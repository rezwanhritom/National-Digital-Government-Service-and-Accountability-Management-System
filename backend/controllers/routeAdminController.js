import mongoose from 'mongoose';
import TransitRoute from '../models/TransitRoute.js';
import AuditLog from '../models/AuditLog.js';
import { buildOptimizationSuggestions } from '../services/routeOptimizationService.js';

export const listRoutes = async (req, res, next) => {
  try {
    const rows = await TransitRoute.find().sort({ name: 1 }).lean();
    return res.json({ data: rows });
  } catch (e) {
    next(e);
  }
};

export const getRoute = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid route id' });
    }
    const row = await TransitRoute.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Route not found' });
    return res.json(row);
  } catch (e) {
    next(e);
  }
};

export const createRoute = async (req, res, next) => {
  try {
    const { name, stops, scheduleNote } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ message: 'stops must be an array of at least two stop names' });
    }
    const cleanStops = stops.map((s) => String(s).trim()).filter(Boolean);
    const doc = await TransitRoute.create({
      name: name.trim(),
      stops: cleanStops,
      scheduleNote: typeof scheduleNote === 'string' ? scheduleNote : '',
    });
    await AuditLog.create({
      action: 'transit_route.create',
      resourceType: 'TransitRoute',
      resourceId: String(doc._id),
      meta: { name: doc.name },
    });
    return res.status(201).json(doc);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'Route name already exists' });
    }
    next(e);
  }
};

export const updateRoute = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid route id' });
    }
    const { name, stops, scheduleNote } = req.body ?? {};
    const patch = {};
    if (typeof name === 'string' && name.trim()) patch.name = name.trim();
    if (Array.isArray(stops) && stops.length >= 2) {
      patch.stops = stops.map((s) => String(s).trim()).filter(Boolean);
    }
    if (typeof scheduleNote === 'string') patch.scheduleNote = scheduleNote;
    const doc = await TransitRoute.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ message: 'Route not found' });
    await AuditLog.create({
      action: 'transit_route.update',
      resourceType: 'TransitRoute',
      resourceId: String(doc._id),
      meta: patch,
    });
    return res.json(doc);
  } catch (e) {
    next(e);
  }
};

export const deleteRoute = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid route id' });
    }
    const doc = await TransitRoute.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Route not found' });
    await AuditLog.create({
      action: 'transit_route.delete',
      resourceType: 'TransitRoute',
      resourceId: String(doc._id),
      meta: { name: doc.name },
    });
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const getSuggestions = async (req, res, next) => {
  try {
    const hour = req.query.hour !== undefined ? Number(req.query.hour) : undefined;
    const dow = req.query.dow !== undefined ? Number(req.query.dow) : undefined;
    const payload = await buildOptimizationSuggestions({
      hour: Number.isInteger(hour) ? hour : undefined,
      dow: Number.isInteger(dow) ? dow : undefined,
    });
    return res.json(payload);
  } catch (e) {
    next(e);
  }
};
