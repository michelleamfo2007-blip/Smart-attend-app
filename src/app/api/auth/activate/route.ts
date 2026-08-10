import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { student_id, password, institution_id } = await req.json();

    if (!student_id || !password || !institution_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the pre-imported student
    const user = await prisma.users.findFirst({
      where: {
        student_id: student_id.trim(),
        institution_id: institution_id,
        role: 'STUDENT'
      }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Student record not found. Please contact your administrator to ensure your Index Number is registered.' 
      }, { status: 404 });
    }

    if (user.password) {
      return NextResponse.json({ 
        error: 'This account has already been activated. Please login instead.' 
      }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user record
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Generate JWT token so they are immediately logged in
    const token = await signToken({
      userId: updatedUser.id,
      email: updatedUser.email || '',
      role: updatedUser.role || 'STUDENT',
      institutionId: updatedUser.institution_id || '',
    });

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Audit log
    await prisma.audit_logs.create({
      data: {
        user_id: updatedUser.id,
        action: 'ACCOUNT_ACTIVATED',
        details: 'Student activated their account and set a password',
        ip_address: ip
      }
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        institution_id: updatedUser.institution_id,
        level: updatedUser.level,
        semester: updatedUser.semester,
        device_id: updatedUser.device_id,
        student_id: updatedUser.student_id,
        cohort_id: updatedUser.cohort_id
      },
      token
    });

  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
