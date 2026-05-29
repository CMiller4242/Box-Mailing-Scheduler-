-- Migration: resolve_user_conflict
-- This migration represents the changes that were partially committed to the database.
-- ALTER TYPE ADD VALUE runs outside Prisma's transaction wrapper and is permanent in PostgreSQL,
-- so MANAGER and EMPLOYEE were committed even though the rest of the migration failed.
-- The column additions and default change are handled in the follow-up migration.

-- AlterEnum: add MANAGER value (committed outside transaction)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';

-- AlterEnum: add EMPLOYEE value (committed outside transaction)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
