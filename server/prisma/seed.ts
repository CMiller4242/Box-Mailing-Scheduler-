import { PrismaClient, UserRole, CampaignStatus, TaskStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.taskActivity.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.task.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: { name: 'Alice Johnson', email: 'alice@positivepromotions.com', role: UserRole.ADMIN },
  });
  const bob = await prisma.user.create({
    data: { name: 'Bob Martinez', email: 'bob@positivepromotions.com', role: UserRole.MEMBER },
  });
  const carol = await prisma.user.create({
    data: { name: 'Carol Lee', email: 'carol@positivepromotions.com', role: UserRole.MEMBER },
  });

  const mailDate = new Date('2026-07-15T00:00:00.000Z');

  const campaign = await prisma.campaign.create({
    data: {
      name: 'Summer Promo Box — July 2026',
      mailDate,
      status: CampaignStatus.ACTIVE,
      notes: 'Key summer campaign targeting loyalty customers.',
    },
  });

  const tasks = [
    {
      title: 'Confirm product list with merchandising',
      instructions: 'Review and lock in the final product selection for the summer box. Coordinate with the merchandising team to confirm quantities and lead times.',
      ownerId: alice.id,
      dueDate: new Date('2026-06-01T17:00:00.000Z'),
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
    },
    {
      title: 'Design box artwork and insert card',
      instructions: 'Work with the design team to finalize the box exterior artwork and interior insert card copy. All assets must be approved before being sent to the printer.',
      ownerId: carol.id,
      dueDate: new Date('2026-06-10T17:00:00.000Z'),
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
    },
    {
      title: 'Send artwork to printer for proof',
      instructions: 'Submit finalized artwork files to our print vendor. Request a physical proof and digital PDF proof. Turnaround expected within 5 business days.',
      ownerId: carol.id,
      dueDate: new Date('2026-06-15T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.HIGH,
    },
    {
      title: 'Approve printer proof',
      instructions: 'Review the printer proof for color accuracy and layout. Note any corrections needed and resubmit if required. Final approval unlocks production run.',
      ownerId: alice.id,
      dueDate: new Date('2026-06-22T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
    },
    {
      title: 'Finalize mailing list segmentation',
      instructions: 'Pull the loyalty customer segment from CRM. Apply suppression lists and validate addresses. Export final list in required format for mail house.',
      ownerId: bob.id,
      dueDate: new Date('2026-06-25T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
    },
    {
      title: 'Ship product inventory to fulfillment center',
      instructions: 'Coordinate with warehouse to prepare and ship all product inventory to the fulfillment center. Include packing slips and BOL documentation.',
      ownerId: bob.id,
      dueDate: new Date('2026-07-01T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.HIGH,
    },
    {
      title: 'Confirm mail date with mail house',
      instructions: 'Contact the mail house to confirm the scheduled in-home date of July 15th. Verify that all materials and lists will be received in time.',
      ownerId: alice.id,
      dueDate: new Date('2026-07-05T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
    },
    {
      title: 'QA final box assembly',
      instructions: 'Perform a QA check on a sample of assembled boxes before full production run. Verify product placement, insert card, and packaging integrity.',
      ownerId: carol.id,
      dueDate: new Date('2026-07-08T17:00:00.000Z'),
      status: TaskStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
    },
    {
      title: 'Campaign goes to mail',
      instructions: 'The mail house begins processing and sending boxes. Monitor tracking data and be on-call for any fulfillment issues.',
      ownerId: alice.id,
      dueDate: mailDate,
      status: TaskStatus.NOT_STARTED,
      priority: Priority.HIGH,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: { ...task, campaignId: campaign.id } });
  }

  console.log('Seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
