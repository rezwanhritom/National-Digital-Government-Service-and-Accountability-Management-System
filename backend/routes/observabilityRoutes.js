import { Router } from 'express';
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
  getDashboardOverview
} from '../controllers/observabilityController.js';

const router = Router();

// System health and metrics
router.get('/health', getSystemHealth);
router.get('/metrics/current', getCurrentMetrics);
router.get('/metrics/history', getMetricsHistory);

// Alert rules management
router.get('/alerts/rules', getAlertRules);
router.post('/alerts/rules', createAlertRule);
router.put('/alerts/rules/:id', updateAlertRule);
router.delete('/alerts/rules/:id', deleteAlertRule);

// Alert monitoring
router.get('/alerts/active', getActiveAlerts);
router.get('/alerts/history', getAlertHistory);
router.put('/alerts/:id/acknowledge', acknowledgeAlert);

// Dashboard
router.get('/dashboard', getDashboardOverview);

export default router;
