import AuditLog from '../models/AuditLog.js';

export async function logAudit(action, req, details = {}) {
  try {
    await AuditLog.create({
      action,
      actor: req?.user?.email || req?.user?.name || 'system',
      resourceType: details.resourceType || '',
      resourceId: details.resourceId || '',
      meta: {
        role: req?.user?.role || null,
        ip: req?.ip || null,
        ...details.meta,
      },
    });
  } catch {
    // Audit failures must not break primary API actions.
  }
}
