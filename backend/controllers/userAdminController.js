import User from '../models/User.js';
import { ACCOUNT_STATUS, ALL_ROLES, ROLES } from '../constants/roles.js';
import { logAudit } from '../services/auditService.js';

const PRIVILEGED_ROLES = new Set(
  ALL_ROLES.filter((role) => role !== ROLES.COMMUTER),
);

export async function listUsers(req, res, next) {
  try {
    const { role, status } = req.query ?? {};
    const query = {};
    if (role) query.role = role;
    if (status) query.accountStatus = status;
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();
    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const role = String(req.body?.role || '');
    if (!ALL_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, roles: [role], accountStatus: ACCOUNT_STATUS.ACTIVE },
      { new: true },
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await logAudit('user.role_update', req, {
      resourceType: 'User',
      resourceId: String(user._id),
      meta: { role },
    });
    return res.json(user);
  } catch (error) {
    return next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const accountStatus = String(req.body?.accountStatus || '');
    if (!Object.values(ACCOUNT_STATUS).includes(accountStatus)) {
      return res.status(400).json({ message: 'Invalid account status' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true },
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    await logAudit('user.status_update', req, {
      resourceType: 'User',
      resourceId: String(user._id),
      meta: { accountStatus },
    });
    return res.json(user);
  } catch (error) {
    return next(error);
  }
}

export async function listRoleRequests(req, res, next) {
  try {
    const users = await User.find({
      accountStatus: ACCOUNT_STATUS.PENDING,
      role: { $in: [...PRIVILEGED_ROLES] },
    }).select('-password').sort({ updatedAt: -1 }).lean();
    return res.json({ data: users });
  } catch (error) {
    return next(error);
  }
}

export async function requestRoleUpgrade(req, res, next) {
  try {
    const requestedRole = String(req.body?.requestedRole || '');
    if (!PRIVILEGED_ROLES.has(requestedRole)) {
      return res.status(400).json({ message: 'Invalid requested role' });
    }
    const currentRoles = Array.isArray(req.user.roles) && req.user.roles.length > 0
      ? req.user.roles
      : [req.user.role].filter(Boolean);
    const mergedRoles = [...new Set([...currentRoles, requestedRole])];
    req.user.roles = mergedRoles;
    req.user.role = mergedRoles[0];
    req.user.accountStatus = ACCOUNT_STATUS.PENDING;
    await req.user.save();
    await logAudit('user.role_request', req, {
      resourceType: 'User',
      resourceId: String(req.user._id),
      meta: { requestedRole },
    });
    return res.json({ message: 'Role request submitted and awaiting admin approval' });
  } catch (error) {
    return next(error);
  }
}
