import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

// PATCH: end a session
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const session = await prisma.session.findUnique({ where: { id } });
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (session.lecturerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const updated = await prisma.session.update({
      where: { id },
      data: { isActive: false, endTime: new Date() },
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
