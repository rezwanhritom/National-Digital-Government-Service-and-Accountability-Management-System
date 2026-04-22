import mongoose from 'mongoose';

const systemMetricsSchema = new mongoose.Schema(
  {
    // System resource usage
    cpuUsagePercent: { type: Number, min: 0, max: 100 },
    memoryUsageMB: { type: Number },
    memoryUsagePercent: { type: Number, min: 0, max: 100 },
    diskUsageGB: { type: Number },
    diskUsagePercent: { type: Number, min: 0, max: 100 },
    uptimeSeconds: { type: Number },
    processId: { type: Number },
    
    // Service status
    serviceName: { type: String, required: true, trim: true, index: true },
    status: { type: String, enum: ['healthy', 'degraded', 'down'], default: 'healthy' },
    
    // Timestamp
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

systemMetricsSchema.index({ serviceName: 1, timestamp: 1 });
systemMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 days

const SystemMetrics = mongoose.model('SystemMetrics', systemMetricsSchema);
export default SystemMetrics;
