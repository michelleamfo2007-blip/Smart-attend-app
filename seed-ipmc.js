const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding IPMC Data...');

  // 1. Wipe out existing catalogue and cohorts
  await prisma.attendance_records.deleteMany({});
  await prisma.attendance_sessions.deleteMany({});
  await prisma.enrollments.deleteMany({});
  await prisma.cohort_classes.deleteMany({});
  await prisma.classes.deleteMany({});
  await prisma.cohorts.deleteMany({});
  await prisma.programmes.deleteMany({});
  await prisma.departments.deleteMany({});
  await prisma.colleges.deleteMany({});
  
  // Clean out users and institutions
  await prisma.users.deleteMany({});
  await prisma.institutions.deleteMany({});

  // 2. Create IPMC Institution
  const ipmc = await prisma.institutions.create({
    data: {
      name: 'IPMC Ghana',
      domain: 'ipmcghana.com',
      status: 'active',
      subscription_plan: 'premium',
      invite_code: 'IPMC-2026'
    }
  });
  console.log(`Created Institution: ${ipmc.name} (Code: ${ipmc.invite_code})`);

  // 3. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.users.create({
    data: {
      name: 'IPMC Admin',
      email: 'admin@ipmcghana.com',
      password: adminPassword,
      role: 'ADMIN',
      institution_id: ipmc.id
    }
  });
  console.log(`Created Admin: ${admin.email}`);

  // Create Lecturer User
  const lecturerPassword = await bcrypt.hash('lecturer123', 10);
  const lecturer = await prisma.users.create({
    data: {
      name: 'Dr. Kwame',
      email: 'kwame@ipmcghana.com',
      password: lecturerPassword,
      role: 'LECTURER',
      institution_id: ipmc.id
    }
  });
  console.log(`Created Lecturer: ${lecturer.email}`);

  // 4. Seed IPMC Catalogue (Colleges -> Departments -> Programmes -> Courses)
  const catalogueData = [
    {
      college: 'School of Computing',
      departments: [
        {
          name: 'IT & Software Engineering',
          progs: [
            {
              name: 'BSc Computing and Information Systems',
              courses: [
                { code: 'CIS 101', name: 'Introduction to Information Systems', credits: 3, level: '100', sem: '1' },
                { code: 'CIS 102', name: 'Programming Foundations (Python)', credits: 3, level: '100', sem: '1' },
                { code: 'CIS 201', name: 'Database Management Systems', credits: 3, level: '200', sem: '1' },
                { code: 'CIS 301', name: 'Software Engineering', credits: 3, level: '300', sem: '1' }
              ]
            },
            {
              name: 'NCC Education Level 4 Diploma (Computing)',
              courses: [
                { code: 'NCC 401', name: 'Skills for Computing', credits: 3, level: '4', sem: '1' },
                { code: 'NCC 402', name: 'Computer Networks', credits: 3, level: '4', sem: '1' },
                { code: 'NCC 403', name: 'Computer Systems', credits: 3, level: '4', sem: '1' },
                { code: 'NCC 404', name: 'Designing and Developing a Website', credits: 3, level: '4', sem: '1' }
              ]
            }
          ]
        },
        {
          name: 'Professional Certifications',
          progs: [
            {
              name: 'Cisco Networking (CCNA)',
              courses: [
                { code: 'CCNA 1', name: 'Introduction to Networks', credits: 3, level: '1', sem: '1' },
                { code: 'CCNA 2', name: 'Switching, Routing, and Wireless Essentials', credits: 3, level: '1', sem: '1' }
              ]
            }
          ]
        }
      ]
    },
    {
      college: 'School of Business',
      departments: [
        {
          name: 'Business Administration',
          progs: [
            {
              name: 'BSc Business Management',
              courses: [
                { code: 'BUS 101', name: 'Business Environment', credits: 3, level: '100', sem: '1' },
                { code: 'BUS 102', name: 'Introduction to Marketing', credits: 3, level: '100', sem: '1' },
                { code: 'BUS 201', name: 'Financial Accounting', credits: 3, level: '200', sem: '1' },
                { code: 'BUS 301', name: 'Strategic Management', credits: 3, level: '300', sem: '1' }
              ]
            },
            {
              name: 'MBA (Master of Business Administration)',
              courses: [
                { code: 'MBA 501', name: 'Corporate Finance', credits: 4, level: '500', sem: '1' },
                { code: 'MBA 502', name: 'Global Business Strategy', credits: 4, level: '500', sem: '1' }
              ]
            }
          ]
        }
      ]
    }
  ];

  for (const c of catalogueData) {
    let college = await prisma.colleges.create({ data: { name: c.college, institution_id: ipmc.id } });

    for (const d of c.departments) {
      let dept = await prisma.departments.create({ data: { name: d.name, college_id: college.id } });

      for (const p of d.progs) {
        let prog = await prisma.programmes.create({ data: { name: p.name, department_id: dept.id } });

        for (const course of p.courses) {
          await prisma.classes.create({
            data: {
              name: course.name,
              course_code: course.code,
              credit_hours: course.credits,
              is_compulsory: true,
              level: course.level,
              semester: course.sem,
              programme_id: prog.id,
              institution_id: ipmc.id,
              lecturer_id: lecturer.id,
              invite_code: `IPMC-${course.code.replace(' ', '')}`,
              schedule_time: 'Mondays 10:00 AM'
            }
          });
          console.log(`Created Course: ${course.code} - ${course.name}`);
        }
      }
    }
  }

  console.log('\n--- IPMC SEED COMPLETE ---');
  console.log('Login with:');
  console.log('Admin: admin@ipmcghana.com / admin123');
  console.log('Lecturer: kwame@ipmcghana.com / lecturer123');
  console.log('Institution Invite Code for Students:', ipmc.invite_code);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
