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
  },
  { timestamps: true },
);

modelRegistrySchema.index({ modelKey: 1, version: 1 }, { unique: true });
modelRegistrySchema.index({ modelKey: 1, status: 1 });

const ModelRegistry = mongoose.model('ModelRegistry', modelRegistrySchema);
export default ModelRegistry;
