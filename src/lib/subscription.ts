import prisma from '@/lib/prisma';
import { addBillingPeriod, resolveMaxUsers } from '@/lib/plans';

export class SubscriptionError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function getInstitutionSubscription(institutionId: string) {
  return prisma.institutions.findUnique({
    where: { id: institutionId },
    select: {
      id: true,
      name: true,
      status: true,
      subscription_plan: true,
      billing_cycle: true,
      max_users: true,
      subscription_ends_at: true,
    },
  });
}

/** Suspends the school if the paid period has ended. */
export async function refreshInstitutionSubscription(institutionId: string) {
  const institution = await getInstitutionSubscription(institutionId);
  if (!institution) return null;

  if (
    institution.status === 'active' &&
    institution.subscription_ends_at &&
    new Date(institution.subscription_ends_at).getTime() < Date.now()
  ) {
    return prisma.institutions.update({
      where: { id: institutionId },
      data: { status: 'expired' },
      select: {
        id: true,
        name: true,
        status: true,
        subscription_plan: true,
        billing_cycle: true,
        max_users: true,
        subscription_ends_at: true,
      },
    });
  }

  return institution;
}

export async function assertInstitutionAccess(institutionId: string) {
  const institution = await refreshInstitutionSubscription(institutionId);
  if (!institution) {
    throw new SubscriptionError('Institution not found.', 404);
  }

  if (institution.status === 'suspended') {
    throw new SubscriptionError(
      'This school account is suspended. Contact support or renew billing to continue.',
      403
    );
  }

  if (institution.status === 'expired') {
    throw new SubscriptionError(
      'This school subscription has ended. Renew your plan to continue using SmartAttend.',
      403
    );
  }

  if (institution.status !== 'active') {
    throw new SubscriptionError(
      `This school account is ${institution.status}. Access is blocked until billing is active.`,
      403
    );
  }

  return institution;
}

export async function assertCanAddUsers(institutionId: string, addingCount = 1) {
  const institution = await assertInstitutionAccess(institutionId);
  const maxUsers = resolveMaxUsers(institution);

  if (maxUsers == null) {
    return { institution, maxUsers, currentUsers: null as number | null };
  }

  const currentUsers = await prisma.users.count({
    where: { institution_id: institutionId },
  });

  if (currentUsers + addingCount > maxUsers) {
    throw new SubscriptionError(
      `Your ${String(institution.subscription_plan || 'current').toUpperCase()} plan allows up to ${maxUsers} users. You have ${currentUsers}. Upgrade your plan or remove users to add more.`,
      403
    );
  }

  return { institution, maxUsers, currentUsers };
}

export async function startOrExtendSubscription(
  institutionId: string,
  opts?: { plan?: string; billingCycle?: string | null; from?: Date; setMaxUsers?: boolean }
) {
  const institution = await prisma.institutions.findUnique({
    where: { id: institutionId },
    select: { billing_cycle: true, subscription_ends_at: true, max_users: true },
  });
  if (!institution) return null;

  const from =
    opts?.from ||
    (institution.subscription_ends_at && new Date(institution.subscription_ends_at) > new Date()
      ? new Date(institution.subscription_ends_at)
      : new Date());

  const endsAt = addBillingPeriod(from, opts?.billingCycle || institution.billing_cycle);
  const planId = opts?.plan;
  const planMax = planId ? resolveMaxUsers({ subscription_plan: planId, max_users: null }) : null;

  return prisma.institutions.update({
    where: { id: institutionId },
    data: {
      status: 'active',
      trial_period: false,
      ...(planId ? { subscription_plan: planId } : {}),
      ...(opts?.billingCycle ? { billing_cycle: opts.billingCycle } : {}),
      subscription_ends_at: endsAt,
      ...(opts?.setMaxUsers !== false && planMax != null
        ? { max_users: planMax }
        : planId && planMax == null
          ? { max_users: null }
          : {}),
    },
  });
}

export async function expireInstitutionSubscription(institutionId: string) {
  return prisma.institutions.update({
    where: { id: institutionId },
    data: { status: 'expired' },
  });
}
