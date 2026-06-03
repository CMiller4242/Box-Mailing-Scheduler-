import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class CampaignTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.checklistTemplate.findMany({
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.checklistTemplate.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!t) throw new NotFoundException(`Template ${id} not found`);
    return t;
  }

  async create(dto: CreateTemplateDto, userId: string) {
    const { items, ...rest } = dto;
    return this.prisma.checklistTemplate.create({
      data: {
        ...rest,
        createdById: userId,
        items: { create: items },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    const { items, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (items !== undefined) {
        await tx.checklistTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.checklistTemplateItem.createMany({
          data: items.map((item) => ({ ...item, templateId: id })),
        });
      }
      return tx.checklistTemplate.update({
        where: { id },
        data: rest,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.checklistTemplate.delete({ where: { id } });
  }
}
