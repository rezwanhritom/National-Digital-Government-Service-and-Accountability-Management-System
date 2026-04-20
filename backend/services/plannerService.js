import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { getCrowding, getETA, getPlannerTrafficLevel } from './aiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo-relative path to transit routes (single source of truth). */
const ROUTES_DATA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'routes.json',
);

const CROWD_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
/** Extra minutes charged for alighting and boarding another line at the same stop. */
const TRANSFER_PENALTY_MIN = 5;

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
 * Collect unique stop names from all routes, sorted for stable UI.
 * @returns {Promise<string[]>}
 */
export async function getAllStops() {
  const routes = await loadRoutesDataset();
  const set = new Set();
  for (const route of routes) {
    const stops = route?.stops;
    if (!Array.isArray(stops)) continue;
    for (const s of stops) {
      if (typeof s === 'string' && s.trim()) set.add(s.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
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

/**
 * Prefer congestion service when configured; fall back to hour heuristic.
 * @param {number} hour
 * @returns {Promise<'HIGH'|'MEDIUM'|'LOW'>}
 */
export async function resolveTrafficLevelForPlanning(hour) {
  try {
    const level = await getPlannerTrafficLevel({ hour });
    const s = String(level ?? '')
      .trim()
      .toUpperCase();
    if (s === 'HIGH' || s === 'MEDIUM' || s === 'LOW') return s;
  } catch {
    // AI_SERVICE_URL missing or congestion not available
  }
  return trafficLevelForHour(hour);
}

function normalizeCrowdLevel(level) {
  const s = String(level).trim().toUpperCase();
  if (s in CROWD_RANK) return s;
  throw new Error(`Unexpected crowd level from AI service: ${level}`);
}

function worseCrowd(a, b) {
  return CROWD_RANK[a] >= CROWD_RANK[b] ? a : b;
}

function stateKey(stop, route) {
  return `${stop}\0${route ?? ''}`;
}

function parseStateKey(key) {
  const i = key.indexOf('\0');
  if (i === -1) return { stop: key, route: null };
  const routePart = key.slice(i + 1);
  return { stop: key.slice(0, i), route: routePart === '' ? null : routePart };
}

/**
 * @param {Array<{ name: string, stops: string[] }>} routes
 * @param {string} stop
 * @returns {string[]}
 */
function routesServingStop(routes, stop) {
  const out = [];
  for (const r of routes) {
    const stops = r?.stops;
    if (!Array.isArray(stops)) continue;
    if (stops.some((s) => String(s).trim() === stop)) out.push(r.name);
  }
  return out;
}

/**
 * Multi-route graph: states (stop, currentRoute | null before first board).
 * Dijkstra with transfer penalty at same stop across lines.
 *
 * @param {string} origin
 * @param {string} destination
 * @param {number} hour
 * @param {string} trafficLevel
 * @returns {Promise<Array<{ totalEta: number, legs: Array<{ from_stop: string, to_stop: string, route: string, eta: number, crowd: string, kind: 'ride'|'transfer' }>, explanation: string }>>}
 */
export async function findPathsWithTransfers(origin, destination, hour, trafficLevel) {
  const routes = await loadRoutesDataset();
  const originTrim = origin.trim();
  const destTrim = destination.trim();

  if (originTrim === destTrim) {
    return [];
  }

  /** @type {Map<string, number>} */
  const dist = new Map();
  /** @type {Map<string, { prevKey: string, leg: { from_stop: string, to_stop: string, route: string, eta: number, crowd: string, kind: 'ride'|'transfer' } } | null>} */
  const prev = new Map();

  /** @type {Array<{ key: string, cost: number }>} */
  const heap = [];

  function push(key, cost) {
    heap.push({ key, cost });
    let idx = heap.length - 1;
    while (idx > 0) {
      const p = Math.floor((idx - 1) / 2);
      if (heap[p].cost <= heap[idx].cost) break;
      [heap[p], heap[idx]] = [heap[idx], heap[p]];
      idx = p;
    }
  }

  function pop() {
    if (heap.length === 0) return null;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0 && last) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = i * 2 + 2;
        let smallest = i;
        if (l < heap.length && heap[l].cost < heap[smallest].cost) smallest = l;
        if (r < heap.length && heap[r].cost < heap[smallest].cost) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }

  /**
   * @param {string} fromKey
   * @param {number} fromCost
   * @param {string} fromStop
   * @param {string} toStop
   * @param {string} routeName
   */
  async function relaxRide(fromKey, fromCost, fromStop, toStop, routeName, h, traf) {
    const [etaRes, crowdRes] = await Promise.all([
      getETA({
        route: routeName,
        from_stop: fromStop,
        to_stop: toStop,
        hour: h,
        traffic_level: traf,
      }),
      getCrowding({
        route: routeName,
        stop: toStop,
        hour: h,
      }),
    ]);
    const eta = Number(etaRes?.eta);
    if (!Number.isFinite(eta)) {
      throw new Error('AI ETA response missing numeric `eta`');
    }
    const crowd = normalizeCrowdLevel(crowdRes?.level);
    const leg = {
      from_stop: fromStop,
      to_stop: toStop,
      route: routeName,
      eta,
      crowd,
      kind: 'ride',
    };
    const toKey = stateKey(toStop, routeName);
    const newDist = fromCost + eta;
    if (!dist.has(toKey) || newDist < dist.get(toKey)) {
      dist.set(toKey, newDist);
      prev.set(toKey, { prevKey: fromKey, leg });
      push(toKey, newDist);
    }
  }

  const startKey = stateKey(originTrim, null);
  dist.set(startKey, 0);
  push(startKey, 0);

  while (heap.length > 0) {
    const node = pop();
    if (!node) break;
    const { key: uKey, cost: uCost } = node;
    const best = dist.get(uKey);
    if (best === undefined || uCost > best) continue;

    const { stop: uStop, route: uRoute } = parseStateKey(uKey);

    if (uStop === destTrim) {
      continue;
    }

    // Board or ride along a line
    const candidateRoutes =
      uRoute === null ? routesServingStop(routes, uStop) : [uRoute];

    for (const routeName of candidateRoutes) {
      const routeObj = routes.find((r) => r.name === routeName);
      if (!routeObj || !Array.isArray(routeObj.stops)) continue;
      const stops = routeObj.stops.map((s) => String(s).trim());
      const idx = stops.indexOf(uStop);
      if (idx === -1) continue;

      if (uRoute === null) {
        // First board: must go forward
        if (idx + 1 >= stops.length) continue;
        const vStop = stops[idx + 1];
        await relaxRide(uKey, uCost, uStop, vStop, routeName, hour, trafficLevel);
      } else if (uRoute === routeName) {
        if (idx + 1 < stops.length) {
          const vStop = stops[idx + 1];
          await relaxRide(uKey, uCost, uStop, vStop, routeName, hour, trafficLevel);
        }
      }
    }

    // Transfer: at uStop on uRoute, switch to another line (same physical stop)
    if (uRoute !== null) {
      const others = routesServingStop(routes, uStop).filter((rn) => rn !== uRoute);
      for (const rn of others) {
        const vKey = stateKey(uStop, rn);
        const edgeCost = TRANSFER_PENALTY_MIN;
        const newDist = uCost + edgeCost;
        if (!dist.has(vKey) || newDist < dist.get(vKey)) {
          dist.set(vKey, newDist);
          prev.set(vKey, {
            prevKey: uKey,
            leg: {
              from_stop: uStop,
              to_stop: uStop,
              route: rn,
              eta: TRANSFER_PENALTY_MIN,
              crowd: 'LOW',
              kind: 'transfer',
            },
          });
          push(vKey, newDist);
        }
      }
    }
  }

  // Collect all goal states (destination, any route)
  const goalKeys = [];
  for (const k of dist.keys()) {
    const { stop } = parseStateKey(k);
    if (stop === destTrim) goalKeys.push(k);
  }
  if (goalKeys.length === 0) return [];

  goalKeys.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));

  const maxPaths = 12;
  const results = [];

  const seenPathSigs = new Set();

  for (let g = 0; g < goalKeys.length && results.length < maxPaths; g += 1) {
    const goalKey = goalKeys[g];
    const totalEta = dist.get(goalKey);
    if (totalEta === undefined) continue;

    const legs = [];
    let cur = goalKey;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const p = prev.get(cur);
      if (!p || !p.leg) break;
      legs.push(p.leg);
      cur = p.prevKey;
    }
    legs.reverse();

    const rideLegs = legs.filter((l) => l.kind === 'ride');
    const sig = rideLegs.map((l) => `${l.route}:${l.from_stop}->${l.to_stop}`).join('|');
    if (seenPathSigs.has(sig)) continue;
    seenPathSigs.add(sig);

    const transfers = legs.filter((l) => l.kind === 'transfer').length;
    const linesUsed = [...new Set(rideLegs.map((l) => l.route))];
    const explanationParts = [
      `${linesUsed.join(' → ')} · ${rideLegs.length} segment(s)`,
      transfers > 0 ? `${transfers} transfer(s) included` : 'direct or single-line',
    ];
    const explanation = explanationParts.join(' · ');

    results.push({
      totalEta,
      legs,
      explanation,
      linesUsed,
      transferCount: transfers,
    });
  }

  return results;
}

