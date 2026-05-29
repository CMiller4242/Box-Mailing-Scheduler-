import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { name: 'Box Mailing Scheduler API', status: 'ok', docs: '/docs' };
  }
}
