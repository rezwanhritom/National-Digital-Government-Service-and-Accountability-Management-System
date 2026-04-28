import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DATA_PATH = path.join(__dirname, '..', '..', 'ai-services', 'data', 'routes.json');
const STOPS_DATA_PATH = path.join(__dirname, '..', '..', 'ai-services', 'data', 'stops.json');

let cached = null;

function normalizeName(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

async function load() {
  if (cached) return cached;
  const [routesRaw, stopsRaw] = await Promise.all([
    fs.readFile(ROUTES_DATA_PATH, 'utf8'),
    fs.readFile(STOPS_DATA_PATH, 'utf8'),
  ]);
  const routes = JSON.parse(routesRaw);
  const stops = JSON.parse(stopsRaw);

  const stopsWithId = stops.map((s, i) => ({
    id: i + 1,
    name: String(s?.name ?? '').trim(),
    lat: Number(s?.lat),
    lng: Number(s?.lon),
    zone: String(s?.zone ?? 'normal'),
    area: String(s?.area ?? 'Dhaka'),
  }));

  const byName = new Map();
  const byId = new Map();
  for (const stop of stopsWithId) {
    if (!stop.name || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) continue;
    byName.set(normalizeName(stop.name), stop);
    byId.set(String(stop.id), stop);
  }

  const routesByStop = new Map();
  for (const r of routes) {
    const routeName = String(r?.name ?? '').trim();
    const routeStops = Array.isArray(r?.stops) ? r.stops.map((x) => String(x).trim()) : [];
    for (const s of routeStops) {
      const key = normalizeName(s);
      if (!routesByStop.has(key)) routesByStop.set(key, []);
      routesByStop.get(key).push(routeName);
    }
  }

  cached = { routes, stops: stopsWithId, byName, byId, routesByStop };
  return cached;
}

export async function getAllStopsData() {
  return load();
}

export async function getStopByIdOrName(value) {
  const data = await load();
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return data.byId.get(raw) ?? data.byName.get(normalizeName(raw)) ?? null;
}

