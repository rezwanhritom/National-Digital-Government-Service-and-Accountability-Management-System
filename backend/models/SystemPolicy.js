import mongoose from 'mongoose';

const systemPolicySchema = new mongoose.Schema(
  {
    retentionDays: { type: Number, default: 90 },
    backupEnabled: { type: Boolean, default: true },
    backupWindowUtc: { type: String, default: '02:00' },
    allowedOrigins: [{ type: String, trim: true }],
    securityMode: { type: String, enum: ['standard', 'strict'], default: 'standard' },
  },
  { timestamps: true },
);

const SystemPolicy = mongoose.model('SystemPolicy', systemPolicySchema);
export default SystemPolicy;
