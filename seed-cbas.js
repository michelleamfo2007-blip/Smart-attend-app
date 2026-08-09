const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CBAS Catalogue...');

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

  // 2. Departments
  const departmentsData = [
    { name: 'Department of Computer Science', prog: 'BSc Computer Science' },
    { name: 'Department of Mathematics', prog: 'BSc Mathematics' },
    { name: 'Department of Statistics', prog: 'BSc Statistics' },
    { name: 'Department of Physics', prog: 'BSc Physics' },
    { name: 'Department of Earth Science', prog: 'BSc Earth Science' },
    { name: 'Department of Chemistry', prog: 'BSc Chemistry' },
  ];

  const depts = {};
  const progs = {};

  for (const d of departmentsData) {
    let dept = await prisma.departments.findFirst({ where: { name: d.name, college_id: college.id } });
    if (!dept) {
      dept = await prisma.departments.create({
        data: { name: d.name, college_id: college.id }
      });
    }
    depts[d.name] = dept;

    let prog = await prisma.programmes.findFirst({ where: { name: d.prog, department_id: dept.id } });
    if (!prog) {
      prog = await prisma.programmes.create({
        data: { name: d.prog, department_id: dept.id }
      });
    }
    progs[d.name] = prog;
  }

  // 4. Create Courses
  const courses = [
    // COMPUTER SCIENCE (Level 100 - 400)
    { dept: 'Department of Computer Science', code: 'CSCD 101', name: 'Introduction to Computer Science I', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 102', name: 'Introduction to Computer Science II', credits: 3, level: '100', sem: '2', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 201', name: 'Information Systems', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 205', name: 'Programming I (C++)', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 211', name: 'Computer Organization and Architecture', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 202', name: 'Programming II (Java)', credits: 3, level: '200', sem: '2', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 313', name: 'Database Management Systems', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 311', name: 'Web Technologies and Development', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 314', name: 'Software Engineering', credits: 3, level: '300', sem: '2', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 415', name: 'Compilers', credits: 3, level: '400', sem: '1', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 418', name: 'Computer Systems Security', credits: 3, level: '400', sem: '2', comp: true },
    { dept: 'Department of Computer Science', code: 'CSCD 422', name: 'Human Computer Interaction', credits: 3, level: '400', sem: '2', comp: true },

    // MATHEMATICS
    { dept: 'Department of Mathematics', code: 'MATH 121', name: 'Algebra and Trigonometry', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Mathematics', code: 'MATH 122', name: 'Calculus I', credits: 3, level: '100', sem: '2', comp: true },
    { dept: 'Department of Mathematics', code: 'MATH 221', name: 'Algebra', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Mathematics', code: 'MATH 223', name: 'Calculus II', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Mathematics', code: 'MATH 351', name: 'Linear Algebra', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Mathematics', code: 'MATH 441', name: 'Advanced Calculus', credits: 3, level: '400', sem: '1', comp: true },

    // STATISTICS
    { dept: 'Department of Statistics', code: 'STAT 111', name: 'Introduction to Statistics', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Statistics', code: 'STAT 112', name: 'Elementary Probability', credits: 3, level: '100', sem: '2', comp: true },
    { dept: 'Department of Statistics', code: 'STAT 221', name: 'Introductory Probability I', credits: 3, level: '200', sem: '1', comp: true },
    { dept: 'Department of Statistics', code: 'STAT 331', name: 'Probability Distributions', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Statistics', code: 'STAT 445', name: 'Multivariate Methods', credits: 3, level: '400', sem: '1', comp: true },

    // PHYSICS
    { dept: 'Department of Physics', code: 'PHYS 101', name: 'Practical Physics I', credits: 1, level: '100', sem: '1', comp: true },
    { dept: 'Department of Physics', code: 'PHYS 143', name: 'Mechanics and Thermal Physics', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Physics', code: 'PHYS 205', name: 'Practical Physics III', credits: 1, level: '200', sem: '1', comp: true },
    { dept: 'Department of Physics', code: 'PHYS 344', name: 'Electromagnetism I', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Physics', code: 'PHYS 441', name: 'Quantum Mechanics I', credits: 3, level: '400', sem: '1', comp: true },

    // EARTH SCIENCE
    { dept: 'Department of Earth Science', code: 'EASC 101', name: 'Physical Geology', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Earth Science', code: 'EASC 219', name: 'Practical Earth Science I', credits: 1, level: '200', sem: '1', comp: true },
    { dept: 'Department of Earth Science', code: 'EASC 311', name: 'Igneous and Metamorphic Petrology', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Earth Science', code: 'EASC 441', name: 'Fieldwork I', credits: 3, level: '400', sem: '1', comp: true },

    // CHEMISTRY
    { dept: 'Department of Chemistry', code: 'CHEM 111', name: 'General Chemistry I', credits: 3, level: '100', sem: '1', comp: true },
    { dept: 'Department of Chemistry', code: 'CHEM 112', name: 'General Chemistry II', credits: 3, level: '100', sem: '2', comp: true },
    { dept: 'Department of Chemistry', code: 'CHEM 213', name: 'Physical Chemistry I', credits: 2, level: '200', sem: '1', comp: true },
    { dept: 'Department of Chemistry', code: 'CHEM 341', name: 'Organic Chemistry II', credits: 3, level: '300', sem: '1', comp: true },
    { dept: 'Department of Chemistry', code: 'CHEM 411', name: 'Inorganic Chemistry III', credits: 3, level: '400', sem: '1', comp: true },
  ];

  for (const c of courses) {
    const progId = progs[c.dept].id;
    let course = await prisma.classes.findFirst({
      where: { course_code: c.code, programme_id: progId }
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
          programme_id: progId,
          institution_id: institutionId
        }
      });
      console.log(`Created ${c.code}`);
    } else {
      console.log(`${c.code} already exists.`);
    }
  }

  console.log('Successfully seeded CBAS Catalogue!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
