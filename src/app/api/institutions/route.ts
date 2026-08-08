import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const institutions = await prisma.institutions.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('Failed to fetch public institutions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
