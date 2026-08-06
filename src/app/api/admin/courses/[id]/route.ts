import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getStartOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
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
