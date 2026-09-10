import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.users.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institution_id: true,
        level: true,
        semester: true,
        student_id: true,
        staff_id: true,
        device_id: true,
        institution: { select: { id: true, name: true } },
        can_mark_attendance: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const user = await prisma.users.update({
      where: { id: auth.userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institution_id: true,
        level: true,
        semester: true,
        student_id: true,
        institution: { select: { id: true, name: true } },
        can_mark_attendance: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Me update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
