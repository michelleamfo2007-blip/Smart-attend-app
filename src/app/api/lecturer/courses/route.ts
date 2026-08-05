import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await prisma.classes.findMany({
      where: {
        lecturer_id: userId,
      },
      include: {
        sessions: {
          where: { lecturer_id: userId, status: 'active' },
          take: 1,
        },
        records: true, // Use records as a proxy for enrollments
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
