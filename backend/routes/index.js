import { Router } from 'express';
import { classifyIncident, getCrowding, getETA, getImpact } from '../services/aiService.js';
import plannerRoutes from './plannerRoutes.js';

const router = Router();

router.use('/planner', plannerRoutes);

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

router.get('/', (req, res) => {
  res.json({ message: 'Dhaka Smart Transit API', docs: '/api/health' });
});

export default router;
