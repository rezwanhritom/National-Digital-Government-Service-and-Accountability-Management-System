import { Router } from 'express';

const router = Router();

router.post('/commute', async (req, res) => {
  try {
    return res.json({
      data: [
        {
          route: 'Alif Paribahan',
          stops: ['Shyamoli', 'Agargaon', 'Banasree'],
          eta: 25,
          crowd: 'HIGH',
        },
      ],
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
