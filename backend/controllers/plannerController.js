/**
 * Commute planner: validates input and delegates to plannerService.
 */

import axios from 'axios';
import { getAllStops, planCommute } from '../services/plannerService.js';
import fleetSimulationService from '../services/fleetSimulationService.js';

const savedCommutes = [];

function parseHour(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    return { ok: false, error: 'hour must be an integer between 0 and 23' };
  }
  return { ok: true, hour: n };
}

function parseTimeString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'time must be in HH:MM format' };
  }
  const s = value.trim();
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (!m) return { ok: false, error: 'time must be in HH:MM format' };
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return { ok: true, hour, minute, time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

function parseTimeContext(hourRaw, timeRaw) {
  if (timeRaw !== undefined && timeRaw !== null && String(timeRaw).trim() !== '') {
    const parsed = parseTimeString(timeRaw);
    if (!parsed.ok) return parsed;
    return { ok: true, hour: parsed.hour, minute: parsed.minute, time: parsed.time };
  }
  if (hourRaw === undefined || hourRaw === null || hourRaw === '') {
    return { ok: false, error: 'Provide either `time` (HH:MM) or `hour` (0-23).' };
  }
  const hourParsed = parseHour(hourRaw);
  if (!hourParsed.ok) return hourParsed;
  return {
    ok: true,
    hour: hourParsed.hour,
    minute: 0,
    time: `${String(hourParsed.hour).padStart(2, '0')}:00`,
  };
}

function parsePreference(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase();
  if (s === 'less_crowded') return 'less_crowded';
  if (s === 'fewer_transfers') return 'fewer_transfers';
  return 'fastest';
}

export const getStops = async (req, res, next) => {
  try {
    const data = await getAllStops();
    return res.json({ data });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        message: 'Transit routes dataset could not be read',
      });
    }
    next(error);
  }
};

export const postCommute = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      hour: hourRaw,
      time: timeRaw,
      time_type: timeTypeRaw,
      preference: preferenceRaw,
      active_incidents: activeIncidentsRaw,
    } = req.body ?? {};

    if (typeof origin !== 'string' || !origin.trim()) {
      return res.status(400).json({ message: 'origin is required (non-empty string)' });
    }
    if (typeof destination !== 'string' || !destination.trim()) {
      return res
        .status(400)
        .json({ message: 'destination is required (non-empty string)' });
    }

    const timeContext = parseTimeContext(hourRaw, timeRaw);
    if (!timeContext.ok) {
      return res.status(400).json({ message: timeContext.error });
    }

    const tt =
      typeof timeTypeRaw === 'string' && timeTypeRaw.trim().toLowerCase() === 'arrive_by'
        ? 'arrive_by'
        : 'leave_after';

    const data = await planCommute({
      origin: origin.trim(),
      destination: destination.trim(),
      hour: timeContext.hour,
      minute: timeContext.minute,
      requested_time: timeContext.time,
      time_type: tt,
      preference: parsePreference(preferenceRaw),
      active_incidents: Array.isArray(activeIncidentsRaw) ? activeIncidentsRaw : [],
    });

    return res.json({ data });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        message: 'Transit routes dataset could not be read',
      });
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data?.detail ?? error.response?.data;
      return res.status(502).json({
        message: error.response
          ? 'AI service returned an error'
          : 'AI service unreachable',
        status: status ?? null,
        detail: detail ?? error.message,
      });
    }
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }
    next(error);
  }
};

export const getSimulationFleet = async (req, res, next) => {
  try {
    const data = await fleetSimulationService.getFleetSnapshot();
    return res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getSimulationBus = async (req, res, next) => {
  try {
    const { bus_id: busId } = req.params;
    if (!busId) return res.status(400).json({ message: 'bus_id is required' });
    const bus = await fleetSimulationService.getBus(busId);
    if (!bus) return res.status(404).json({ message: 'Bus not found' });
    return res.json({ data: bus });
  } catch (error) {
    next(error);
  }
};

export const getSimulationHistory = async (req, res, next) => {
  try {
    const n = Number(req.query?.limit ?? 100);
    const limit = Number.isFinite(n) ? Math.max(1, Math.min(2000, Math.floor(n))) : 100;
    const data = await fleetSimulationService.getLoopHistory(limit);
    return res.json({ data, limit });
  } catch (error) {
    next(error);
  }
};

export const getSimulationNearestBus = async (req, res, next) => {
  try {
    const origin = String(req.query?.origin ?? '').trim();
    const destination = String(req.query?.destination ?? '').trim();
    const routeName = String(req.query?.route_name ?? '').trim();
    const boardingStop = String(req.query?.boarding_stop ?? '').trim();
    if (!origin || !destination || !routeName) {
      return res.status(400).json({ message: 'origin, destination, and route_name are required' });
    }
    const data = await fleetSimulationService.getNearestBus({
      origin,
      destination,
      route_name: routeName,
      boarding_stop: boardingStop || undefined,
    });
    if (!data) return res.status(404).json({ message: 'No active bus found for this route segment' });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const postSimulationSession = async (req, res, next) => {
  try {
    const { origin, destination, route_name: routeName, boarding_stop: boardingStop } = req.body ?? {};
    if (!origin || !destination || !routeName) {
      return res.status(400).json({ message: 'origin, destination, and route_name are required' });
    }
    const data = await fleetSimulationService.createTrackingSession({
      origin: String(origin).trim(),
      destination: String(destination).trim(),
      route_name: String(routeName).trim(),
      boarding_stop: boardingStop ? String(boardingStop).trim() : undefined,
    });
    if (!data) {
      return res.status(404).json({ message: 'No active simulated bus found for this route segment' });
    }
    return res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getSimulationSession = async (req, res, next) => {
  try {
    const { session_id: sessionId } = req.params;
    const data = await fleetSimulationService.getTrackingSession(sessionId);
    if (!data) return res.status(404).json({ message: 'Session not found' });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const postSimulationSessionOnboard = async (req, res, next) => {
  try {
    const { session_id: sessionId } = req.params;
    const data = await fleetSimulationService.confirmOnboard(sessionId);
    if (!data) return res.status(404).json({ message: 'Session not found' });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const postFavoriteCommute = async (req, res, next) => {
  try {
    const { label, route_name: routeName, origin, destination, preference, payload } = req.body ?? {};
    if (!routeName || !origin || !destination) {
      return res.status(400).json({ message: 'route_name, origin, and destination are required' });
    }
    const row = {
      id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: String(label || `${origin} → ${destination}`).trim(),
      route_name: String(routeName).trim(),
      origin: String(origin).trim(),
      destination: String(destination).trim(),
      preference: String(preference || 'fastest').trim(),
      payload: payload ?? null,
      created_at: new Date().toISOString(),
    };
    savedCommutes.unshift(row);
    if (savedCommutes.length > 200) savedCommutes.length = 200;
    return res.status(201).json({ data: row });
  } catch (error) {
    next(error);
  }
};

export const getFavoriteCommutes = async (req, res, next) => {
  try {
    return res.json({ data: savedCommutes });
  } catch (error) {
    next(error);
  }
};
