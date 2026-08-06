const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRole() {
  // First find the user
  const user = await prisma.users.findFirst({
    where: { 
      OR: [
        { email: { contains: 'devwithmercedes' } },
        { name: { contains: 'devwithmercedes' } }
      ]
    }
  });

  if (user) {
    await prisma.users.update({
      where: { id: user.id },
      data: { role: 'LECTURER' }
    });
    console.log('Successfully updated role for:', user.email, 'to LECTURER');
  } else {
    console.log('User not found.');
  }
}

updateRole().catch(console.error).finally(() => prisma.$disconnect());
