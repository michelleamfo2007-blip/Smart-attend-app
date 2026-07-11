const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Adding Michelle and her courses...\n');

  // 1. Create the student
  const studentPassword = await bcrypt.hash('michelle123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'michelle@ipmc.edu' },
    update: {},
    create: { 
      email: 'michelle@ipmc.edu', 
      name: 'Michelle Nhyira Amfo', 
      password: studentPassword, 
      role: 'STUDENT' 
    },
  });
  console.log('✅ Student created:', student.name, `(${student.email})`);

  // 2. Create the courses with their schedules in the description
  const courseAI = await prisma.course.upsert({
    where: { code: 'AI' },
    update: {},
    create: { 
      code: 'AI', 
      name: 'Artificial Intelligence', 
      description: 'IPMC Second Semester. Schedule: Thursdays 9AM - 12PM' 
    },
  });
  console.log('✅ Course created:', courseAI.code);

  const courseBITP = await prisma.course.upsert({
    where: { code: 'BITP' },
    update: {},
    create: { 
      code: 'BITP', 
      name: 'BITP', 
      description: 'IPMC Second Semester. Schedule: Fridays 9AM - 12PM' 
    },
  });
  console.log('✅ Course created:', courseBITP.code);

  const coursePBO = await prisma.course.upsert({
    where: { code: 'PBO' },
    update: {},
    create: { 
      code: 'PBO', 
      name: 'PBO', 
      description: 'IPMC Second Semester. Schedule: Tuesdays 9AM - 12PM' 
    },
  });
  console.log('✅ Course created:', coursePBO.code);

  // 3. Enroll Michelle in these courses
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: courseAI.id } },
    update: {},
    create: { userId: student.id, courseId: courseAI.id },
  });
  
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: courseBITP.id } },
    update: {},
    create: { userId: student.id, courseId: courseBITP.id },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: coursePBO.id } },
    update: {},
    create: { userId: student.id, courseId: coursePBO.id },
  });
  console.log('✅ Enrolled Michelle in AI, BITP, and PBO');

  console.log('\n🎉 Done! Login credentials for Michelle:');
  console.log('  Email:    michelle@ipmc.edu');
  console.log('  Password: michelle123\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); console.error(e.stack); process.exit(1); })
  .finally(() => prisma.$disconnect());
