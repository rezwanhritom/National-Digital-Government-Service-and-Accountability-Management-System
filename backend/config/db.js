import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // .env ফাইল থেকে ডেটাবেস URI নিবে (সাধারণত MONGO_URI নাম থাকে)
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1); // এরর হলে সার্ভার বন্ধ করে দিবে
  }
};

export default connectDB;