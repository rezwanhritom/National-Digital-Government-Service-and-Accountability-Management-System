import mongoose from 'mongoose';

const queueMetricsSchema = new mongoose.Schema(
  {
    queueName: { type: String, required: true, trim: true, index: true },
    serviceName: { type: String, required: true, trim: true, index: true },
    queueDepth: { type: Number, default: 0 },
    processedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
    averageProcessingTimeMs: { type: Number },
    throughputPerMinute: { type: Number },
    errorRatePercent: { type: Number, min: 0, max: 100 },
    isHealthy: { type: Boolean, default: true },
    lastProcessedAt: { type: Date },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

queueMetricsSchema.index({ queueName: 1, timestamp: 1 });
queueMetricsSchema.index({ serviceName: 1, timestamp: 1 });
queueMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const QueueMetrics = mongoose.model('QueueMetrics', queueMetricsSchema);
export default QueueMetrics;