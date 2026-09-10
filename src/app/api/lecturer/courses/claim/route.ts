import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth?.userId || auth.userRole !== 'LECTURER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { courseId, action } = await req.json();
    if (!courseId || (action !== 'claim' && action !== 'unclaim')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const course = await prisma.classes.findUnique({ where: { id: courseId } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (isCrossTenant(auth, course.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'claim') {
      if (course.lecturer_id !== null) {
        return NextResponse.json({ error: 'Course is already claimed by another lecturer' }, { status: 400 });
      }
      await prisma.classes.update({
        where: { id: courseId },
        data: { lecturer_id: auth.userId },
      });
    } else if (action === 'unclaim') {
      if (course.lecturer_id !== auth.userId) {
        return NextResponse.json({ error: 'You can only unclaim your own courses' }, { status: 403 });
      }
      await prisma.classes.update({
        where: { id: courseId },
        data: { lecturer_id: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
