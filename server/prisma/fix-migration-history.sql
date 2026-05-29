-- =============================================================================
-- Prisma Migration History Repair Script
-- Run this ONCE against your database to reconcile migration state.
-- It is safe to run multiple times (uses upsert logic).
--
-- After running this script:
--   cd server
--   npx prisma migrate deploy   ← applies the 2 new pending migrations
--   npx prisma generate         ← regenerates the Prisma client
-- =============================================================================

-- Step 1 ─ Inspect current state (informational, no changes)
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count, checksum
FROM "_prisma_migrations"
ORDER BY started_at;

-- Step 2 ─ Reconcile the failed/conflicted migration record.
--
-- The original migration (20260529201359_resolve_user_conflict) ran partially:
--   • ALTER TYPE ADD VALUE for MANAGER and EMPLOYEE committed (Postgres auto-commits these)
--   • The subsequent SET DEFAULT 'EMPLOYEE' failed (unsafe use of new enum value)
--
-- We replace the DB record with our placeholder migration's checksum so that
-- `migrate deploy` stops seeing a mismatch and treats this migration as applied.
--
-- The placeholder SQL only contains the ADD VALUE statements that actually
-- committed, so the DB schema and this record are now consistent.
--
-- Checksum = SHA-256 of:
--   server/prisma/migrations/20260529201359_resolve_user_conflict/migration.sql
--   = 2804aca2d097f486cccaeecb2cd0fc1f7a7e3aa22d3a4248c4bff7cf9ac6ac01

INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
)
VALUES (
    gen_random_uuid()::text,
    '2804aca2d097f486cccaeecb2cd0fc1f7a7e3aa22d3a4248c4bff7cf9ac6ac01',
    NOW(),
    '20260529201359_resolve_user_conflict',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT (migration_name)
DO UPDATE SET
    checksum            = EXCLUDED.checksum,
    finished_at         = COALESCE("_prisma_migrations".finished_at, NOW()),
    rolled_back_at      = NULL,
    logs                = NULL,
    applied_steps_count = 1;

-- Step 3 ─ Verify the record looks correct before running migrate deploy
SELECT migration_name, finished_at, rolled_back_at, applied_steps_count, checksum
FROM "_prisma_migrations"
WHERE migration_name = '20260529201359_resolve_user_conflict';

-- Expected result:
--   migration_name              | finished_at | rolled_back_at | applied_steps_count | checksum
--   20260529201359_resolve_...  | <timestamp> | NULL           | 1                   | 2804aca2...
-- =============================================================================
