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

  create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({ data: dto });
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}
