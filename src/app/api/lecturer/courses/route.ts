import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    const userId = payload?.userId as string;

    if (!userId || !institutionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await prisma.classes.findMany({
      where: {
        lecturer_id: userId,
        institution_id: institutionId,
      },
      include: {
        sessions: {
          where: { lecturer_id: userId, status: 'active' },
          take: 1,
        },
        records: true, // Use records as a proxy for enrollments
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
    const token = (await cookies()).get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    const userId = payload?.userId as string;

    if (!userId || !institutionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, level, semester } = await req.json();

    if (!name || !level || !semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique 6-character alphanumeric invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newClass = await prisma.classes.create({
      data: {
        name,
        level,
        semester,
        lecturer_id: userId,
        invite_code,
        institution_id: institutionId,
      }
    });

    // Auto-enroll existing students matching level and semester within the same institution
    const matchingStudents = await prisma.users.findMany({
      where: { role: 'STUDENT', level, semester, institution_id: institutionId }
    });

    if (matchingStudents.length > 0) {
      await prisma.enrollments.createMany({
        data: matchingStudents.map(student => ({
          student_id: student.id,
          class_id: newClass.id
        })),
        skipDuplicates: true
      });
    }

    return NextResponse.json({ course: newClass }, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
