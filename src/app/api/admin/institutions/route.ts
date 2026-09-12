import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { addBillingPeriod, addTrialPeriod, getPlan, normalizePlan } from '@/lib/plans';
import {
  DEFAULT_SESSION_PERIODS,
  normalizeTimezone,
} from '@/lib/institutionTime';

function requireSuperAdmin(auth: Awaited<ReturnType<typeof getAuth>>) {
  return !auth || auth.userRole !== 'ADMIN' || auth.institutionId;
}

export async function GET() {
  try {
    const auth = await getAuth();
    if (requireSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admins only' }, { status: 403 });
    }

    const institutions = await prisma.institutions.findMany({
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ institutions });
  } catch (error) {
    console.error('Fetch institutions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (requireSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admins only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, domain, logo, contact_email, phone_number,
      subscription_plan, status, billing_cycle, trial_period,
      max_users, api_access, sso, custom_branding, notes, timezone,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (domain) {
      const existing = await prisma.institutions.findUnique({
        where: { domain },
      });
      if (existing) {
        return NextResponse.json({ error: 'Domain is already in use' }, { status: 400 });
      }
    }

    const plan = normalizePlan(subscription_plan || 'starter');
    const planDef = getPlan(plan);
    const cycle = billing_cycle || 'monthly';
    const onTrial = trial_period !== false;
    const endsAt = onTrial ? addTrialPeriod(new Date()) : addBillingPeriod(new Date(), cycle);

    const institution = await prisma.institutions.create({
      data: {
        name,
        domain,
        logo,
        contact_email,
        phone_number,
        subscription_plan: plan,
        status: status || 'active',
        billing_cycle: cycle,
        trial_period: onTrial,
        max_users: max_users ? parseInt(max_users, 10) : planDef.maxUsers,
        subscription_ends_at: endsAt,
        api_access: api_access || false,
        sso: sso || false,
        custom_branding: custom_branding || false,
        notes,
        timezone: normalizeTimezone(timezone),
        session_periods: DEFAULT_SESSION_PERIODS,
      },
    });

    return NextResponse.json({ institution }, { status: 201 });
  } catch (error) {
    console.error('Create institution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
