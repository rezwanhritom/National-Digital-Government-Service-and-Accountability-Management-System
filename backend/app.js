import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import plannerRoutes from './routes/plannerRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);
app.use('/api/planner', plannerRoutes);
app.use('/api/incidents', incidentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
