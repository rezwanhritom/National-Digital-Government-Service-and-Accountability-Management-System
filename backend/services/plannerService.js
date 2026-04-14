import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { getCrowding, getETA } from './aiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo-relative path to transit routes (no hardcoded route definitions). */
const ROUTES_DATA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'routes.json',
);

const CROWD_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

let routesCache = null;

/**
 * @returns {Promise<Array<{ name: string, stops: string[] }>>}
 */
export async function loadRoutesDataset() {
  if (routesCache) {
    return routesCache;
  }
  const raw = await fs.readFile(ROUTES_DATA_PATH, 'utf8');
  routesCache = JSON.parse(raw);
  if (!Array.isArray(routesCache)) {
    throw new Error('routes.json must contain a JSON array');
  }
  return routesCache;
}

/** For tests or hot-reload of dataset file. */
export function clearRoutesCache() {
  routesCache = null;
}

/**
 * @param {number} hour 0–23
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export function trafficLevelForHour(hour) {
  if (hour >= 7 && hour <= 10) return 'HIGH';
  if (hour >= 17 && hour <= 20) return 'HIGH';
  if (hour >= 11 && hour <= 16) return 'MEDIUM';
  return 'LOW';
}

function normalizeCrowdLevel(level) {
  const s = String(level).trim().toUpperCase();
  if (s in CROWD_RANK) return s;
  throw new Error(`Unexpected crowd level from AI service: ${level}`);
}

function worseCrowd(a, b) {
  return CROWD_RANK[a] >= CROWD_RANK[b] ? a : b;
}

/**
 * @param {string} origin
 * @param {string} destination
 * @param {Array<{ name: string, stops: string[] }>} routes
 */
export function findCommuteOptions(routes, origin, destination) {
  const options = [];
  for (const route of routes) {
    const stops = route.stops;
    const oi = stops.indexOf(origin);
    const di = stops.indexOf(destination);
    if (oi === -1 || di === -1) continue;
    if (oi >= di) continue;
    options.push({
      routeName: route.name,
      stops: stops.slice(oi, di + 1),
    });
  }
  return options;
}

/**
 * @param {{ routeName: string, stops: string[], hour: number, trafficLevel: string }} option
 * @returns {Promise<{ route: string, stops: string[], eta: number, crowd: string }>}
 */
async function scoreOption(option) {
  const { routeName, stops, hour, trafficLevel } = option;
  const segments = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    segments.push({ from_stop: stops[i], to_stop: stops[i + 1] });
  }

  const segmentScores = await Promise.all(
    segments.map(async (seg) => {
      const [etaRes, crowdRes] = await Promise.all([
        getETA({
          route: routeName,
          from_stop: seg.from_stop,
          to_stop: seg.to_stop,
          hour,
          traffic_level: trafficLevel,
        }),
        getCrowding({
          route: routeName,
          stop: seg.to_stop,
          hour,
        }),
      ]);

      const eta = Number(etaRes?.eta);
      if (!Number.isFinite(eta)) {
        throw new Error('AI ETA response missing numeric `eta`');
      }

      const crowd = normalizeCrowdLevel(crowdRes?.level);
      return { eta, crowd };
    }),
  );

  const totalEta = segmentScores.reduce((sum, s) => sum + s.eta, 0);
  const finalCrowd = segmentScores.reduce(
    (worst, s) => worseCrowd(worst, s.crowd),
    'LOW',
  );

  return {
    route: routeName,
    stops,
    eta: totalEta,
    crowd: finalCrowd,
  };
}

/**
 * @param {{ origin: string, destination: string, hour: number }} params
 * @returns {Promise<Array<{ route: string, stops: string[], eta: number, crowd: string }>>}
 */
export async function planCommute({ origin, destination, hour }) {
  const routes = await loadRoutesDataset();
  const options = findCommuteOptions(routes, origin, destination);
  const trafficLevel = trafficLevelForHour(hour);

  const results = await Promise.all(
    options.map((opt) =>
      scoreOption({
        routeName: opt.routeName,
        stops: opt.stops,
        hour,
        trafficLevel,
      }),
    ),
  );

  return results;
}
