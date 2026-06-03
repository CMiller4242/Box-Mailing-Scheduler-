import { IsBoolean, IsInt, IsOptional, IsString, MinLength, ValidateNested, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, UserRole } from '@prisma/client';

export class CreateTemplateItemDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  sortOrder: number;

  @IsOptional()
  @IsEnum(UserRole)
  defaultRole?: UserRole;

  @IsOptional()
  @IsInt()
  defaultDaysOffset?: number;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}

export class CreateTemplateDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateItemDto)
  items: CreateTemplateItemDto[];
}
