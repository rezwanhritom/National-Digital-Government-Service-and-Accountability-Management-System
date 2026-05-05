import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ACCOUNT_STATUS, ALL_ROLES } from '../constants/roles.js';
import { hashPassword } from '../services/passwordService.js';
import { connectMongoWithFallback } from '../utils/mongoConnectWithFallback.js';

async function run() {
  const [, , emailArg, usernameArg, passwordArg, fullNameArg] = process.argv;
  const email = String(emailArg || '').toLowerCase().trim();
  const username = String(usernameArg || '').toLowerCase().trim();
  const password = String(passwordArg || '');
  const name = String(fullNameArg || '').trim();

  if (!email || !username || !password || !name) {
    console.log('Usage: npm run user:create-privileged -- <email> <username> <password> <full_name>');
    process.exit(1);
  }
  await connectMongoWithFallback({ retries: 6, timeoutMs: 7000 });
  const passwordHash = await hashPassword(password);
  const update = {
    name,
    username,
    email,
    password: passwordHash,
    role: ALL_ROLES[0],
    roles: ALL_ROLES,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  };

  const user = await User.findOneAndUpdate(
    { email },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`User ready: ${user.email}`);
  console.log(`Username: ${user.username}`);
  console.log(`Roles: ${user.roles.join(', ')}`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
