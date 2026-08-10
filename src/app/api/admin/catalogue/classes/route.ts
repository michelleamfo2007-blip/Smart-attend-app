import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, courseCode, credits, level, semester, isCompulsory, programmeId } = await req.json();

    if (!name || !courseCode || !programmeId) {
      return NextResponse.json({ error: 'Name, Course Code, and Programme ID are required' }, { status: 400 });
    }

    const newClass = await prisma.classes.create({
      data: {
        name,
        course_code: courseCode,
        credit_hours: parseInt(credits) || 3,
        level: level || '100',
        semester: semester || '1',
        is_compulsory: isCompulsory !== undefined ? isCompulsory : true,
        programme_id: programmeId,
        institution_id: payload.institutionId as string
      }
    });

    return NextResponse.json(newClass);
  } catch (error: any) {
    console.error('Error creating class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
