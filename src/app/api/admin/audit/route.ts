import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { ATTENDANCE_AUDIT_ACTIONS } from '@/lib/audit';

export async function GET(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const action = (searchParams.get('action') || '').trim();
    const result = (searchParams.get('result') || '').trim();
    const category = (searchParams.get('category') || '').trim(); // attendance | all
    const take = Math.min(Number(searchParams.get('limit') || 200), 500);

    const where: any = {};

    if (auth.institutionId) {
      where.OR = [
        { institution_id: auth.institutionId },
        {
          institution_id: null,
          user: { institution_id: auth.institutionId },
        },
        {
          institution_id: null,
          user_id: null,
          details: { contains: auth.institutionId },
        },
      ];
    }

    if (action) where.action = action;
    if (result) where.result = result;
    if (category === 'attendance') {
      where.action = { in: [...ATTENDANCE_AUDIT_ACTIONS] };
    }
    if (q) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { action: { contains: q, mode: 'insensitive' } },
            { details: { contains: q, mode: 'insensitive' } },
            { role: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const logs = await prisma.audit_logs.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { created_at: 'desc' },
      take,
    });

    const openFlags = auth.institutionId
      ? await prisma.attendance_flags.count({
          where: { institution_id: auth.institutionId, status: 'open' },
        })
      : await prisma.attendance_flags.count({ where: { status: 'open' } });

    return NextResponse.json({
      logs,
      summary: {
        openFlags,
        returned: logs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
