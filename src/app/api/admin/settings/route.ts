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
      return NextResponse.json({ code: 'SUPER-ADMIN-N/A' });
    }

    const institution = await prisma.institutions.findUnique({
      where: { id: auth.institutionId },
    });

    return NextResponse.json({ code: institution?.invite_code || 'N/A' });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Super admins cannot generate invite codes' }, { status: 400 });
    }

    const { code } = await req.json();
    if (!code || code.length < 5) {
      return NextResponse.json({ error: 'Code must be at least 5 characters' }, { status: 400 });
    }

    const updated = await prisma.institutions.update({
      where: { id: auth.institutionId },
      data: { invite_code: code },
    });

    return NextResponse.json({ success: true, code: updated.invite_code });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'That invite code is already in use' }, { status: 400 });
    }
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
