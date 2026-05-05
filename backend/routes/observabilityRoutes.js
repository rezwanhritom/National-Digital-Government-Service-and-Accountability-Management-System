import { Router } from 'express';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';
import {
  getSystemHealth,
  getCurrentMetrics,
  getMetricsHistory,
  getAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  getActiveAlerts,
  getAlertHistory,
  acknowledgeAlert,
  getDashboardOverview,
  getSystemPolicy,
  upsertSystemPolicy,
} from '../controllers/observabilityController.js';

const router = Router();
router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER, ROLES.ML_DEVOPS_ENGINEER),
);

// System health and metrics
router.get('/health', getSystemHealth);
router.get('/metrics/current', getCurrentMetrics);
router.get('/metrics/history', getMetricsHistory);

// Alert rules management
router.get('/alerts/rules', getAlertRules);
router.post('/alerts/rules', requireRoles(ROLES.SYSTEM_ADMIN), createAlertRule);
router.put('/alerts/rules/:id', requireRoles(ROLES.SYSTEM_ADMIN), updateAlertRule);
router.delete('/alerts/rules/:id', requireRoles(ROLES.SYSTEM_ADMIN), deleteAlertRule);

// Alert monitoring
router.get('/alerts/active', getActiveAlerts);
router.get('/alerts/history', getAlertHistory);
router.put('/alerts/:id/acknowledge', requireRoles(ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER), acknowledgeAlert);

// Dashboard
router.get('/dashboard', getDashboardOverview);
router.get('/policy', requireRoles(ROLES.SYSTEM_ADMIN), getSystemPolicy);
router.put('/policy', requireRoles(ROLES.SYSTEM_ADMIN), upsertSystemPolicy);

export default router;
