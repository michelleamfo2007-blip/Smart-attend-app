const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS late_grace_minutes INTEGER DEFAULT 15`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE institutions SET late_grace_minutes = 15 WHERE late_grace_minutes IS NULL`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_in_status TEXT DEFAULT 'present'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS notes TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS verification_type TEXT DEFAULT 'self'`
  );
  await prisma.$executeRawUnsafe(`
    UPDATE attendance_records
    SET verification_type = 'staff_verified'
    WHERE method IN ('staff_scan', 'staff_manual')
      AND (verification_type IS NULL OR verification_type = 'self')
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS attendance_flags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
      session_id UUID,
      student_id UUID,
      flagged_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Phase 5 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
