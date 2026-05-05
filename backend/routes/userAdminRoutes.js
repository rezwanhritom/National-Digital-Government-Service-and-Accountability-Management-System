import { Router } from 'express';
import {
  listRoleRequests,
  listUsers,
  requestRoleUpgrade,
  updateUserRole,
  updateUserStatus,
} from '../controllers/userAdminController.js';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/request-role', requireAuth, requireActiveAccount, requestRoleUpgrade);

router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN),
);
router.get('/users', listUsers);
router.get('/role-requests', listRoleRequests);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);

export default router;
