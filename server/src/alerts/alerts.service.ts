import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  findByTask(taskId: string) {
    return this.prisma.alert.findMany({ where: { taskId }, orderBy: { triggerDate: 'asc' } });
  }

  create(dto: CreateAlertDto) {
    return this.prisma.alert.create({ data: dto });
  }

  async markFired(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return this.prisma.alert.update({ where: { id }, data: { isFired: true } });
  }

  async remove(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException(`Alert ${id} not found`);
    return this.prisma.alert.delete({ where: { id } });
  }
}
