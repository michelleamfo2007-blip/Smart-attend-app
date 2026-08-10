import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const cohort = await prisma.cohorts.findUnique({
      where: { id: params.id, institution_id: user.institutionId },
      include: {
        users: {
          select: { id: true, name: true, student_id: true, email: true }
        },
        cohort_classes: {
          include: {
            class: { select: { id: true, name: true, course_code: true, level: true, semester: true } }
          }
        }
      }
    });

    if (!cohort) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    return NextResponse.json({ cohort });
  } catch (error) {
    console.error('Fetch cohort details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, student_id } = body;

    if (!name || !student_id) {
      return NextResponse.json({ error: 'Name and Index Number are required' }, { status: 400 });
    }

    // Ensure cohort belongs to this admin's institution
    const cohort = await prisma.cohorts.findUnique({
      where: { id: params.id, institution_id: user.institutionId }
    });

    if (!cohort) return NextResponse.json({ error: 'Program not found' }, { status: 404 });

    // Check if index number exists
    const existing = await prisma.users.findFirst({
      where: { student_id, institution_id: user.institutionId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Index Number is already in use.' }, { status: 400 });
    }

    // Create the pre-loaded student
    const newStudent = await prisma.users.create({
      data: {
        name,
        student_id,
        role: 'STUDENT',
        institution_id: user.institutionId,
        cohort_id: cohort.id
      }
    });

    return NextResponse.json({ success: true, student: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Add student error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
