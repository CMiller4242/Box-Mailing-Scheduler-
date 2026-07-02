import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  findAll() { return this.usersService.findAll(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.usersService.update(id, dto); }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a user\'s role (ADMIN only)' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() caller: any,
  ) {
    return this.usersService.updateRole(id, dto.role, caller.id);
  }

  @Patch(':id/manager')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Assign or remove a manager for a user (ADMIN only)' })
  updateManager(@Param('id') id: string, @Body() dto: UpdateManagerDto) {
    return this.usersService.updateManager(id, dto.managerId ?? null);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a user (ADMIN only)' })
  remove(@Param('id') id: string, @CurrentUser() caller: any) {
    return this.usersService.remove(id, caller.id);
  }
}
