import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.userRole !== 'ADMIN') return null;
  return payload;
}

export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!auth.institutionId) {
      // Super admins don't have an invite code
      return NextResponse.json({ code: 'SUPER-ADMIN-N/A' });
    }

    const institution = await prisma.institutions.findUnique({
      where: { id: auth.institutionId as string }
    });
    
    return NextResponse.json({ code: institution?.invite_code || 'N/A' });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!auth.institutionId) {
      return NextResponse.json({ error: 'Super admins cannot generate invite codes' }, { status: 400 });
    }

    const { code } = await req.json();
    if (!code || code.length < 5) {
      return NextResponse.json({ error: 'Code must be at least 5 characters' }, { status: 400 });
    }

    const updated = await prisma.institutions.update({
      where: { id: auth.institutionId as string },
      data: { invite_code: code },
    });

    return NextResponse.json({ success: true, code: updated.invite_code });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
