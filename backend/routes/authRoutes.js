import { Router } from 'express';
import { login, logout, me, refresh, signup } from '../controllers/authController.js';
import { requireActiveAccount, requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, requireActiveAccount, me);

export default router;
