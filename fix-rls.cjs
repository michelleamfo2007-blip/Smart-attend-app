const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;`);
    
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous inserts" ON public.attendance_records;`); } catch (e) {}
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow anonymous inserts" ON public.attendance_records FOR INSERT TO anon, authenticated WITH CHECK (true);`);
    
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous selects" ON public.attendance_records;`); } catch (e) {}
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow anonymous selects" ON public.attendance_records FOR SELECT TO anon, authenticated USING (true);`);
    
    try { await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS "Allow anonymous updates" ON public.attendance_records;`); } catch (e) {}
    await prisma.$executeRawUnsafe(`CREATE POLICY "Allow anonymous updates" ON public.attendance_records FOR UPDATE TO anon, authenticated USING (true);`);
    
    console.log('Successfully added policies!');
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
