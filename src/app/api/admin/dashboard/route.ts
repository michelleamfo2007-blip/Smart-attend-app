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
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [users, lecturers, students, classes, sessions, records, failedCheckins24h, deviceAlerts24h] =
      await Promise.all([
        prisma.users.count({ where: institutionId ? { institution_id: institutionId } : {} }),
        prisma.users.count({
          where: { ...(institutionId ? { institution_id: institutionId } : {}), role: 'LECTURER' },
        }),
        prisma.users.count({
          where: { ...(institutionId ? { institution_id: institutionId } : {}), role: 'STUDENT' },
        }),
        prisma.classes.count({ where: institutionId ? { institution_id: institutionId } : {} }),
        prisma.attendance_sessions.findMany({
          where: institutionId ? { class: { institution_id: institutionId } } : {},
          select: { id: true },
        }),
        prisma.attendance_records.findMany({
          where: institutionId ? { class: { institution_id: institutionId } } : {},
          select: { student_id: true },
        }),
        prisma.audit_logs.count({
          where: {
            action: 'ATTENDANCE_REJECTED',
            created_at: { gte: since },
            ...(institutionId
              ? { user: { institution_id: institutionId } }
              : {}),
          },
        }),
        prisma.audit_logs.count({
          where: {
            action: {
              in: ['DEVICE_MISMATCH', 'DEVICE_FINGERPRINT_MISMATCH', 'DEVICE_CONFLICT'],
            },
            created_at: { gte: since },
            ...(institutionId
              ? { user: { institution_id: institutionId } }
              : {}),
          },
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

    const recentFailures = await prisma.audit_logs.findMany({
      where: {
        action: {
          in: [
            'ATTENDANCE_REJECTED',
            'DEVICE_MISMATCH',
            'DEVICE_FINGERPRINT_MISMATCH',
            'DEVICE_CONFLICT',
          ],
        },
        created_at: { gte: since },
        ...(institutionId ? { user: { institution_id: institutionId } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 8,
      select: {
        id: true,
        action: true,
        details: true,
        created_at: true,
        user: { select: { name: true, student_id: true } },
      },
    });

    return NextResponse.json({
      stats: {
        users,
        lecturers,
        students,
        classes,
        failedCheckins24h,
        deviceAlerts24h,
      },
      atRiskStudents,
      recentFailures,
      monitoring: {
        healthUrl: '/api/health',
        hint: 'Point UptimeRobot or Better Stack at GET /api/health on your domain.',
      },
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
