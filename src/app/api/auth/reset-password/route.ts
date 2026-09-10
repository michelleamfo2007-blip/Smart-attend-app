import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyPasswordResetToken } from '@/lib/passwordReset';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`reset_${ip}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const token = typeof body.token === 'string' ? body.token : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const payload = await verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, email: true },
    });

    if (!user || user.role === 'STUDENT') {
      return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'PASSWORD_RESET_SELF',
        details: `Password reset completed for ${user.email || user.id}`,
        ip_address: ip,
      },
    }).catch(() => undefined);

    return NextResponse.json({ success: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Unable to reset password' }, { status: 500 });
  }
}
