import { Router } from 'express';
import multer from 'multer';
import { classifyIncident, getCrowding, getETA, getImpact } from '../services/aiService.js';
import { getNearbyStops, searchStops } from '../controllers/stopsController.js';
import { getUpcomingBuses, getLiveBusLocations, getBusLocation } from '../controllers/busesController.js';
import { submitIncident, getIncidents, updateIncidentStatus, getDashboardStats, getIncidentsHeatmap } from '../controllers/incidentsController.js';
// import exampleRoutes from './exampleRoutes.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

// Mount route modules
// router.use('/examples', exampleRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

router.post('/ai/test', async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    const [eta, crowding, classification, impact] = await Promise.all([
      getETA(payload),
      getCrowding(payload),
      classifyIncident(payload),
      getImpact(payload),
    ]);

    res.json({
      status: 'OK',
      data: { eta, crowding, classification, impact },
    });
  } catch (error) {
    next(error);
  }
});

// Stops routes
router.get('/stops/nearby', getNearbyStops);
router.get('/stops/search', searchStops);

// Buses routes
router.get('/stops/:stop_id/buses', getUpcomingBuses);
router.get('/buses/live', getLiveBusLocations);
router.get('/buses/:bus_id/location', getBusLocation);

// Incidents routes
router.post('/incidents/submit', upload.array('media', 5), submitIncident); // Allow up to 5 files
router.get('/incidents', getIncidents);
router.patch('/incidents/:id/status', updateIncidentStatus);

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/heatmap', getIncidentsHeatmap);

router.get('/', (req, res) => {
  res.json({ message: 'Dhaka Smart Transit API', docs: '/api/health' });
});

export default router;
