const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting auto-enrollment...');

  const students = await prisma.users.findMany({
    where: { role: 'STUDENT' }
  });
  console.log(`Found ${students.length} students.`);

  const classes = await prisma.classes.findMany();
  console.log(`Found ${classes.length} classes.`);

  let enrollmentsCreated = 0;

  for (const student of students) {
    if (!student.level || !student.semester) continue;

    const matchingClasses = classes.filter(c => c.level === student.level && c.semester === student.semester);

    for (const cls of matchingClasses) {
      try {
        await prisma.enrollments.upsert({
          where: {
            student_id_class_id: {
              student_id: student.id,
              class_id: cls.id,
            }
          },
          update: {},
          create: {
            student_id: student.id,
            class_id: cls.id,
          }
        });
        enrollmentsCreated++;
      } catch (err) {
        console.error(`Error enrolling student ${student.id} in class ${cls.id}:`, err.message);
      }
    }
  }

  console.log(`Successfully created ${enrollmentsCreated} enrollments.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
