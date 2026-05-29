import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks, optionally filter by campaignId' })
  @ApiQuery({ name: 'campaignId', required: false })
  findAll(@Query('campaignId') campaignId?: string) { return this.tasksService.findAll(campaignId); }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task with alerts and activity log' })
  findOne(@Param('id') id: string) { return this.tasksService.findOne(id); }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  create(@Body() dto: CreateTaskDto) { return this.tasksService.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (status, owner, etc.)' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) { return this.tasksService.update(id, dto); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string) { return this.tasksService.remove(id); }
}
