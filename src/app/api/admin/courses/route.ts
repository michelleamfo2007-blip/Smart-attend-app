import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const whereClause = payload.institutionId ? { institution_id: payload.institutionId as string } : {};

    const courses = await prisma.classes.findMany({
      where: whereClause,
      include: {
        lecturer: true,
        records: true, 
        sessions: { orderBy: { created_at: 'desc' } }, 
        _count: {
          select: { sessions: true }
        }
      }
    });
    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, lecturer_id, level, semester, schedule_time } = await req.json();
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
        institution_id: payload.institutionId as string | null
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
