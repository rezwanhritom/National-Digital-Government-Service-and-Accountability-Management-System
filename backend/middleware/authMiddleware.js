import User from '../models/User.js';
import { ACCOUNT_STATUS } from '../constants/roles.js';
import { verifyAccessToken } from '../services/tokenService.js';

function getBearerToken(req) {
  const raw = req.get('authorization');
  if (!raw || !raw.startsWith('Bearer ')) return null;
  return raw.slice(7).trim();
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token subject' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const currentRoles = Array.isArray(req.user.roles) && req.user.roles.length > 0
      ? req.user.roles
      : [req.user.role].filter(Boolean);
    const hasAllowedRole = currentRoles.some((role) => allowedRoles.includes(role));
    if (!hasAllowedRole) {
      return res.status(403).json({ message: 'Forbidden for current role' });
    }
    return next();
  };
}

export function requireActiveAccount(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return res.status(403).json({ message: 'Account is suspended' });
  }
  if (req.user.accountStatus === ACCOUNT_STATUS.PENDING) {
    return res.status(403).json({ message: 'Account approval is pending' });
  }
  return next();
}
