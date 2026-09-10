import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'College name is required' }, { status: 400 });
    }

    const college = await prisma.colleges.create({
      data: {
        name: name.trim(),
        institution_id: auth.institutionId,
      },
    });

    return NextResponse.json(college, { status: 201 });
  } catch (error) {
    console.error('Error creating college:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
