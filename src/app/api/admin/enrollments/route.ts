import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: enroll a student or assign a lecturer to a course
export async function POST(req: Request) {
  try {
    const { userId, courseId } = await req.json();
    if (!userId || !courseId) {
      return NextResponse.json({ error: 'userId and courseId are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can be enrolled' }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId },
      include: { user: { select: { id: true, name: true, email: true } }, course: true },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Student already enrolled in this course' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
