import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALERT_HISTORY_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ai-services',
  'data',
  'history',
  'incident_alert_history.jsonl',
);

let recentByFingerprint = new Map();

function alertFingerprint(payload) {
  const area = String(payload?.area ?? '').trim().toLowerCase();
  const sev = String(payload?.severity ?? '').trim().toUpperCase();
  const routes = Array.isArray(payload?.affected_routes)
    ? payload.affected_routes.map((r) => String(r).trim().toLowerCase()).sort()
    : [];
  return `${sev}|${area}|${routes.join(',')}`;
}

function cooldownMs() {
  const raw = Number(process.env.IMPACT_ALERT_COOLDOWN_SECONDS ?? 300);
  if (!Number.isFinite(raw) || raw < 0) return 300_000;
  return Math.floor(raw * 1000);
}

export async function emitImpactAlertEvent(payload) {
  const now = Date.now();
  const fp = alertFingerprint(payload);
  const lastTs = recentByFingerprint.get(fp) ?? 0;
  const cd = cooldownMs();
  if (now - lastTs < cd) {
    return {
      emitted: false,
      deduped: true,
      reason: 'cooldown_active',
      cooldown_seconds: Math.floor(cd / 1000),
      fingerprint: fp,
    };
  }

  recentByFingerprint.set(fp, now);
  if (recentByFingerprint.size > 2000) {
    recentByFingerprint = new Map([...recentByFingerprint.entries()].slice(-1000));
  }

  const event = {
    event_id: `impact-alert-${now}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date(now).toISOString(),
    severity: String(payload?.severity ?? '').toUpperCase(),
    category: String(payload?.category ?? '').toLowerCase(),
    area: payload?.area ?? null,
    zone: payload?.zone ?? null,
    delay: Number(payload?.delay ?? 0),
    recovery_time: Number(payload?.recovery_time ?? 0),
    affected_routes: Array.isArray(payload?.affected_routes) ? payload.affected_routes : [],
    reroutes: Array.isArray(payload?.reroutes) ? payload.reroutes : [],
    nearest_stop: payload?.nearest_stop ?? null,
    nearest_route_segment: payload?.nearest_route_segment ?? null,
    policy_applied: payload?.policy_applied ?? null,
    target_scope: {
      route_subscribers: true,
      stop_proximity_watchers: true,
    },
  };

  await fs.mkdir(path.dirname(ALERT_HISTORY_PATH), { recursive: true });
  await fs.appendFile(ALERT_HISTORY_PATH, `${JSON.stringify(event)}\n`, 'utf8');

  return {
    emitted: true,
    deduped: false,
    cooldown_seconds: Math.floor(cd / 1000),
    event,
  };
}

