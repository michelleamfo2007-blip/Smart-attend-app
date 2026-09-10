# SmartAttend

Campus attendance SaaS. Students check in on the **mobile app**. Lecturers and school admins run sessions and the school on the **web dashboard**.

## How it works

1. A school signs up on the web. An admin sets up the catalogue, programmes, users, and modules.
2. A lecturer starts a class session (web or phone). The app records GPS and shows a QR code that rotates every 10 seconds.
3. A student scans that QR on their phone. They must be within about 50 metres, and the account is bound to one device.
4. Admins see attendance, at-risk students, and school settings.

## Stack

| Part | Tech |
|------|------|
| Web dashboard | Next.js 16, Prisma, PostgreSQL |
| Auth | JWT (httpOnly cookie on web, Bearer token on mobile) |
| Mobile app | Expo (React Native) in `smart-attend-mobile/` |

The mobile app talks only to the Next.js API. It does not use Supabase.

## Web app

```bash
npm install
npx prisma generate
npm run dev
```

Requires `DATABASE_URL` and `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) in `.env`. In production, a JWT secret is required.

To send a welcome email after **admin** or **lecturer** signup, also add:

```
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=SmartAttend <noreply@yourdomain.com>
NEXT_PUBLIC_APP_URL=https://www.smartattend.co
```

Get a free API key at [resend.com](https://resend.com). Until you verify your domain, Resend only delivers to the email on your Resend account.

Open [http://localhost:3000](http://localhost:3000).

## Mobile app

See [`smart-attend-mobile/README.md`](smart-attend-mobile/README.md).

## Roles

- **Student** — mark attendance, history, disputes (mobile)
- **Lecturer** — start/end sessions, rotating QR, live roster (web or mobile). Claim modules and schedules on the web.
- **School admin** — users, catalogue, programmes, settings (web)
- **Super admin** — all institutions (web)
