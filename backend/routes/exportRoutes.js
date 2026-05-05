import { Router } from 'express';
import {
  exportIncidents,
  exportFleetData,
  exportSystemMetrics,
  exportCongestionData,
  getExportStatus,
  validateExportRequest
} from '../controllers/exportController.js';
import rateLimit from '../middleware/rateLimitMiddleware.js';
import { ROLES } from '../constants/roles.js';
import { requireActiveAccount, requireAuth, requireRoles } from '../middleware/authMiddleware.js';

const router = Router();
router.use(
  requireAuth,
  requireActiveAccount,
  requireRoles(ROLES.SYSTEM_ADMIN, ROLES.TRANSPORT_OFFICER, ROLES.ML_DEVOPS_ENGINEER),
);

// Apply rate limiting to all export routes
router.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many export requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
}));

// Export validation middleware
router.use('/validate', validateExportRequest);

// Export endpoints
router.get('/incidents', validateExportRequest, exportIncidents);
router.get('/fleet', validateExportRequest, exportFleetData);
router.get('/metrics', validateExportRequest, exportSystemMetrics);
router.get('/congestion', validateExportRequest, exportCongestionData);

// Export status
router.get('/status', getExportStatus);

export default router;
