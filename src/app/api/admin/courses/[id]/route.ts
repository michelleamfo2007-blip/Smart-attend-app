import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

function getStartOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const startOfWeek = getStartOfWeek();

    const course = await prisma.classes.findUnique({
      where: { id },
      include: {
        lecturer: { select: { name: true } },
        sessions: true,
        enrollments: {
          include: {
            student: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        records: true
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (isCrossTenant(auth, course.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Calculate class session counts
    let weeklySessions = 0;
    let overallSessions = course.sessions.length;

    for (const session of course.sessions) {
      if (new Date(session.created_at) >= startOfWeek) {
        weeklySessions++;
      }
    }

    // 2. Map student attendance
    const studentsWithAnalytics = course.enrollments.map(enrollment => {
      const student = enrollment.student;
      
      // Filter records for this specific student in this specific class
      const studentRecords = course.records.filter(r => r.student_id === student.id);
      
      let weeklyAttended = 0;
      let overallAttended = studentRecords.length;

      for (const record of studentRecords) {
        if (new Date(record.timestamp) >= startOfWeek) {
          weeklyAttended++;
        }
      }

      const weeklyPercentage = weeklySessions > 0 ? Math.min(100, Math.round((weeklyAttended / weeklySessions) * 100)) : 100;
      const overallPercentage = overallSessions > 0 ? Math.min(100, Math.round((overallAttended / overallSessions) * 100)) : 100;

      return {
        ...student,
        analytics: {
          weekly: { attended: weeklyAttended, required: weeklySessions, percentage: weeklyPercentage },
          overall: { attended: overallAttended, required: overallSessions, percentage: overallPercentage }
        }
      };
    });

    // Remove raw relational data that is no longer needed
    const { records, enrollments, ...cleanCourse } = course;

    return NextResponse.json({ 
      course: cleanCourse, 
      students: studentsWithAnalytics 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function requireAdminCourse(id: string) {
  const auth = await getAuth();
  if (!auth || auth.userRole !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const course = await prisma.classes.findUnique({ where: { id } });
  if (!course) {
    return { error: NextResponse.json({ error: 'Class not found' }, { status: 404 }) };
  }
  if (isCrossTenant(auth, course.institution_id)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { auth, course };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAdminCourse(id);
    if (access.error) return access.error;
    if (!access.auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();

    if (body.lecturer_id) {
      const lecturer = await prisma.users.findUnique({
        where: { id: body.lecturer_id },
        select: { role: true, institution_id: true },
      });
      if (!lecturer || lecturer.role !== 'LECTURER' || isCrossTenant(access.auth, lecturer.institution_id)) {
        return NextResponse.json({ error: 'Invalid lecturer' }, { status: 400 });
      }
    }

    if (body.classroom_id) {
      const classroom = await prisma.classrooms.findUnique({
        where: { id: body.classroom_id },
        select: { institution_id: true },
      });
      if (!classroom || isCrossTenant(access.auth, classroom.institution_id)) {
        return NextResponse.json({ error: 'Invalid classroom' }, { status: 400 });
      }
    }

    const updated = await prisma.classes.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.lecturer_id !== undefined && { lecturer_id: body.lecturer_id || null }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.semester !== undefined && { semester: body.semester }),
        ...(body.schedule_time !== undefined && { schedule_time: body.schedule_time }),
        ...(body.invite_code !== undefined && { invite_code: body.invite_code || undefined }),
        ...(body.classroom_id !== undefined && { classroom_id: body.classroom_id || null }),
      },
      include: {
        lecturer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAdminCourse(id);
    if (access.error) return access.error;

    await prisma.classes.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
