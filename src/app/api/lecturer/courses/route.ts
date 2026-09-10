import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    const institutionId = auth?.institutionId;
    const userId = auth?.userId;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await prisma.classes.findMany({
      where: {
        lecturer_id: userId,
        ...(institutionId ? { institution_id: institutionId } : {}),
      },
      include: {
        sessions: {
          where: { lecturer_id: userId, status: 'active' },
          take: 1,
        },
        records: true,
        _count: { select: { enrollments: true } },
      }
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    const institutionId = auth?.institutionId;
    const userId = auth?.userId;

    if (!userId || !institutionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { moduleId, scheduleDay, startTime, endTime, semester } = await req.json();

    if (!moduleId || !scheduleDay || !startTime || !endTime || !semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the module in the catalogue
    const moduleItem = await prisma.classes.findUnique({
      where: { id: moduleId }
    });

    if (!moduleItem) {
      return NextResponse.json({ error: 'Module not found in catalogue' }, { status: 404 });
    }

    // Generate a unique 6-character alphanumeric invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create a new scheduled class for this lecturer based on the module
    const newClass = await prisma.classes.create({
      data: {
        name: moduleItem.name,
        course_code: moduleItem.course_code,
        credit_hours: moduleItem.credit_hours,
        is_compulsory: moduleItem.is_compulsory,
        level: moduleItem.level, // Inherit level from module, but let them override semester
        semester,
        schedule_time: scheduleDay,
        start_time: startTime,
        end_time: endTime,
        programme_id: moduleItem.programme_id,
        lecturer_id: userId,
        invite_code,
        institution_id: institutionId,
      }
    });

    return NextResponse.json({ course: newClass }, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
