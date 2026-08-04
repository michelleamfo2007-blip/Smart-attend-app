import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

/**
 * GET /api/student/notifications
 * Checks for 3 consecutive absences and returns active notifications
 */
export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find student enrollments and courses
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            sessions: {
              where: { isActive: false },
              orderBy: { startTime: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    // Check each enrolled course for 3 consecutive missed sessions
    for (const enrollment of enrollments) {
      const pastSessions = enrollment.course.sessions;
      if (pastSessions.length >= 3) {
        const last3Sessions = pastSessions.slice(0, 3);
        const last3SessionIds = last3Sessions.map(s => s.id);

        // Check how many of these 3 sessions the student attended
        const attendedCount = await prisma.attendanceRecord.count({
          where: {
            studentId: userId,
            sessionId: { in: last3SessionIds },
          },
        });

        // If attendedCount is 0, student missed 3 consecutive sessions
        if (attendedCount === 0) {
          const warningTitle = `Consecutive Absence Warning: ${enrollment.course.code}`;
          const warningMessage = `You have missed 3 consecutive lectures for ${enrollment.course.name} (${enrollment.course.code}). Please report to the Administrator's Office immediately.`;

          // Check if notification already sent
          const existingNotif = await prisma.notification.findFirst({
            where: {
              userId,
              title: warningTitle,
            },
          });

          if (!existingNotif) {
            await prisma.notification.create({
              data: {
                userId,
                title: warningTitle,
                message: warningMessage,
                type: 'WARNING',
              },
            });
          }
        }
      }
    }

    // Return all notifications for student
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
