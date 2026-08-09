const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
    await prisma.$executeRawUnsafe('GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;');
    await prisma.$executeRawUnsafe('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;');
    
    // Disable RLS on all tables so students can read/write without complex policies
    const tables = ['users', 'attendance_sessions', 'institutions', 'attendance_records', 'classes', 'enrollments'];
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
    }

    console.log('Granted schema access and disabled RLS for development!');
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
