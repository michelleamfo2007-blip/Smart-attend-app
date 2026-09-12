import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

async function requireKiosk(id: string) {
  const auth = await getAuth();
  if (!auth || auth.userRole !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const kiosk = await prisma.classroom_kiosks.findUnique({ where: { id } });
  if (!kiosk) {
    return { error: NextResponse.json({ error: 'Desktop not found' }, { status: 404 }) };
  }
  if (isCrossTenant(auth, kiosk.institution_id)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { auth, kiosk };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireKiosk(id);
    if ('error' in access) return access.error;

    const body = await req.json();
    const kiosk = await prisma.classroom_kiosks.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() : undefined,
        device_label:
          body.device_label === null || body.deviceLabel === null
            ? null
            : typeof body.device_label === 'string'
              ? body.device_label.trim() || null
              : typeof body.deviceLabel === 'string'
                ? body.deviceLabel.trim() || null
                : undefined,
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      },
    });

    return NextResponse.json({ kiosk });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireKiosk(id);
    if ('error' in access) return access.error;

    await prisma.classroom_kiosks.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
