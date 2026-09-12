const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE attendance_sessions ALTER COLUMN attendance_method SET DEFAULT 'both'`
  );
  console.log('Phase 2 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
