import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { effectiveRole } from '../common/utils/role.utils';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type RequestUser = { id: string; role: string; managerId: string | null };

const OWNER_SELECT = { id: true, name: true, firstName: true, lastName: true, email: true };

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Scope helpers ────────────────────────────────────────────────────────

  private async scopeWhere(user: RequestUser): Promise<Prisma.TaskWhereInput> {
    const role = effectiveRole(user.role);
    if (role === 'ADMIN') return {};
    if (role === 'MANAGER') {
      const reportIds = await this.users.getReportIds(user.id);
      return { ownerId: { in: [user.id, ...reportIds] } };
    }
    return { ownerId: user.id };
  }

  private async assertCanModify(taskOwnerId: string | null, user: RequestUser): Promise<void> {
    const role = effectiveRole(user.role);
    if (role === 'ADMIN') return;
    if (role === 'MANAGER') {
      if (taskOwnerId === user.id) return;
      const reportIds = await this.users.getReportIds(user.id);
      if (taskOwnerId && reportIds.includes(taskOwnerId)) return;
      throw new ForbiddenException('Task is outside your team scope');
    }
    if (taskOwnerId !== user.id) {
      throw new ForbiddenException('You can only modify your own tasks');
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(campaignId: string | undefined, user: RequestUser) {
    const scope = await this.scopeWhere(user);
    return this.prisma.task.findMany({
      where: { ...(campaignId ? { campaignId } : {}), ...scope },
      include: { owner: { select: OWNER_SELECT } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, user?: RequestUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        owner: { select: OWNER_SELECT },
        alerts: { orderBy: { triggerDate: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (user) await this.assertCanModify(task.ownerId, user);
    return task;
  }

  async create(dto: CreateTaskDto, user: RequestUser) {
    const role = effectiveRole(user.role);
    if (role === 'EMPLOYEE') throw new ForbiddenException('Employees cannot create tasks');

    const { campaignId, ownerId, ...rest } = dto;
    const task = await this.prisma.task.create({
      data: {
        ...rest,
        campaign: { connect: { id: campaignId } },
        ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
      },
      include: { owner: { select: OWNER_SELECT } },
    });
    await this.prisma.taskActivity.create({ data: { taskId: task.id, action: 'Task created' } });
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: RequestUser) {
    const existing = await this.findOne(id);
    await this.assertCanModify(existing.ownerId, user);

    const role = effectiveRole(user.role);
    const { ownerId, campaignId, ...rest } = dto;

    // Employees may only touch status, instructions, and ownerId (only when completing)
    let safeRest = rest;
    let safeOwnerId = ownerId;
    if (role === 'EMPLOYEE') {
      const { title, dueDate, priority, reminderDateTime, ...employeeRest } = rest as any;
      safeRest = { status: employeeRest.status, instructions: employeeRest.instructions };
      // Allow reassignment only when marking complete
      if (dto.status !== 'COMPLETED') safeOwnerId = undefined;
    }

    const actions: string[] = [];
    if (dto.status && dto.status !== existing.status) actions.push(`Status changed to ${dto.status}`);
    if (safeOwnerId !== undefined && safeOwnerId !== existing.ownerId) actions.push('Owner updated');

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...safeRest,
        ...(campaignId !== undefined && role !== 'EMPLOYEE'
          ? { campaign: { connect: { id: campaignId } } }
          : {}),
        ...(safeOwnerId !== undefined
          ? { owner: safeOwnerId ? { connect: { id: safeOwnerId } } : { disconnect: true } }
          : {}),
      },
      include: { owner: { select: OWNER_SELECT } },
    });

    for (const action of actions) {
      await this.prisma.taskActivity.create({ data: { taskId: id, action } });
    }
    return task;
  }

  async remove(id: string, user: RequestUser) {
    const role = effectiveRole(user.role);
    if (role === 'EMPLOYEE') throw new ForbiddenException('Employees cannot delete tasks');

    const task = await this.findOne(id);
    await this.assertCanModify(task.ownerId, user);
    return this.prisma.task.delete({ where: { id } });
  }

  // ─── Complete + auto-advance ───────────────────────────────────────────────

  async complete(id: string, nextOwnerId: string | undefined, user: RequestUser) {
    const task = await this.findOne(id);
    await this.assertCanModify(task.ownerId, user);

    await this.prisma.task.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    await this.prisma.taskActivity.create({ data: { taskId: id, action: 'Task completed' } });

    // Find next NOT_STARTED task in the same campaign (by sortOrder then dueDate)
    const nextTask = await this.prisma.task.findFirst({
      where: { campaignId: task.campaignId, status: 'NOT_STARTED', id: { not: id } },
      orderBy: [{ sortOrder: 'asc' }, { dueDate: 'asc' }],
    });

    if (nextTask) {
      const assigneeId = nextOwnerId ?? nextTask.ownerId;
      if (assigneeId) {
        await this.prisma.task.update({ where: { id: nextTask.id }, data: { ownerId: assigneeId } });
        await this.notifications.create(
          assigneeId,
          `You've been assigned: "${nextTask.title}"`,
          nextTask.id,
        );
      }
    }

    return { completed: id, next: nextTask?.id ?? null };
  }

  // ─── Attachments ───────────────────────────────────────────────────────────

  async addAttachment(
    taskId: string,
    file: Express.Multer.File,
    uploaderId: string,
  ) {
    await this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    return this.prisma.taskAttachment.create({
      data: {
        taskId,
        filename: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploaderId,
      },
    });
  }

  getAttachments(taskId: string) {
    return this.prisma.taskAttachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getAttachmentById(id: string) {
    const a = await this.prisma.taskAttachment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Attachment not found');
    return a;
  }

  async removeAttachment(attachmentId: string, userId: string, userRole: string) {
    const attachment = await this.prisma.taskAttachment.findUniqueOrThrow({ where: { id: attachmentId } });
    const role = effectiveRole(userRole);
    if (role === 'EMPLOYEE' && attachment.uploaderId !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }
    return this.prisma.taskAttachment.delete({ where: { id: attachmentId } });
  }
}
