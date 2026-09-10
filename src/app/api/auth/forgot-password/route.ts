import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getEmailError, normalizeEmail, sendPasswordResetEmail } from '@/lib/email';
import { signPasswordResetToken } from '@/lib/passwordReset';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`forgot_${ip}`, 5, 60_000)) {
      return NextResponse.json({ error: 'Too many reset requests. Try again later.' }, { status: 429 });
    }

    const body = await req.json();
    const emailError = getEmailError(body.email);
    if (emailError) {
      // Same response whether or not the user exists (avoid account enumeration).
      return NextResponse.json({
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    }

    const email = normalizeEmail(body.email);
    const user = await prisma.users.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, password: true },
    });

    // Students use index numbers on mobile; password reset is for staff with email.
    if (user?.email && user.password && user.role !== 'STUDENT') {
      const token = await signPasswordResetToken(user.id, user.email);
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        'https://www.smartattend.co'
      ).replace(/\/$/, '');
      const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const sent = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });

      if (!sent.sent) {
        console.warn('[forgot-password] email not sent — check RESEND_API_KEY');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Unable to process reset request' }, { status: 500 });
  }
}
