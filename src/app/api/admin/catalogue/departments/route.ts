import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, collegeId } = await req.json();

    if (!name || !collegeId) {
      return NextResponse.json({ error: 'Name and College ID are required' }, { status: 400 });
    }

    const college = await prisma.colleges.findUnique({ where: { id: collegeId } });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }
    if (isCrossTenant(auth, college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dept = await prisma.departments.create({
      data: {
        name,
        college_id: collegeId,
      },
    });

    return NextResponse.json(dept);
  } catch (error) {
    console.error('Error creating department:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
