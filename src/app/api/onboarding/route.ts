import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { getEmailError, normalizeEmail, sendWelcomeEmail } from '@/lib/email';
import { addTrialPeriod, getPlan, normalizePlan } from '@/lib/plans';
import {
  DEFAULT_SESSION_PERIODS,
  normalizeTimezone,
} from '@/lib/institutionTime';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      institutionName, domain, contactEmail, plan, 
      adminName, adminEmail, adminPassword, timezone,
    } = body;

    // 1. Basic Validation
    if (!institutionName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const contactEmailError = getEmailError(contactEmail);
    if (contactEmailError) {
      return NextResponse.json({ error: `School contact email: ${contactEmailError}` }, { status: 400 });
    }

    const adminEmailError = getEmailError(adminEmail);
    if (adminEmailError) {
      return NextResponse.json({ error: `Admin email: ${adminEmailError}` }, { status: 400 });
    }

    const normalizedContactEmail = normalizeEmail(contactEmail);
    const normalizedAdminEmail = normalizeEmail(adminEmail);
    const selectedPlan = normalizePlan(plan || 'starter');
    const planDef = getPlan(selectedPlan);
    // Every new school gets a 6-month free trial; paid periods start after checkout/renewal.
    const subscriptionEndsAt = addTrialPeriod(new Date());

    // 2. Check if Admin Email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedAdminEmail }
    });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // 3. Check if Domain already exists (if provided)
    if (domain) {
      const existingInst = await prisma.institutions.findUnique({
        where: { domain }
      });
      if (existingInst) {
        return NextResponse.json({ error: 'Domain is already registered to another institution' }, { status: 400 });
      }
    }

    // 4. Create the Institution and the Admin User in a Transaction
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const generatedInviteCode = `LECTURER-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const newInstitution = await tx.institutions.create({
        data: {
          name: institutionName,
          domain: domain || null,
          contact_email: normalizedContactEmail,
          subscription_plan: selectedPlan,
          status: 'active',
          billing_cycle: 'monthly',
          trial_period: true,
          max_users: planDef.maxUsers,
          subscription_ends_at: subscriptionEndsAt,
          invite_code: generatedInviteCode,
          timezone: normalizeTimezone(timezone),
          session_periods: DEFAULT_SESSION_PERIODS,
        }
      });

      const newAdmin = await tx.users.create({
        data: {
          name: adminName,
          email: normalizedAdminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          institution_id: newInstitution.id,
        }
      });

      return { newInstitution, newAdmin };
    });

    const token = await signToken({
      userId: result.newAdmin.id,
      email: result.newAdmin.email,
      role: result.newAdmin.role,
      institutionId: result.newInstitution.id,
    });

    await sendWelcomeEmail({
      to: result.newAdmin.email,
      name: result.newAdmin.name,
      role: result.newAdmin.role,
      institutionName: result.newInstitution.name,
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

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error) {
    console.error('Onboarding API Error:', error);
    return NextResponse.json({ error: 'Internal server error during onboarding' }, { status: 500 });
  }
}
