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

    const { name, departmentId } = await req.json();

    if (!name || !departmentId) {
      return NextResponse.json({ error: 'Name and Department ID are required' }, { status: 400 });
    }

    const prog = await prisma.programmes.create({
      data: {
        name,
        department_id: departmentId,
      }
    });

    return NextResponse.json(prog);
  } catch (error: any) {
    console.error('Error creating programme:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
