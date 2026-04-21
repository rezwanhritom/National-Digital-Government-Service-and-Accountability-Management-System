import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use(notFound);
app.use(errorHandler);

export default app;
