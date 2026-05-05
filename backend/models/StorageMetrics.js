import mongoose from 'mongoose';

const storageMetricsSchema = new mongoose.Schema(
  {
    storageType: { type: String, enum: ['database', 'file_system', 'cache'], required: true, index: true },
    storageName: { type: String, required: true, trim: true, index: true },
    totalSizeGB: { type: Number },
    usedSizeGB: { type: Number },
    availableSizeGB: { type: Number },
    usagePercent: { type: Number, min: 0, max: 100 },
    recordCount: { type: Number },
    collectionCount: { type: Number },
    averageRecordSizeKB: { type: Number },
    readLatencyMs: { type: Number },
    writeLatencyMs: { type: Number },
    throughputOpsPerSecond: { type: Number },
    isHealthy: { type: Boolean, default: true },
    lastBackupAt: { type: Date },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

storageMetricsSchema.index({ storageType: 1, timestamp: 1 });
storageMetricsSchema.index({ storageName: 1, timestamp: 1 });
storageMetricsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const StorageMetrics = mongoose.model('StorageMetrics', storageMetricsSchema);
export default StorageMetrics;