import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, role, inviteCode, cohort_id, student_id, institution_id, device_id, programme_id, level, semester, selected_courses } = body;

    // Basic Validation
    if (!password || !name) {
      return NextResponse.json({ error: 'Name and Password are required' }, { status: 400 });
    }

    let assignedInstitutionId = institution_id;

    if (role === 'STUDENT') {
      if (!student_id || (!cohort_id && !programme_id)) {
        return NextResponse.json({ error: 'Index Number and Program are required for students' }, { status: 400 });
      }

      if (programme_id) {
        const programmeData = await prisma.programmes.findUnique({
          where: { id: programme_id },
          include: { department: { include: { college: true } } }
        });

        if (!programmeData) {
          return NextResponse.json({ error: 'Invalid Program Selected' }, { status: 403 });
        }
        assignedInstitutionId = programmeData.department.college.institution_id;
      } else if (cohort_id) {
        const cohortData = await prisma.cohorts.findUnique({
          where: { id: cohort_id }
        });

        if (!cohortData) {
          return NextResponse.json({ error: 'Invalid Cohort Selected' }, { status: 403 });
        }
        assignedInstitutionId = cohortData.institution_id;
      }

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
        programme_id: programme_id || undefined,
        level: level || undefined,
        semester: semester || undefined,
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
        programme_id: true,
        level: true,
        semester: true,
        institution_id: true,
      }
    });

    // Magic Auto-Enrollment
    if (user.role === 'STUDENT') {
      if (selected_courses && Array.isArray(selected_courses) && selected_courses.length > 0) {
        // Enroll in selected catalogue courses
        await prisma.enrollments.createMany({
          data: selected_courses.map((courseId: string) => ({
            student_id: user.id,
            class_id: courseId
          })),
          skipDuplicates: true
        });
      } else if (user.cohort_id) {
        // Fallback to old cohort auto-enrollment
        const cohortClasses = await prisma.cohort_classes.findMany({
          where: { cohort_id: user.cohort_id }
        });

        if (cohortClasses.length > 0) {
          await prisma.enrollments.createMany({
            data: cohortClasses.map(c => ({
              student_id: user.id,
              class_id: c.class_id
            })),
            skipDuplicates: true
          });
        }
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
