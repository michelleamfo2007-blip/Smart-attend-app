import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@/lib/session';

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
      max_users, api_access, sso, custom_branding, notes,
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

    const institution = await prisma.institutions.update({
      where: { id },
      data: {
        name,
        domain,
        logo,
        contact_email,
        phone_number,
        subscription_plan,
        status,
        billing_cycle,
        trial_period,
        max_users: max_users ? parseInt(max_users) : null,
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
