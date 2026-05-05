import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import {
  createRoute,
  deleteRoute,
  getRoute,
  getSuggestions,
  listRoutes,
  updateRoute,
} from '../controllers/routeAdminController.js';

const router = Router();
router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER),
);

router.get('/optimization-suggestions', getSuggestions);
router.get('/', listRoutes);
router.get('/:id', getRoute);
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

export default router;
