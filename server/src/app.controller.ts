import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { name: 'Box Mailing Scheduler API', status: 'ok', docs: '/docs' };
  }
}
