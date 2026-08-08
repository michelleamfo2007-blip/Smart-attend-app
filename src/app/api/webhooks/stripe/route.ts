import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret as string);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      const institutionId = session.client_reference_id;
      const plan = session.metadata?.plan;

      if (institutionId) {
        // Update institution in database
        await prisma.institutions.update({
          where: { id: institutionId },
          data: {
            subscription_plan: plan || 'pro',
            status: 'active',
          },
        });
        console.log(`Successfully updated institution ${institutionId} to plan ${plan}`);
      }
      break;

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
      // Handle cancellation or update
      // For a real app, we'd look up the customer and update the institution status
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
