import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cohorts = await prisma.cohorts.findMany({
      where: { institution_id: institutionId },
      include: {
        _count: {
          select: { users: true, cohort_classes: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(cohorts);
  } catch (error) {
    console.error('Fetch cohorts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = cookies().get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    const institutionId = payload?.institutionId as string;
    if (!institutionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, classIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Cohort name is required' }, { status: 400 });
    }

    // Create Cohort and the class mappings in a transaction
    const cohort = await prisma.$transaction(async (tx) => {
      const newCohort = await tx.cohorts.create({
        data: {
          name,
          institution_id: institutionId,
        }
      });

      if (classIds && Array.isArray(classIds) && classIds.length > 0) {
        await tx.cohort_classes.createMany({
          data: classIds.map(cid => ({
            cohort_id: newCohort.id,
            class_id: cid
          }))
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
