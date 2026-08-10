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

    const { name, collegeId } = await req.json();

    if (!name || !collegeId) {
      return NextResponse.json({ error: 'Name and College ID are required' }, { status: 400 });
    }

    const dept = await prisma.departments.create({
      data: {
        name,
        college_id: collegeId,
      }
    });

    return NextResponse.json(dept);
  } catch (error: any) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
