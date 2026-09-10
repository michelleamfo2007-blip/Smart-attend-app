import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, departmentId } = await req.json();

    if (!name || !departmentId) {
      return NextResponse.json({ error: 'Name and Department ID are required' }, { status: 400 });
    }

    const department = await prisma.departments.findUnique({
      where: { id: departmentId },
      include: { college: { select: { institution_id: true } } },
    });
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }
    if (isCrossTenant(auth, department.college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prog = await prisma.programmes.create({
      data: {
        name,
        department_id: departmentId,
      },
    });

    return NextResponse.json(prog);
  } catch (error) {
    console.error('Error creating programme:', error);
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
    if (!id) return NextResponse.json({ error: 'Programme id is required' }, { status: 400 });

    const programme = await prisma.programmes.findUnique({
      where: { id },
      include: {
        department: { include: { college: { select: { institution_id: true } } } },
        classes: { select: { id: true } },
      },
    });

    if (!programme) return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    if (isCrossTenant(auth, programme.department.college.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const classIds = programme.classes.map((c) => c.id);
    if (classIds.length) {
      const liveSessions = await prisma.attendance_sessions.count({
        where: { class_id: { in: classIds } },
      });
      if (liveSessions > 0) {
        return NextResponse.json(
          {
            error:
              'Cannot delete this programme because some courses already have attendance sessions.',
          },
          { status: 409 }
        );
      }
      await prisma.classes.deleteMany({ where: { id: { in: classIds } } });
    }

    await prisma.programmes.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting programme:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
