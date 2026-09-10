import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereClause = auth.institutionId ? { institution_id: auth.institutionId } : {};

    const classrooms = await prisma.classrooms.findMany({
      where: whereClause,
      include: {
        kiosks: { orderBy: { created_at: 'asc' } },
        classes: {
          select: {
            id: true,
            name: true,
            course_code: true,
            level: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const unassignedClasses = await prisma.classes.findMany({
      where: {
        ...whereClause,
        classroom_id: null,
      },
      select: { id: true, name: true, course_code: true, level: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ classrooms, unassignedClasses });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Tenant admins manage classrooms for their school.' }, { status: 400 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    const classroom = await prisma.classrooms.create({
      data: {
        institution_id: auth.institutionId,
        name,
        latitude: body.latitude != null ? Number(body.latitude) : null,
        longitude: body.longitude != null ? Number(body.longitude) : null,
        radius_meters: body.radius_meters != null ? Number(body.radius_meters) : 50,
      },
      include: { kiosks: true, classes: { select: { id: true, name: true, course_code: true, level: true } } },
    });

    return NextResponse.json({ classroom }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
