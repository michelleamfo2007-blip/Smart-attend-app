import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      institutionName, domain, contactEmail, plan, 
      adminName, adminEmail, adminPassword 
    } = body;

    // 1. Basic Validation
    if (!institutionName || !contactEmail || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Check if admin email is already taken
    const existingUser = await prisma.users.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'Admin email is already registered' }, { status: 400 });
    }

    // 3. Check if domain is taken (if provided)
    if (domain) {
      const existingInst = await prisma.institutions.findUnique({
        where: { domain },
      });
      if (existingInst) {
        return NextResponse.json({ error: 'Domain is already registered to another institution' }, { status: 400 });
      }
    }

    // 4. Create the Institution and the Admin User in a Transaction
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const generatedInviteCode = `LECTURER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      // Create Institution
      const newInstitution = await tx.institutions.create({
        data: {
          name: institutionName,
          domain: domain || null,
          contact_email: contactEmail,
          subscription_plan: plan || 'starter',
          status: 'active',
          billing_cycle: 'monthly',
          trial_period: true,
          invite_code: generatedInviteCode,
        }
      });

      // Create Admin User (Tenant Admin)
      const newAdmin = await tx.users.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN', // Database requires ADMIN, LECTURER, or STUDENT
          institution_id: newInstitution.id, // Links them to this specific tenant
        }
      });

      return { newInstitution, newAdmin };
    });

    // 5. Generate JWT for auto-login
    const token = await signToken({
      userId: result.newAdmin.id,
      email: result.newAdmin.email,
      role: result.newAdmin.role,
      institutionId: result.newInstitution.id,
    });

    const response = NextResponse.json({
      success: true,
      institution: result.newInstitution,
      user: {
        id: result.newAdmin.id,
        email: result.newAdmin.email,
        name: result.newAdmin.name,
      }
    }, { status: 201 });

    // Set auth cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return response;

  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal server error during onboarding' }, { status: 500 });
  }
}
