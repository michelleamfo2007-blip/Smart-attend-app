import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await prisma.classes.findMany({
      where: {
        lecturer_id: userId,
      },
      include: {
        sessions: {
          where: { lecturer_id: userId, status: 'active' },
          take: 1,
        },
        records: true, // Use records as a proxy for enrollments
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, level, semester } = await req.json();

    if (!name || !level || !semester) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate a unique 6-character alphanumeric invite code
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newClass = await prisma.classes.create({
      data: {
        name,
        level,
        semester,
        lecturer_id: userId,
        invite_code,
      }
    });

    return NextResponse.json({ course: newClass }, { status: 201 });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
