import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getStudentClasses } from '@/lib/student';
import { headers } from 'next/headers';

async function getUserId() {
  const headersList = await headers();
  return headersList.get('x-user-id');
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const classes = await getStudentClasses(userId);
    const classIds = classes.map((cls) => cls.id);
    const now = new Date();

    const [records, sessions, user] = await Promise.all([
      prisma.attendance_records.findMany({
        where: { student_id: userId },
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          class_id: true,
          session_id: true,
        },
      }),
      classIds.length
        ? prisma.attendance_sessions.findMany({
            where: { class_id: { in: classIds } },
            orderBy: { created_at: 'desc' },
            select: {
              id: true,
              class_id: true,
              created_at: true,
              status: true,
              expires_at: true,
            },
          })
        : Promise.resolve(
            [] as {
              id: string;
              class_id: string;
              created_at: Date;
              status: string;
              expires_at: Date | null;
            }[]
          ),
      prisma.users.findUnique({
        where: { id: userId },
        select: {
          institution: { select: { name: true } },
        },
      }),
    ]);

    // Close anything that already expired so students don't see stale "live" sessions
    const staleIds = sessions
      .filter((session) => session.status === 'active' && session.expires_at && session.expires_at < now)
      .map((session) => session.id);

    if (staleIds.length > 0) {
      await prisma.attendance_sessions.updateMany({
        where: { id: { in: staleIds } },
        data: { status: 'closed' },
      });
    }

    const attendedSessionIds = new Set(records.map((record) => record.session_id));
    const classById = new Map(classes.map((cls) => [cls.id, cls]));

    const history = sessions.map((session) => {
      const isStale = staleIds.includes(session.id);
      const status = isStale ? 'closed' : session.status;
      return {
        id: session.id,
        className: classById.get(session.class_id)?.name || 'Unknown Class',
        timestamp: session.created_at,
        created_at: session.created_at,
        status: attendedSessionIds.has(session.id) ? 'Present' : status === 'active' ? 'Open' : 'Missed',
      };
    });

    const activeSessions = sessions
      .filter(
        (session) =>
          session.status === 'active' &&
          !staleIds.includes(session.id) &&
          (!session.expires_at || session.expires_at >= now)
      )
      .map((session) => {
        const cls = classById.get(session.class_id);
        return {
          id: session.id,
          class_id: session.class_id,
          created_at: session.created_at,
          expires_at: session.expires_at,
          alreadyMarked: attendedSessionIds.has(session.id),
          class: cls
            ? {
                id: cls.id,
                name: cls.name,
                course_code: (cls as any).course_code || null,
                level: cls.level,
                schedule_time: cls.schedule_time,
              }
            : null,
        };
      });

    return NextResponse.json({
      classes,
      records,
      sessions,
      history,
      activeSessions,
      institutionName: user?.institution?.name || '',
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
