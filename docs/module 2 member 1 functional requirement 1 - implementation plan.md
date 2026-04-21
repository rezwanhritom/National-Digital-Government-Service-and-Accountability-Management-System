# Module 2 Member 1 Functional Requirement 1 - Implementation Plan

## Feature scope (only this FR)

**Functional Requirement:**  
Incident classification & routing system  
"The system automatically classifies incidents using rules + AI model, assigns severity, and routes them to the appropriate operator or authority team based on route/zone."

This plan tracks only the above feature. It does not include unrelated modules/features.

---

## Tracking status legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Completed
- `[!]` Blocked

---

## Current baseline (MVP already present)

- `[x]` AI + fallback incident classification endpoint exists.
- `[x]` Severity assignment exists.
- `[x]` Basic authority assignment rules exist.
- `[x]` Affected route lookup exists (text-based match).
- `[x]` Impact estimation endpoint exists (delay + recovery + reroutes).

---

## Final-product readiness plan

## Phase 1 - Routing accuracy and zone intelligence

- `[x]` Add geospatial location support (`lat`, `lng`) in incident flow.
- `[x]` Implement nearest stop/route-segment matching from coordinates.
- `[x]` Add zone mapping (ward/traffic zone/polygon) for authority routing.
- `[x]` Upgrade routing logic to use route + zone context together.
- `[x]` Add validation for out-of-network incident locations.

**Exit criteria:** Routing decision is no longer dependent only on plain location text.

---

## Phase 2 - Classification quality and trust

- `[ ]` Expand and rebalance incident training dataset.
- `[ ]` Return classification confidence scores in API response.
- `[ ]` Add confidence threshold handling (auto-route vs manual review).
- `[ ]` Add error categories for ambiguous/insufficient input.
- `[ ]` Add model quality checkpoints (precision/recall by category, severity accuracy).

**Exit criteria:** Classification quality is measurable, explainable, and review-safe.

---

## Phase 3 - Operator workflow (real routing, not string only)

- `[ ]` Persist incidents in database with lifecycle states (`open`, `assigned`, `acknowledged`, `resolved`).
- `[ ]` Map `assigned_to` to real operator/team queues.
- `[ ]` Add assignment history and audit trail.
- `[ ]` Add SLA timers and escalation path by severity.
- `[ ]` Add minimal operator action endpoints (reassign, update status, close).

**Exit criteria:** Incident routing produces actionable work items in a real workflow.

---

## Phase 4 - User-facing and control-plane readiness

- `[ ]` Align report form and classify flow with one clear product journey.
- `[ ]` Add admin rule configuration for authority mapping (category/severity/zone matrix).
- `[ ]` Add notification hooks (email/SMS/webhook) for assigned teams.
- `[ ]` Add role-based access checks for sensitive incident operations.

**Exit criteria:** Operations teams can run the feature without code changes.

---

## Phase 5 - Reliability and production hardening

- `[ ]` Add structured logs with incident IDs across backend and AI service.
- `[ ]` Add metrics (volume, classification latency, fallback rate, assignment latency).
- `[ ]` Add retry/circuit-breaker behavior for AI-service communication failures.
- `[ ]` Add rate limiting and abuse controls for report endpoints.
- `[ ]` Add regression tests for classify/routing/impact critical paths.

**Exit criteria:** Feature is observable, resilient, and safe for sustained use.

---

## Suggested implementation order

1. Phase 1 (route/zone accuracy)
2. Phase 3 (real operator workflow)
3. Phase 2 (confidence + quality controls)
4. Phase 5 (hardening + observability)
5. Phase 4 (admin and UX refinements)

---

## Change log for this plan

- 2026-04-21: Initial FR-only implementation plan created.
- 2026-04-21: Phase 1 backend implementation started; geo input, nearest-stop context, zone-aware routing, and out-of-network validation added.
- 2026-04-21: Incident report flow updated with allowed-area selection, nearest-area auto-resolution from coordinates, and map-based coordinate picking.

