import { Router } from 'express';
import {
  getSimulationBus,
  getSimulationFleet,
  getSimulationHistory,
  getSimulationSession,
  getFavoriteCommutes,
  getStops,
  postFavoriteCommute,
  postSimulationSession,
  postSimulationSessionOnboard,
  postCommute,
} from '../controllers/plannerController.js';

const router = Router();

router.post('/commute', postCommute);
router.get('/stops', getStops);
router.get('/favorites', getFavoriteCommutes);
router.post('/favorites', postFavoriteCommute);
router.get('/sim/fleet', getSimulationFleet);
router.get('/sim/buses/:bus_id', getSimulationBus);
router.get('/sim/history', getSimulationHistory);
router.post('/sim/session', postSimulationSession);
router.get('/sim/session/:session_id', getSimulationSession);
router.post('/sim/session/:session_id/onboard', postSimulationSessionOnboard);

export default router;
