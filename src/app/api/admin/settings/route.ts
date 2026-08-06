import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;
  return payload;
}

export async function GET() {
  try {
    const auth = await checkAdminAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await prisma.system_settings.findUnique({ where: { id: 'global' } });
    const code = settings?.lecturer_invite_code || process.env.LECTURER_INVITE_CODE || 'LECTURER-2026';
    
    return NextResponse.json({ code });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminAuth();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await req.json();
    if (!code || code.length < 5) {
      return NextResponse.json({ error: 'Code must be at least 5 characters' }, { status: 400 });
    }

    const settings = await prisma.system_settings.upsert({
      where: { id: 'global' },
      update: { lecturer_invite_code: code },
      create: { id: 'global', lecturer_invite_code: code },
    });

    return NextResponse.json({ success: true, code: settings.lecturer_invite_code });
  } catch (error) {
    console.error('Settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
