import mongoose from 'mongoose';

const alertRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
    metric: { type: String, required: true, trim: true },
    condition: { type: String, enum: ['>', '<', '>=', '<=', '==', '!='], required: true },
    threshold: { type: Number, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    enabled: { type: Boolean, default: true },
    notificationChannels: [{ type: String, enum: ['email', 'slack', 'webhook'] }],
    cooldownMinutes: { type: Number, default: 60 },
    createdBy: { type: String, trim: true },
    lastTriggeredAt: { type: Date },
  },
  { timestamps: true }
);

const AlertRule = mongoose.model('AlertRule', alertRuleSchema);
export default AlertRule;