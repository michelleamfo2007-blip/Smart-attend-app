import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rawUsers = await prisma.users.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        _count: {
          select: {
            classes_lectured: true, 
            attendance_sessions: true, 
          }
        },
      },
    });
    
    // For students, fetch their total attendance count manually
    const attendanceGroup = await prisma.attendance_records.groupBy({
      by: ['student_id'],
      _count: { _all: true }
    });
    
    const attendanceMap = new Map(attendanceGroup.map(g => [g.student_id, g._count._all]));
    
    const users = rawUsers.map(u => ({
      ...u,
      attendance_count: attendanceMap.get(u.id) || 0
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
