import mongoose from 'mongoose';

const alertLogSchema = new mongoose.Schema(
  {
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule', required: true },
    triggeredAt: { type: Date, default: Date.now },
    value: { type: Number, required: true },
    message: { type: String, required: true, trim: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String, trim: true },
    resolvedAt: { type: Date },
    notificationSent: { type: Boolean, default: false },
    notificationChannels: [{ type: String }],
  },
  { timestamps: true }
);

alertLogSchema.index({ ruleId: 1, triggeredAt: 1 });
alertLogSchema.index({ severity: 1, triggeredAt: 1 });
alertLogSchema.index({ acknowledgedAt: 1 });

const AlertLog = mongoose.model('AlertLog', alertLogSchema);
export default AlertLog;