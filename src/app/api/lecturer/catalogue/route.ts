import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId || auth.userRole !== 'LECTURER' || !auth.institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const catalogue = await prisma.classes.findMany({
      where: {
        institution_id: auth.institutionId,
        lecturer_id: null,
      },
      include: {
        programme: {
          include: {
            department: {
              include: {
                college: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({ catalogue });
  } catch (error) {
    console.error('Fetch catalogue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
