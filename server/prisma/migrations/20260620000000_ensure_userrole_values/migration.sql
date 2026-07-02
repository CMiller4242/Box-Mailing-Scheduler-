-- Migration: ensure_userrole_values
--
-- Root cause this fixes:
--   fix-migration-history.mjs marks 20260529201359_resolve_user_conflict as
--   "applied" in _prisma_migrations WITHOUT executing its SQL. On databases
--   that were initialised via db push with an older schema (UserRole = {ADMIN,
--   MEMBER} only), this leaves MANAGER and EMPLOYEE missing from the enum even
--   though subsequent migrations ran fine. Prisma then rejects any role update
--   with: invalid input value for enum "UserRole": "MANAGER".
--
-- This migration is safe to apply in any state:
--   - If MANAGER/EMPLOYEE/MEMBER already exist, IF NOT EXISTS makes it a no-op.
--   - If they are missing, they are added here.
--
-- ALTER TYPE ADD VALUE cannot be run inside a transaction in PostgreSQL < 12.
-- PostgreSQL 12+ allows it (deferred visibility). Prisma 5 on PG 14+ handles
-- this correctly. The existing resolve_user_conflict migration uses the same
-- pattern and is proven to work in this repo.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MEMBER';
