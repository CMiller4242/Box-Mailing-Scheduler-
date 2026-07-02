import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateManagerDto {
  @ApiPropertyOptional({ description: 'User ID of the manager to assign, or null to remove.' })
  @IsOptional()
  @IsString()
  managerId?: string | null;
}
