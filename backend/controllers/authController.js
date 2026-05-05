import User from '../models/User.js';
import { ACCOUNT_STATUS, ROLES } from '../constants/roles.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../services/tokenService.js';
import { logAudit } from '../services/auditService.js';

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role].filter(Boolean),
    accountStatus: user.accountStatus,
    profile: user.profile,
  };
}

function validatePasswordRules(password) {
  const value = String(password ?? '');
  const errors = [];
  if (value.length < 10) errors.push('at least 10 characters');
  if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
  if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
  if (!/[0-9]/.test(value)) errors.push('one number');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('one special character');
  return errors;
}

export async function signup(req, res, next) {
  try {
    const { name, username, email, password } = req.body ?? {};
    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'name, username, email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).toLowerCase().trim();
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      return res.status(409).json({
        message: 'This email is already registered. Please log in instead.',
      });
    }
    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username is already taken. Try another one.' });
    }
    const passwordErrors = validatePasswordRules(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        message: `Password must contain ${passwordErrors.join(', ')}.`,
      });
    }

    const user = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: await hashPassword(String(password)),
      role: ROLES.COMMUTER,
      roles: [ROLES.COMMUTER],
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });
    await logAudit('auth.signup', req, { resourceType: 'User', resourceId: String(user._id) });
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await verifyPassword(String(password), user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, user.tokenVersion);
    user.refreshTokens.push({
      tokenHash: hashToken(refreshToken),
      userAgent: req.get('user-agent') || '',
      ip: req.ip || '',
    });
    await user.save();
    await logAudit('auth.login', req, { resourceType: 'User', resourceId: String(user._id) });

    return res.json({
      accessToken,
      refreshToken,
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    const payload = verifyRefreshToken(String(refreshToken));
    const user = await User.findById(payload.sub).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
    if (payload.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

    const hashed = hashToken(String(refreshToken));
    const exists = user.refreshTokens.some((entry) => entry.tokenHash === hashed);
    if (!exists) return res.status(401).json({ message: 'Unknown refresh token' });

    const nextAccessToken = signAccessToken(user);
    return res.json({ accessToken: nextAccessToken, user: publicUser(user) });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
}

export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body ?? {};
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });
    const payload = verifyRefreshToken(String(refreshToken));
    const user = await User.findById(payload.sub).select('+password');
    if (!user) return res.status(204).send();
    const hashed = hashToken(String(refreshToken));
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== hashed);
    await user.save();
    await logAudit('auth.logout', req, { resourceType: 'User', resourceId: String(user._id) });
    return res.status(204).send();
  } catch (error) {
    return res.status(204).send();
  }
}

export async function me(req, res) {
  return res.json({ user: publicUser(req.user) });
}
