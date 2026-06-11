import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
  UploadedFile, UseInterceptors, Res, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const storage = diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`);
  },
});

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks scoped by caller role' })
  @ApiQuery({ name: 'campaignId', required: false })
  findAll(@Query('campaignId') campaignId: string | undefined, @CurrentUser() user: any) {
    return this.tasksService.findAll(campaignId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task (access-checked)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task (ADMIN + MANAGER only)' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.update(id, dto, user);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark task complete and auto-advance to next' })
  complete(
    @Param('id') id: string,
    @Body() body: { nextOwnerId?: string },
    @CurrentUser() user: any,
  ) {
    return this.tasksService.complete(id, body.nextOwnerId, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task (ADMIN + MANAGER only)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tasksService.remove(id, user);
  }

  // ── Attachments ────────────────────────────────────────────────────────────

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List attachments for a task' })
  getAttachments(@Param('id') id: string) {
    return this.tasksService.getAttachments(id);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Upload a file attachment to a task' })
  @UseInterceptors(FileInterceptor('file', { storage }))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addAttachment(id, file, user.id);
  }

  @Get('attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Download an attachment' })
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.tasksService.getAttachmentById(attachmentId);
    const filePath = join(UPLOADS_DIR, attachment.storedName);
    if (!existsSync(filePath)) throw new NotFoundException('File not found on disk');
    res.download(filePath, attachment.filename);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an attachment' })
  removeAttachment(@Param('attachmentId') attachmentId: string, @CurrentUser() user: any) {
    return this.tasksService.removeAttachment(attachmentId, user.id, user.role);
  }

  @Patch('attachments/:attachmentId/sales-enablement')
  @ApiOperation({ summary: 'Mark attachment as sent to Sales Enablement' })
  markSentToSalesEnablement(@Param('attachmentId') attachmentId: string, @CurrentUser() user: any) {
    return this.tasksService.markSentToSalesEnablement(attachmentId, user.id);
  }
}
