# Plan: AI commute planner — next level

This document is the **working roadmap** for upgrading the AI-powered commute planner (Module 1, requirement 1). Work through phases **in order** unless a dependency is skipped by team decision. Update this file as items complete (check boxes, add dates or PR links if useful).

**Related docs:** [`feature-ai-powered-commute-planner.md`](./feature-ai-powered-commute-planner.md) (current behavior), [`run-full-stack.md`](./run-full-stack.md).

---

## Goals (what “done” looks like)

1. **Bidirectional travel** matches reality: return legs along the same physical routes are plannable (e.g. Banasree → Badda, not only Badda → Banasree).
2. **Time and congestion** align better with the course spec: finer time context where feasible, segment- or corridor-aware signals feeding ETA where we choose to implement them.
3. **Ranking** can reflect more than raw minutes: transfers, crowding (and optionally walking) via a clear scoring or preset modes.
4. **Map + corridor data**: users see the **path on a map** and can read **named road / landmark points** along the line (dataset-driven, not only stop names).
5. **Simulated “live” leg in the planner** (your scope): while the user is planning or after they pick a trip, the planner can show **ETA for the bus to reach the user** and, after **“I’m on the bus”**, **ETA to destination** — driven by an **automatic GPS simulation** (no duplicate “full live map” product; the separate **nearby stops & live bus discovery** page remains the other member’s feature for the broader map UX).
6. **Fleet + loop lifecycle (simulated):** Many vehicles per route/operator (minimum **>20 per bus type**, configurable), **staggered first departures** (e.g. one bus every ~10 minutes), **per-bus duty windows** within a global service day (**05:00–24:00** as the outer band — individual buses get **randomized** start/end shifts, e.g. 06:00–23:00). Each bus advances along the route polyline with **distinct GPS**, tracks **loop count**, and **resets** when its duty ends; a **full loop** completes when the vehicle finishes one cycle along its assigned pattern (direction + terminals as defined in implementation).
7. **Loop history for future ML:** Persist **every completed loop** per bus: loop start time, end time, **duration**, route/direction identifiers — exportable for **supervised training** (realized round-trip times, delay distributions) and analytics later.

---

## Scope boundaries (avoid duplicate work)

| Area | This plan (commute planner) | Other page / teammate |
|------|-----------------------------|------------------------|
| Map with **all buses**, city-wide discovery, “nearby stops” primary UX | Out of scope | Nearby stops & live bus discovery |
| **Planner-only** location strip, ETAs, confirm onboard, **simulated** vehicle progress along **chosen route** | In scope | May later consume **real** GPS if the same API exists |
| **Multi-bus fleet simulation**, per-bus GPS, schedules, loop counters, **loop history store** (backend + data files / DB) | In scope (powers realistic “next bus” / ETA in planner) | Same data could be **reused read-only** by live discovery later |
| Road geometry & named points along routes | In scope (new/updated data under repo) | — |

If the team adds **real** `bus_id` positions later, the planner’s simulation layer can be swapped for a thin client that calls shared APIs without changing the rest of the UX story.

---

## Datasets: what exists, what to add or change

### Already in the repo

| Asset | Role |
|--------|------|
| [`ai-services/data/routes.json`](../ai-services/data/routes.json) | Ordered stop lists per route — **graph source** for pathfinding. |

### What you likely need to add (new files or structured extensions)

1. **Bidirectional patterns**  
   - **Option A:** Duplicate logical routes with explicit direction (e.g. `Alif Paribahan (Demra → Shyamoli)`) with reversed `stops` arrays.  
   - **Option B:** One route id + `direction` + two stop sequences in JSON.  
   - **Decision (locked):** **Option A** — a second route entry per line: **`{name} (Return)`** with **reversed** `stops` (see [`routes.json`](../ai-services/data/routes.json)).  
   - **Training data:** [`eta_dataset.csv`](../ai-services/data/eta_dataset.csv) / crowding may need **direction** or **distinct route labels** so models learn both ways.

2. **Geometry for maps (“exact roads”)**  
   - **Per route (and per direction if split):** an ordered list of **coordinates** `[lat, lon]` forming a **polyline** along the main road (good enough for visualization; sub-meter precision not required for MVP).  
   - **Optional “road points” / landmarks:** same polyline, or a separate list of `{ name, lat, lon, order }` for labels (“in front of X”, “Main Road — Y”).  
   - **Suggested locations in repo** (adjust names if you prefer):  
     - `ai-services/data/route_geometries.json` — `{ "route_key": { "polyline": [[lat,lon], ...], "landmarks": [...] } }`  
     - or split: `geometries/*.json` per route.  
   - **How to build:** manual trace (Google Maps / OSM / Mapbox draw), or export from OpenStreetMap; **no** need to scrape “the whole city” — only routes present in `routes.json`. Version-control friendly.

