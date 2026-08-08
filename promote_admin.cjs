const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.users.update({
      where: { email: 'devwithmercedes@gmail.com' },
      data: { role: 'ADMIN' }
    });
    console.log('Successfully promoted user to admin:', user.email);
  } catch (error) {
    console.error('Failed to promote user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
