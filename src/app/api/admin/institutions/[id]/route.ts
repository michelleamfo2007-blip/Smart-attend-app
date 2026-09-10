import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';
import { getPlan, normalizePlan } from '@/lib/plans';

function requireSuperAdmin(auth: Awaited<ReturnType<typeof getAuth>>) {
  return !auth || auth.userRole !== 'ADMIN' || auth.institutionId;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (requireSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admins only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name, domain, logo, contact_email, phone_number,
      subscription_plan, status, billing_cycle, trial_period,
      max_users, api_access, sso, custom_branding, notes, subscription_ends_at,
    } = body;

    if (domain) {
      const existing = await prisma.institutions.findFirst({
        where: {
          domain,
          id: { not: id },
        },
      });
      if (existing) {
        return NextResponse.json({ error: 'Domain is already in use by another institution' }, { status: 400 });
      }
    }

    const plan = subscription_plan ? normalizePlan(subscription_plan) : undefined;
    const planDef = plan ? getPlan(plan) : null;

    const institution = await prisma.institutions.update({
      where: { id },
      data: {
        name,
        domain,
        logo,
        contact_email,
        phone_number,
        ...(plan ? { subscription_plan: plan } : {}),
        status,
        billing_cycle,
        trial_period,
        max_users: max_users !== undefined && max_users !== '' && max_users !== null
          ? parseInt(String(max_users), 10)
          : planDef
            ? planDef.maxUsers
            : undefined,
        ...(subscription_ends_at ? { subscription_ends_at: new Date(subscription_ends_at) } : {}),
        api_access,
        sso,
        custom_branding,
        notes,
      },
    });

    return NextResponse.json({ institution });
  } catch (error) {
    console.error('Update institution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuth();
    if (requireSuperAdmin(auth)) {
      return NextResponse.json({ error: 'Forbidden: Super Admins only' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.institutions.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete institution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
