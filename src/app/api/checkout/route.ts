import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy');

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    const institutionId = typeof decoded?.institutionId === 'string' ? decoded.institutionId : null;
    if (!decoded || !institutionId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const plan = typeof body.plan === 'string' ? body.plan : '';

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    let priceId = '';
    if (plan === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID || 'price_123';
    } else if (plan === 'starter') {
      priceId = process.env.STRIPE_STARTER_PRICE_ID || 'price_124';
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const institution = await prisma.institutions.findUnique({
      where: { id: institutionId },
    });

    const customerEmail =
      institution?.contact_email ||
      (typeof decoded.email === 'string' ? decoded.email : undefined);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/admin/settings?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/admin/settings?checkout=cancelled`,
      customer_email: customerEmail,
      client_reference_id: institutionId,
      metadata: {
        institutionId,
        plan,
      },
      subscription_data: {
        metadata: {
          institutionId,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
