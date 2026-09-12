const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS lecturer_geo_policy TEXT DEFAULT 'warn'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS campus_latitude DOUBLE PRECISION`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS campus_longitude DOUBLE PRECISION`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS campus_radius_meters INTEGER DEFAULT 200`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE institutions SET lecturer_geo_policy = 'warn' WHERE lecturer_geo_policy IS NULL`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS lecturer_verified_at TIMESTAMPTZ`
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS lecturer_location_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
      lecturer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
      class_id UUID,
      classroom_id UUID,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy_meters DOUBLE PRECISION,
      expected_latitude DOUBLE PRECISION,
      expected_longitude DOUBLE PRECISION,
      expected_radius_m INTEGER,
      distance_meters DOUBLE PRECISION,
      result TEXT NOT NULL,
      policy TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('Phase 4 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
