import ModelRegistry from '../models/ModelRegistry.js';
import AuditLog from '../models/AuditLog.js';
import FeatureFlag from '../models/FeatureFlag.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_MANIFEST_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'active_model_manifest.json',
);

async function writeActiveModelManifest(doc) {
  let manifest = { activeModels: {}, updatedAt: null };
  try {
    const raw = await fs.readFile(ACTIVE_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') manifest = parsed;
  } catch {
    manifest = { activeModels: {}, updatedAt: null };
  }
  if (!manifest.activeModels || typeof manifest.activeModels !== 'object') {
    manifest.activeModels = {};
  }
  manifest.activeModels[doc.modelKey] = {
    version: doc.version,
    artifactPath: doc.artifactPath || '',
    checksum: doc.checksum || '',
    activatedAt: new Date().toISOString(),
  };
  manifest.updatedAt = new Date().toISOString();
  await fs.writeFile(ACTIVE_MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

export const listModels = async (req, res, next) => {
  try {
    const { modelKey } = req.query ?? {};
    const q = modelKey ? { modelKey: String(modelKey) } : {};
    const rows = await ModelRegistry.find(q).sort({ modelKey: 1, createdAt: -1 }).lean();
    return res.json({ data: rows });
  } catch (e) {
    next(e);
  }
};

export const registerModel = async (req, res, next) => {
  try {
    const {
      modelKey,
      version,
      metrics,
      notes,
      featureFlags,
      artifactPath,
      checksum,
      rolloutPercentage,
      driftScore,
    } = req.body ?? {};
    if (typeof modelKey !== 'string' || !modelKey.trim()) {
      return res.status(400).json({ message: 'modelKey is required' });
    }
    if (typeof version !== 'string' || !version.trim()) {
      return res.status(400).json({ message: 'version is required' });
    }
    const doc = await ModelRegistry.create({
      modelKey: modelKey.trim(),
      version: version.trim(),
      status: 'draft',
      metrics: metrics && typeof metrics === 'object' ? metrics : {},
      notes: typeof notes === 'string' ? notes : '',
      featureFlags: featureFlags && typeof featureFlags === 'object' ? featureFlags : {},
      artifactPath: typeof artifactPath === 'string' ? artifactPath.trim() : '',
      checksum: typeof checksum === 'string' ? checksum.trim() : '',
      rolloutPercentage: Number.isFinite(Number(rolloutPercentage))
        ? Math.max(0, Math.min(100, Number(rolloutPercentage)))
        : 100,
      driftScore: Number.isFinite(Number(driftScore)) ? Number(driftScore) : 0,
    });
    await AuditLog.create({
      action: 'ml_model.register',
      resourceType: 'ModelRegistry',
      resourceId: String(doc._id),
      meta: { modelKey: doc.modelKey, version: doc.version },
    });
    return res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'This modelKey+version already exists' });
    }
    next(e);
  }
};

export const activateModel = async (req, res, next) => {
  try {
    const doc = await ModelRegistry.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Model record not found' });
    const requestedRollout = req.body?.rolloutPercentage;
    if (Number.isFinite(Number(requestedRollout))) {
      doc.rolloutPercentage = Math.max(0, Math.min(100, Number(requestedRollout)));
    }

    await ModelRegistry.updateMany(
      { modelKey: doc.modelKey, status: 'active' },
      { $set: { status: 'archived' } },
    );
    doc.status = 'active';
    await doc.save();
    await writeActiveModelManifest(doc);

    await AuditLog.create({
      action: 'ml_model.activate',
      resourceType: 'ModelRegistry',
      resourceId: String(doc._id),
      meta: { modelKey: doc.modelKey, version: doc.version },
    });
    return res.json(doc);
  } catch (e) {
    next(e);
  }
};

export const archiveModel = async (req, res, next) => {
  try {
    const doc = await ModelRegistry.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Model record not found' });
    doc.status = 'archived';
    await doc.save();
    await AuditLog.create({
      action: 'ml_model.archive',
      resourceType: 'ModelRegistry',
      resourceId: String(doc._id),
      meta: { modelKey: doc.modelKey, version: doc.version },
    });
    return res.json(doc);
  } catch (e) {
    next(e);
  }
};

/** Pick another version for the same modelKey and make it active (simple rollback). */
export const rollbackModel = async (req, res, next) => {
  try {
    const current = await ModelRegistry.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Model record not found' });

    const previous = await ModelRegistry.findOne({
      modelKey: current.modelKey,
      _id: { $ne: current._id },
    }).sort({ createdAt: -1 });

    if (!previous) {
      return res.status(400).json({ message: 'No other registered version for this modelKey' });
    }

    await ModelRegistry.updateMany(
      { modelKey: current.modelKey, status: 'active' },
      { $set: { status: 'archived' } },
    );
    previous.status = 'active';
    await previous.save();
    await writeActiveModelManifest(previous);

    await AuditLog.create({
      action: 'ml_model.rollback',
      resourceType: 'ModelRegistry',
      resourceId: String(previous._id),
      meta: {
        fromVersion: current.version,
        toVersion: previous.version,
        modelKey: current.modelKey,
      },
    });
    return res.json({ active: previous, archivedOthers: true });
  } catch (e) {
    next(e);
  }
};

export const setRolloutPercentage = async (req, res, next) => {
  try {
    const rolloutPercentage = Number(req.body?.rolloutPercentage);
    if (!Number.isFinite(rolloutPercentage)) {
      return res.status(400).json({ message: 'rolloutPercentage must be a number' });
    }
    const doc = await ModelRegistry.findByIdAndUpdate(
      req.params.id,
      { rolloutPercentage: Math.max(0, Math.min(100, rolloutPercentage)) },
      { new: true },
    );
    if (!doc) return res.status(404).json({ message: 'Model record not found' });
    await AuditLog.create({
      action: 'ml_model.rollout_update',
      resourceType: 'ModelRegistry',
      resourceId: String(doc._id),
      meta: { modelKey: doc.modelKey, version: doc.version, rolloutPercentage: doc.rolloutPercentage },
    });
    return res.json(doc);
  } catch (e) {
    return next(e);
  }
};

export const listFlags = async (req, res, next) => {
  try {
    const rows = await FeatureFlag.find().sort({ key: 1 }).lean();
    return res.json({ data: rows });
  } catch (e) {
    next(e);
  }
};

export const upsertFlag = async (req, res, next) => {
  try {
    const key = String(req.params.key ?? '').trim();
    if (!key) return res.status(400).json({ message: 'key required' });
    const { value, description } = req.body ?? {};
    const doc = await FeatureFlag.findOneAndUpdate(
      { key },
      {
        $set: {
          value: value !== undefined ? String(value) : 'false',
          description: typeof description === 'string' ? description : '',
        },
      },
      { new: true, upsert: true },
    );
    await AuditLog.create({
      action: 'feature_flag.upsert',
      resourceType: 'FeatureFlag',
      resourceId: key,
      meta: { value: doc.value },
    });
    return res.json(doc);
  } catch (e) {
    next(e);
  }
};

export const listAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ data: rows });
  } catch (e) {
    next(e);
  }
};

export const getRuntimeManifest = async (req, res, next) => {
  try {
    try {
      const raw = await fs.readFile(ACTIVE_MANIFEST_PATH, 'utf8');
      return res.json(JSON.parse(raw));
    } catch {
      return res.json({ activeModels: {}, updatedAt: null });
    }
  } catch (e) {
    next(e);
  }
};
