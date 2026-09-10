import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, collegeId } = await req.json();

    if (!name || !collegeId) {
      return NextResponse.json({ error: 'Name and College ID are required' }, { status: 400 });
    }

    const college = await prisma.colleges.findUnique({ where: { id: collegeId } });
    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }
    if (isCrossTenant(auth, college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dept = await prisma.departments.create({
      data: {
        name,
        college_id: collegeId,
      },
    });

    return NextResponse.json(dept);
  } catch (error) {
    console.error('Error creating department:', error);
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
    if (!id) return NextResponse.json({ error: 'Department id is required' }, { status: 400 });

    const department = await prisma.departments.findUnique({
      where: { id },
      include: {
        college: { select: { institution_id: true } },
        programmes: { include: { classes: { select: { id: true } } } },
      },
    });

    if (!department) return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    if (isCrossTenant(auth, department.college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classIds = department.programmes.flatMap((p) => p.classes.map((c) => c.id));
    if (classIds.length) {
      const liveSessions = await prisma.attendance_sessions.count({
        where: { class_id: { in: classIds } },
      });
      if (liveSessions > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot delete this department because some courses already have attendance sessions.',
          },
          { status: 409 }
        );
      }
      await prisma.classes.deleteMany({ where: { id: { in: classIds } } });
    }

    await prisma.departments.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting department:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
