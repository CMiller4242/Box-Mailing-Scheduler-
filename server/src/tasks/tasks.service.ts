import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(campaignId?: string) {
    return this.prisma.task.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: { owner: { select: { id: true, name: true, firstName: true, lastName: true, email: true } } },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
        alerts: { orderBy: { triggerDate: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(dto: CreateTaskDto) {
    const { campaignId, ownerId, ...rest } = dto;
    const task = await this.prisma.task.create({
      data: { ...rest, campaign: { connect: { id: campaignId } }, ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}) },
      include: { owner: { select: { id: true, name: true, firstName: true, lastName: true, email: true } } },
    });
    await this.prisma.taskActivity.create({ data: { taskId: task.id, action: 'Task created' } });
    return task;
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await this.findOne(id);
    const { ownerId, campaignId, ...rest } = dto;
    const actions: string[] = [];
    if (dto.status && dto.status !== existing.status) actions.push(`Status changed to ${dto.status}`);
    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) actions.push(`Owner updated`);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(campaignId !== undefined ? { campaign: { connect: { id: campaignId } } } : {}),
        ...(ownerId !== undefined ? { owner: ownerId ? { connect: { id: ownerId } } : { disconnect: true } } : {}),
      },
      include: { owner: { select: { id: true, name: true, firstName: true, lastName: true, email: true } } },
    });

    for (const action of actions) {
      await this.prisma.taskActivity.create({ data: { taskId: id, action } });
    }
    return task;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({ where: { id } });
  }
}
