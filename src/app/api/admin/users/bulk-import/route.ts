import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getAuth } from '@/lib/session';
import { assertCanAddUsers, SubscriptionError } from '@/lib/subscription';
import { generateTemporaryPassword } from '@/lib/passwordReset';

export async function POST(req: Request) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { users, institutionId } = await req.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty user data' }, { status: 400 });
    }

    const targetInstitutionId = auth.institutionId || institutionId;
    if (!targetInstitutionId) {
      return NextResponse.json({ error: 'Institution ID is required' }, { status: 400 });
    }

    if (auth.institutionId && institutionId && institutionId !== auth.institutionId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const newUserCandidates = users.filter((userData: { email?: string; index_number?: string; role?: string }) => {
      const role = String(userData.role || '').toUpperCase();
      return role === 'STUDENT' || role === 'LECTURER';
    });

    try {
      await assertCanAddUsers(targetInstitutionId, newUserCandidates.length);
    } catch (err) {
      if (err instanceof SubscriptionError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }

    let successCount = 0;
    let failedCount = 0;
    const temporaryCredentials: { name: string; email: string; temporaryPassword: string }[] = [];

    for (const userData of users) {
      try {
        let existing = null;
        if (userData.email) {
          existing = await prisma.users.findUnique({ where: { email: userData.email } });
        }
        if (!existing && userData.index_number) {
          existing = await prisma.users.findFirst({
            where: { student_id: userData.index_number, institution_id: targetInstitutionId },
          });
        }

        if (!existing) {
          const role = String(userData.role || '').toUpperCase();
          if (role !== 'STUDENT' && role !== 'LECTURER') {
            failedCount++;
            continue;
          }

          try {
            await assertCanAddUsers(targetInstitutionId, 1);
          } catch (err) {
            if (err instanceof SubscriptionError) {
              failedCount++;
              continue;
            }
            throw err;
          }

          let passwordHash: string | null = null;
          if (role === 'LECTURER') {
            const temporaryPassword = generateTemporaryPassword();
            passwordHash = await bcrypt.hash(temporaryPassword, 10);
            temporaryCredentials.push({
              name: userData.name,
              email: userData.email,
              temporaryPassword,
            });
          }

          await prisma.users.create({
            data: {
              name: userData.name,
              email: role === 'STUDENT' ? undefined : userData.email || undefined,
              role,
              institution_id: targetInstitutionId,
              level: userData.level || null,
              semester: userData.semester || null,
              student_id: userData.index_number || null,
              cohort_id: userData.cohort_id || userData.program_id || null,
              password: passwordHash,
            },
          });
          successCount++;
        }
      } catch (error) {
        console.error('Failed to import user', userData, error);
        failedCount++;
      }
    }

    await prisma.import_history.create({
      data: {
        institution_id: targetInstitutionId,
        uploaded_by: auth.userId,
        file_name: 'bulk-import',
        import_type: 'users',
        success_count: successCount,
        failed_count: failedCount,
      },
    }).catch(() => undefined);

    await prisma.audit_logs.create({
      data: {
        user_id: auth.userId,
        action: 'BULK_IMPORT_USERS',
        details: `Imported ${successCount} users (${failedCount} failed); ${temporaryCredentials.length} lecturer temp passwords issued`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      count: successCount,
      failedCount,
      temporaryCredentials,
      message:
        temporaryCredentials.length > 0
          ? `Imported ${successCount} users. Copy the one-time lecturer passwords now — they are not shown again.`
          : `Imported ${successCount} users. Students still need to register on the mobile app.`,
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: 'Failed to process bulk import' }, { status: 500 });
  }
}
