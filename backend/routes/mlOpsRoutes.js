import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import {
  activateModel,
  archiveModel,
  getRuntimeManifest,
  listAuditLogs,
  listFlags,
  listModels,
  registerModel,
  rollbackModel,
  setRolloutPercentage,
  upsertFlag,
} from '../controllers/mlOpsController.js';

const router = Router();
router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.ML_DEVOPS_ENGINEER),
);

router.get('/models', listModels);
router.post('/models', registerModel);
router.post('/models/:id/activate', activateModel);
router.post('/models/:id/archive', archiveModel);
router.post('/models/:id/rollback', rollbackModel);
router.put('/models/:id/rollout', setRolloutPercentage);

router.get('/flags', listFlags);
router.put('/flags/:key', upsertFlag);

router.get('/audit', listAuditLogs);
router.get('/runtime-manifest', getRuntimeManifest);

export default router;
