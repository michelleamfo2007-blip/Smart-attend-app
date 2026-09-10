import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cohorts = await prisma.cohorts.findMany({
      where: { institution_id: auth.institutionId },
      include: {
        _count: {
          select: { users: true, cohort_classes: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json(cohorts);
  } catch (error) {
    console.error('Fetch cohorts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, classIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Cohort name is required' }, { status: 400 });
    }

    const uniqueClassIds = Array.isArray(classIds)
      ? [...new Set(classIds.filter((id: unknown) => typeof id === 'string'))]
      : [];

    if (uniqueClassIds.length > 0) {
      const ownedClasses = await prisma.classes.findMany({
        where: { id: { in: uniqueClassIds }, institution_id: auth.institutionId },
        select: { id: true },
      });
      if (ownedClasses.length !== uniqueClassIds.length) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const cohort = await prisma.$transaction(async (tx) => {
      const newCohort = await tx.cohorts.create({
        data: {
          name,
          institution_id: auth.institutionId!,
        },
      });

      if (uniqueClassIds.length > 0) {
        await tx.cohort_classes.createMany({
          data: uniqueClassIds.map((cid) => ({
            cohort_id: newCohort.id,
            class_id: cid,
          })),
        });
      }

      return newCohort;
    });

    return NextResponse.json({ success: true, cohort }, { status: 201 });
  } catch (error) {
    console.error('Create cohort error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
