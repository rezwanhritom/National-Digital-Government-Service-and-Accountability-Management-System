import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';

console.log('Starting server...');
const PORT = process.env.PORT || 5000;
console.log(`Port: ${PORT}`);

connectDB()
  .then(() => {
    console.log('DB connected, starting app...');
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
