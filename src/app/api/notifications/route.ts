import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const notifications = await prisma.user_notifications.findMany({
      where: { user_id: auth.userId },
      orderBy: { created_at: 'desc' },
      take: 30,
    });

    const unread = notifications.filter((n) => !n.read).length;
    return NextResponse.json({ notifications, unread });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.markAllRead) {
      await prisma.user_notifications.updateMany({
        where: { user_id: auth.userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    const id = body.id as string | undefined;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const existing = await prisma.user_notifications.findUnique({ where: { id } });
    if (!existing || existing.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.user_notifications.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
