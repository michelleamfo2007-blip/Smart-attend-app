const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Full University of Ghana Catalogue...');

  const admin = await prisma.users.findFirst({
    where: { role: 'ADMIN', name: { contains: 'Margaret' } }
  });

  if (!admin || !admin.institution_id) {
    console.log('Could not find Margaret or her institution.');
    return;
  }
  const institutionId = admin.institution_id;

  const data = [
    {
      college: 'College of Humanities',
      departments: [
        {
          name: 'University of Ghana Business School',
          progs: [
            {
              name: 'BSc Administration (Accounting)',
              courses: [
                { code: 'UGBS 101', name: 'Introduction to Business', credits: 3, level: '100', sem: '1' },
                { code: 'UGBS 201', name: 'Microeconomics and Business', credits: 3, level: '200', sem: '1' },
                { code: 'ACCT 301', name: 'Financial Accounting I', credits: 3, level: '300', sem: '1' },
                { code: 'ACCT 401', name: 'Auditing and Assurance Services', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        },
        {
          name: 'Faculty of Law',
          progs: [
            {
              name: 'Bachelor of Laws (LLB)',
              courses: [
                { code: 'FLAW 101', name: 'Ghana Legal System', credits: 3, level: '100', sem: '1' },
                { code: 'FLAW 201', name: 'Law of Contract I', credits: 3, level: '200', sem: '1' },
                { code: 'FLAW 301', name: 'Criminal Law I', credits: 3, level: '300', sem: '1' },
                { code: 'FLAW 401', name: 'Jurisprudence I', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        },
        {
          name: 'Department of Economics',
          progs: [
            {
              name: 'BA Economics',
              courses: [
                { code: 'ECON 101', name: 'Introduction to Economics I', credits: 3, level: '100', sem: '1' },
                { code: 'ECON 211', name: 'Elements of Economics I', credits: 3, level: '200', sem: '1' },
                { code: 'ECON 311', name: 'Microeconomic Theory I', credits: 3, level: '300', sem: '1' },
                { code: 'ECON 401', name: 'Economic Theory I', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        },
        {
          name: 'Department of Political Science',
          progs: [
            {
              name: 'BA Political Science',
              courses: [
                { code: 'POLI 111', name: 'Introduction to the Study of Political Science', credits: 3, level: '100', sem: '1' },
                { code: 'POLI 211', name: 'Introduction to Development Studies', credits: 3, level: '200', sem: '1' },
                { code: 'POLI 341', name: 'Ancient and Medieval Political Thought', credits: 3, level: '300', sem: '1' },
                { code: 'POLI 441', name: 'Political Economy of Africa\'s Development', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        }
      ]
    },
    {
      college: 'College of Health Sciences',
      departments: [
        {
          name: 'University of Ghana Medical School',
          progs: [
            {
              name: 'Bachelor of Medicine and Bachelor of Surgery (MBChB)',
              courses: [
                { code: 'SMED 111', name: 'Anatomy I', credits: 4, level: '100', sem: '1' },
                { code: 'SMED 211', name: 'Physiology I', credits: 4, level: '200', sem: '1' },
                { code: 'SMED 311', name: 'Pathology I', credits: 4, level: '300', sem: '1' },
                { code: 'SMED 411', name: 'Clinical Pharmacology', credits: 4, level: '400', sem: '1' }
              ]
            }
          ]
        },
        {
          name: 'School of Pharmacy',
          progs: [
            {
              name: 'Doctor of Pharmacy (PharmD)',
              courses: [
                { code: 'PHAR 111', name: 'Introduction to Pharmacy', credits: 2, level: '100', sem: '1' },
                { code: 'PHAR 211', name: 'Pharmaceutics I', credits: 3, level: '200', sem: '1' },
                { code: 'PHAR 311', name: 'Pharmacognosy', credits: 3, level: '300', sem: '1' },
                { code: 'PHAR 411', name: 'Pharmacology and Toxicology', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        }
      ]
    },
    {
      college: 'College of Education',
      departments: [
        {
          name: 'Department of Information Studies',
          progs: [
            {
              name: 'BA Information Studies',
              courses: [
                { code: 'INFS 111', name: 'Information in Society', credits: 3, level: '100', sem: '1' },
                { code: 'INFS 211', name: 'Introduction to Information Technology', credits: 3, level: '200', sem: '1' },
                { code: 'INFS 321', name: 'Information Sources', credits: 3, level: '300', sem: '1' },
                { code: 'INFS 421', name: 'Automation of Information Systems', credits: 3, level: '400', sem: '1' }
              ]
            }
          ]
        }
      ]
    }
  ];

  for (const c of data) {
    let college = await prisma.colleges.findFirst({ where: { name: c.college, institution_id: institutionId } });
    if (!college) {
      college = await prisma.colleges.create({ data: { name: c.college, institution_id: institutionId } });
    }

    for (const d of c.departments) {
      let dept = await prisma.departments.findFirst({ where: { name: d.name, college_id: college.id } });
      if (!dept) {
        dept = await prisma.departments.create({ data: { name: d.name, college_id: college.id } });
      }

      for (const p of d.progs) {
        let prog = await prisma.programmes.findFirst({ where: { name: p.name, department_id: dept.id } });
        if (!prog) {
          prog = await prisma.programmes.create({ data: { name: p.name, department_id: dept.id } });
        }

        for (const course of p.courses) {
          let existingCourse = await prisma.classes.findFirst({ where: { course_code: course.code, programme_id: prog.id } });
          if (!existingCourse) {
            await prisma.classes.create({
              data: {
                name: course.name,
                course_code: course.code,
                credit_hours: course.credits,
                is_compulsory: true,
                level: course.level,
                semester: course.sem,
                programme_id: prog.id,
                institution_id: institutionId
              }
            });
            console.log(`Created ${course.code}: ${course.name}`);
          }
        }
      }
    }
  }

  console.log('Successfully seeded Full University of Ghana Catalogue!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
