import { Router } from 'express';
import {
  getFleetPerformance,
  getFleetKPIs,
  getSLAPolicies,
  updateSLAPolicy,
  getTripLogs,
  getOperatorPerformance
} from '../controllers/fleetController.js';

const router = Router();

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
