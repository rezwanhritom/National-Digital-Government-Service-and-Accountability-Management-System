import mongoose from 'mongoose';

const modelRegistrySchema = new mongoose.Schema(
  {
    modelKey: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    notes: { type: String, default: '' },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
    artifactPath: { type: String, default: '' },
    checksum: { type: String, default: '' },
    rolloutPercentage: { type: Number, min: 0, max: 100, default: 100 },
    driftScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

modelRegistrySchema.index({ modelKey: 1, version: 1 }, { unique: true });
modelRegistrySchema.index({ modelKey: 1, status: 1 });

const ModelRegistry = mongoose.model('ModelRegistry', modelRegistrySchema);
export default ModelRegistry;
