-- Add Sales Enablement tracking fields to TaskAttachment
ALTER TABLE "TaskAttachment" ADD COLUMN "sentToSalesEnablementAt" TIMESTAMP(3);
ALTER TABLE "TaskAttachment" ADD COLUMN "sentToSalesEnablementBy" TEXT;
