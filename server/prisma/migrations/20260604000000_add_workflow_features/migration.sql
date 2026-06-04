-- Add sortOrder to Task
ALTER TABLE "Task" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Add defaultAssigneeId to ChecklistTemplateItem
ALTER TABLE "ChecklistTemplateItem" ADD COLUMN "defaultAssigneeId" TEXT;

-- Create TaskAttachment
CREATE TABLE "TaskAttachment" (
  "id"         TEXT         NOT NULL,
  "taskId"     TEXT         NOT NULL,
  "filename"   TEXT         NOT NULL,
  "storedName" TEXT         NOT NULL,
  "mimeType"   TEXT         NOT NULL,
  "size"       INTEGER      NOT NULL,
  "uploaderId" TEXT         NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TaskAttachment"
  ADD CONSTRAINT "TaskAttachment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create Notification
CREATE TABLE "Notification" (
  "id"        TEXT         NOT NULL,
  "userId"    TEXT         NOT NULL,
  "taskId"    TEXT,
  "message"   TEXT         NOT NULL,
  "isRead"    BOOLEAN      NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
