import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';
import { getInstitutionRolePermissions } from '@/lib/permissions';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate UUID format to prevent Prisma throwing on "undefined" or invalid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!id || !uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            class: {
              include: {
                sessions: {
                  select: { id: true, created_at: true, status: true }
                }
              }
            }
          }
        },
        records: {
          select: { session_id: true, timestamp: true, method: true, marked_by: { select: { name: true } } }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isCrossTenant(auth, user.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (user.role !== 'STUDENT') {
      // For lecturers or admins, just return the user details without attendance math
      return NextResponse.json({ user });
    }

    const attendedSessionIds = new Set((user.records || []).map((r: any) => r.session_id));
    const recordBySession = new Map((user.records || []).map((r: any) => [r.session_id, r]));
    
    const timeline: any[] = [];

    // Calculate class-by-class attendance
    const classesAnalytics = (user.enrollments || []).map((enr: any) => {
      const classData = enr.class;
      const sessions = classData?.sessions || [];
      const totalSessions = sessions.length;
      let attendedSessions = 0;

      sessions.forEach((s: any) => {
        const attended = attendedSessionIds.has(s.id);
        if (attended) {
          attendedSessions++;
        }
        
        // Add to timeline
        timeline.push({
          sessionId: s.id,
          className: classData?.name || 'Unknown Class',
          date: s.created_at,
          status: attended ? 'Present' : 'Absent',
          method: attended ? (recordBySession.get(s.id)?.method || 'dynamic_qr') : null,
          markedBy: attended ? (recordBySession.get(s.id)?.marked_by?.name || null) : null,
        });
      });

      return {
        classId: classData?.id || 'unknown',
        className: classData?.name || 'Unknown Class',
        level: classData?.level || 'Unknown',
        semester: classData?.semester || 'Unknown',
        totalSessions,
        attendedSessions,
        missedSessions: totalSessions - attendedSessions,
        percentage: totalSessions === 0 ? 100 : Math.round((attendedSessions / totalSessions) * 100)
      };
    });
    
    // Sort timeline chronologically (newest first)
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Overall attendance
    let totalOverallSessions = 0;
    let totalAttendedSessions = 0;
    
    classesAnalytics.forEach((c: any) => {
      totalOverallSessions += c.totalSessions;
      totalAttendedSessions += c.attendedSessions;
    });

    const overallPercentage = totalOverallSessions === 0 ? 100 : Math.round((totalAttendedSessions / totalOverallSessions) * 100);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        level: user.level,
        semester: user.semester,
        can_mark_attendance: user.can_mark_attendance,
      },
      analytics: {
        classes: classesAnalytics,
        timeline,
        overall: {
          totalSessions: totalOverallSessions,
          attendedSessions: totalAttendedSessions,
          missedSessions: totalOverallSessions - totalAttendedSessions,
          percentage: overallPercentage
        }
      }
    });
  } catch (error: any) {
    console.error('Failed to fetch user details:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const target = await prisma.users.findUnique({
      where: { id },
      select: { id: true, role: true, institution_id: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (isCrossTenant(auth, target.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (target.role === 'STUDENT') {
      return NextResponse.json({ error: 'Students cannot be granted attendance officer access.' }, { status: 400 });
    }

    const body = await req.json();
    const enabling = Boolean(body.can_mark_attendance);

    if (enabling && target.role === 'LECTURER') {
      const perms = await getInstitutionRolePermissions(auth.institutionId || target.institution_id);
      if (!perms.lecturer.manually_mark_students) {
        return NextResponse.json(
          {
            error:
              'Lecturer manual marking is disabled in Settings → Role permissions. Enable “Manually mark students” first.',
            code: 'PERMISSION_DENIED',
          },
          { status: 403 }
        );
      }
    }

    const user = await prisma.users.update({
      where: { id },
      data: {
        can_mark_attendance: enabling,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        can_mark_attendance: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
