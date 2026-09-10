import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const institutionId = auth.institutionId || undefined;

    const [users, lecturers, students, classes, sessions, records] = await Promise.all([
      prisma.users.count({ where: institutionId ? { institution_id: institutionId } : {} }),
      prisma.users.count({ where: { ...(institutionId ? { institution_id: institutionId } : {}), role: 'LECTURER' } }),
      prisma.users.count({ where: { ...(institutionId ? { institution_id: institutionId } : {}), role: 'STUDENT' } }),
      prisma.classes.count({ where: institutionId ? { institution_id: institutionId } : {} }),
      prisma.attendance_sessions.findMany({
        where: institutionId ? { class: { institution_id: institutionId } } : {},
        select: { id: true },
      }),
      prisma.attendance_records.findMany({
        where: institutionId ? { class: { institution_id: institutionId } } : {},
        select: { student_id: true },
      }),
    ]);

    const studentRows = await prisma.users.findMany({
      where: { ...(institutionId ? { institution_id: institutionId } : {}), role: 'STUDENT' },
      select: { id: true, name: true },
    });

    const totalSessions = sessions.length;
    const atRiskStudents =
      totalSessions >= 3
        ? studentRows
            .map((student) => {
              const attendedCount = records.filter((record) => record.student_id === student.id).length;
              const rate = totalSessions > 0 ? (attendedCount / totalSessions) * 100 : 100;
              return { ...student, rate, attendedCount };
            })
            .filter((student) => student.rate < 75)
        : [];

    return NextResponse.json({
      stats: { users, lecturers, students, classes },
      atRiskStudents,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
