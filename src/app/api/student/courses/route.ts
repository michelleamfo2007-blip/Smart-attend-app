import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getStudentClasses } from '@/lib/student';
import { headers } from 'next/headers';

async function getUserId() {
  const headersList = await headers();
  return headersList.get('x-user-id');
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classes = await getStudentClasses(userId);
    return NextResponse.json({
      classes,
      enrollments: classes.map((course) => ({ course })),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
