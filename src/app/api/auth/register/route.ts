import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role, inviteCode, cohort_id, student_id, institution_id, device_id } = body;

    // Basic Validation
    if (!password || !name) {
      return NextResponse.json({ error: 'Name and Password are required' }, { status: 400 });
    }

    let assignedInstitutionId = institution_id;

    if (role === 'STUDENT') {
      if (!student_id || !cohort_id) {
        return NextResponse.json({ error: 'Index Number (Student ID) and Cohort are required for students' }, { status: 400 });
      }

      const cohortData = await prisma.cohorts.findUnique({
        where: { id: cohort_id }
      });

      if (!cohortData) {
        return NextResponse.json({ error: 'Invalid Cohort Selected' }, { status: 403 });
      }

      assignedInstitutionId = cohortData.institution_id;
      
      // Check if student_id is already taken at this institution
      const existingStudentId = await prisma.users.findFirst({
        where: { student_id, institution_id: assignedInstitutionId }
      });
      
      if (existingStudentId) {
        return NextResponse.json({ error: 'This Index Number is already registered.' }, { status: 400 });
      }

    } else if (role === 'LECTURER') {
      if (!email || !inviteCode) {
        return NextResponse.json({ error: 'Email and Invite code are required for lecturers' }, { status: 400 });
      }
      
      const institution = await prisma.institutions.findUnique({ 
        where: { invite_code: inviteCode } 
      });

      if (!institution) {
        return NextResponse.json({ error: 'Invalid Institution/Lecturer Invite Code' }, { status: 403 });
      }
      
      assignedInstitutionId = institution.id;
    }

    // Check if email exists (only if email was provided)
    if (email) {
      const existingUser = await prisma.users.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    }

    if (device_id) {
      const deviceOwner = await prisma.users.findFirst({
        where: { device_id }
      });
      if (deviceOwner) {
        return NextResponse.json({ error: 'This phone is already registered to another user. You cannot create multiple accounts on the same phone.' }, { status: 403 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        email: email || undefined,
        name,
        password: hashedPassword,
        role: role || 'STUDENT',
        student_id: student_id || undefined,
        cohort_id: cohort_id || undefined,
        institution_id: role === 'ADMIN' ? null : assignedInstitutionId,
        device_id: device_id || undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        student_id: true,
        cohort_id: true,
        institution_id: true,
      }
    });

    // Magic Auto-Enrollment
    if (user.role === 'STUDENT' && user.cohort_id) {
      // Find all classes assigned to this cohort
      const cohortClasses = await prisma.cohort_classes.findMany({
        where: { cohort_id: user.cohort_id }
      });

      if (cohortClasses.length > 0) {
        // Create enrollments for all classes in the cohort
        await prisma.enrollments.createMany({
          data: cohortClasses.map(c => ({
            student_id: user.id,
            class_id: c.class_id
          })),
          skipDuplicates: true
        });
      }
    }

    const { signToken } = await import('@/lib/auth');
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
    });

    const response = NextResponse.json({ user, token }, { status: 201 });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