3. **Optional finer stops (Banasree-style)**  
   - Parent/child stops or **aliases** mapping several labels → one graph node, or extra nodes if a route truly serves different stops.

4. **GPS simulation defaults**  
   - **Replay config:** speed profile, tick interval, jitter — code or `simulation_defaults.json`.

5. **Fleet & schedule seed data (generated or hand-tuned)**  
   - **Fleet size:** For each **route pattern** (or operator + direction), generate **N** vehicles where **N ≥ 21** (policy: random integer in a band, e.g. **21–45**, so it stays “more than 20” but not identical every run unless you fix the seed).  
   - **Headway:** e.g. **first departure** of bus *k* = `service_open + k * headway_minutes` (default **10** minutes between consecutive bus starts from the same terminal — configurable).  
   - **Global service window:** e.g. operations allowed **05:00–24:00** (5 AM through midnight); **simulation clock** or “virtual day” should respect this for departures and for deciding when buses are off-duty.  
   - **Per-bus duty:** Each vehicle gets a **randomized** `(shift_start, shift_end)` **inside** the global window (examples: 06:00–23:00, 07:00–22:30). When **sim time** passes `shift_end`, that bus **ends its day**: finish current loop or hard-stop per your rule, **reset** for the next simulated day (or next rolling window), **loop index** and **odometer-like** stats reset as you define.  
   - **Persistence:** `fleet_config.json` (targets + headway rules) vs **runtime-generated** fleet at server start — choose one and document.

6. **Loop history (training gold)**  
   - **Append-only** store: SQLite, JSON Lines, or CSV under e.g. `ai-services/data/history/` — each row: `bus_id`, `route_key`, `direction`, `loop_index`, `started_at`, `ended_at`, `duration_sec`, optional `peak_traffic_level`, `notes`.  
   - **Purpose:** future **ETA / dwell / congestion** models trained on **realized loop duration** and time-of-day; export scripts can merge with [`eta_dataset.csv`](../ai-services/data/eta_dataset.csv).

**Enlightenment (your question):** You will **not** replace `routes.json` for graph connectivity unless you migrate carefully. **Road/place data is additive:** new JSON (geometries + landmarks) keyed by route (and direction). Pathfinding still uses **stops**; the map uses **polyline + landmarks** aligned to those stops (snap first/last vertex to stop coordinates when you geocode stops). **Fleet and history** are **orthogonal**: they sit on top of geometry + bidirectional patterns.

---

## Implementation phases (do in order)

### Phase 1 — Bidirectional network & planner correctness

- [x] **1.1** Decide data model: two route entries vs `direction` field (see above).  
- [x] **1.2** Update `routes.json` (or successor) so **return** directions exist for routes that run both ways in real life.  
- [x] **1.3** Adjust `plannerService.js` graph logic if the schema changes (single forward list vs direction-aware). *(No code change: existing forward-only graph works with separate return route rows.)*  
- [x] **1.4** Re-run or extend training pipelines so ETA/crowding support new route names or direction features; re-export encoders/models as needed. *(Augmentation script + retrain ETA, crowd, congestion — see below.)*  
- [x] **1.5** Smoke-test: symmetric OD pairs behave as expected (e.g. Banasree ↔ Badda on Alif). *(Graph check: `Alif Paribahan (Return)` includes edges toward Shyamoli; run `/planner` with AI up to confirm ETAs.)*

**Exit criteria:** Reverse-direction trips appear in results where the network allows; no regression on existing pairs.

---

### Phase 2 — Time, congestion, and ranking (PDF alignment)

- [ ] **2.1** Extend API contract: `minute` or `time` (HH:MM) + `time_type`; backend normalizes to features for AI calls.  
- [ ] **2.2** Optionally pass **per-segment** congestion (from existing segment keys) into ETA instead of only global `traffic_level` — define minimal contract in FastAPI + Node.  
- [ ] **2.3** Implement **multi-criteria score** or **modes** (“Fastest”, “Less crowded”, “Fewer transfers”) using ETA + transfer count + crowding penalty.  
- [ ] **2.4** Update [`Planner.jsx`](../frontend/src/pages/Planner.jsx) for new inputs and result labels.

**Exit criteria:** Spec text “score combining time, transfers, walking, crowding” is partially or fully satisfied; walking optional in a later sub-phase.

---

### Phase 3 — Road geometry & named points (dataset + UI)

- [ ] **3.1** Create `route_geometries.json` (or chosen structure) for all planner routes; include **polylines**.  
- [ ] **3.2** Add **landmarks / main road points** (as many as practical; iterate).  
- [ ] **3.3** Geocode **stops** if not lat/lon yet (small `stops_geo.json` or embed in routes) so map endpoints align with graph stops.  
- [ ] **3.4** Backend: optional `GET /api/planner/route-geometry?route=...` or embed geometry in commute response for chosen path.  
- [ ] **3.5** Frontend: map component on planner (Leaflet/Mapbox already aligned with project choice) — draw polyline, markers for stops and landmark labels.

