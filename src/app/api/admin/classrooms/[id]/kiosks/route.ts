import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const classroom = await prisma.classrooms.findUnique({ where: { id } });
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }
    if (isCrossTenant(auth, classroom.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Desktop name is required' }, { status: 400 });
    }

    const deviceLabel =
      typeof body.device_label === 'string' && body.device_label.trim()
        ? body.device_label.trim()
        : typeof body.deviceLabel === 'string' && body.deviceLabel.trim()
          ? body.deviceLabel.trim()
          : null;

    const kiosk = await prisma.classroom_kiosks.create({
      data: {
        institution_id: classroom.institution_id,
        classroom_id: classroom.id,
        name,
        device_label: deviceLabel,
        access_token: randomBytes(24).toString('hex'),
        enabled: true,
      },
    });

    return NextResponse.json({ kiosk }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
