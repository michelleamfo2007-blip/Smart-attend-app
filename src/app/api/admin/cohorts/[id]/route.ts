import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cohort = await prisma.cohorts.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, student_id: true, email: true },
        },
        cohort_classes: {
          include: {
            class: { select: { id: true, name: true, course_code: true, level: true, semester: true } },
          },
        },
      },
    });

    if (!cohort) return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    if (isCrossTenant(auth, cohort.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ cohort });
  } catch (error) {
    console.error('Fetch cohort details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, student_id } = body;

    if (!name || !student_id) {
      return NextResponse.json({ error: 'Name and Index Number are required' }, { status: 400 });
    }

    const cohort = await prisma.cohorts.findUnique({ where: { id } });
    if (!cohort) return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    if (isCrossTenant(auth, cohort.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const institutionId = auth.institutionId || cohort.institution_id;

    const existing = await prisma.users.findFirst({
      where: { student_id, institution_id: institutionId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Index Number is already in use.' }, { status: 400 });
    }

    const newStudent = await prisma.users.create({
      data: {
        name,
        student_id,
        role: 'STUDENT',
        institution_id: institutionId,
        cohort_id: cohort.id,
      },
    });

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Add student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
