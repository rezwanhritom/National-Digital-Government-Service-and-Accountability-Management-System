import { Router } from 'express';
// import exampleRoutes from './exampleRoutes.js';

const router = Router();

// Mount route modules
// router.use('/examples', exampleRoutes);

router.get('/', (req, res) => {
  res.json({ message: 'NDGSAMS API v1', docs: '/api' });
});

export default router;
