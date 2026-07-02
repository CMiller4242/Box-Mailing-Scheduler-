import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveRole } from '../common/utils/role.utils';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: SAFE_SELECT, orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    return this.prisma.user.create({ data: dto, select: SAFE_SELECT });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });
  }

  async remove(targetId: string, callerId: string) {
    if (targetId === callerId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }
    await this.findOne(targetId); // 404 if not found

    // Null out FK references that have no cascade, so the delete can proceed cleanly:
    //   • tasks owned by this user → ownerId = null
    //   • users who report to this user → managerId = null
    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { ownerId: targetId },
        data: { ownerId: null },
      }),
      this.prisma.user.updateMany({
        where: { managerId: targetId },
        data: { managerId: null },
      }),
      this.prisma.user.delete({ where: { id: targetId } }),
    ]);

    return { id: targetId };
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateRole(targetId: string, role: UserRole, callerId: string) {
    if (targetId === callerId) {
      throw new ForbiddenException('You cannot change your own role.');
    }
    await this.findOne(targetId); // throws 404 if not found
    return this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: SAFE_SELECT,
    });
  }

  async updateManager(targetId: string, managerId: string | null) {
    if (managerId !== null && managerId === targetId) {
      throw new BadRequestException('A user cannot be assigned as their own manager.');
    }
    if (managerId) {
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        select: { role: true },
      });
      if (!manager) throw new NotFoundException('Manager user not found.');
      if (effectiveRole(manager.role) !== 'MANAGER') {
        throw new BadRequestException('The assigned manager must have the MANAGER role.');
      }
    }
    await this.findOne(targetId);
    return this.prisma.user.update({
      where: { id: targetId },
      data: { managerId: managerId ?? null },
      select: SAFE_SELECT,
    });
  }

  async getReportIds(managerId: string): Promise<string[]> {
    const reports = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });
    return reports.map((r) => r.id);
  }
}
