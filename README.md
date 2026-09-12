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

Requires `DATABASE_URL` and `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) in `.env`. In production, a JWT secret is **required** — the app will refuse to sign tokens without it.

### Monitoring

- Public health probe: `GET /api/health` (checks database). Point UptimeRobot / Better Stack at `https://www.smartattend.co/api/health`.
- Admin dashboard shows failed check-ins and device alerts for the last 24 hours (also in Audit Logs).
- Session scheduler: `GET /api/cron/sessions` (set `CRON_SECRET` in production). Vercel Cron hits it every 5 minutes (`vercel.json`). Lecturer/kiosk/staff polls also advance sessions for that school.

### Institution timezone & auto sessions

- Each school stores an IANA `timezone` (auto-detected at onboard / institution create).
- Configurable morning/afternoon/evening periods live on the institution (Settings → Timezone & class periods).
- Classes with weekday + start/end times get `scheduled → active → closed` sessions automatically in the school timezone.
- Geofence for auto sessions prefers classroom lat/lng. Manual Start Session remains as an override.
- **Attendance methods (Phase 2):** secure short-lived QR tokens (~15s refresh) and short 6-digit codes (rooms without a projector). Sessions default to `both`.
- **Classroom Mode (Phase 3):** registered room displays at `/kiosk/[token]` auto-show the active timetable QR (course, room, time, status). Waiting state when inactive.
- **Lecturer geofence (Phase 4):** on-demand GPS when opening session controls (not background tracking). Institution policy `off | warn | block` plus optional campus fallback; classroom GPS preferred. Verifications logged in `lecturer_location_verifications`.
- **Librarian dashboard (Phase 5):** `/dashboard/staff` shows active/scheduled sessions, Present/Late/Absent roster, staff scan/manual assist (manual requires reason), history, and suspicious flags. Self check-in vs staff-verified is recorded. Late grace minutes are configurable in Settings.
- **Role permissions (Phase 6):** Tenant Admin configures lecturer/librarian capabilities under Settings → Role permissions. Lecturers cannot manage the institution. Short codes, manual mark, edit/delete attendance are gated; delete stays off by default.
- **Audit & suspicious activity (Phase 7):** Structured audit fields (institution/session/student/role/result/metadata). Auto-detects repeated failures, duplicate scans, and device tamper signals into librarian flags. Admin Audit filters + librarian Audit tab. Lecturers get in-app “class started” notifications when timetable opens a session.

Copy [`.env.example`](./.env.example) and fill in values.

### Production secrets (Vercel)

For **smart-attend-app-trgr** (`https://www.smartattend.co`):

1. Open [Vercel → Project → Settings → Environment Variables](https://vercel.com/dashboard)
2. Set these for **Production** (and Preview if you use it):

| Variable | Required? |
|----------|-----------|
| `DATABASE_URL` | Yes |
| `DIRECT_URL` | Yes |
| `JWT_SECRET` | Yes (long random string) |
| `NEXT_PUBLIC_APP_URL` | Yes (`https://www.smartattend.co`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Recommended (welcome + forgot-password emails) |
| Stripe keys | Optional — not required if you bill via **Paystack** later |

3. Redeploy after changing env vars.
4. Sign in as an admin → **Settings** → **Production secrets** panel (shows Set/Missing only, never values).

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
