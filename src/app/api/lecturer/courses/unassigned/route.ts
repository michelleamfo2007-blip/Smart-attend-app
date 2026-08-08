import { NextResponse } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'LECTURER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch courses that belong to the lecturer's institution and have NO lecturer assigned
    const courses = await prisma.classes.findMany({
      where: { 
        lecturer_id: null,
        institution_id: payload.institutionId as string
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
