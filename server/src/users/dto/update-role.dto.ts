import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'role must be one of: ADMIN, MANAGER, EMPLOYEE, MEMBER' })
  role: UserRole;
}
