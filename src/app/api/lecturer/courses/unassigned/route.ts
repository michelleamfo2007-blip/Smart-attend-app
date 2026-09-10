import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId || auth.userRole !== 'LECTURER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ courses: [] });
    }

    const courses = await prisma.classes.findMany({
      where: {
        lecturer_id: null,
        institution_id: auth.institutionId,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
