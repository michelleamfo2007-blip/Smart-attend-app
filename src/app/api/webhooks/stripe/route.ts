import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';
import {
  expireInstitutionSubscription,
  startOrExtendSubscription,
} from '@/lib/subscription';
import { getPlan, normalizePlan } from '@/lib/plans';
import { getStripeSecretKey } from '@/lib/env';

export async function POST(req: Request) {
  let stripeKey: string | null;
  try {
    stripeKey = getStripeSecretKey();
  } catch {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const institutionId = session.client_reference_id || session.metadata?.institutionId;
      const plan = normalizePlan(session.metadata?.plan || 'pro');

      if (institutionId) {
        await startOrExtendSubscription(institutionId, {
          plan,
          billingCycle: 'monthly',
          from: new Date(),
          setMaxUsers: true,
        });
        console.log(`Institution ${institutionId} activated on ${plan} (${getPlan(plan).maxUsers ?? 'unlimited'} seats)`);
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const institutionId = invoice.metadata?.institutionId;
      if (institutionId) {
        await startOrExtendSubscription(institutionId, {
          plan: invoice.metadata?.plan,
          from: new Date(),
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const institutionId = subscription.metadata?.institutionId;
      if (institutionId) {
        await expireInstitutionSubscription(institutionId);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const institutionId = subscription.metadata?.institutionId;
      if (!institutionId) break;

      if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
        await expireInstitutionSubscription(institutionId);
      } else if (subscription.status === 'active' || subscription.status === 'trialing') {
        const periodEndUnix = (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
        const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : undefined;
        const plan = subscription.metadata?.plan;
        await prisma.institutions.update({
          where: { id: institutionId },
          data: {
            status: 'active',
            ...(plan ? { subscription_plan: plan } : {}),
            ...(periodEnd ? { subscription_ends_at: periodEnd } : {}),
          },
        });
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
