import { Router } from 'express';
import { requireAdminKey } from '../middleware/requireAdminKey.js';
import {
  createRoute,
  deleteRoute,
  getRoute,
  getSuggestions,
  listRoutes,
  updateRoute,
} from '../controllers/routeAdminController.js';

const router = Router();
router.use(requireAdminKey);

router.get('/optimization-suggestions', getSuggestions);
router.get('/', listRoutes);
router.get('/:id', getRoute);
router.post('/', createRoute);
router.put('/:id', updateRoute);
router.delete('/:id', deleteRoute);

export default router;
