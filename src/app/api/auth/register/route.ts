import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password, name, role, inviteCode } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (role === 'LECTURER') {
      const settings = await prisma.system_settings.findUnique({ where: { id: 'global' } });
      const validCode = settings?.lecturer_invite_code || process.env.LECTURER_INVITE_CODE || 'LECTURER-2026';
      if (inviteCode !== validCode) {
        return NextResponse.json({ error: 'Invalid Institution/Lecturer Invite Code' }, { status: 403 });
      }
    }

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || 'STUDENT',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
