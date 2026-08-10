const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const users = await prisma.users.findMany({ 
    where: { role: 'LECTURER' }, 
    select: { email: true, name: true, institution: { select: { name: true } } } 
  }); 
  console.log(users); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
