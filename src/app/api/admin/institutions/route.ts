import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    // Only Super Admins (ADMIN role + NO institutionId) can manage all institutions
    if (!payload || payload.role !== 'ADMIN' || payload.institutionId) {
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
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    // Only Super Admins (ADMIN role + NO institutionId) can create institutions manually
    if (!payload || payload.role !== 'ADMIN' || payload.institutionId) {
      return NextResponse.json({ error: 'Forbidden: Super Admins only' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, domain, logo, contact_email, phone_number,
      subscription_plan, status, billing_cycle, trial_period, 
      max_users, api_access, sso, custom_branding, notes 
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if domain already exists
    if (domain) {
      const existing = await prisma.institutions.findUnique({
        where: { domain },
      });
      if (existing) {
        return NextResponse.json({ error: 'Domain is already in use' }, { status: 400 });
      }
    }

    const institution = await prisma.institutions.create({
      data: {
        name,
        domain,
        logo,
        contact_email,
        phone_number,
        subscription_plan: subscription_plan || 'free',
        status: status || 'active',
        billing_cycle: billing_cycle || 'monthly',
        trial_period: trial_period || false,
        max_users: max_users ? parseInt(max_users) : null,
        api_access: api_access || false,
        sso: sso || false,
        custom_branding: custom_branding || false,
        notes,
      },
    });

    return NextResponse.json({ institution }, { status: 201 });
  } catch (error) {
    console.error('Create institution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
