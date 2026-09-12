const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Accra'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS session_periods JSONB`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS attendance_method TEXT NOT NULL DEFAULT 'dynamic_qr'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS auto_created BOOLEAN NOT NULL DEFAULT false`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_class_id_scheduled_start_key ON attendance_sessions (class_id, scheduled_start)`
  );
  await prisma.$executeRawUnsafe(`
    UPDATE institutions
    SET session_periods = '[
      {"key":"morning","name":"Morning","start_time":"09:00","end_time":"12:00","enabled":true},
      {"key":"afternoon","name":"Afternoon","start_time":"13:00","end_time":"15:00","enabled":true},
      {"key":"evening","name":"Evening","start_time":"16:00","end_time":"19:00","enabled":true}
    ]'::jsonb
    WHERE session_periods IS NULL
  `);
  console.log('Phase 1 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
