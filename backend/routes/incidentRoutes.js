import { Router } from 'express';
import { classifyIncident } from '../controllers/incidentController.js';

const router = Router();

router.post('/classify', classifyIncident);

export default router;
