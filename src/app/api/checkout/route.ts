import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy', {
  apiVersion: '2024-04-10',
});

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded || !decoded.institutionId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    // Determine price ID based on plan (these would be actual price IDs in a real setup)
    let priceId = '';
    if (plan === 'pro') {
      priceId = process.env.STRIPE_PRO_PRICE_ID || 'price_123';
    } else if (plan === 'starter') {
      priceId = process.env.STRIPE_STARTER_PRICE_ID || 'price_124';
    } else {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Get institution to pass customer email if available
    const institution = await prisma.institutions.findUnique({
      where: { id: decoded.institutionId }
    });

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
      customer_email: institution?.contact_email || decoded.email,
      client_reference_id: decoded.institutionId,
      metadata: {
        institutionId: decoded.institutionId,
        plan: plan,
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
