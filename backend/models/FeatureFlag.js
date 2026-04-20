import mongoose from 'mongoose';

const featureFlagSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: String, default: 'false' },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

const FeatureFlag = mongoose.model('FeatureFlag', featureFlagSchema);
export default FeatureFlag;
