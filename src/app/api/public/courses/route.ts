import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get('programmeId');
    const level = searchParams.get('level');
    const semester = searchParams.get('semester');

    if (!programmeId || !level || !semester) {
      return NextResponse.json({ error: 'Programme, Level, and Semester are required' }, { status: 400 });
    }

    const courses = await prisma.classes.findMany({
      where: { 
        programme_id: programmeId,
        level: level,
        semester: semester
      },
      select: {
        id: true,
        name: true,
        course_code: true,
        credit_hours: true,
        is_compulsory: true,
        level: true,
        semester: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error('Courses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
