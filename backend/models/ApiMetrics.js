import mongoose from 'mongoose';

const apiMetricsSchema = new mongoose.Schema(
  {
    // Request details
    endpoint: { type: String, required: true, trim: true, index: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    statusCode: { type: Number, required: true, index: true },
    
    // Performance metrics
    responseTimeMs: { type: Number, required: true }, // Response time in milliseconds
    requestBodySize: { type: Number }, // Bytes
    responseBodySize: { type: Number }, // Bytes
    
    // Request details
    userId: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    
    // Error information
    errorMessage: { type: String, trim: true },
    errorStack: { type: String, trim: true },
    
    // Timestamp
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Indexes for common queries and aggregations
apiMetricsSchema.index({ endpoint: 1, timestamp: 1 });
apiMetricsSchema.index({ statusCode: 1, timestamp: 1 });
apiMetricsSchema.index({ method: 1, timestamp: 1 });
apiMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days

const ApiMetrics = mongoose.model('ApiMetrics', apiMetricsSchema);
export default ApiMetrics;
