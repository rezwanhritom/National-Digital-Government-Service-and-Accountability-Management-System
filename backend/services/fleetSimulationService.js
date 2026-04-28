import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DATA_PATH = path.join(__dirname, '..', '..', 'ai-services', 'data', 'routes.json');
const STOPS_DATA_PATH = path.join(__dirname, '..', '..', 'ai-services', 'data', 'stops.json');
const HISTORY_DIR = path.join(__dirname, '..', '..', 'ai-services', 'data', 'history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'fleet_loop_history.jsonl');

const GLOBAL_SERVICE_START_MIN = 5 * 60; // 05:00
const GLOBAL_SERVICE_END_MIN = 24 * 60; // 24:00
const HEADWAY_MIN = 10;
const FLEET_MIN_PER_ROUTE = 21;
const FLEET_MAX_PER_ROUTE = 30;
const SIM_TIME_SCALE = Math.max(0.1, Number(process.env.FLEET_SIM_TIME_SCALE || 1));

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function strHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function dateKeyFromTs(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

function minutesOfDay(ts) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function minuteToHHMM(minute) {
  const m = Math.max(0, Math.min(24 * 60, Math.floor(minute)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

class FleetSimulationService {
  constructor() {
    this.initialized = false;
    this.routes = [];
    this.stopGeo = new Map();
    this.buses = [];
    this.dayKey = '';
    this.bootRealTs = Date.now();
    this.bootSimTs = Date.now();
    this.sessions = new Map();
  }

  async init() {
    if (this.initialized) return;
    const [routesRaw, stopsRaw] = await Promise.all([
      fs.readFile(ROUTES_DATA_PATH, 'utf8'),
      fs.readFile(STOPS_DATA_PATH, 'utf8'),
    ]);
    this.routes = JSON.parse(routesRaw);
    const stops = JSON.parse(stopsRaw);
    for (const s of stops) {
      const name = String(s?.name ?? '').trim();
      const lat = Number(s?.lat);
      const lon = Number(s?.lon);
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      this.stopGeo.set(name, { lat, lon });
    }
    await fs.mkdir(HISTORY_DIR, { recursive: true });
    this.rebuildFleet(Date.now());
    this.initialized = true;
  }

  rebuildFleet(nowTs) {
    this.dayKey = dateKeyFromTs(nowTs);
    this.buses = [];
    for (const route of this.routes) {
      const routeName = String(route?.name ?? '').trim();
      const stops = Array.isArray(route?.stops) ? route.stops.map((s) => String(s).trim()) : [];
      if (!routeName || stops.length < 2) continue;
      const rng = mulberry32(strHash(routeName));
      const fleetN = FLEET_MIN_PER_ROUTE + Math.floor(rng() * (FLEET_MAX_PER_ROUTE - FLEET_MIN_PER_ROUTE + 1));
      for (let i = 0; i < fleetN; i += 1) {
        const shiftStart = GLOBAL_SERVICE_START_MIN + Math.floor(rng() * 120); // 05:00-07:00
        const shiftEnd = Math.max(shiftStart + 9 * 60, GLOBAL_SERVICE_END_MIN - Math.floor(rng() * 120)); // ~22:00-24:00
        const segmentCount = stops.length - 1;
        const loopDurationMin = Math.max(30, segmentCount * (6 + Math.floor(rng() * 4)) + Math.floor(rng() * 20));
        const firstDeparture = shiftStart + i * HEADWAY_MIN;
        this.buses.push({
          bus_id: `${routeName.replace(/\s+/g, '-').toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
          route_name: routeName,
          stops,
          shift_start_min: shiftStart,
          shift_end_min: shiftEnd,
          first_departure_min: firstDeparture,
          loop_duration_min: loopDurationMin,
          last_recorded_loop: 0,
          loop_count_today: 0,
          status: 'idle',
          current_loop_index: 0,
          lat: null,
          lon: null,
          progress: 0,
        });
      }
    }
  }

  simulatedNow(realNowTs = Date.now()) {
    return this.bootSimTs + (realNowTs - this.bootRealTs) * SIM_TIME_SCALE;
  }

  async ensureCurrentDay(nowTs) {
    const key = dateKeyFromTs(nowTs);
    if (key !== this.dayKey) {
      this.rebuildFleet(nowTs);
    }
  }

  positionForBus(bus, elapsedInLoopMin) {
    const segmentDur = bus.loop_duration_min / (bus.stops.length - 1);
    const segIdx = Math.min(bus.stops.length - 2, Math.floor(elapsedInLoopMin / segmentDur));
    const segProgress = Math.max(0, Math.min(1, (elapsedInLoopMin - segIdx * segmentDur) / segmentDur));
    const aName = bus.stops[segIdx];
    const bName = bus.stops[segIdx + 1];
    const a = this.stopGeo.get(aName);
    const b = this.stopGeo.get(bName);
    if (!a || !b) return { lat: null, lon: null, from_stop: aName, to_stop: bName };
    return {
      lat: a.lat + (b.lat - a.lat) * segProgress,
      lon: a.lon + (b.lon - a.lon) * segProgress,
      from_stop: aName,
      to_stop: bName,
    };
  }

  _indexOfStop(bus, stopName) {
    return bus.stops.findIndex((s) => s === stopName);
  }

  _etaToStopMinutes(bus, targetStop) {
    const idxTarget = this._indexOfStop(bus, targetStop);
    if (idxTarget === -1) return null;
    const segmentDur = bus.loop_duration_min / (bus.stops.length - 1);
    const currentEdgeIdx = Math.max(0, bus.stops.indexOf(bus.from_stop));
    const edgeProgress = Math.max(0, Math.min(1, Number(bus.progress || 0) * (bus.stops.length - 1) - currentEdgeIdx));
    let remainingEdges = 0;
    if (idxTarget > currentEdgeIdx) {
      remainingEdges = (idxTarget - currentEdgeIdx) - edgeProgress;
    } else if (idxTarget === currentEdgeIdx) {
      remainingEdges = Math.max(0, 1 - edgeProgress);
    } else {
      // target already behind on this loop, estimate next loop arrival
      remainingEdges = (bus.stops.length - 1 - currentEdgeIdx) - edgeProgress + idxTarget;
    }
    return Math.max(0, Math.round(remainingEdges * segmentDur));
  }

  _etaBetweenStopsOnRoute(bus, fromStop, toStop) {
    const i = this._indexOfStop(bus, fromStop);
    const j = this._indexOfStop(bus, toStop);
    if (i === -1 || j === -1 || j < i) return null;
    const segmentDur = bus.loop_duration_min / (bus.stops.length - 1);
    return Math.round((j - i) * segmentDur);
  }

  async appendLoopHistory(rows) {
    if (!rows.length) return;
    const body = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
    await fs.appendFile(HISTORY_FILE, body, 'utf8');
  }

  async advance(nowTs = Date.now()) {
    const simTs = this.simulatedNow(nowTs);
    await this.init();
    await this.ensureCurrentDay(simTs);
    const nowMin = minutesOfDay(simTs);
    const historyRows = [];
    for (const bus of this.buses) {
      if (nowMin < bus.shift_start_min || nowMin > bus.shift_end_min) {
        bus.status = 'off_duty';
        bus.current_loop_index = 0;
        bus.progress = 0;
        continue;
      }
      if (nowMin < bus.first_departure_min) {
        bus.status = 'waiting_start';
        bus.current_loop_index = 0;
        bus.progress = 0;
        continue;
      }
      const elapsed = nowMin - bus.first_departure_min;
      const loopsDone = Math.floor(elapsed / bus.loop_duration_min);
      const inLoop = elapsed - loopsDone * bus.loop_duration_min;
      bus.status = 'in_service';
      bus.current_loop_index = loopsDone + 1;
      bus.loop_count_today = loopsDone;
      bus.progress = inLoop / bus.loop_duration_min;
      const pos = this.positionForBus(bus, inLoop);
      bus.lat = pos.lat;
      bus.lon = pos.lon;
      bus.from_stop = pos.from_stop;
      bus.to_stop = pos.to_stop;

      if (loopsDone > bus.last_recorded_loop) {
        for (let li = bus.last_recorded_loop + 1; li <= loopsDone; li += 1) {
          const startedMin = bus.first_departure_min + (li - 1) * bus.loop_duration_min;
          const endedMin = startedMin + bus.loop_duration_min;
          historyRows.push({
            bus_id: bus.bus_id,
            route_name: bus.route_name,
            loop_index: li,
            started_at_hhmm: minuteToHHMM(startedMin),
            ended_at_hhmm: minuteToHHMM(endedMin),
            duration_min: bus.loop_duration_min,
            service_day: this.dayKey,
          });
        }
        bus.last_recorded_loop = loopsDone;
      }
    }
    await this.appendLoopHistory(historyRows);
  }

  async getFleetSnapshot(nowTs = Date.now()) {
    const simTs = this.simulatedNow(nowTs);
    await this.advance(nowTs);
    return {
      service_day: this.dayKey,
      simulation_time_iso: new Date(simTs).toISOString(),
      simulation_time_scale: SIM_TIME_SCALE,
      global_window: { start: '05:00', end: '24:00' },
      headway_min: HEADWAY_MIN,
      buses: this.buses.map((b) => ({
        bus_id: b.bus_id,
        route_name: b.route_name,
        status: b.status,
        loop_count_today: b.loop_count_today,
        current_loop_index: b.current_loop_index,
        shift_start_hhmm: minuteToHHMM(b.shift_start_min),
        shift_end_hhmm: minuteToHHMM(b.shift_end_min),
        first_departure_hhmm: minuteToHHMM(b.first_departure_min),
        lat: b.lat,
        lon: b.lon,
        from_stop: b.from_stop ?? null,
        to_stop: b.to_stop ?? null,
      })),
    };
  }

  async getBus(busId, nowTs = Date.now()) {
    const simTs = this.simulatedNow(nowTs);
    await this.advance(nowTs);
    const bus = this.buses.find((b) => b.bus_id === busId);
    if (!bus) return null;
    return {
      bus_id: bus.bus_id,
      route_name: bus.route_name,
      status: bus.status,
      loop_count_today: bus.loop_count_today,
      current_loop_index: bus.current_loop_index,
      shift_start_hhmm: minuteToHHMM(bus.shift_start_min),
      shift_end_hhmm: minuteToHHMM(bus.shift_end_min),
      first_departure_hhmm: minuteToHHMM(bus.first_departure_min),
      loop_duration_min: bus.loop_duration_min,
      simulation_time_iso: new Date(simTs).toISOString(),
      simulation_time_scale: SIM_TIME_SCALE,
      lat: bus.lat,
      lon: bus.lon,
      from_stop: bus.from_stop ?? null,
      to_stop: bus.to_stop ?? null,
    };
  }

  async getLoopHistory(limit = 100) {
    await this.init();
    try {
      const raw = await fs.readFile(HISTORY_FILE, 'utf8');
      const rows = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return rows.slice(Math.max(0, rows.length - limit));
    } catch {
      return [];
    }
  }

  async getUpcomingForStop(stopName, limit = 10) {
    await this.advance(Date.now());
    const out = [];
    for (const b of this.buses) {
      if (b.status !== 'in_service') continue;
      if (!b.stops.includes(stopName)) continue;
      const eta = this._etaToStopMinutes(b, stopName);
      if (!Number.isFinite(eta)) continue;
      out.push({
        bus_id: b.bus_id,
        route_name: b.route_name,
        eta_minutes: eta,
        loop_count_today: b.loop_count_today,
        current_loop_index: b.current_loop_index,
        current_from_stop: b.from_stop ?? null,
        current_to_stop: b.to_stop ?? null,
        lat: b.lat,
        lon: b.lon,
      });
    }
    out.sort((a, b) => a.eta_minutes - b.eta_minutes);
    return out.slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));
  }

  async createTrackingSession({ origin, destination, route_name: routeName, boarding_stop: boardingStop }) {
    await this.advance(Date.now());
    const nearest = this.findNearestBus({ origin, destination, route_name: routeName, boarding_stop: boardingStop });
    if (!nearest) return null;
    const targetBoarding = boardingStop || origin;
    const chosen = nearest;
    const sessionId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.set(sessionId, {
      session_id: sessionId,
      bus_id: chosen.bus_id,
      route_name: chosen.route_name,
      origin,
      destination,
      boarding_stop: targetBoarding,
      onboard_confirmed: false,
      created_at: new Date().toISOString(),
    });
    return { session_id: sessionId, bus_id: chosen.bus_id, eta_to_user_min: chosen.eta_to_user_min };
  }

  findNearestBus({ origin, destination, route_name: routeName, boarding_stop: boardingStop }) {
    const candidates = this.buses.filter(
      (b) =>
        b.status === 'in_service' &&
        b.route_name === routeName &&
        b.stops.includes(origin) &&
        b.stops.includes(destination) &&
        b.stops.indexOf(origin) < b.stops.indexOf(destination),
    );
    if (!candidates.length) return null;
    const targetBoarding = boardingStop || origin;
    const ranked = candidates
      .map((b) => ({ bus: b, eta_to_user_min: this._etaToStopMinutes(b, targetBoarding) }))
      .filter((x) => Number.isFinite(x.eta_to_user_min))
      .sort((a, b) => a.eta_to_user_min - b.eta_to_user_min);
    if (!ranked.length) return null;
    const chosen = ranked[0].bus;
    return {
      bus_id: chosen.bus_id,
      route_name: chosen.route_name,
      eta_to_user_min: ranked[0].eta_to_user_min,
      bus_status: chosen.status,
      loop_count_today: chosen.loop_count_today,
      current_loop_index: chosen.current_loop_index,
      bus_position: {
        lat: chosen.lat,
        lon: chosen.lon,
        from_stop: chosen.from_stop ?? null,
        to_stop: chosen.to_stop ?? null,
      },
    };
  }

  async getNearestBus(params) {
    await this.advance(Date.now());
    return this.findNearestBus(params);
  }

  async getTrackingSession(sessionId) {
    await this.advance(Date.now());
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const bus = this.buses.find((b) => b.bus_id === session.bus_id);
    if (!bus) return null;
    const etaToUser = this._etaToStopMinutes(bus, session.boarding_stop);
    const etaFromOriginToDest = this._etaBetweenStopsOnRoute(bus, session.origin, session.destination);
    const remainingToDest = session.onboard_confirmed
      ? this._etaToStopMinutes(bus, session.destination)
      : null;
    return {
      ...session,
      bus_status: bus.status,
      bus_position: { lat: bus.lat, lon: bus.lon, from_stop: bus.from_stop, to_stop: bus.to_stop },
      eta_to_user_min: etaToUser,
      eta_origin_to_destination_min: etaFromOriginToDest,
      eta_to_destination_min: remainingToDest,
    };
  }

  async confirmOnboard(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    session.onboard_confirmed = true;
    session.onboard_confirmed_at = new Date().toISOString();
    return this.getTrackingSession(sessionId);
  }
}

const fleetSimulationService = new FleetSimulationService();

export default fleetSimulationService;
