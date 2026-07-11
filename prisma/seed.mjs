import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // Create Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartattend.com' },
    update: {},
    create: {
      email: 'admin@smartattend.com',
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create a Lecturer
  const lecturerPassword = await bcrypt.hash('lecturer123', 10);
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@smartattend.com' },
    update: {},
    create: {
      email: 'lecturer@smartattend.com',
      name: 'Dr. John Smith',
      password: lecturerPassword,
      role: 'LECTURER',
    },
  });
  console.log('✅ Lecturer created:', lecturer.email);

  // Create a Student
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@smartattend.com' },
    update: {},
    create: {
      email: 'student@smartattend.com',
      name: 'Jane Doe',
      password: studentPassword,
      role: 'STUDENT',
    },
  });
  console.log('✅ Student created:', student.email);

  // Create sample courses
  const course1 = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      name: 'Introduction to Programming',
      description: 'Fundamentals of programming with Python',
    },
  });

  const course2 = await prisma.course.upsert({
    where: { code: 'MATH201' },
    update: {},
    create: {
      code: 'MATH201',
      name: 'Calculus I',
      description: 'Differential and integral calculus',
    },
  });

  console.log('✅ Courses created: CS101, MATH201');

  // Enroll student in courses
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course1.id } },
    update: {},
    create: { userId: student.id, courseId: course1.id },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course2.id } },
    update: {},
    create: { userId: student.id, courseId: course2.id },
  });

  console.log('✅ Student enrolled in CS101 and MATH201');

  console.log('\n🎉 Seed complete! Login credentials:\n');
  console.log('  👑 Admin    → admin@smartattend.com     / admin123');
  console.log('  📋 Lecturer → lecturer@smartattend.com  / lecturer123');
  console.log('  🎓 Student  → student@smartattend.com   / student123\n');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
