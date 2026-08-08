const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.users.findFirst({
      where: { id: '81df205c-f399-480c-ac8e-3880f2683ebb' },
      include: {
        enrollments: {
          include: {
            class: {
              include: {
                sessions: {
                  select: { id: true, created_at: true, status: true }
                }
              }
            }
          }
        },
        records: {
          select: { session_id: true, timestamp: true }
        }
      }
    });
    console.log(JSON.stringify(user, null, 2));
  } catch(e) {
    console.error('Prisma Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
