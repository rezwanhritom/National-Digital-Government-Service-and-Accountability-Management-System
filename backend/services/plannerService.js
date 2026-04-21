import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { getCrowding, getETA, getPlannerTrafficLevel, predictCongestion } from './aiService.js';

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
const STOPS_DATA_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'stops.json',
);
const ROUTE_GEOMETRIES_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'route_geometries.json',
);

const CROWD_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
/** Extra minutes charged for alighting and boarding another line at the same stop. */
const TRANSFER_PENALTY_MIN = 5;
const WALKING_MAX_KM = 1.2;
const WALKING_MIN_PER_KM = 12;

let routesCache = null;
let stopsGeoCache = null;
let routeGeometryCache = null;

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
  stopsGeoCache = null;
  routeGeometryCache = null;
}

async function loadStopsGeoMap() {
  if (stopsGeoCache) return stopsGeoCache;
  const raw = await fs.readFile(STOPS_DATA_PATH, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('stops.json must contain a JSON array');
  const map = new Map();
  for (const row of rows) {
    const name = String(row?.name ?? '').trim();
    const lat = Number(row?.lat);
    const lon = Number(row?.lon);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    map.set(name, { lat, lon, zone: String(row?.zone ?? 'normal') });
  }
  stopsGeoCache = map;
  return map;
}

async function loadRouteGeometryDataset() {
  if (routeGeometryCache) return routeGeometryCache;
  try {
    const raw = await fs.readFile(ROUTE_GEOMETRIES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    routeGeometryCache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    routeGeometryCache = {};
  }
  return routeGeometryCache;
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

function segmentKey(route, fromStop, toStop) {
  return `${route}|${fromStop}->${toStop}`;
}

async function resolveSegmentTrafficLevels(routes, hour, fallbackTrafficLevel) {
  const keys = [];
  for (const r of routes) {
    const routeName = String(r?.name ?? '').trim();
    const stops = Array.isArray(r?.stops) ? r.stops.map((s) => String(s).trim()) : [];
    if (!routeName || stops.length < 2) continue;
    for (let i = 0; i < stops.length - 1; i += 1) {
      keys.push(segmentKey(routeName, stops[i], stops[i + 1]));
    }
  }
  if (keys.length === 0) return new Map();

  try {
    const res = await predictCongestion({ segment_keys: keys, hour });
    const list = Array.isArray(res?.predictions) ? res.predictions : [];
    const out = new Map();
    for (const row of list) {
      const k = String(row?.segment_key ?? '').trim();
      const lvl = String(row?.level ?? '')
        .trim()
        .toUpperCase();
      if (!k) continue;
      if (lvl === 'LOW' || lvl === 'MEDIUM' || lvl === 'HIGH') {
        out.set(k, lvl);
      }
    }
    return out;
  } catch {
    const out = new Map();
    for (const k of keys) out.set(k, fallbackTrafficLevel);
    return out;
  }
}

function normalizeCrowdLevel(level) {
  const s = String(level).trim().toUpperCase();
  if (s in CROWD_RANK) return s;
  throw new Error(`Unexpected crowd level from AI service: ${level}`);
}

function worseCrowd(a, b) {
  return CROWD_RANK[a] >= CROWD_RANK[b] ? a : b;
}

function pad2(n) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function toTimeString(hour, minute = 0) {
  const h = ((Number(hour) % 24) + 24) % 24;
  const m = Math.max(0, Math.min(59, Math.floor(Number(minute) || 0)));
  return `${pad2(h)}:${pad2(m)}`;
}

function minutesSinceMidnight(hour, minute = 0) {
  return Math.max(0, Math.min(23, Number(hour) || 0)) * 60 + Math.max(0, Math.min(59, Number(minute) || 0));
}

function normalizePreference(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase();
  if (s === 'less_crowded') return 'less_crowded';
  if (s === 'fewer_transfers') return 'fewer_transfers';
  return 'fastest';
}

function keyForRoute(routeName) {
  return String(routeName ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function baseRouteKey(routeName) {
  return keyForRoute(routeName).replace(/\s+\(return\)$/, '');
}

function normalizeLandmarks(rawLandmarks, stopGeoMap) {
  if (!Array.isArray(rawLandmarks)) return [];
  const out = [];
  for (const lm of rawLandmarks) {
    if (typeof lm === 'string') {
      const stopGeo = stopGeoMap.get(lm.trim());
      if (stopGeo) {
        out.push({ name: lm.trim(), lat: stopGeo.lat, lon: stopGeo.lon });
      }
      continue;
    }
    const name = String(lm?.name ?? '').trim();
    const lat = Number(lm?.lat);
    const lon = Number(lm?.lon);
    if (name && Number.isFinite(lat) && Number.isFinite(lon)) {
      out.push({ name, lat, lon });
    }
  }
  return out;
}

function collectPathFromRoute(routeName, fromStop, toStop, routes) {
  const route = routes.find((r) => String(r?.name ?? '').trim() === routeName);
  if (!route || !Array.isArray(route.stops)) return [];
  const stops = route.stops.map((s) => String(s).trim());
  const i = stops.indexOf(fromStop);
  const j = stops.indexOf(toStop);
  if (i === -1 || j === -1 || j < i) return [];
  return stops.slice(i, j + 1);
}

function pointsForStops(stopNames, stopGeoMap) {
  const out = [];
  for (const s of stopNames) {
    const geo = stopGeoMap.get(s);
    if (!geo) continue;
    out.push([geo.lat, geo.lon]);
  }
  return out;
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function buildWalkAdjacency(stopGeoMap) {
  const names = Array.from(stopGeoMap.keys());
  const adj = new Map();
  for (const s of names) adj.set(s, []);
  for (let i = 0; i < names.length; i += 1) {
    const a = names[i];
    const ga = stopGeoMap.get(a);
    for (let j = i + 1; j < names.length; j += 1) {
      const b = names[j];
      const gb = stopGeoMap.get(b);
      const km = haversineKm(ga.lat, ga.lon, gb.lat, gb.lon);
      if (km <= WALKING_MAX_KM) {
        const eta = Math.max(1, Math.round(km * WALKING_MIN_PER_KM));
        adj.get(a).push({ toStop: b, km, eta });
        adj.get(b).push({ toStop: a, km, eta });
      }
    }
  }
  return adj;
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
export async function findPathsWithTransfers(origin, destination, hour, trafficLevel, segmentTraffic = new Map()) {
  const routes = await loadRoutesDataset();
  const stopGeoMap = await loadStopsGeoMap();
  const walkAdjacency = buildWalkAdjacency(stopGeoMap);
  const originTrim = origin.trim();
  const destTrim = destination.trim();

  if (originTrim === destTrim) {
    return [];
  }

  /** @type {Map<string, number>} */
  const dist = new Map();
  /** @type {Map<string, { prevKey: string, leg: { from_stop: string, to_stop: string, route: string|null, eta: number, crowd: string, kind: 'ride'|'transfer'|'walk', distance_km?: number } } | null>} */
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
    const segKey = segmentKey(routeName, fromStop, toStop);
    const segTraffic = segmentTraffic.get(segKey) ?? traf;
    const [etaRes, crowdRes] = await Promise.all([
      getETA({
        route: routeName,
        from_stop: fromStop,
        to_stop: toStop,
        hour: h,
        traffic_level: segTraffic,
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

    // Optional walking edges between nearby stops; after walking you're unboarded (route=null).
    const walks = walkAdjacency.get(uStop) ?? [];
    for (const w of walks) {
      const vKey = stateKey(w.toStop, null);
      const newDist = uCost + w.eta;
      if (!dist.has(vKey) || newDist < dist.get(vKey)) {
        dist.set(vKey, newDist);
        prev.set(vKey, {
          prevKey: uKey,
          leg: {
            from_stop: uStop,
            to_stop: w.toStop,
            route: null,
            eta: w.eta,
            crowd: 'LOW',
            kind: 'walk',
            distance_km: Number(w.km.toFixed(2)),
          },
        });
        push(vKey, newDist);
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
    const walkLegs = legs.filter((l) => l.kind === 'walk');
    const sig = rideLegs.map((l) => `${l.route}:${l.from_stop}->${l.to_stop}`).join('|');
    if (seenPathSigs.has(sig)) continue;
    seenPathSigs.add(sig);

    const transfers = legs.filter((l) => l.kind === 'transfer').length;
    const linesUsed = [...new Set(rideLegs.map((l) => l.route))];
    const walkMinutes = walkLegs.reduce((n, l) => n + Number(l.eta || 0), 0);
    const explanationParts = [
      `${linesUsed.join(' → ')} · ${rideLegs.length} segment(s)`,
      transfers > 0 ? `${transfers} transfer(s) included` : 'direct or single-line',
      walkMinutes > 0 ? `~${walkMinutes} min walking` : 'no walking needed',
    ];
    const explanation = explanationParts.join(' · ');

    results.push({
      totalEta,
      legs,
      explanation,
      linesUsed,
      transferCount: transfers,
      walkCount: walkLegs.length,
      walkMinutes,
    });
  }

  return results;
}

/**
 * @param {'leave_after'|'arrive_by'} timeType
 * @param {number} hour
 * @param {number} minute
 * @param {number} totalEtaMinutes
 * @returns {{ feasible: boolean, suggested_departure_hour: number | null, suggested_departure_time: string | null, note: string }}
 */
export function evaluateTimeType(timeType, hour, minute, totalEtaMinutes) {
  const timeLabel = toTimeString(hour, minute);
  if (timeType === 'leave_after') {
    return {
      feasible: true,
      suggested_departure_hour: hour,
      suggested_departure_time: timeLabel,
      note: `Travel context uses ${timeLabel} for traffic and crowding models (model granularity: hour).`,
    };
  }
  // arrive_by: requested time is latest arrival target; suggest departure time.
  const arrivalMins = minutesSinceMidnight(hour, minute);
  const departMins = Math.floor(arrivalMins - totalEtaMinutes);
  const feasible = departMins >= 0;
  const suggestedHour = feasible ? Math.floor(departMins / 60) : null;
  const suggestedMinute = feasible ? departMins % 60 : null;
  return {
    feasible,
    suggested_departure_hour: suggestedHour,
    suggested_departure_time: feasible ? `${pad2(suggestedHour)}:${pad2(suggestedMinute)}` : null,
    note: feasible
      ? `To arrive by ${timeLabel}, start around ${pad2(suggestedHour)}:${pad2(suggestedMinute)} or earlier (approx.).`
      : `Trip may exceed your arrival window if starting near hour 0; total time ~${Math.round(totalEtaMinutes)} min.`,
  };
}

function computeScore({ eta, transferCount, crowd, walkMinutes, preference }) {
  const crowdPenalty = CROWD_RANK[crowd] ?? 1;
  if (preference === 'less_crowded') {
    return crowdPenalty * 100 + eta + transferCount * 8 + walkMinutes * 0.5;
  }
  if (preference === 'fewer_transfers') {
    return transferCount * 120 + eta + crowdPenalty * 12 + walkMinutes;
  }
  // fastest
  return eta + transferCount * 10 + crowdPenalty * 5 + walkMinutes;
}

/**
 * @param {{ origin: string, destination: string, hour: number, minute?: number, requested_time?: string, time_type?: 'leave_after'|'arrive_by', preference?: 'fastest'|'less_crowded'|'fewer_transfers' }} params
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function planCommute({
  origin,
  destination,
  hour,
  minute = 0,
  requested_time: requestedTimeRaw,
  time_type: timeTypeRaw = 'leave_after',
  preference: preferenceRaw = 'fastest',
}) {
  const timeType = timeTypeRaw === 'arrive_by' ? 'arrive_by' : 'leave_after';
  const preference = normalizePreference(preferenceRaw);
  const requestedTime = typeof requestedTimeRaw === 'string' && requestedTimeRaw.trim()
    ? requestedTimeRaw.trim()
    : toTimeString(hour, minute);
  const routes = await loadRoutesDataset();
  const stopGeoMap = await loadStopsGeoMap();
  const routeGeomData = await loadRouteGeometryDataset();
  const trafficLevel = await resolveTrafficLevelForPlanning(hour);
  const segmentTraffic = await resolveSegmentTrafficLevels(routes, hour, trafficLevel);

  const paths = await findPathsWithTransfers(
    origin.trim(),
    destination.trim(),
    hour,
    trafficLevel,
    segmentTraffic,
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
    const timeEval = evaluateTimeType(timeType, hour, minute, p.totalEta);

    const primaryRouteLabel =
      p.linesUsed.length === 1 ? p.linesUsed[0] : `${p.linesUsed[0]} (+${p.linesUsed.length - 1} line(s))`;

    const mapSegments = rideLegs.map((leg) => {
      const stopPath = collectPathFromRoute(leg.route, leg.from_stop, leg.to_stop, routes);
      const polyline = pointsForStops(stopPath, stopGeoMap);
      const routeGeom =
        routeGeomData[keyForRoute(leg.route)] ??
        routeGeomData[baseRouteKey(leg.route)] ??
        {};
      return {
        route: leg.route,
        from_stop: leg.from_stop,
        to_stop: leg.to_stop,
        crowd: leg.crowd,
        polyline,
        landmarks: normalizeLandmarks(routeGeom.landmarks, stopGeoMap),
      };
    });

    results.push({
      route: primaryRouteLabel,
      lines: p.linesUsed,
      stops: [...new Set(stopsChain)],
      eta: Math.round(p.totalEta),
      crowd: finalCrowd,
      explanation: p.explanation,
      time_type: timeType,
      preference,
      requested_time: requestedTime,
      feasible_for_arrival: timeEval.feasible,
      suggested_departure_hour: timeEval.suggested_departure_hour,
      suggested_departure_time: timeEval.suggested_departure_time,
      time_note: timeEval.note,
      transfer_count: p.transferCount,
      walk_count: p.walkCount,
      walk_minutes: p.walkMinutes,
      score: computeScore({
        eta: Math.round(p.totalEta),
        transferCount: p.transferCount,
        crowd: finalCrowd,
        walkMinutes: p.walkMinutes,
        preference,
      }),
      map_segments: mapSegments,
      legs: p.legs,
    });
  }

  const ranked = results.sort((a, b) => {
    const sa = Number(a.score);
    const sb = Number(b.score);
    if (!Number.isFinite(sa) && !Number.isFinite(sb)) return 0;
    if (!Number.isFinite(sa)) return 1;
    if (!Number.isFinite(sb)) return -1;
    return sa - sb;
  });

  if (timeType === 'arrive_by') {
    return ranked.filter((r) => r.feasible_for_arrival);
  }

  return ranked;
}
