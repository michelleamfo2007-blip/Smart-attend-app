import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all courses
export async function GET() {
  try {
    const courses = await prisma.classes.findMany({
      include: {
        lecturer: true,
        records: true, 
        sessions: { orderBy: { created_at: 'desc' } }, // Get all sessions
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

// POST: create a course
export async function POST(req: Request) {
  try {
    const { name, lecturer_id, level, semester, schedule_time } = await req.json();
    if (!name || !lecturer_id) {
      return NextResponse.json({ error: 'Name and lecturer are required' }, { status: 400 });
    }

    const course = await prisma.classes.create({
      data: { name, lecturer_id, level, semester, schedule_time },
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
