import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
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
}
