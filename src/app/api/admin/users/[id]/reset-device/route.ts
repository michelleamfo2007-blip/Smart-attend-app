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

    const target = await prisma.users.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, institution_id: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isCrossTenant(auth, target.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.users.update({
      where: { id },
      data: {
        device_id: null,
        needs_device_reset: true,
      },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: auth.userId,
        action: 'DEVICE_RESET',
        details: `Admin reset device binding for user ${user.name || user.email} (${id})`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
