import { NextResponse } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const payload = await verifyToken(token);
    if (!payload || payload.userRole !== 'LECTURER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { courseId, action } = await req.json();
    if (!courseId || (action !== 'claim' && action !== 'unclaim')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify course exists
    const course = await prisma.classes.findUnique({ where: { id: courseId } });
    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    if (action === 'claim') {
      if (course.lecturer_id !== null) {
        return NextResponse.json({ error: 'Course is already claimed by another lecturer' }, { status: 400 });
      }
      await prisma.classes.update({
        where: { id: courseId },
        data: { lecturer_id: payload.userId as string }
      });
    } else if (action === 'unclaim') {
      if (course.lecturer_id !== payload.userId) {
        return NextResponse.json({ error: 'You can only unclaim your own courses' }, { status: 403 });
      }
      await prisma.classes.update({
        where: { id: courseId },
        data: { lecturer_id: null }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
