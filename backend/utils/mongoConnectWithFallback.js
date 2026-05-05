import mongoose from 'mongoose';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMongoWithFallback({
  retries = 5,
  timeoutMs = 7000,
} = {}) {
  const primaryUri = process.env.MONGO_URI;
  const directUri = process.env.MONGO_URI_DIRECT;
  const uris = [primaryUri, directUri].filter(Boolean);

  if (uris.length === 0) {
    throw new Error('MONGO_URI is required in environment');
  }

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    for (const uri of uris) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: timeoutMs,
        });
        return conn;
      } catch (error) {
        lastError = error;
      }
    }
    if (attempt < retries) {
      await sleep(600 * attempt);
    }
  }

  throw lastError || new Error('Unable to connect to MongoDB');
}
