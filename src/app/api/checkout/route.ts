import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getStripeSecretKey } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs first.' },
        { status: 503 }
      );
    }

    const starterPrice = process.env.STRIPE_STARTER_PRICE_ID;
    const proPrice = process.env.STRIPE_PRO_PRICE_ID;
    if (!starterPrice || !proPrice || starterPrice.startsWith('price_12') || proPrice.startsWith('price_12')) {
      return NextResponse.json(
        { error: 'Stripe price IDs are not configured (STRIPE_STARTER_PRICE_ID / STRIPE_PRO_PRICE_ID).' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(stripeKey);

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
      priceId = proPrice;
    } else if (plan === 'starter') {
      priceId = starterPrice;
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const institution = await prisma.institutions.findUnique({
      where: { id: institutionId },
    });

    const customerEmail =
      institution?.contact_email ||
      (typeof decoded.email === 'string' ? decoded.email : undefined);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard/admin/settings?checkout=success`,
      cancel_url: `${appUrl}/dashboard/admin/settings?checkout=cancelled`,
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
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    const message =
      typeof error?.message === 'string' && error.message.includes('STRIPE_SECRET_KEY')
        ? error.message
        : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
