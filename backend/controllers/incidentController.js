import axios from 'axios';
import { classifyIncident as classifyIncidentWithAi } from '../services/aiService.js';

function assignAuthority(severityRaw) {
  const severity = String(severityRaw ?? '').toUpperCase();
  if (severity === 'HIGH') {
    return 'Emergency Response Unit';
  }
  if (severity === 'MEDIUM') {
    return 'Traffic Control';
  }
  return 'Monitoring Team';
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

    const { category, severity } = await classifyIncidentWithAi({
      text: trimmedDesc,
      location: trimmedLoc,
    });

    const assigned_to = assignAuthority(severity);

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
