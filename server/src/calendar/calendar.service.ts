import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents() {
    const [campaigns, tasks] = await Promise.all([
      this.prisma.campaign.findMany({ select: { id: true, name: true, mailDate: true, status: true } }),
      this.prisma.task.findMany({
        select: { id: true, title: true, dueDate: true, status: true, priority: true, campaignId: true, ownerId: true },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const campaignEvents = campaigns.map((c) => ({
      id: `campaign-${c.id}`,
      title: `📬 ${c.name}`,
      date: c.mailDate,
      type: 'campaign',
      resourceId: c.id,
      status: c.status,
    }));

    const taskEvents = tasks.map((t) => ({
      id: `task-${t.id}`,
      title: t.title,
      date: t.dueDate,
      type: 'task',
      resourceId: t.id,
      campaignId: t.campaignId,
      status: t.status,
      priority: t.priority,
      ownerId: t.ownerId,
    }));

    return [...campaignEvents, ...taskEvents];
  }
}
