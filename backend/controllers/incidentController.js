import axios from 'axios';
import { classifyIncident as classifyIncidentWithAi, getImpact } from '../services/aiService.js';
import {
  deriveIncidentGeoContext,
  loadRoutesDataset,
  pickReroutes,
} from '../services/incidentImpactService.js';

/**
 * Route incidents using category, severity, and optional affected route names.
 * @param {string} categoryRaw
 * @param {string} severityRaw
 * @param {string[]} affectedRouteNames
 */
const MANUAL_REVIEW_QUEUE = 'Manual classification review queue';

function parseConfidenceThreshold(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 1) return fallback;
  return n;
}

function probForLabel(probs, label) {
  if (!probs || typeof probs !== 'object' || label === undefined || label === null) return null;
  const key = String(label);
  const upper = key.toUpperCase();
  const lower = key.toLowerCase();
  const v = probs[key] ?? probs[upper] ?? probs[lower];
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

function classificationSource(ai) {
  const hasCat = ai?.category_probs && typeof ai.category_probs === 'object' && Object.keys(ai.category_probs).length > 0;
  const hasSev = ai?.severity_probs && typeof ai.severity_probs === 'object' && Object.keys(ai.severity_probs).length > 0;
  return hasCat && hasSev ? 'ml' : 'fallback';
}

function evaluateClassificationTrust(ai, category, severity) {
  const source = classificationSource(ai);
  const catProb = probForLabel(ai?.category_probs, category);
  const sevProb = probForLabel(ai?.severity_probs, severity);
  const catMin = parseConfidenceThreshold('INCIDENT_CATEGORY_CONF_MIN', 0.55);
  const sevMin = parseConfidenceThreshold('INCIDENT_SEVERITY_CONF_MIN', 0.55);

  const review_reasons = [];
  if (source === 'fallback') {
    review_reasons.push('ml_artifacts_missing_keyword_fallback');
  }
  if (source === 'ml') {
    if (catProb === null) review_reasons.push('category_probability_unavailable');
    else if (catProb < catMin) review_reasons.push('category_confidence_below_threshold');
    if (sevProb === null) review_reasons.push('severity_probability_unavailable');
    else if (sevProb < sevMin) review_reasons.push('severity_confidence_below_threshold');
  }

  const needsReview =
    source === 'fallback' ||
    (source === 'ml' &&
      (catProb === null || sevProb === null || catProb < catMin || sevProb < sevMin));

  return {
    source,
    confidence: { category: catProb, severity: sevProb },
    thresholds: { category_min: catMin, severity_min: sevMin },
    routing_mode: needsReview ? 'manual_review' : 'auto',
    review_reasons,
  };
}

function validateDescriptionQuality(description) {
  const text = String(description ?? '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (text.length < 12) {
    return {
      ok: false,
      error_code: 'ambiguous_input',
      message: 'Description is too short; add a few more words about what happened.',
    };
  }
  if (words.length < 2) {
    return {
      ok: false,
      error_code: 'ambiguous_input',
      message: 'Description is too vague; include at least two meaningful words.',
    };
  }
  return { ok: true };
}

function assignAuthority(categoryRaw, severityRaw, affectedRouteNames = [], geoContext = null) {
  const category = String(categoryRaw ?? '').toLowerCase().replace(/\s+/g, '_');
  const severity = String(severityRaw ?? '').toUpperCase();
  const primary =
    Array.isArray(affectedRouteNames) && affectedRouteNames.length > 0
      ? affectedRouteNames[0]
      : null;
  const zone = String(geoContext?.zone ?? '').toLowerCase();
  const networkStatus = String(geoContext?.network_status ?? '').toLowerCase();

  if (networkStatus === 'out_of_network') {
    return 'City command verification desk (outside transit corridor)';
  }
  if (zone === 'busy' && severity !== 'LOW') {
    return primary
      ? `Urban traffic control priority queue (${primary})`
      : 'Urban traffic control priority queue';
  }

  if (category === 'road_blockage' || category === 'accident') {
    if (severity === 'HIGH') {
      return 'Emergency response & city traffic coordination';
    }
    return 'Traffic control & incident verification';
  }
  if (category === 'breakdown' || category === 'overcrowding') {
    return primary
      ? `Operator fleet desk (${primary})`
      : 'Operator fleet desk (assign route from GPS)';
  }
  if (category === 'reckless_driving') {
    return 'Safety enforcement & operator QA';
  }
  if (severity === 'HIGH') {
    return 'Authority escalation desk';
  }
  if (severity === 'MEDIUM') {
    return 'Traffic monitoring team';
  }
  return 'Standard monitoring queue';
}

export const classifyIncident = async (req, res, next) => {
  try {
    const { description } = req.body ?? {};

    if (typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'description is required (non-empty string)' });
    }

    const quality = validateDescriptionQuality(description);
    if (!quality.ok) {
      return res.status(400).json({
        message: quality.message,
        error_code: quality.error_code,
      });
    }

    const geo = await deriveIncidentGeoContext(req.body ?? {});
    if (!geo.location) {
      return res.status(400).json({
        message: 'location text or valid coordinates (latitude/longitude) are required',
      });
    }
    if (geo.network_status === 'out_of_network') {
      return res.status(422).json({
        message:
          'incident location appears outside known transit network. submit a point closer to transit corridors or provide a valid stop location',
        network_status: geo.network_status,
        nearest_stop: geo.nearest_stop,
        nearest_route_segment: geo.nearest_route_segment,
      });
    }

    const trimmedDesc = description.trim();
    const trimmedLoc = geo.location;

    const ai = await classifyIncidentWithAi({
      text: trimmedDesc,
      location: trimmedLoc,
    });
    const category = ai.category;
    const severity = ai.severity;
    const trust = evaluateClassificationTrust(ai, category, severity);

    const affectedPreview = geo.affected_routes;
    const assigned_to =
      trust.routing_mode === 'manual_review'
        ? MANUAL_REVIEW_QUEUE
        : assignAuthority(category, severity, affectedPreview, geo);

    return res.json({
      category,
      severity,
      assigned_to,
      routing_mode: trust.routing_mode,
      classification_source: trust.source,
      confidence: trust.confidence,
      confidence_thresholds: trust.thresholds,
      review_reasons: trust.review_reasons,
      category_probs: ai.category_probs ?? {},
      severity_probs: ai.severity_probs ?? {},
      location: trimmedLoc,
      network_status: geo.network_status,
      zone: geo.zone,
      area: geo.area,
      nearest_stop: geo.nearest_stop,
      nearest_route_segment: geo.nearest_route_segment,
      affected_routes: affectedPreview,
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

export const estimateImpact = async (req, res, next) => {
  try {
    const { category, severity, hour: hourRaw } = req.body ?? {};

    if (category === undefined || category === null || String(category).trim() === '') {
      return res.status(400).json({ message: 'category is required' });
    }
    if (severity === undefined || severity === null || String(severity).trim() === '') {
      return res.status(400).json({ message: 'severity is required' });
    }

    const geo = await deriveIncidentGeoContext(req.body ?? {});
    if (!geo.location) {
      return res.status(400).json({
        message: 'location text or valid coordinates (latitude/longitude) are required',
      });
    }
    if (geo.network_status === 'out_of_network') {
      return res.status(422).json({
        message:
          'incident location appears outside known transit network. submit a point closer to transit corridors or provide a valid stop location',
        network_status: geo.network_status,
        nearest_stop: geo.nearest_stop,
        nearest_route_segment: geo.nearest_route_segment,
      });
    }

    const trimmedLoc = geo.location;
    const routes = await loadRoutesDataset();
    const affected_routes = geo.affected_routes;
    const allNames = routes
      .map((r) => r?.name)
      .filter((n) => typeof n === 'string' && n.trim())
      .map((n) => n.trim());
    const affectedSet = new Set(affected_routes);
    const reroutes = pickReroutes(allNames, affectedSet, 2);

    let hour = null;
    if (hourRaw !== undefined && hourRaw !== null && hourRaw !== '') {
      const n = Number(hourRaw);
      if (Number.isInteger(n) && n >= 0 && n <= 23) hour = n;
    }

    const aiPayload = {
      location: trimmedLoc,
      category,
      severity,
      affected_routes,
      hour,
    };

    const { delay, recovery_time } = await getImpact(aiPayload);

    return res.json({
      affected_routes,
      delay,
      recovery_time,
      reroutes,
      network_status: geo.network_status,
      zone: geo.zone,
      area: geo.area,
      nearest_stop: geo.nearest_stop,
      nearest_route_segment: geo.nearest_route_segment,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(500).json({
        message: 'Transit routes dataset could not be read',
      });
    }
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
