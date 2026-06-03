import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  findAll() { return this.campaignsService.findAll(); }

  @Get('with-tasks')
  @ApiOperation({ summary: 'List all campaigns with role-scoped tasks' })
  findAllWithTasks(@CurrentUser() user: any) {
    return this.campaignsService.findAllWithTasks(user);
  }

  @Post(':id/apply-template')
  @ApiOperation({ summary: 'Apply a checklist template to a campaign' })
  applyTemplate(
    @Param('id') id: string,
    @Body() body: { templateId: string; clearExisting?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.campaignsService.applyTemplate(id, body.templateId, body.clearExisting ?? false, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign with tasks scoped by caller role' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.campaignsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a campaign' })
  create(@Body() dto: CreateCampaignDto) { return this.campaignsService.create(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) { return this.campaignsService.update(id, dto); }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a campaign' })
  remove(@Param('id') id: string) { return this.campaignsService.remove(id); }
}
