import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    const userId = payload?.userId as string;

    if (!userId || !institutionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch catalogue modules (classes where lecturer is null)
    const catalogue = await prisma.classes.findMany({
      where: {
        institution_id: institutionId,
        lecturer_id: null,
      },
      include: {
        programme: {
          include: {
            department: {
              include: {
                college: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ catalogue });
  } catch (error) {
    console.error('Fetch catalogue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
