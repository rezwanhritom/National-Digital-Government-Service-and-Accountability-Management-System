import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    secret: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    tier: { type: String, enum: ['free', 'basic', 'enterprise'], default: 'free' },
    rateLimit: {
      requestsPerHour: { type: Number, default: 100 },
      requestsPerDay: { type: Number, default: 1000 },
      dataLimitMB: { type: Number, default: 10 },
    },
    permissions: [{
      type: String,
      enum: ['read_incidents', 'read_fleet', 'read_congestion', 'read_metrics', 'export_data']
    }],
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
    usage: {
      requestsToday: { type: Number, default: 0 },
      requestsThisHour: { type: Number, default: 0 },
      dataUsedMB: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
      lastResetHour: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

apiKeySchema.index({ owner: 1 });
apiKeySchema.index({ tier: 1 });
apiKeySchema.index({ isActive: 1 });
apiKeySchema.index({ expiresAt: 1 });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;