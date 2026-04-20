import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { type: String, default: 'admin' },
    resourceType: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
