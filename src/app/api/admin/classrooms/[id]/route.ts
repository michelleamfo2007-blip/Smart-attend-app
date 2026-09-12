import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

async function requireClassroom(id: string) {
  const auth = await getAuth();
  if (!auth || auth.userRole !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const classroom = await prisma.classrooms.findUnique({ where: { id } });
  if (!classroom) {
    return { error: NextResponse.json({ error: 'Classroom not found' }, { status: 404 }) };
  }
  if (isCrossTenant(auth, classroom.institution_id)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { auth, classroom };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireClassroom(id);
    if ('error' in access) return access.error;

    const body = await req.json();
    const classroom = await prisma.classrooms.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() : undefined,
        building:
          body.building === null
            ? null
            : typeof body.building === 'string'
              ? body.building.trim() || null
              : undefined,
        latitude: body.latitude != null && body.latitude !== '' ? Number(body.latitude) : body.latitude === null ? null : undefined,
        longitude: body.longitude != null && body.longitude !== '' ? Number(body.longitude) : body.longitude === null ? null : undefined,
        radius_meters: body.radius_meters != null ? Number(body.radius_meters) : undefined,
      },
    });

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireClassroom(id);
    if ('error' in access) return access.error;

    await prisma.classrooms.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
