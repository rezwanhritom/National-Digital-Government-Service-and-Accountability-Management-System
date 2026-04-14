import { Router } from 'express';
import { postCommute } from '../controllers/plannerController.js';

const router = Router();

router.post('/commute', postCommute);

export default router;
