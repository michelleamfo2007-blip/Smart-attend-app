import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, student_id, password } = await req.json();

    if ((!email && !student_id) || !password) {
      return NextResponse.json({ error: 'Missing login credentials or password' }, { status: 400 });
    }

    // Find user by either email or student_id
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { student_id: student_id || undefined }
        ]
      }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
        cohort_id: user.cohort_id
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

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
