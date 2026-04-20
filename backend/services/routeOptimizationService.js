import { getCongestionCurrent } from './aiService.js';
import TransitRoute from '../models/TransitRoute.js';
import { loadRoutesDataset } from './plannerService.js';

/**
 * Parse "RouteName|A->B" -> route name.
 * @param {string} segmentKey
 */
function routeFromSegmentKey(segmentKey) {
  const i = String(segmentKey).indexOf('|');
  if (i === -1) return null;
  return String(segmentKey).slice(0, i).trim();
}

/**
 * Heuristic suggestions from congestion snapshot + optional DB routes.
 * @param {{ hour?: number, dow?: number }} opts
 */
export async function buildOptimizationSuggestions(opts = {}) {
  const hour = Number.isInteger(opts.hour) ? opts.hour : 8;
  const dow = Number.isInteger(opts.dow) ? opts.dow : 1;

  let segments = [];
  try {
    const data = await getCongestionCurrent({ hour, dow });
    segments = Array.isArray(data?.segments) ? data.segments : [];
  } catch {
    segments = [];
  }

  const highByRoute = new Map();
  const medByRoute = new Map();
  for (const seg of segments) {
    const route = routeFromSegmentKey(seg.segment_key);
    if (!route) continue;
    const lvl = String(seg.level ?? '').toUpperCase();
    if (lvl === 'HIGH') {
      highByRoute.set(route, (highByRoute.get(route) ?? 0) + 1);
    } else if (lvl === 'MEDIUM') {
      medByRoute.set(route, (medByRoute.get(route) ?? 0) + 1);
    }
  }

  const suggestions = [];
  for (const [route, count] of highByRoute) {
    if (count >= 2) {
      suggestions.push({
        type: 'add_frequency',
        priority: 'high',
        route,
        message: `Peak congestion on ${route}: ${count} hot segment(s) at hour ${hour}. Consider adding buses or staggering departures.`,
      });
    }
  }
  for (const [route, count] of medByRoute) {
    if (count >= 4 && !highByRoute.has(route)) {
      suggestions.push({
        type: 'monitor',
        priority: 'medium',
        route,
        message: `Elevated congestion spread on ${route} (${count} medium segments). Review headways.`,
      });
    }
  }

  let dbCount = 0;
  try {
    dbCount = await TransitRoute.countDocuments();
  } catch {
    dbCount = 0;
  }
  if (dbCount === 0) {
    try {
      const fileRoutes = await loadRoutesDataset();
      if (fileRoutes.length > 0) {
        suggestions.push({
          type: 'data_hygiene',
          priority: 'low',
          route: null,
          message:
            'No routes in admin database yet; planner still uses ai-services/data/routes.json. Import routes via admin API when ready.',
        });
      }
    } catch {
      /* ignore */
    }
  }

  return { hour, dow, suggestions };
}
