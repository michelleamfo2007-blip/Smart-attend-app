import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // A student is considered "enrolled" if they have at least one attendance record for the class.
    const records = await prisma.attendance_records.findMany({
      where: { student_id: userId },
      select: {
        class: {
          include: {
            sessions: {
              where: { status: 'active' },
              take: 1,
            },
          },
        },
      },
      distinct: ['class_id'],
    });

    const enrollments = records.map(r => ({ course: r.class }));

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
