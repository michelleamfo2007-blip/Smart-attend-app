const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS building TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE classroom_kiosks ADD COLUMN IF NOT EXISTS device_label TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE classroom_kiosks ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ`
  );
  console.log('Phase 3 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
