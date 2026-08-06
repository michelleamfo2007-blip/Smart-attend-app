import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getStartOfWeek() {
  const date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function GET() {
  try {
    const rawUsers = await prisma.users.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        level: true,
        semester: true,
        _count: {
          select: {
            classes_lectured: true, 
            attendance_sessions: true, 
          }
        },
      },
    });
    
    const startOfWeek = getStartOfWeek();

    // 1. Calculate Required Sessions per (Level + Semester)
    const allSessions = await prisma.attendance_sessions.findMany({
      include: { class: { select: { level: true, semester: true } } }
    });

    const sessionCounts: Record<string, { overall: number, weekly: number }> = {};
    
    for (const session of allSessions) {
      if (!session.class?.level || !session.class?.semester) continue;
      
      const key = `${session.class.level}-${session.class.semester}`;
      if (!sessionCounts[key]) {
        sessionCounts[key] = { overall: 0, weekly: 0 };
      }
      
      sessionCounts[key].overall += 1;
      
      if (new Date(session.created_at) >= startOfWeek) {
        sessionCounts[key].weekly += 1;
      }
    }

    // 2. Fetch Check-ins per student
    const allRecords = await prisma.attendance_records.findMany({
      select: { student_id: true, timestamp: true }
    });

    const studentCheckins: Record<string, { overall: number, weekly: number }> = {};
    for (const record of allRecords) {
      if (!studentCheckins[record.student_id]) {
        studentCheckins[record.student_id] = { overall: 0, weekly: 0 };
      }
      studentCheckins[record.student_id].overall += 1;
      if (new Date(record.timestamp) >= startOfWeek) {
        studentCheckins[record.student_id].weekly += 1;
      }
    }

    // 3. Map Users with calculated analytics
    const users = rawUsers.map(u => {
      let weekly = { attended: 0, required: 0, percentage: 0 };
      let overall = { attended: 0, required: 0, percentage: 0 };

      if (u.role === 'STUDENT' && u.level && u.semester) {
        const key = `${u.level}-${u.semester}`;
        const reqs = sessionCounts[key] || { overall: 0, weekly: 0 };
        const checkins = studentCheckins[u.id] || { overall: 0, weekly: 0 };

        weekly.attended = checkins.weekly;
        weekly.required = reqs.weekly;
        weekly.percentage = reqs.weekly > 0 ? Math.round((checkins.weekly / reqs.weekly) * 100) : 100;

        overall.attended = checkins.overall;
        overall.required = reqs.overall;
        overall.percentage = reqs.overall > 0 ? Math.round((checkins.overall / reqs.overall) * 100) : 100;
        
        // Cap percentages at 100% just in case of weird data
        weekly.percentage = Math.min(100, weekly.percentage);
        overall.percentage = Math.min(100, overall.percentage);
      }

      return {
        ...u,
        analytics: { weekly, overall }
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
