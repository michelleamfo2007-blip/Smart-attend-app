import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const inviteCode = searchParams.get('inviteCode');

    if (!inviteCode) {
      return NextResponse.json({ error: 'Institution invite code is required' }, { status: 400 });
    }

    const institution = await prisma.institutions.findUnique({
      where: { invite_code: inviteCode }
    });

    if (!institution) {
      return NextResponse.json({ error: 'Invalid institution invite code' }, { status: 404 });
    }

    const cohorts = await prisma.cohorts.findMany({
      where: { institution_id: institution.id },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      institution: { id: institution.id, name: institution.name },
      cohorts
    });
  } catch (error) {
    console.error('Fetch public cohorts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
