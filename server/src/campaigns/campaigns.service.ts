import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { effectiveRole } from '../common/utils/role.utils';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

type RequestUser = { id: string; role: string };

const OWNER_SELECT = { id: true, name: true, firstName: true, lastName: true, email: true };

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private async taskScope(user: RequestUser): Promise<Prisma.TaskWhereInput> {
    const role = effectiveRole(user.role);
    if (role === 'ADMIN') return {};
    if (role === 'MANAGER') {
      const reportIds = await this.users.getReportIds(user.id);
      return { ownerId: { in: [user.id, ...reportIds] } };
    }
    return { ownerId: user.id };
  }

  findAll() {
    return this.prisma.campaign.findMany({
      orderBy: { mailDate: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async findOne(id: string, user?: RequestUser) {
    const taskWhere = user ? await this.taskScope(user) : {};
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        tasks: {
          where: taskWhere,
          include: { owner: { select: OWNER_SELECT } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async findAllWithTasks(user: RequestUser) {
    const taskWhere = await this.taskScope(user);
    return this.prisma.campaign.findMany({
      orderBy: { mailDate: 'asc' },
      include: {
        tasks: {
          where: taskWhere,
          include: { owner: { select: OWNER_SELECT } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
  }

  async applyTemplate(
    campaignId: string,
    templateId: string,
    clearExisting: boolean,
    user: RequestUser,
  ) {
    const [campaign, template] = await Promise.all([
      this.prisma.campaign.findUnique({ where: { id: campaignId } }),
      this.prisma.checklistTemplate.findUnique({
        where: { id: templateId },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      }),
    ]);
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} not found`);
    if (!template) throw new NotFoundException(`Template ${templateId} not found`);

    const mailDate = new Date(campaign.mailDate);

    return this.prisma.$transaction(async (tx) => {
      if (clearExisting) {
        await tx.task.deleteMany({ where: { campaignId } });
      }
      const tasks = await Promise.all(
        template.items.map((item) => {
          const dueDate = new Date(mailDate);
          dueDate.setDate(dueDate.getDate() + (item.defaultDaysOffset ?? 0));
          return tx.task.create({
            data: {
              campaignId,
              title: item.title,
              instructions: item.description ?? undefined,
              priority: item.priority,
              dueDate,
              ownerId: null,
            },
          });
        }),
      );
      return { applied: tasks.length };
    });
  }

  create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: { ...dto, mailDate: new Date(dto.mailDate) },
    });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    const data = dto.mailDate ? { ...dto, mailDate: new Date(dto.mailDate) } : dto;
    return this.prisma.campaign.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}
