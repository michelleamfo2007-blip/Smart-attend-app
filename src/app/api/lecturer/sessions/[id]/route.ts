import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

// PATCH: end a session
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const userId = payload?.userId as string;
    
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const session = await prisma.attendance_sessions.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.lecturer_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.attendance_sessions.update({
      where: { id },
      data: { status: 'closed', expires_at: new Date() },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
