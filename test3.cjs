const { signToken } = require('./src/lib/auth.ts'); // Can't do this easily in CJS

async function run() {
  const res = await fetch('http://localhost:3000/api/admin/users');
  console.log(res.status);
}
run();
