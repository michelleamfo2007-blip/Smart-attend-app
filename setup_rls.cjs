const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Applying RLS policies...');

    // 1. Enable RLS on all tables
    const tables = ['users', 'classes', 'attendance_sessions', 'attendance_records', 'enrollments'];
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }

    // 2. Drop existing policies to start fresh
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation" ON public.users;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation" ON public.classes;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation" ON public.attendance_sessions;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation" ON public.attendance_records;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "tenant_isolation" ON public.enrollments;`); } catch(e) {}

    // Disable all anon access policies from before
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.attendance_records;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous selects" ON public.attendance_records;`); } catch(e) {}
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous updates" ON public.attendance_records;`); } catch(e) {}

    // 3. Create Tenant Isolation Policies based on JWT app_metadata.institution_id
    // For users table
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "tenant_isolation" ON public.users
      FOR ALL
      TO authenticated
      USING (
        institution_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'institution_id')::uuid
        OR role = 'ADMIN'
      );
    `);

    // For classes table
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "tenant_isolation" ON public.classes
      FOR ALL
      TO authenticated
      USING (
        institution_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'institution_id')::uuid
      );
    `);

    // For attendance_sessions (join through classes to get institution_id)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "tenant_isolation" ON public.attendance_sessions
      FOR ALL
      TO authenticated
      USING (
        class_id IN (
          SELECT id FROM public.classes 
          WHERE institution_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'institution_id')::uuid
        )
      );
    `);

    // For attendance_records (join through classes)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "tenant_isolation" ON public.attendance_records
      FOR ALL
      TO authenticated
      USING (
        class_id IN (
          SELECT id FROM public.classes 
          WHERE institution_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'institution_id')::uuid
        )
      );
    `);

    // For enrollments (join through classes)
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "tenant_isolation" ON public.enrollments
      FOR ALL
      TO authenticated
      USING (
        class_id IN (
          SELECT id FROM public.classes 
          WHERE institution_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'institution_id')::uuid
        )
      );
    `);

    console.log('Successfully added strict RLS policies! Only authenticated users with matching institution_id can access data.');
  } catch (error) {
    console.error('Error setting up RLS:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
