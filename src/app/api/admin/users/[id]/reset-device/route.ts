import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (payload?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    const user = await prisma.users.update({
      where: { id },
      data: {
        device_id: null,
        needs_device_reset: true
      }
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        user_id: payload.userId as string,
        action: 'DEVICE_RESET',
        details: `Admin reset device binding for user ${user.name || user.email} (${id})`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
