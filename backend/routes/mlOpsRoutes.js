import { Router } from 'express';
import { requireAdminKey } from '../middleware/requireAdminKey.js';
import {
  activateModel,
  archiveModel,
  listAuditLogs,
  listFlags,
  listModels,
  registerModel,
  rollbackModel,
  upsertFlag,
} from '../controllers/mlOpsController.js';

const router = Router();
router.use(requireAdminKey);

router.get('/models', listModels);
router.post('/models', registerModel);
router.post('/models/:id/activate', activateModel);
router.post('/models/:id/archive', archiveModel);
router.post('/models/:id/rollback', rollbackModel);

router.get('/flags', listFlags);
router.put('/flags/:key', upsertFlag);

router.get('/audit', listAuditLogs);

export default router;
