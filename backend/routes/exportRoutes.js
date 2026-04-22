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

const router = Router();

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
