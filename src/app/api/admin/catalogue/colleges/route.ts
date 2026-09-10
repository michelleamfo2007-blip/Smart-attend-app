import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'College name is required' }, { status: 400 });
    }

    const college = await prisma.colleges.create({
      data: {
        name: name.trim(),
        institution_id: auth.institutionId,
      },
    });

    return NextResponse.json(college, { status: 201 });
  } catch (error) {
    console.error('Error creating college:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'College id is required' }, { status: 400 });

    const college = await prisma.colleges.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            programmes: {
              include: { classes: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!college) return NextResponse.json({ error: 'College not found' }, { status: 404 });
    if (isCrossTenant(auth, college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classIds = college.departments.flatMap((d) =>
      d.programmes.flatMap((p) => p.classes.map((c) => c.id))
    );

    if (classIds.length) {
      const liveSessions = await prisma.attendance_sessions.count({
        where: { class_id: { in: classIds } },
      });
      if (liveSessions > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot delete this college because some courses already have attendance sessions. Remove those classes first or keep the catalogue.',
          },
          { status: 409 }
        );
      }
      await prisma.classes.deleteMany({ where: { id: { in: classIds } } });
    }

    await prisma.colleges.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting college:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
