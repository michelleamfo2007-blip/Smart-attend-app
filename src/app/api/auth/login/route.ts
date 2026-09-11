import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import { assertInstitutionAccess, refreshInstitutionSubscription, SubscriptionError } from '@/lib/subscription';
import { assertAndBindStudentDevice, DeviceBindingError } from '@/lib/deviceBinding';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limit: 5 requests per 1 minute window
    if (!checkRateLimit(`login_${ip}`, 5, 60000)) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const { email, student_id, password, device_id, device_fingerprint, institutionId } = await req.json();

    if ((!email && !student_id) || !password) {
      return NextResponse.json({ error: 'Missing login credentials or password' }, { status: 400 });
    }

    const identityFilters = [];
    if (email) identityFilters.push({ email });
    if (student_id) identityFilters.push({ student_id });

    const user = await prisma.users.findFirst({
      where: {
        AND: [
          { OR: identityFilters },
          ...(institutionId ? [{ institution_id: institutionId as string }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        institution_id: true,
        device_id: true,
        device_fingerprint: true,
        needs_device_reset: true,
        student_id: true,
        level: true,
        semester: true,
        can_mark_attendance: true,
        cohort_id: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.institution_id) {
      if (user.role === 'ADMIN') {
        // School admins may still sign in after expiry so they can renew.
        await refreshInstitutionSubscription(user.institution_id);
      } else {
        try {
          await assertInstitutionAccess(user.institution_id);
        } catch (err) {
          if (err instanceof SubscriptionError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
          }
          throw err;
        }
      }
    }

    if (user.role === 'STUDENT' && !device_id) {
      return NextResponse.json(
        { error: 'Students sign in on the SmartAttend mobile app, not the website.' },
        { status: 403 }
      );
    }

    if (device_id && user.role === 'STUDENT') {
      try {
        await assertAndBindStudentDevice(
          {
            id: user.id,
            device_id: user.device_id,
            device_fingerprint: user.device_fingerprint,
            needs_device_reset: user.needs_device_reset,
          },
          { deviceId: device_id, deviceFingerprint: device_fingerprint },
          { ip, context: 'login' }
        );
      } catch (err) {
        if (err instanceof DeviceBindingError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    // Generate JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        institution_id: user.institution_id,
        level: user.level,
        semester: user.semester,
        device_id: user.device_id,
        student_id: user.student_id,
        cohort_id: user.cohort_id,
        can_mark_attendance: user.can_mark_attendance,
      },
      token: token // Return token for mobile clients
    });

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // Audit log
    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'LOGIN',
        details: 'User logged in successfully',
        ip_address: ip
      }
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
