import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding University of Ghana data...');

  // 1. Create or Find Institution
  let ug = await prisma.institutions.findFirst({
    where: { name: 'University of Ghana' }
  });

  if (!ug) {
    ug = await prisma.institutions.create({
      data: {
        name: 'University of Ghana',
        domain: 'ug.edu.gh',
        invite_code: 'UG-2026',
        status: 'active'
      }
    });
    console.log('Created University of Ghana');
  }

  // 2. Create College
  let cbas = await prisma.colleges.findFirst({
    where: { name: 'College of Basic and Applied Sciences', institution_id: ug.id }
  });

  if (!cbas) {
    cbas = await prisma.colleges.create({
      data: {
        name: 'College of Basic and Applied Sciences',
        institution_id: ug.id
      }
    });
    console.log('Created CBAS');
  }

  // 3. Create Department
  let csDept = await prisma.departments.findFirst({
    where: { name: 'Department of Computer Science', college_id: cbas.id }
  });

  if (!csDept) {
    csDept = await prisma.departments.create({
      data: {
        name: 'Department of Computer Science',
        college_id: cbas.id
      }
    });
    console.log('Created CS Department');
  }

  // 4. Create Programme
  let bscCS = await prisma.programmes.findFirst({
    where: { name: 'BSc Computer Science', department_id: csDept.id }
  });

  if (!bscCS) {
    bscCS = await prisma.programmes.create({
      data: {
        name: 'BSc Computer Science',
        department_id: csDept.id
      }
    });
    console.log('Created BSc Computer Science Programme');
  }

  // 5. Create Courses
  const coursesToSeed = [
    {
      course_code: 'CSCD 201',
      name: 'Data Structures and Algorithms', // Modified to user's example
      level: '200',
      semester: '1',
      credit_hours: 3,
      is_compulsory: true
    },
    {
      course_code: 'CSCD 205',
      name: 'Programming I',
      level: '200',
      semester: '1',
      credit_hours: 3,
      is_compulsory: true
    },
    {
      course_code: 'CSCD 211',
      name: 'Computer Architecture',
      level: '200',
      semester: '1',
      credit_hours: 3,
      is_compulsory: true
    },
    {
      course_code: 'UGRC 210',
      name: 'Academic Writing II',
      level: '200',
      semester: '1',
      credit_hours: 3,
      is_compulsory: true
    }
  ];

  for (const courseData of coursesToSeed) {
    const existing = await prisma.classes.findFirst({
      where: {
        course_code: courseData.course_code,
        institution_id: ug.id,
        programme_id: bscCS.id
      }
    });

    if (!existing) {
      // Create course
      await prisma.classes.create({
        data: {
          institution_id: ug.id,
          name: courseData.name,
          level: courseData.level,
          semester: courseData.semester,
          course_code: courseData.course_code,
          credit_hours: courseData.credit_hours,
          is_compulsory: courseData.is_compulsory,
          programme_id: bscCS.id,
        }
      });
      console.log(`Created course: ${courseData.course_code}`);
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
