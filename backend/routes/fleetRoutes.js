import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import {
  getFleetPerformance,
  getFleetKPIs,
  getSLAPolicies,
  updateSLAPolicy,
  getTripLogs,
  getOperatorPerformance
} from '../controllers/fleetController.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();
router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.BUS_OPERATOR, ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER),
);

// Fleet performance metrics
router.get('/performance', getFleetPerformance);
router.get('/kpis', getFleetKPIs);

// SLA policies
router.get('/sla-policies', getSLAPolicies);
router.put('/sla-policies/:routeId', updateSLAPolicy);

// Trip logs
router.get('/trips', getTripLogs);

// Operator performance
router.get('/operators/performance', getOperatorPerformance);

export default router;
