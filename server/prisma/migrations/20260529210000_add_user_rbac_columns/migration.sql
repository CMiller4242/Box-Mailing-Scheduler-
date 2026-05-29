-- Migration: add_user_rbac_columns
-- Adds firstName, lastName, passwordHash, managerId columns to User.
-- These are added with IF NOT EXISTS so this is safe to run whether or not the
-- columns were partially applied by the failed migration.

-- AlterTable: add profile and auth columns
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "firstName"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "lastName"     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "managerId"    TEXT;

-- AddForeignKey: self-referential manager→reports relation
-- Use DO block so it's idempotent if the constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_managerId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_managerId_fkey"
      FOREIGN KEY ("managerId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