**Exit criteria:** User sees **actual path shape** and **named road points** for planned routes.

---

### Phase 4 — Fleet registry, duty schedules, multi-bus GPS & loop lifecycle

This phase implements the **full cycle / loop system**: many buses per route type, staggered starts, independent **live** positions, loop counting, shift end → reset, and **historical records** per loop for future model training.

- [ ] **4.1** Define identifiers: `route_key` / `pattern_id`, `bus_id` (unique across fleet), `operator` optional.  
- [ ] **4.2** **Fleet generation:** For each active route pattern, instantiate **≥ 21** buses (implement **random N** in `[min_fleet, max_fleet]` with **min_fleet ≥ 21**, e.g. 21–40). Store fleet list in memory + optional seed file for reproducible demos.  
- [ ] **4.3** **Staggered departures:** First trip of bus *i* at `t0 + i * headway` (default **10 min** headway; configurable). Handle wrap past midnight if needed (policy: cap within service window).  
- [ ] **4.4** **Global service window:** Default **05:00–24:00** — no new departures outside window unless you add night service; document edge cases (buses already on road past midnight).  
- [ ] **4.5** **Per-bus duty shifts:** Randomize each bus’s `(shift_start, shift_end)` within the global window (e.g. 06:00–23:00). When simulation time **exceeds `shift_end`**, mark bus **off-duty**, optionally **complete** current loop then park, **reset** for next cycle (next simulated day or rolling 24h — pick one and document).  
- [ ] **4.6** **Loop semantics:** Increment **loop count** when a bus completes one full traversal of its **assigned polyline pattern** (terminal → terminal); align with bidirectional data from Phase 1.  
- [ ] **4.7** **Per-bus GPS state:** Each bus has **independent** position along polyline, speed/jitter, current segment index — expose via internal service or `GET /api/planner/fleet/...` (exact routes TBD).  
- [ ] **4.8** **Loop history persistence:** On loop completion, append `{ bus_id, route_key, loop_index, started_at, ended_at, duration_sec, ... }` to **durable storage** (SQLite recommended for queries + CSV export). Retention policy: keep all for dev; cap size in production if needed.  
- [ ] **4.9** **Export hook:** Script or endpoint to dump recent history for **training pipelines** (join with congestion hour, weather later).  
- [ ] **4.10** **Simulation clock:** Virtual clock or wall-clock with speed multiplier for demos; document in runbook.

**Exit criteria:** Running backend shows **many buses** per route with **different** positions; loops increment; shifts end and reset; **history file/DB** grows with one row per completed loop; data is suitable for **future** ETA/loop-duration experiments.

---

### Phase 5 — Planner UX: “ETA to you” / “onboard” / “ETA to destination” (uses Phase 4)

- [ ] **5.1** Bind a **user’s planned boarding** to a **specific simulated bus** (e.g. nearest arriving by schedule + polyline ETA) or “next available in headway.”  
- [ ] **5.2** Show **ETA until bus reaches origin** (poll or SSE/WebSocket) using that bus’s **live** simulated position along geometry.  
- [ ] **5.3** **“I’m on the bus”** → switch to **remaining ETA to destination** (same bus instance; remaining polyline or segment ETAs).  
- [ ] **5.4** Keep UI **focused**: times, next landmark, loop/line info optional — **not** the full city “live discovery” map.  
- [ ] **5.5** Document public APIs (`POST` session bind, `GET` position/eta, etc.).

**Exit criteria:** End-to-end demo: pick trip → see approaching bus ETA → confirm onboard → see trip completion ETA; all backed by **Phase 4** fleet state.

---

### Phase 6 — Optional polish & integration

- [ ] **6.1** **Favorite / save commute** payload stub (wire to alerts module when ready).  
- [ ] **6.2** **Walking** edges between nearby stops (small graph extension) if you want walking in the score.  
- [ ] **6.3** Update [`feature-ai-powered-commute-planner.md`](./feature-ai-powered-commute-planner.md) to reflect new flows and files.

**Exit criteria:** Planner doc matches code; optional items clearly marked done or deferred.

---

## Progress log (optional)

Use this table to track milestones:

| Date | Phase | Note |
|------|-------|------|
| | | |

---

## After this plan

When phases **1–5** (and chosen items in **6**) are stable — including **fleet + loop history (Phase 4)** and **planner ETAs wired to that fleet (Phase 5)** — treat the commute planner as **feature-complete for Module 1 item 1**, then proceed to the **next functional requirement** per your course order, using a separate plan file if useful.

---

## Dependency note (geometry vs fleet)

**Phase 4** needs a **polyline** per pattern to move buses; **minimum** path is: complete **Phase 3** first, or stub straight-line segments between stops until full `route_geometries.json` exists. If you must parallelize, implement fleet against **stop-to-stop geodesics** first, then swap in real polylines when ready.
