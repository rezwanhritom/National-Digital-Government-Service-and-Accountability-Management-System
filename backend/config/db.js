import mongoose from 'mongoose';
import { connectMongoWithFallback } from '../utils/mongoConnectWithFallback.js';

const connectDB = async () => {
  try {
    const conn = await connectMongoWithFallback({ retries: 4, timeoutMs: 6000 });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn('MongoDB connection failed, running with mock data:', error.message);
    // Don't exit, continue with mock data
  }
};

export default connectDB;
