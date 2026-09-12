const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS institution_id UUID`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id UUID`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS student_id UUID`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS role TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS result TEXT DEFAULT 'info'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB`
  );

  // Optional FK — ignore if already exists / conflict
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE audit_logs
          ADD CONSTRAINT audit_logs_institution_id_fkey
          FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  } catch {
    // ignore
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      read BOOLEAN NOT NULL DEFAULT FALSE,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS user_notifications_user_read_created_idx
    ON user_notifications (user_id, read, created_at DESC)
  `);

  console.log('Phase 7 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
