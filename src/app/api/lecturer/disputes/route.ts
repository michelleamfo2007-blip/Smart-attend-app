import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const myClasses = await prisma.classes.findMany({
      where: { lecturer_id: auth.userId },
      select: { id: true, name: true },
    });

    if (myClasses.length === 0) {
      return NextResponse.json({ disputes: [] });
    }

    const classIds = myClasses.map((cls) => cls.id);
    const classNameById = new Map(myClasses.map((cls) => [cls.id, cls.name]));

    const disputes = await prisma.attendance_disputes.findMany({
      where: { class_id: { in: classIds } },
      orderBy: { created_at: 'desc' },
    });

    const studentIds = [...new Set(disputes.map((dispute) => dispute.student_id))];
    const students = studentIds.length
      ? await prisma.users.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const studentById = new Map(students.map((student) => [student.id, student]));

    const sorted = disputes
      .map((dispute) => {
        const student = studentById.get(dispute.student_id);
        const className = classNameById.get(dispute.class_id) || 'Unknown Class';
        return {
          ...dispute,
          class: { name: className },
          classes: { name: className },
          student,
          users: student,
        };
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    return NextResponse.json({ disputes: sorted });
  } catch (error) {
    console.error('Lecturer disputes GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
