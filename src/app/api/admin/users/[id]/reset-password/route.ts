import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAuth, isCrossTenant } from '@/lib/session';

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(10);
  let password = '';
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length];
  }
  return password;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuth();
    if (!auth || auth.userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const target = await prisma.users.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, institution_id: true },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (isCrossTenant(auth, target.institution_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashed = await bcrypt.hash(temporaryPassword, 10);

    await prisma.users.update({
      where: { id },
      data: { password: hashed },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: auth.userId,
        action: 'PASSWORD_RESET',
        details: `Admin reset password for ${target.name || target.email || id}`,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      temporaryPassword,
      user: { id: target.id, name: target.name, email: target.email },
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
