// Using built-in fetch (Node v18+)

const BASE_URL = 'http://localhost:3000/api/auth';

async function testAuth() {
  const users = [
    { email: 'admin@test.com', password: 'password123', name: 'Admin User', role: 'ADMIN' },
    { email: 'lecturer@test.com', password: 'password123', name: 'Lecturer User', role: 'LECTURER' },
    { email: 'student@test.com', password: 'password123', name: 'Student User', role: 'STUDENT' },
  ];

  console.log('--- Registering Users ---');
  for (const user of users) {
    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Registered ${user.role}: ${data.user.email}`);
      } else {
        console.log(`❌ Failed to register ${user.role}: ${data.error}`);
      }
    } catch (e) {
      console.log(`❌ Error registering ${user.role}:`, e.message);
    }
  }

  console.log('\n--- Logging In Users ---');
  for (const user of users) {
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: user.password })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Logged in ${user.role}: ${data.user.email}`);
      } else {
        console.log(`❌ Failed to log in ${user.role}: ${data.error}`);
      }
    } catch (e) {
      console.log(`❌ Error logging in ${user.role}:`, e.message);
    }
  }
}

testAuth();
