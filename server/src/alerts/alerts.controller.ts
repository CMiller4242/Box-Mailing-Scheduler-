import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts for a task' })
  @ApiQuery({ name: 'taskId', required: true })
  findByTask(@Query('taskId') taskId: string) { return this.alertsService.findByTask(taskId); }

  @Post()
  @ApiOperation({ summary: 'Create an alert' })
  create(@Body() dto: CreateAlertDto) { return this.alertsService.create(dto); }

  @Patch(':id/fire')
  @ApiOperation({ summary: 'Mark an alert as fired' })
  markFired(@Param('id') id: string) { return this.alertsService.markFired(id); }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an alert' })
  remove(@Param('id') id: string) { return this.alertsService.remove(id); }
}
