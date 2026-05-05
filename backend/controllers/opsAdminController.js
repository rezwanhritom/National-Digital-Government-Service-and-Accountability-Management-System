import crypto from 'crypto';
import ApiKey from '../models/ApiKey.js';
import FleetAsset from '../models/FleetAsset.js';
import TransitRoute from '../models/TransitRoute.js';
import { logAudit } from '../services/auditService.js';

export async function listStopsAndRoutes(req, res, next) {
  try {
    const routes = await TransitRoute.find().sort({ name: 1 }).lean();
    const stops = [...new Set(routes.flatMap((route) => route.stops || []))].sort();
    return res.json({ routes, stops });
  } catch (error) {
    return next(error);
  }
}

export async function registerBus(req, res, next) {
  try {
    const { busCode, operatorName, gpsDeviceId, routeNames = [] } = req.body ?? {};
    if (!busCode || !operatorName) {
      return res.status(400).json({ message: 'busCode and operatorName are required' });
    }
    const asset = await FleetAsset.create({
      busCode: String(busCode).trim(),
      operatorName: String(operatorName).trim(),
      gpsDeviceId: String(gpsDeviceId || '').trim(),
      routeNames: Array.isArray(routeNames) ? routeNames.map((r) => String(r).trim()) : [],
    });
    await logAudit('fleet.bus_register', req, {
      resourceType: 'FleetAsset',
      resourceId: String(asset._id),
    });
    return res.status(201).json(asset);
  } catch (error) {
    return next(error);
  }
}

export async function listFleetAssets(req, res, next) {
  try {
    const rows = await FleetAsset.find().sort({ createdAt: -1 }).lean();
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function issueOperatorApiKey(req, res, next) {
  try {
    const { name, owner, description } = req.body ?? {};
    if (!name || !owner) return res.status(400).json({ message: 'name and owner are required' });

    const key = `op_${crypto.randomBytes(8).toString('hex')}`;
    const secret = crypto.randomBytes(24).toString('hex');
    const doc = await ApiKey.create({
      key,
      secret,
      name: String(name).trim(),
      owner: String(owner).trim(),
      description: String(description || '').trim(),
      permissions: ['read_fleet', 'read_incidents', 'read_metrics'],
      tier: 'enterprise',
    });
    await logAudit('operator.api_key_issue', req, {
      resourceType: 'ApiKey',
      resourceId: String(doc._id),
      meta: { key: doc.key, owner: doc.owner },
    });
    return res.status(201).json(doc);
  } catch (error) {
    return next(error);
  }
}
