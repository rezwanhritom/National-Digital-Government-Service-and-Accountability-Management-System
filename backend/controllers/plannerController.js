/**
 * Commute planner: validates input and delegates to plannerService.
 */

import axios from 'axios';
import { getAllStops, planCommute } from '../services/plannerService.js';

function parseHour(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, error: 'hour is required' };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    return { ok: false, error: 'hour must be an integer between 0 and 23' };
  }
  return { ok: true, hour: n };
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
    const { origin, destination, hour: hourRaw, time_type: timeTypeRaw } = req.body ?? {};

    if (typeof origin !== 'string' || !origin.trim()) {
      return res.status(400).json({ message: 'origin is required (non-empty string)' });
    }
    if (typeof destination !== 'string' || !destination.trim()) {
      return res
        .status(400)
        .json({ message: 'destination is required (non-empty string)' });
    }

    const hourParsed = parseHour(hourRaw);
    if (!hourParsed.ok) {
      return res.status(400).json({ message: hourParsed.error });
    }

    const tt =
      typeof timeTypeRaw === 'string' && timeTypeRaw.trim().toLowerCase() === 'arrive_by'
        ? 'arrive_by'
        : 'leave_after';

    const data = await planCommute({
      origin: origin.trim(),
      destination: destination.trim(),
      hour: hourParsed.hour,
      time_type: tt,
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
