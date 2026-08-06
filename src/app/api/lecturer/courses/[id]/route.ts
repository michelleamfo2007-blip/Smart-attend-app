import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    
    // Ensure the lecturer owns this class
    const course = await prisma.classes.findUnique({
      where: { id },
    });

    if (!course || course.lecturer_id !== userId) {
      return NextResponse.json({ error: 'Course not found or unauthorized' }, { status: 404 });
    }

    // Generate new code
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const updated = await prisma.classes.update({
      where: { id },
      data: { invite_code: newCode },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    console.error('Update invite code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
