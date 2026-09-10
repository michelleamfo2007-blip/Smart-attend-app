import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

async function getUserId() {
  const headersList = await headers();
  return headersList.get('x-user-id');
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const inviteCode = String(body.inviteCode || body.invite_code || '').trim().toUpperCase();
    if (!inviteCode) {
      return NextResponse.json({ error: 'Class invite code is required' }, { status: 400 });
    }

    const student = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, role: true, institution_id: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can join a class' }, { status: 403 });
    }

    const classItem = await prisma.classes.findFirst({
      where: { invite_code: inviteCode },
      include: {
        lecturer: { select: { id: true, name: true } },
      },
    });

    if (!classItem) {
      return NextResponse.json({ error: 'Invalid class invite code' }, { status: 404 });
    }

    if (
      student.institution_id &&
      classItem.institution_id &&
      student.institution_id !== classItem.institution_id
    ) {
      return NextResponse.json({ error: 'This class belongs to a different school' }, { status: 403 });
    }

    const existing = await prisma.enrollments.findFirst({
      where: { student_id: student.id, class_id: classItem.id },
    });

    if (existing) {
      return NextResponse.json({
        alreadyJoined: true,
        message: 'You are already in this class',
        class: classItem,
      });
    }

    await prisma.enrollments.create({
      data: {
        student_id: student.id,
        class_id: classItem.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Joined ${classItem.name}`,
      class: classItem,
    }, { status: 201 });
  } catch (error) {
    console.error('Join class error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
