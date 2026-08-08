const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding University of Ghana Catalogue...');

  // Find the Super Admin's institution
  const admin = await prisma.users.findFirst({
    where: { role: 'ADMIN', name: { contains: 'Margaret' } }
  });

  if (!admin || !admin.institution_id) {
    console.log('Could not find Margaret or her institution.');
    return;
  }

  const institutionId = admin.institution_id;

  // 1. Create College
  let college = await prisma.colleges.findFirst({ where: { name: 'College of Basic and Applied Sciences', institution_id: institutionId } });
  if (!college) {
    college = await prisma.colleges.create({
      data: { name: 'College of Basic and Applied Sciences', institution_id: institutionId }
    });
  }

  // 2. Create Department
  let dept = await prisma.departments.findFirst({ where: { name: 'Department of Computer Science', college_id: college.id } });
  if (!dept) {
    dept = await prisma.departments.create({
      data: { name: 'Department of Computer Science', college_id: college.id }
    });
  }

  // 3. Create Programme
  let prog = await prisma.programmes.findFirst({ where: { name: 'BSc Computer Science', department_id: dept.id } });
  if (!prog) {
    prog = await prisma.programmes.create({
      data: { name: 'BSc Computer Science', department_id: dept.id }
    });
  }

  // 4. Create Courses
  const courses = [
    { code: 'CSCD 201', name: 'Information Systems', credits: 3, level: '200', sem: '1', comp: true },
    { code: 'CSCD 205', name: 'Programming I (C++)', credits: 3, level: '200', sem: '1', comp: true },
    { code: 'CSCD 211', name: 'Computer Organization and Architecture', credits: 3, level: '200', sem: '1', comp: true },
    { code: 'CSCD 202', name: 'Programming II (Java)', credits: 3, level: '200', sem: '2', comp: true },
    { code: 'CSCD 212', name: 'Computer Ethics', credits: 1, level: '200', sem: '2', comp: true },
    { code: 'CSCD 214', name: 'Digital Electronics', credits: 2, level: '200', sem: '2', comp: true },
    { code: 'CSCD 313', name: 'Database Management Systems', credits: 3, level: '300', sem: '1', comp: true },
    { code: 'CSCD 311', name: 'Web Technologies and Development', credits: 3, level: '300', sem: '1', comp: true },
    { code: 'CSCD 315', name: 'Operating Systems', credits: 3, level: '300', sem: '1', comp: true },
    { code: 'CSCD 312', name: 'Introduction to Artificial Intelligence', credits: 3, level: '300', sem: '2', comp: true },
    { code: 'CSCD 314', name: 'Software Engineering', credits: 3, level: '300', sem: '2', comp: true },
    { code: 'CSCD 415', name: 'Compilers', credits: 3, level: '400', sem: '1', comp: true },
    { code: 'CSCD 417', name: 'Theory and Survey of Programming Languages', credits: 3, level: '400', sem: '1', comp: true },
    { code: 'CSCD 416', name: 'System Programming', credits: 3, level: '400', sem: '2', comp: true },
    { code: 'CSCD 418', name: 'Computer Systems Security', credits: 3, level: '400', sem: '2', comp: true },
    { code: 'CSCD 422', name: 'Human Computer Interaction', credits: 3, level: '400', sem: '2', comp: true },
  ];

  for (const c of courses) {
    let course = await prisma.classes.findFirst({
      where: { course_code: c.code, programme_id: prog.id }
    });
    if (!course) {
      await prisma.classes.create({
        data: {
          name: c.name,
          course_code: c.code,
          credit_hours: c.credits,
          is_compulsory: c.comp,
          level: c.level,
          semester: c.sem,
          programme_id: prog.id,
          institution_id: institutionId
        }
      });
      console.log(`Created ${c.code}`);
    } else {
      console.log(`${c.code} already exists.`);
    }
  }

  console.log('Successfully seeded UG Catalogue!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
