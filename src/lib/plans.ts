export type PlanId = 'free' | 'starter' | 'pro' | 'enterprise';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  maxUsers: number | null; // null = unlimited
  maxAdmins: number | null;
  priceMonthlyUsd: number | null;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    maxUsers: 10,
    maxAdmins: 1,
    priceMonthlyUsd: 0,
    features: ['Up to 10 users', 'Basic attendance'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    maxUsers: 50,
    maxAdmins: 1,
    priceMonthlyUsd: 29,
    features: ['Up to 50 users', '1 admin', 'Basic reporting'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    maxUsers: 500,
    maxAdmins: 5,
    priceMonthlyUsd: 99,
    features: ['Up to 500 users', '5 admins', 'Advanced analytics', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    maxUsers: null,
    maxAdmins: null,
    priceMonthlyUsd: 299,
    features: ['Unlimited users', 'Unlimited admins', 'SSO', 'Custom branding'],
  },
};

export function normalizePlan(plan?: string | null): PlanId {
  const value = String(plan || 'starter').toLowerCase();
  if (value === 'free' || value === 'starter' || value === 'pro' || value === 'enterprise') {
    return value;
  }
  return 'starter';
}

export function getPlan(plan?: string | null): PlanDefinition {
  return PLANS[normalizePlan(plan)];
}

export function resolveMaxUsers(institution: {
  subscription_plan?: string | null;
  max_users?: number | null;
}) {
  if (typeof institution.max_users === 'number' && institution.max_users > 0) {
    return institution.max_users;
  }
  return getPlan(institution.subscription_plan).maxUsers;
}

export function addBillingPeriod(from: Date, billingCycle?: string | null) {
  const end = new Date(from);
  if (String(billingCycle || 'monthly').toLowerCase() === 'annual') {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/** All new schools get a 6-month free trial by default. */
export const TRIAL_MONTHS = 6;

export function addTrialPeriod(from: Date, months = TRIAL_MONTHS) {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  return end;
}

/** @deprecated Prefer addTrialPeriod (months). Kept for callers that pass day counts. */
export function addTrialDays(from: Date, days = TRIAL_MONTHS * 30) {
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end;
}

export function formatUserLimit(maxUsers: number | null | undefined) {
  if (maxUsers == null) return 'Unlimited users';
  return `Up to ${maxUsers} users`;
}
