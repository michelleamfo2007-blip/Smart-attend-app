import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let userIds: string[] | undefined;
    if (auth.institutionId) {
      const tenantUsers = await prisma.users.findMany({
        where: { institution_id: auth.institutionId },
        select: { id: true },
      });
      userIds = tenantUsers.map((user) => user.id);
    }

    const logs = await prisma.audit_logs.findMany({
      where: userIds ? { user_id: { in: userIds } } : undefined,
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
