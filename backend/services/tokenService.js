import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
const REFRESH_TTL_DAYS = Number(process.env.JWT_REFRESH_TTL_DAYS || 14);

function getSecrets() {
  return {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  };
}

export function signAccessToken(user) {
  const { accessSecret } = getSecrets();
  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles
    : [user.role].filter(Boolean);
  return jwt.sign(
    { sub: String(user._id), role: user.role, roles, status: user.accountStatus },
    accessSecret,
    { expiresIn: ACCESS_TTL },
  );
}

export function signRefreshToken(user, tokenVersion = 0) {
  const { refreshSecret } = getSecrets();
  return jwt.sign(
    { sub: String(user._id), type: 'refresh', tokenVersion },
    refreshSecret,
    { expiresIn: `${REFRESH_TTL_DAYS}d` },
  );
}

export function verifyAccessToken(token) {
  const { accessSecret } = getSecrets();
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
  const { refreshSecret } = getSecrets();
  return jwt.verify(token, refreshSecret);
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
