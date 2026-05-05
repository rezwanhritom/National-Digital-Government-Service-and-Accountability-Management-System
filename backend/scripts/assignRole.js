import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { ACCOUNT_STATUS, ALL_ROLES } from '../constants/roles.js';
import { connectMongoWithFallback } from '../utils/mongoConnectWithFallback.js';

async function run() {
  const [, , emailArg, roleArg, statusArg] = process.argv;
  const email = String(emailArg || '').toLowerCase().trim();
  const role = String(roleArg || '').trim();
  const accountStatus = String(statusArg || ACCOUNT_STATUS.ACTIVE).trim();

  if (!email || !role) {
    console.log('Usage: npm run role:assign -- <email> <role> [status]');
    console.log(`Allowed roles: ${ALL_ROLES.join(', ')}`);
    process.exit(1);
  }
  if (!ALL_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Allowed: ${ALL_ROLES.join(', ')}`);
    process.exit(1);
  }
  if (!Object.values(ACCOUNT_STATUS).includes(accountStatus)) {
    console.error(`Invalid status "${accountStatus}". Allowed: ${Object.values(ACCOUNT_STATUS).join(', ')}`);
    process.exit(1);
  }
  await connectMongoWithFallback({ retries: 6, timeoutMs: 7000 });
  const user = await User.findOneAndUpdate(
    { email },
    { role, accountStatus },
    { new: true },
  );
  if (!user) {
    console.error(`No user found for email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`Updated ${user.email}: role=${user.role}, status=${user.accountStatus}`);
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
