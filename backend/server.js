import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js'; // নতুন ইমপোর্ট যুক্ত করা হয়েছে

const PORT = process.env.PORT || 5000;

// API রাউটটি মিডলওয়্যার হিসেবে যুক্ত করা হলো
app.use('/api/subscriptions', subscriptionRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  