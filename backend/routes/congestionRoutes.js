import { Router } from 'express';
import {
  getCurrent,
  getForecast,
  getMap,
  postPredict,
} from '../controllers/congestionController.js';

const router = Router();

router.get('/current', getCurrent);
router.get('/forecast', getForecast);
router.get('/map', getMap);
router.post('/predict', postPredict);

export default router;
