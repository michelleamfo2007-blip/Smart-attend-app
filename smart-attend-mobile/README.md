# SmartAttend Mobile

Expo app for students and lecturers. It talks to the Next.js API in the repo root, not to Supabase.

## Run it

1. Start the web API from the repo root: `npm run dev`
2. In this folder:

```bash
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` if the API is not on the default host:

- iOS simulator / web: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- Physical device: your computer’s LAN URL, e.g. `http://192.168.x.x:3000`

## Who uses it

- **Students** scan the lecturer’s rotating QR, stay inside the GPS radius, and track attendance.
- **Lecturers** start a session, show the QR, and watch check-ins. Claiming modules still happens on the web dashboard.
- **Admins** should use the web dashboard for school setup.
