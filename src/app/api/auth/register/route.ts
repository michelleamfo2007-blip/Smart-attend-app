import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getEmailError, normalizeEmail, sendWelcomeEmail } from '@/lib/email';
import { assertCanAddUsers, assertInstitutionAccess, SubscriptionError } from '@/lib/subscription';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email, password, name: rawName, first_name, firstName, last_name, lastName,
      role, inviteCode, cohort_id, student_id, institution_id, device_id,
      programme_id, level, semester, selected_courses,
    } = body;

    const givenName = String(first_name || firstName || '').trim();
    const familyName = String(last_name || lastName || '').trim();
    const name = String(rawName || '').trim() || [givenName, familyName].filter(Boolean).join(' ');

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (role === 'STUDENT') {
      if (!givenName || !familyName) {
        return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
      }
      if (!device_id) {
        return NextResponse.json(
          { error: 'Students can only sign up in the SmartAttend mobile app.' },
          { status: 400 }
        );
      }
    } else if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const staffSignup = role === 'LECTURER' || role === 'ADMIN';
    let normalizedEmail: string | undefined;

    if (staffSignup) {
      const emailError = getEmailError(email);
      if (emailError) {
        return NextResponse.json({ error: emailError }, { status: 400 });
      }
      normalizedEmail = normalizeEmail(email);
    }
    // Students do not use email — identity is student_id / index number only.

    let assignedInstitutionId = institution_id;
    let preloadedStudent = null;

    if (role === 'STUDENT') {
      // For pre-loaded students, we only technically require student_id and an institution code to look them up.
      // If manual registration without pre-loading is allowed, we would require cohort_id/programme_id.
      if (!student_id) {
        return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
      }
      if (!inviteCode) {
        return NextResponse.json({ error: 'Institution code is required' }, { status: 400 });
      }

      if (inviteCode && !programme_id && !cohort_id) {
        const institution = await prisma.institutions.findUnique({ 
          where: { invite_code: inviteCode } 
        });
        if (!institution) {
          return NextResponse.json({ error: 'Invalid institution code' }, { status: 403 });
        }
        try {
          await assertInstitutionAccess(institution.id);
        } catch (err) {
          if (err instanceof SubscriptionError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
          }
          throw err;
        }
        assignedInstitutionId = institution.id;
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
        try {
          await assertInstitutionAccess(assignedInstitutionId);
        } catch (err) {
          if (err instanceof SubscriptionError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
          }
          throw err;
        }
      } else if (cohort_id) {
        const cohortData = await prisma.cohorts.findUnique({
          where: { id: cohort_id }
        });

        if (!cohortData) {
          return NextResponse.json({ error: 'Invalid Cohort Selected' }, { status: 403 });
        }
        assignedInstitutionId = cohortData.institution_id;
        try {
          await assertInstitutionAccess(assignedInstitutionId);
        } catch (err) {
          if (err instanceof SubscriptionError) {
            return NextResponse.json({ error: err.message }, { status: err.status });
          }
          throw err;
        }
      }

      // Check if student_id is already taken at this institution
      const existingStudentId = await prisma.users.findFirst({
        where: { student_id, institution_id: assignedInstitutionId }
      });
      
      if (existingStudentId) {
        if (existingStudentId.password) {
          return NextResponse.json({ error: 'This Index Number is already registered.' }, { status: 400 });
        } else {
          // This is a pre-loaded student (they have no password).
          preloadedStudent = existingStudentId;
        }
      } else {
         // If they are not preloaded, and they didn't provide a cohort/program during manual signup:
         if (!cohort_id && !programme_id) {
           return NextResponse.json({ error: 'Index Number not found in pre-loaded roster. Please select a Program to register manually.' }, { status: 400 });
         }
      }

    } else if (role === 'LECTURER') {
      if (!inviteCode) {
        return NextResponse.json({ error: 'Invite code is required for lecturers' }, { status: 400 });
      }
      
      const institution = await prisma.institutions.findUnique({ 
        where: { invite_code: inviteCode } 
      });

      if (!institution) {
        return NextResponse.json({ error: 'Invalid Institution/Lecturer Invite Code' }, { status: 403 });
      }

      try {
        await assertInstitutionAccess(institution.id);
      } catch (err) {
        if (err instanceof SubscriptionError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
      
      assignedInstitutionId = institution.id;
    }

    if (assignedInstitutionId && role === 'STUDENT' && preloadedStudent) {
      try {
        await assertInstitutionAccess(assignedInstitutionId);
      } catch (err) {
        if (err instanceof SubscriptionError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    if (assignedInstitutionId && !(role === 'STUDENT' && preloadedStudent)) {
      try {
        await assertCanAddUsers(assignedInstitutionId, 1);
      } catch (err) {
        if (err instanceof SubscriptionError) {
          return NextResponse.json({ error: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    if (normalizedEmail) {
      const existingUser = await prisma.users.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== preloadedStudent?.id) {
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

    let user;

    if (role === 'STUDENT' && preloadedStudent) {
      // CLAIM PRELOADED ACCOUNT
      user = await prisma.users.update({
        where: { id: preloadedStudent.id },
        data: {
          name, // Update name in case they fixed a typo
          password: hashedPassword,
          device_id: device_id || undefined,
          email: normalizedEmail || undefined,
          programme_id: programme_id || undefined,
          cohort_id: cohort_id || undefined,
          level: level || undefined,
          semester: semester || undefined,
        },
        select: {
          id: true, email: true, name: true, role: true, student_id: true,
          cohort_id: true, programme_id: true, level: true, semester: true, institution_id: true,
        }
      });
    } else {
      // CREATE NEW ACCOUNT
      user = await prisma.users.create({
        data: {
          email: normalizedEmail || undefined,
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
          id: true, email: true, name: true, role: true, student_id: true,
          cohort_id: true, programme_id: true, level: true, semester: true, institution_id: true,
        }
      });
    }

    // Explicit enrollments only (selected courses / cohort). Students otherwise Join Class in the app.
    if (user.role === 'STUDENT') {
      if (selected_courses && Array.isArray(selected_courses) && selected_courses.length > 0) {
        await prisma.enrollments.createMany({
          data: selected_courses.map((courseId: string) => ({
            student_id: user.id,
            class_id: courseId
          })),
          skipDuplicates: true
        });
      } else if (user.cohort_id) {
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

    const institution = user.institution_id
      ? await prisma.institutions.findUnique({
          where: { id: user.institution_id },
          select: { name: true },
        })
      : null;

    if (user.role === 'ADMIN' || user.role === 'LECTURER') {
      await sendWelcomeEmail({
        to: user.email,
        name: user.name,
        role: user.role,
        institutionName: institution?.name,
      });
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
