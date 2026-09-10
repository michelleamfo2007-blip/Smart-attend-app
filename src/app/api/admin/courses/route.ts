import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const whereClause = auth.institutionId ? { institution_id: auth.institutionId } : {};

    const courses = await prisma.classes.findMany({
      where: whereClause,
      include: {
        lecturer: { select: { id: true, name: true, email: true } },
        records: true,
        sessions: { orderBy: { created_at: 'desc' } },
        _count: {
          select: { sessions: true },
        },
      },
    });
    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, lecturer_id, level, semester, schedule_time, invite_code } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const course = await prisma.classes.create({
      data: {
        name,
        lecturer_id: lecturer_id || null,
        level,
        semester,
        schedule_time,
        invite_code: invite_code || Math.random().toString(36).substring(2, 8).toUpperCase(),
        institution_id: auth.institutionId,
      },
      include: {
        lecturer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Class constraint failed' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
