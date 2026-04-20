import axios from 'axios';
import { classifyIncident as classifyIncidentWithAi, getImpact } from '../services/aiService.js';
import {
  findAffectedRouteNames,
  loadRoutesDataset,
  pickReroutes,
} from '../services/incidentImpactService.js';

/**
 * Route incidents using category, severity, and optional affected route names.
 * @param {string} categoryRaw
 * @param {string} severityRaw
 * @param {string[]} affectedRouteNames
 */
function assignAuthority(categoryRaw, severityRaw, affectedRouteNames = []) {
  const category = String(categoryRaw ?? '').toLowerCase().replace(/\s+/g, '_');
  const severity = String(severityRaw ?? '').toUpperCase();
  const primary =
    Array.isArray(affectedRouteNames) && affectedRouteNames.length > 0
      ? affectedRouteNames[0]
      : null;

  if (category === 'road_blockage' || category === 'accident') {
    if (severity === 'HIGH') {
      return 'Emergency response & city traffic coordination';
    }
    return 'Traffic control & incident verification';
  }
  if (category === 'breakdown' || category === 'overcrowding') {
    return primary
      ? `Operator fleet desk (${primary})`
      : 'Operator fleet desk (assign route from GPS)';
  }
  if (category === 'reckless_driving') {
    return 'Safety enforcement & operator QA';
  }
  if (severity === 'HIGH') {
    return 'Authority escalation desk';
  }
  if (severity === 'MEDIUM') {
    return 'Traffic monitoring team';
  }
  return 'Standard monitoring queue';
}

export const classifyIncident = async (req, res, next) => {
  try {
    const { description, location } = req.body ?? {};

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'description is required (non-empty string)' });
    }
    if (typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ message: 'location is required (non-empty string)' });
    }

    const trimmedDesc = description.trim();
    const trimmedLoc = location.trim();

    const ai = await classifyIncidentWithAi({
      text: trimmedDesc,
      location: trimmedLoc,
    });
    const category = ai.category;
    const severity = ai.severity;

    const routes = await loadRoutesDataset();
    const affectedPreview = [...new Set(findAffectedRouteNames(routes, trimmedLoc))];
    const assigned_to = assignAuthority(category, severity, affectedPreview);

    return res.json({
      category,
      severity,
      assigned_to,
      location: trimmedLoc,
    });
  } catch (error) {
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

export const estimateImpact = async (req, res, next) => {
  try {
    const { location, category, severity, hour: hourRaw } = req.body ?? {};

    if (typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ message: 'location is required (non-empty string)' });
    }
    if (category === undefined || category === null || String(category).trim() === '') {
      return res.status(400).json({ message: 'category is required' });
    }
    if (severity === undefined || severity === null || String(severity).trim() === '') {
      return res.status(400).json({ message: 'severity is required' });
    }

    const trimmedLoc = location.trim();
    const routes = await loadRoutesDataset();
    const affected_routes = [...new Set(findAffectedRouteNames(routes, trimmedLoc))];
    const allNames = routes
      .map((r) => r?.name)
      .filter((n) => typeof n === 'string' && n.trim())
      .map((n) => n.trim());
    const affectedSet = new Set(affected_routes);
    const reroutes = pickReroutes(allNames, affectedSet, 2);

    let hour = null;
    if (hourRaw !== undefined && hourRaw !== null && hourRaw !== '') {
      const n = Number(hourRaw);
      if (Number.isInteger(n) && n >= 0 && n <= 23) hour = n;
    }

    const aiPayload = {
      location: trimmedLoc,
      category,
      severity,
      affected_routes,
      hour,
    };

    const { delay, recovery_time } = await getImpact(aiPayload);

    return res.json({
      affected_routes,
      delay,
      recovery_time,
      reroutes,
    });
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
