import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  getCongestionCurrent,
  getCongestionForecast,
  predictCongestion,
} from '../services/aiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOPS_JSON = path.join(__dirname, '../../ai-services/data/stops.json');

async function loadStopCoords() {
  const raw = await fs.readFile(STOPS_JSON, 'utf8');
  const arr = JSON.parse(raw);
  const map = new Map();
  if (Array.isArray(arr)) {
    for (const row of arr) {
      const n = row?.name;
      if (typeof n === 'string' && n.trim()) {
        map.set(n.trim(), { lat: Number(row.lat), lon: Number(row.lon) });
      }
    }
  }
  return map;
}

/**
 * @param {string} segmentKey e.g. "BRTC|Agargaon->Farmgate"
 */
function parseSegmentKey(segmentKey) {
  const s = String(segmentKey ?? '');
  const pipe = s.indexOf('|');
  const arrow = s.indexOf('->');
  if (pipe === -1 || arrow === -1 || arrow <= pipe) return null;
  const route = s.slice(0, pipe).trim();
  const a = s.slice(pipe + 1, arrow).trim();
  const b = s.slice(arrow + 2).trim();
  return { route, from: a, to: b };
}

export const getCurrent = async (req, res, next) => {
  try {
    const hour = req.query.hour !== undefined ? Number(req.query.hour) : undefined;
    const dow = req.query.dow !== undefined ? Number(req.query.dow) : undefined;
    const params = {};
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) params.hour = hour;
    if (Number.isInteger(dow) && dow >= 0 && dow <= 6) params.dow = dow;
    const data = await getCongestionCurrent(params);
    return res.json(data);
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }
    next(error);
  }
};

export const getForecast = async (req, res, next) => {
  try {
    const data = await getCongestionForecast(req.query ?? {});
    return res.json(data);
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }
    next(error);
  }
};

export const postPredict = async (req, res, next) => {
  try {
    const data = await predictCongestion(req.body ?? {});
    return res.json(data);
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }
    next(error);
  }
};

export const getMap = async (req, res, next) => {
  try {
    const coords = await loadStopCoords();
    const hour = req.query.hour !== undefined ? Number(req.query.hour) : undefined;
    const dow = req.query.dow !== undefined ? Number(req.query.dow) : undefined;
    const params = {};
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) params.hour = hour;
    if (Number.isInteger(dow) && dow >= 0 && dow <= 6) params.dow = dow;
    const current = await getCongestionCurrent(params);
    const segments = Array.isArray(current?.segments) ? current.segments : [];
    const features = [];
    for (const seg of segments) {
      const key = seg.segment_key;
      const parsed = parseSegmentKey(key);
      if (!parsed) continue;
      const ca = coords.get(parsed.from);
      const cb = coords.get(parsed.to);
      if (!ca || !cb || !Number.isFinite(ca.lat) || !Number.isFinite(cb.lat)) continue;
      features.push({
        segment_key: key,
        level: seg.level,
        route: parsed.route,
        from: { name: parsed.from, ...ca },
        to: { name: parsed.to, ...cb },
      });
    }
    return res.json({ hour: current?.hour, dow: current?.dow, features });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(500).json({ message: 'stops geodata missing' });
    }
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }
    next(error);
  }
};
