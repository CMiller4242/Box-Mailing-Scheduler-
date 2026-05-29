/**
 * fix-migration-history.mjs
 *
 * Repairs the _prisma_migrations table so that the local placeholder migration
 * (20260529201359_resolve_user_conflict) is treated as correctly applied.
 *
 * Run once from the server/ directory:
 *   node fix-migration-history.mjs
 *
 * This script:
 *   1. Loads DATABASE_URL from .env (no external packages needed).
 *   2. Connects via @prisma/client.
 *   3. Shows the current state of _prisma_migrations.
 *   4. Upserts the conflicted migration record with the correct checksum.
 *   5. Disconnects cleanly.
 *
 * Does NOT reset the database. Does NOT modify any application tables.
 */

import { createRequire } from 'module';
import { readFileSync, createHash } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── 1. Load .env manually (no dotenv dependency needed) ─────────────────────
function loadEnv(envPath) {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val; // don't override shell env
    }
    console.log('✓ Loaded .env');
  } catch {
    console.log('  No .env file found – relying on process environment.');
  }
}

loadEnv(resolve(__dirname, '.env'));

if (!process.env.DATABASE_URL) {
  console.error('✗ DATABASE_URL is not set. Set it in .env or the shell environment.');
  process.exit(1);
}

// ── 2. Compute checksums of migration files ──────────────────────────────────
function fileChecksum(relativePath) {
  const fullPath = resolve(__dirname, relativePath);
  const content = readFileSync(fullPath);
  return createHash('sha256').update(content).digest('hex');
}

const PLACEHOLDER_NAME = '20260529201359_resolve_user_conflict';
const PLACEHOLDER_CHECKSUM = fileChecksum(
  `prisma/migrations/${PLACEHOLDER_NAME}/migration.sql`
);

console.log(`\n── Checksums ────────────────────────────────────────────────────`);
console.log(`  Placeholder : ${PLACEHOLDER_CHECKSUM}`);

// ── 3. Connect with Prisma ───────────────────────────────────────────────────
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log('\n✓ Connected to database\n');

  // ── 4. Show current migration history ──────────────────────────────────────
  console.log('── Current _prisma_migrations state ────────────────────────────');
  const rows = await prisma.$queryRaw`
    SELECT migration_name, applied_steps_count,
           finished_at IS NOT NULL        AS finished,
           rolled_back_at IS NOT NULL     AS rolled_back,
           checksum
    FROM "_prisma_migrations"
    ORDER BY started_at
  `;

  if (rows.length === 0) {
    console.log('  (no records found)');
  } else {
    for (const r of rows) {
      const status = r.rolled_back ? 'ROLLED-BACK' : r.finished ? 'applied' : 'pending';
      const match  = r.migration_name === PLACEHOLDER_NAME
        ? (r.checksum === PLACEHOLDER_CHECKSUM ? '✓ checksum ok' : '✗ checksum MISMATCH')
        : '';
      console.log(`  [${status.padEnd(11)}] ${r.migration_name}  ${match}`);
    }
  }

  // ── 5. Upsert the placeholder record ────────────────────────────────────────
  console.log('\n── Reconciling placeholder migration ───────────────────────────');

  const existing = rows.find(r => r.migration_name === PLACEHOLDER_NAME);

  if (existing && existing.checksum === PLACEHOLDER_CHECKSUM && existing.finished && !existing.rolled_back) {
    console.log('  Already correct – nothing to change.');
  } else {
    // Upsert: update if exists, insert if not.
    // We do this with two steps to stay compatible with Prisma's raw query API.
    const updated = await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET
        checksum            = ${PLACEHOLDER_CHECKSUM},
        finished_at         = COALESCE(finished_at, NOW()),
        rolled_back_at      = NULL,
        logs                = NULL,
        applied_steps_count = 1
      WHERE migration_name  = ${PLACEHOLDER_NAME}
    `;

    if (updated === 0) {
      // No row existed – insert a fresh record
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations"
          (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES
          (
            gen_random_uuid()::text,
            ${PLACEHOLDER_CHECKSUM},
            NOW(),
            ${PLACEHOLDER_NAME},
            NULL,
            NULL,
            NOW(),
            1
          )
      `;
      console.log('  ✓ Inserted new record for placeholder migration.');
    } else {
      console.log('  ✓ Updated existing record – checksum reconciled.');
    }
  }

  // ── 6. Verify final state ───────────────────────────────────────────────────
  console.log('\n── Verification ────────────────────────────────────────────────');
  const check = await prisma.$queryRaw`
    SELECT migration_name, applied_steps_count, finished_at, rolled_back_at, checksum
    FROM "_prisma_migrations"
    WHERE migration_name = ${PLACEHOLDER_NAME}
  `;

  if (check.length === 0) {
    console.error('  ✗ Record still missing – something went wrong.');
    process.exit(1);
  }

  const rec = check[0];
  const checksumOk    = rec.checksum === PLACEHOLDER_CHECKSUM;
  const finishedOk    = rec.finished_at !== null;
  const notRolledBack = rec.rolled_back_at === null;

  console.log(`  checksum ok   : ${checksumOk    ? '✓' : '✗'}  ${rec.checksum}`);
  console.log(`  finished_at   : ${finishedOk    ? '✓' : '✗'}  ${rec.finished_at}`);
  console.log(`  rolled_back_at: ${notRolledBack ? '✓ (null)' : '✗ ' + rec.rolled_back_at}`);

  if (!checksumOk || !finishedOk || !notRolledBack) {
    console.error('\n✗ Verification failed – check the output above.');
    process.exit(1);
  }

  console.log('\n✓ Migration history repaired. You can now run:');
  console.log('    npx prisma migrate deploy');
  console.log('    npx prisma generate');
  console.log('    npx prisma migrate status\n');
}

main()
  .catch(err => { console.error('\n✗ Error:', err.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
