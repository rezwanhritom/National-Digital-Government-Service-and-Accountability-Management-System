import mongoose from 'mongoose';
import { ACCOUNT_STATUS, ALL_ROLES, ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.COMMUTER },
    roles: {
      type: [{ type: String, enum: ALL_ROLES }],
      default: [ROLES.COMMUTER],
    },
    accountStatus: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    tokenVersion: { type: Number, default: 0 },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        userAgent: { type: String, default: '' },
        ip: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    profile: {
      operatorName: { type: String, trim: true, default: '' },
      authorityDepartment: { type: String, trim: true, default: '' },
      notes: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
