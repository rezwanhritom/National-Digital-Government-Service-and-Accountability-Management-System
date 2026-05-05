import { Router } from 'express';
import {
  issueOperatorApiKey,
  listFleetAssets,
  listStopsAndRoutes,
  registerBus,
} from '../controllers/opsAdminController.js';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER, ROLES.BUS_OPERATOR),
);

router.get('/transit', listStopsAndRoutes);
router.get('/fleet/assets', listFleetAssets);
router.post('/fleet/assets', registerBus);
router.post('/operators/api-keys', requireRoles(ROLES.SYSTEM_ADMIN), issueOperatorApiKey);

export default router;
