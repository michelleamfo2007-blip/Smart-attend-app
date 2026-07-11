import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all courses
export async function GET() {
  try {
    const courses = await prisma.course.findMany({
      include: {
        enrollments: true,
        sessions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: create a course
export async function POST(req: Request) {
  try {
    const { code, name, description } = await req.json();
    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: { code: code.toUpperCase(), name, description },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Course code already exists' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
