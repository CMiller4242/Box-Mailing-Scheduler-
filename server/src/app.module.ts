import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TasksModule } from './tasks/tasks.module';
import { AlertsModule } from './alerts/alerts.module';
import { CalendarModule } from './calendar/calendar.module';

@Module({
  imports: [PrismaModule, UsersModule, CampaignsModule, TasksModule, AlertsModule, CalendarModule],
  controllers: [AppController],
})
export class AppModule {}
