import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth, isCrossTenant } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, courseCode, credits, level, semester, isCompulsory, programmeId } = await req.json();

    if (!name || !courseCode || !programmeId) {
      return NextResponse.json({ error: 'Name, Course Code, and Programme ID are required' }, { status: 400 });
    }

    const programme = await prisma.programmes.findUnique({
      where: { id: programmeId },
      include: { department: { include: { college: { select: { institution_id: true } } } } },
    });
    if (!programme) {
      return NextResponse.json({ error: 'Programme not found' }, { status: 404 });
    }

    const programmeInstitutionId = programme.department.college.institution_id;
    if (isCrossTenant(auth, programmeInstitutionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const institutionId = auth.institutionId || programmeInstitutionId;
    if (!institutionId) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 });
    }

    const newClass = await prisma.classes.create({
      data: {
        name,
        course_code: courseCode,
        credit_hours: parseInt(credits) || 3,
        level: level || '100',
        semester: semester || '1',
        is_compulsory: isCompulsory !== undefined ? isCompulsory : true,
        programme_id: programmeId,
        institution_id: institutionId,
      },
    });

    return NextResponse.json(newClass);
  } catch (error) {
    console.error('Error creating class:', error);
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
    if (!id) return NextResponse.json({ error: 'Course id is required' }, { status: 400 });

    const course = await prisma.classes.findUnique({
      where: { id },
      include: {
        programme: {
          include: {
            department: { include: { college: { select: { institution_id: true } } } },
          },
        },
        _count: { select: { sessions: true, enrollments: true, records: true } },
      },
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    const institutionId =
      course.institution_id || course.programme?.department.college.institution_id || null;
    if (isCrossTenant(auth, institutionId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (course._count.sessions > 0 || course._count.records > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete this course because it already has attendance sessions or records.',
        },
        { status: 409 }
      );
    }

    await prisma.enrollments.deleteMany({ where: { class_id: id } });
    try {
      await prisma.cohort_classes.deleteMany({ where: { class_id: id } });
    } catch {
      // cohort_classes may not exist in older DBs
    }
    await prisma.classes.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