/**
 * @param {'leave_after'|'arrive_by'} timeType
 * @param {number} hour
 * @param {number} totalEtaMinutes
 * @returns {{ feasible: boolean, suggested_departure_hour: number | null, note: string }}
 */
export function evaluateTimeType(timeType, hour, totalEtaMinutes) {
  if (timeType === 'leave_after') {
    return {
      feasible: true,
      suggested_departure_hour: hour,
      note: 'Travel context uses your chosen hour for traffic and crowding models.',
    };
  }
  // arrive_by: hour = latest arrival hour (0–23); suggest departure hour
  const needHours = totalEtaMinutes / 60;
  const suggested = hour - needHours;
  const feasible = suggested >= 0;
  return {
    feasible,
    suggested_departure_hour: feasible
      ? Math.max(0, Math.floor(suggested))
      : null,
    note: feasible
      ? `To arrive by ${hour}:00, start around hour ${Math.floor(suggested)} or earlier (approx.).`
      : `Trip may exceed your arrival window if starting near hour 0; total time ~${Math.round(totalEtaMinutes)} min.`,
  };
}

/**
 * @param {{ origin: string, destination: string, hour: number, time_type?: 'leave_after'|'arrive_by' }} params
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function planCommute({ origin, destination, hour, time_type: timeTypeRaw = 'leave_after' }) {
  const timeType = timeTypeRaw === 'arrive_by' ? 'arrive_by' : 'leave_after';
  const trafficLevel = await resolveTrafficLevelForPlanning(hour);

  const paths = await findPathsWithTransfers(
    origin.trim(),
    destination.trim(),
    hour,
    trafficLevel,
  );

  const results = [];
  for (const p of paths) {
    const rideLegs = p.legs.filter((l) => l.kind === 'ride');
    const stopsChain = [];
    if (rideLegs.length > 0) {
      stopsChain.push(rideLegs[0].from_stop);
      for (const l of rideLegs) {
        stopsChain.push(l.to_stop);
      }
    }
    const finalCrowd = rideLegs.reduce((worst, l) => worseCrowd(worst, l.crowd), 'LOW');
    const timeEval = evaluateTimeType(timeType, hour, p.totalEta);

    const primaryRouteLabel =
      p.linesUsed.length === 1 ? p.linesUsed[0] : `${p.linesUsed[0]} (+${p.linesUsed.length - 1} line(s))`;

    results.push({
      route: primaryRouteLabel,
      lines: p.linesUsed,
      stops: [...new Set(stopsChain)],
      eta: Math.round(p.totalEta),
      crowd: finalCrowd,
      explanation: p.explanation,
      time_type: timeType,
      feasible_for_arrival: timeEval.feasible,
      suggested_departure_hour: timeEval.suggested_departure_hour,
      time_note: timeEval.note,
      legs: p.legs,
    });
  }

  if (timeType === 'arrive_by') {
    return results
      .filter((r) => r.feasible_for_arrival)
      .sort((a, b) => a.eta - b.eta);
  }

  return results.sort((a, b) => a.eta - b.eta);
}
