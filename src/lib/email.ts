const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'throwaway.email',
  'yopmail.com',
  'trashmail.com',
  'fakeinbox.com',
  'getnada.com',
  'dispostable.com',
  'mailnesia.com',
  'maildrop.cc',
  'discard.email',
  'mailcatch.com',
  'moakt.com',
  'inboxkitten.com',
  'trashmailer.com',
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getEmailError(email: unknown): string | null {
  if (typeof email !== 'string' || !email.trim()) {
    return 'A real email address is required.';
  }

  const normalized = normalizeEmail(email);
  if (normalized.length > 254 || !EMAIL_RE.test(normalized)) {
    return 'Enter a valid email address.';
  }

  const domain = normalized.split('@')[1];
  if (!domain || !domain.includes('.') || DISPOSABLE_DOMAINS.has(domain)) {
    return 'Use a real email address you can access, not a temporary inbox.';
  }

  return null;
}

type WelcomeRole = 'ADMIN' | 'LECTURER' | 'STUDENT' | string;

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://www.smartattend.co'
  ).replace(/\/$/, '');
}

function welcomeCopy(role: WelcomeRole, institutionName?: string | null) {
  const school = institutionName?.trim();
  const atSchool = school ? ` at ${school}` : '';

  if (role === 'ADMIN') {
    return {
      headline: `Welcome to SmartAttend${atSchool}`,
      body: `Your school workspace is ready. Sign in to set up your catalogue, invite lecturers, and add students.`,
      cta: 'Open admin dashboard',
      href: `${appUrl()}/login`,
    };
  }

  if (role === 'LECTURER') {
    return {
      headline: `Welcome to SmartAttend${atSchool}`,
      body: `Your lecturer account is ready. Start a class session on the web or the mobile app, then show the rotating QR code so students can check in.`,
      cta: 'Sign in',
      href: `${appUrl()}/login`,
    };
  }

  return {
    headline: `Welcome to SmartAttend${atSchool}`,
    body: `Your student account is ready. Open the SmartAttend mobile app, sign in, and scan the QR code in class to mark attendance.`,
    cta: 'Sign in',
    href: `${appUrl()}/login`,
  };
}

function welcomeHtml(name: string, role: WelcomeRole, institutionName?: string | null) {
  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const copy = welcomeCopy(role, institutionName);

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#e01e37;padding:24px 32px;color:#ffffff;font-size:20px;font-weight:700;">
                SmartAttend
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(firstName)},</p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(copy.headline)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(copy.body)}</p>
                <p style="margin:0 0 28px;">
                  <a href="${copy.href}" style="display:inline-block;background:#e01e37;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:14px;">
                    ${escapeHtml(copy.cta)}
                  </a>
                </p>
                <p style="margin:0;font-size:13px;color:#64748b;">If you did not create this account, you can ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendMail(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'SmartAttend <beth.t@example.com>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY is not set. Skipped sending "${subject}" to ${to}`);
    return { sent: false as const };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Resend failed (${res.status}): ${details}`);
  }

  return { sent: true as const };
}

export async function sendWelcomeEmail(options: {
  to?: string | null;
  name?: string | null;
  role?: WelcomeRole | null;
  institutionName?: string | null;
}) {
  if (options.role === 'STUDENT') return { sent: false as const };
  if (!options.to) return { sent: false as const };

  const emailError = getEmailError(options.to);
  if (emailError) {
    console.warn(`[email] skipped welcome mail: ${emailError}`);
    return { sent: false as const };
  }

  const to = normalizeEmail(options.to);
  const name = options.name?.trim() || 'there';
  const role = options.role || 'LECTURER';
  const copy = welcomeCopy(role, options.institutionName);
  const text = `Hi ${name.split(/\s+/)[0] || 'there'},\n\n${copy.headline}.\n\n${copy.body}\n\n${copy.href}\n`;

  try {
    return await sendMail(to, copy.headline, welcomeHtml(name, role, options.institutionName), text);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { sent: false as const };
  }
}

export async function sendPasswordResetEmail(options: {
  to: string;
  name?: string | null;
  resetUrl: string;
}) {
  const emailError = getEmailError(options.to);
  if (emailError) {
    return { sent: false as const, error: emailError };
  }

  const to = normalizeEmail(options.to);
  const firstName = options.name?.trim()?.split(/\s+/)[0] || 'there';
  const subject = 'Reset your SmartAttend password';
  const text = `Hi ${firstName},\n\nReset your SmartAttend password using this link (expires in 1 hour):\n${options.resetUrl}\n\nIf you did not ask for this, you can ignore this email.\n`;
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5;color:#111">
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>We received a request to reset your SmartAttend password.</p>
    <p><a href="${escapeHtml(options.resetUrl)}" style="display:inline-block;background:#e01e37;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p>
    <p style="color:#64748b;font-size:14px">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
  </body></html>`;

  try {
    return await sendMail(to, subject, html, text);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { sent: false as const, error: 'Failed to send email' };
  }
}
