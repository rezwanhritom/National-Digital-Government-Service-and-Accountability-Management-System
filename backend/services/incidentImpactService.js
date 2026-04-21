import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_JSON = path.join(__dirname, '../../ai-services/data/routes.json');
const STOPS_JSON = path.join(__dirname, '../../ai-services/data/stops.json');
const ROUTE_GEOMETRIES_JSON = path.join(__dirname, '../../ai-services/data/route_geometries.json');
const EARTH_RADIUS_M = 6371000;
const LOCALITY_KEYWORDS = [
  'mirpur',
  'shewrapara',
  'kazipara',
  'agargaon',
  'shyamoli',
  'mohammadpur',
  'dhanmondi',
  'kalabagan',
  'science lab',
  'shahbag',
  'paltan',
  'motijheel',
  'farmgate',
  'karwan bazar',
  'tejgaon',
  'mohakhali',
  'banani',
  'kakoli',
  'airport',
  'uttara',
  'kuril',
  'bashundhara',
  'gulshan',
  'badda',
  'notun bazar',
  'rampura',
  'malibagh',
  'mouchak',
  'khilgaon',
  'banasree',
  'demra',
];

let cachedRoutes = null;
let cachedStops = null;
let cachedRouteGeometries = null;

export async function loadRoutesDataset() {
  if (cachedRoutes) {
    return cachedRoutes;
  }
  const raw = await readFile(ROUTES_JSON, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('routes dataset must be a JSON array');
  }
  cachedRoutes = data;
  return cachedRoutes;
}

export async function loadStopsDataset() {
  if (cachedStops) {
    return cachedStops;
  }
  const raw = await readFile(STOPS_JSON, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('stops dataset must be a JSON array');
  }
  cachedStops = data;
  return cachedStops;
}

export async function loadRouteGeometriesDataset() {
  if (cachedRouteGeometries) {
    return cachedRouteGeometries;
  }
  const raw = await readFile(ROUTE_GEOMETRIES_JSON, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('route geometries dataset must be a JSON object');
  }
  cachedRouteGeometries = data;
  return cachedRouteGeometries;
}

function toRad(deg) {
  return (Number(deg) * Math.PI) / 180;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseGeoPoint(payload = {}) {
  const rawLat = payload?.latitude ?? payload?.lat;
  const rawLon = payload?.longitude ?? payload?.lng ?? payload?.lon;
  if (rawLat === undefined || rawLon === undefined || rawLat === '' || rawLon === '') {
    return null;
  }
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }
  return { lat, lon };
}

export function findNearestStop(stops, geoPoint) {
  if (!geoPoint || !Array.isArray(stops) || stops.length === 0) {
    return null;
  }
  let best = null;
  for (const stop of stops) {
    const lat = Number(stop?.lat);
    const lon = Number(stop?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }
    const distance_m = haversineMeters(geoPoint.lat, geoPoint.lon, lat, lon);
    if (!best || distance_m < best.distance_m) {
      const stop_name = String(stop?.name ?? '').trim() || null;
      best = {
        stop_name,
        area: deriveAreaFromStopName(stop_name),
        zone: String(stop?.zone ?? '').trim().toLowerCase() || null,
        distance_m: Math.round(distance_m),
        lat,
        lon,
      };
    }
  }
  return best;
}

export function classifyNetworkProximity(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return 'unknown';
  }
  if (distanceMeters <= 800) return 'on_network';
  if (distanceMeters <= 2500) return 'near_network';
  return 'out_of_network';
}

