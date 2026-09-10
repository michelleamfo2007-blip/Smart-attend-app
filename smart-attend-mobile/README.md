# SmartAttend Mobile

Expo app for students and lecturers. It talks to the Next.js API in the repo root, not to Supabase.

## Run it (development)

1. Start the web API from the repo root: `npm run dev`
2. In this folder:

```bash
npm install
npx expo start
```

Defaults in `__DEV__`:

- iOS simulator / web: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`

Override anytime with `EXPO_PUBLIC_API_URL` (see `.env.example`). Physical devices need your computer’s LAN URL, e.g. `http://192.168.x.x:3000`.

## Production / store builds

Release builds (`!__DEV__`) call **`https://www.smartattend.co`** automatically.
For EAS, you can also set:

```
EXPO_PUBLIC_API_URL=https://www.smartattend.co
```

## Smoke test (live)

1. Open the app → student or lecturer login against `www.smartattend.co`
2. Lecturer: start a session, confirm GPS, show rotating QR
3. Student: allow location → scan QR → check-in succeeds within radius
4. Confirm the roster updates on lecturer / admin web

## Who uses it

- **Students** scan the lecturer’s rotating QR, stay inside the GPS radius, and track attendance.
- **Lecturers** start a session, show the QR, and watch check-ins. Claiming modules still happens on the web dashboard.
- **Admins** should use the web dashboard for school setup.
