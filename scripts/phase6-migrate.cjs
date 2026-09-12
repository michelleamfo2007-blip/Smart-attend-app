const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_ROLE_PERMISSIONS = {
  lecturer: {
    view_assigned_classes: true,
    view_attendance: true,
    verify_location: true,
    use_short_code: true,
    manually_mark_students: false,
    edit_attendance: false,
    delete_attendance: false,
    manage_students: false,
    manage_lecturers: false,
    manage_institution: false,
  },
  librarian: {
    view_active_attendance: true,
    verify_students: true,
    staff_assisted_attendance: true,
    view_attendance_history: true,
    flag_suspicious: true,
    edit_attendance: false,
    delete_attendance: false,
    manage_institution: false,
  },
};

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE institutions ADD COLUMN IF NOT EXISTS role_permissions JSONB`
  );
  await prisma.$executeRawUnsafe(
    `UPDATE institutions
     SET role_permissions = $1::jsonb
     WHERE role_permissions IS NULL`,
    JSON.stringify(DEFAULT_ROLE_PERMISSIONS)
  );
  console.log('Phase 6 migration applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