function normalizeName(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function toTitleCase(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function deriveAreaFromStopName(stopName) {
  const raw = normalizeName(stopName);
  if (!raw) return null;
  const keyword = LOCALITY_KEYWORDS.find((k) => raw.includes(k));
  if (keyword) return toTitleCase(keyword);
  const tokens = raw.split(' ').filter(Boolean);
  return toTitleCase(tokens.slice(0, 2).join(' '));
}

export function buildIncidentAreasFromStops(stops = []) {
  const grouped = new Map();
  for (const stop of stops) {
    const stopName = String(stop?.name ?? '').trim();
    const area = deriveAreaFromStopName(stopName);
    const lat = Number(stop?.lat);
    const lon = Number(stop?.lon);
    if (!area || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!grouped.has(area)) {
      grouped.set(area, { area, latSum: 0, lonSum: 0, count: 0 });
    }
    const row = grouped.get(area);
    row.latSum += lat;
    row.lonSum += lon;
    row.count += 1;
  }
  return [...grouped.values()]
    .map((row) => ({
      area: row.area,
      center: {
        lat: Number((row.latSum / row.count).toFixed(6)),
        lng: Number((row.lonSum / row.count).toFixed(6)),
      },
      stop_count: row.count,
    }))
    .sort((a, b) => a.area.localeCompare(b.area));
}

function buildRouteNameLookup(routes = []) {
  const map = new Map();
  for (const route of routes) {
    const rawName = typeof route?.name === 'string' ? route.name.trim() : '';
    if (!rawName) continue;
    map.set(normalizeName(rawName), rawName);
  }
  return map;
}

function findCanonicalRouteName(rawKey, routeNameLookup) {
  const key = normalizeName(rawKey);
  return routeNameLookup.get(key) || routeNameLookup.get(key.replace(/_/g, ' ')) || rawKey;
}

export function findNearestRouteSegment(geometries, geoPoint, routeNameLookup) {
  if (!geoPoint || !geometries || typeof geometries !== 'object') {
    return null;
  }
  let best = null;
  for (const [routeKey, entry] of Object.entries(geometries)) {
    if (routeKey === '_meta') continue;
    const landmarks = Array.isArray(entry?.landmarks) ? entry.landmarks : [];
    for (const landmark of landmarks) {
      const lat = Number(landmark?.lat);
      const lon = Number(landmark?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const distance_m = haversineMeters(geoPoint.lat, geoPoint.lon, lat, lon);
      if (!best || distance_m < best.distance_m) {
        best = {
          route_name: findCanonicalRouteName(routeKey, routeNameLookup),
          landmark_name: String(landmark?.name ?? '').trim() || null,
          distance_m: Math.round(distance_m),
          lat,
          lon,
        };
      }
    }
  }
  return best;
}

/**
 * Routes whose stop list contains the given location (case-insensitive trimmed match).
 */
export function findAffectedRouteNames(routes, location) {
  const loc = String(location ?? '').trim().toLowerCase();
  if (!loc) {
    return [];
  }
  const names = [];
  for (const route of routes) {
    const stops = route?.stops;
    if (!Array.isArray(stops)) {
      continue;
    }
    const hit = stops.some((stop) => String(stop).trim().toLowerCase() === loc);
    if (hit && typeof route?.name === 'string' && route.name.trim()) {
      names.push(route.name.trim());
    }
  }
  return names;
}

/**
 * Up to `max` route names that are not in the affected set (dataset-driven).
 */
export function pickReroutes(allRouteNames, affectedSet, max = 2) {
  const reroutes = [];
  for (const name of allRouteNames) {
    if (!affectedSet.has(name) && reroutes.length < max) {
      reroutes.push(name);
    }
  }
  return reroutes;
}

export async function deriveIncidentGeoContext(payload = {}) {
  const point = parseGeoPoint(payload);
  const locationText =
    typeof payload?.location === 'string' && payload.location.trim()
      ? payload.location.trim()
      : null;

  if (!point && !locationText) {
    return {
      source: 'none',
      location: null,
      nearest_stop: null,
      network_status: 'unknown',
      affected_routes: [],
      zone: null,
      area: null,
    };
  }

  const [routes, stops, routeGeometries] = await Promise.all([
    loadRoutesDataset(),
    loadStopsDataset(),
    loadRouteGeometriesDataset(),
  ]);
  const routeNameLookup = buildRouteNameLookup(routes);
  const nearest = point ? findNearestStop(stops, point) : null;
  const nearest_route_segment = point
    ? findNearestRouteSegment(routeGeometries, point, routeNameLookup)
    : null;
  const derivedLocation = locationText || nearest?.stop_name || null;
  const byLocation = derivedLocation ? findAffectedRouteNames(routes, derivedLocation) : [];
  const byNearest = nearest?.stop_name ? findAffectedRouteNames(routes, nearest.stop_name) : [];
  const bySegment = nearest_route_segment?.route_name ? [nearest_route_segment.route_name] : [];
  const affected_routes = [...new Set([...byLocation, ...byNearest, ...bySegment])];
  const nearestDistance = [nearest?.distance_m, nearest_route_segment?.distance_m]
    .filter((n) => Number.isFinite(n))
    .reduce((best, n) => (best === null || n < best ? n : best), null);
  const network_status = classifyNetworkProximity(nearestDistance);

  return {
    source: point ? 'geo' : 'text',
    location: derivedLocation,
    nearest_stop: nearest,
    nearest_route_segment,
    network_status,
    affected_routes,
    zone: nearest?.zone ?? null,
    area: nearest?.area ?? null,
    coordinates: point,
  };
}
