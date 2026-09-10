export type EnvFlag = {
  key: string;
  set: boolean;
  required: boolean;
  notes?: string;
};

function isSet(value?: string | null) {
  return Boolean(value && value.trim() && value !== 'dummy' && !value.startsWith('price_123') && !value.startsWith('price_124'));
}

/** Presence-only check — never returns secret values. */
export function getEnvStatus() {
  const jwtSet = isSet(process.env.JWT_SECRET) || isSet(process.env.SUPABASE_JWT_SECRET);
  const databaseSet = isSet(process.env.DATABASE_URL);
  const directUrlSet = isSet(process.env.DIRECT_URL);
  const appUrlSet = isSet(process.env.NEXT_PUBLIC_APP_URL) || isSet(process.env.APP_URL);
  const resendSet = isSet(process.env.RESEND_API_KEY);
  const emailFromSet = isSet(process.env.EMAIL_FROM);
  const stripeSecretSet = isSet(process.env.STRIPE_SECRET_KEY);
  const stripeWebhookSet = isSet(process.env.STRIPE_WEBHOOK_SECRET);
  const stripeStarterSet = isSet(process.env.STRIPE_STARTER_PRICE_ID);
  const stripeProSet = isSet(process.env.STRIPE_PRO_PRICE_ID);

  const flags: EnvFlag[] = [
    { key: 'DATABASE_URL', set: databaseSet, required: true, notes: 'Postgres connection (pooled OK)' },
    { key: 'DIRECT_URL', set: directUrlSet, required: true, notes: 'Direct Postgres URL for migrations' },
    { key: 'JWT_SECRET (or SUPABASE_JWT_SECRET)', set: jwtSet, required: true, notes: 'Signs web + mobile tokens' },
    { key: 'NEXT_PUBLIC_APP_URL', set: appUrlSet, required: true, notes: 'Public site URL for Stripe redirects + emails' },
    { key: 'RESEND_API_KEY', set: resendSet, required: false, notes: 'Welcome emails for admin/lecturer' },
    { key: 'EMAIL_FROM', set: emailFromSet, required: false, notes: 'Verified sender on Resend' },
    { key: 'STRIPE_SECRET_KEY', set: stripeSecretSet, required: false, notes: 'Needed for paid checkout' },
    { key: 'STRIPE_WEBHOOK_SECRET', set: stripeWebhookSet, required: false, notes: 'Needed for Stripe webhooks' },
    { key: 'STRIPE_STARTER_PRICE_ID', set: stripeStarterSet, required: false },
    { key: 'STRIPE_PRO_PRICE_ID', set: stripeProSet, required: false },
  ];

  const missingRequired = flags.filter((f) => f.required && !f.set).map((f) => f.key);
  const stripeReady =
    stripeSecretSet && stripeWebhookSet && stripeStarterSet && stripeProSet;
  const emailReady = resendSet;

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    productionReady: missingRequired.length === 0,
    stripeReady,
    emailReady,
    missingRequired,
    flags,
  };
}

export function assertProductionJwtConfigured() {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret || secret === 'fallback-secret-for-development-only') {
    throw new Error(
      'JWT_SECRET (or SUPABASE_JWT_SECRET) must be set in production. Refusing to sign or verify tokens with a fallback.'
    );
  }
}

export function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'dummy') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }
    return null;
  }
  return key;
}
