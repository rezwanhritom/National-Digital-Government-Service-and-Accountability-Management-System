import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';

const inputClass =
  'w-full p-3 rounded-lg bg-white/5 border border-white/10 text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20';

function crowdTextClass(crowd) {
  const key = String(crowd ?? '')
    .trim()
    .toUpperCase();
  if (key === 'LOW') return 'text-green-400';
  if (key === 'MEDIUM') return 'text-yellow-400';
  if (key === 'HIGH') return 'text-red-400';
  return 'text-slate-300';
}

function crowdLabel(crowd) {
  const key = String(crowd ?? '')
    .trim()
    .toUpperCase();
  if (key === 'LOW') return 'Low';
  if (key === 'MEDIUM') return 'Medium';
  if (key === 'HIGH') return 'High';
  return String(crowd ?? '—');
}

const routeItemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

function cleanRouteName(name) {
  const s = String(name ?? '').trim();
  if (!s) return 'Route';
  return s.replace(/\s*\(Return\)\s*$/i, '');
}

function isReturnRoute(name) {
  return /\(Return\)\s*$/i.test(String(name ?? '').trim());
}

function Planner() {
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(true);
  const [stopsError, setStopsError] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [time, setTime] = useState('09:00');
  const [timeType, setTimeType] = useState('leave_after');
  const [preference, setPreference] = useState('fastest');
  const [results, setResults] = useState([]);
  const [simSession, setSimSession] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [nearestBus, setNearestBus] = useState(null);
  const [nearestError, setNearestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStopsError('');
      try {
        const { data } = await api.get('/planner/stops');
        const list = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled) setStops(list);
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          'Could not load stops.';
        if (!cancelled) setStopsError(typeof msg === 'string' ? msg : String(msg));
      } finally {
        if (!cancelled) setStopsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRoutes = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return [];
    return [...results].sort((a, b) => {
      const sa = Number(a?.score);
      const sb = Number(b?.score);
      if (Number.isFinite(sa) && Number.isFinite(sb)) return sa - sb;
      const ea = Number(a?.eta);
      const eb = Number(b?.eta);
      if (!Number.isFinite(ea) && !Number.isFinite(eb)) return 0;
      if (!Number.isFinite(ea)) return 1;
      if (!Number.isFinite(eb)) return -1;
      return ea - eb;
    });
  }, [results]);

  const bestRouteContext = useMemo(() => {
    if (!sortedRoutes.length) return null;
    const best = sortedRoutes[0];
    const rideLeg = Array.isArray(best?.legs) ? best.legs.find((l) => l.kind === 'ride') : null;
    if (!rideLeg) return null;
    return {
      route_name: rideLeg.route,
      origin: best?.stops?.[0] ?? rideLeg.from_stop,
      destination: best?.stops?.[best.stops.length - 1] ?? rideLeg.to_stop,
      boarding_stop: rideLeg.from_stop,
    };
  }, [sortedRoutes]);

  const handlePlanRoute = async () => {
    setError('');
    setResults([]);
    setSimSession(null);
    setSimError('');
    setSaveMessage('');
    setNearestBus(null);
    setNearestError('');

    if (!origin?.trim() || !destination?.trim()) {
      setError('Please select both origin and destination.');
      return;
    }
    if (origin === destination) {
      setError('Origin and destination must be different.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError('Enter a valid time in HH:MM format.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/planner/commute', {
        origin: origin.trim(),
        destination: destination.trim(),
        time,
        time_type: timeType,
        preference,
      });
      const list = Array.isArray(data?.data) ? data.data : [];
      setResults(list);
      setHasFetched(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Something went wrong. Try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackBestRoute = async () => {
    if (!sortedRoutes.length) return;
    const best = sortedRoutes[0];
    const rideLeg = Array.isArray(best?.legs) ? best.legs.find((l) => l.kind === 'ride') : null;
    if (!rideLeg) {
      setSimError('No ride leg found to attach simulation tracking.');
      return;
    }
    setSimError('');
    setSimLoading(true);
    try {
      const { data } = await api.post('/planner/sim/session', {
        origin: best?.stops?.[0] ?? rideLeg.from_stop,
        destination: best?.stops?.[best.stops.length - 1] ?? rideLeg.to_stop,
        boarding_stop: rideLeg.from_stop,
        route_name: rideLeg.route,
      });
      const session = data?.data;
      if (session?.session_id) {
        const status = await api.get(`/planner/sim/session/${session.session_id}`);
        setSimSession(status.data?.data ?? null);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not start tracking session.';
      setSimError(String(msg));
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveBestRoute = async () => {
    if (!sortedRoutes.length) return;
    const best = sortedRoutes[0];
    setSaveMessage('');
    try {
      await api.post('/planner/favorites', {
        label: `${origin} -> ${destination}`,
        route_name: best?.route,
        origin,
        destination,
        preference,
        payload: best,
      });
      setSaveMessage('Best route saved.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not save route.';
      setSaveMessage(String(msg));
    }
  };

  const handleConfirmOnboard = async () => {
    if (!simSession?.session_id) return;
    setSimLoading(true);
    setSimError('');
    try {
      const { data } = await api.post(`/planner/sim/session/${simSession.session_id}/onboard`);
      setSimSession(data?.data ?? simSession);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not confirm onboard.';
      setSimError(String(msg));
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (!simSession?.session_id) return undefined;
    const id = setInterval(async () => {
      try {
        const { data } = await api.get(`/planner/sim/session/${simSession.session_id}`);
        setSimSession(data?.data ?? null);
      } catch {
        // Ignore polling blips; keep latest known state.
      }
    }, 3000);
    return () => clearInterval(id);
  }, [simSession?.session_id]);

  useEffect(() => {
    if (!bestRouteContext) return undefined;
    let cancelled = false;
    const loadNearest = async () => {
      try {
        const { data } = await api.get('/planner/sim/nearest', { params: bestRouteContext });
        if (!cancelled) {
          setNearestBus(data?.data ?? null);
          setNearestError('');
        }
      } catch (err) {
        if (!cancelled) {
          setNearestBus(null);
          const msg = err.response?.data?.message || err.message || 'Nearest bus unavailable';
          setNearestError(String(msg));
        }
      }
    };
    loadNearest();
    const id = setInterval(loadNearest, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [bestRouteContext]);

  return (
    <div className="w-full max-w-full overflow-x-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <h2 className="mb-6 text-2xl font-semibold text-white">
              Plan Your Commute
            </h2>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Origin
                </span>
                <select
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  disabled={loading || stopsLoading || stops.length === 0}
                  className={inputClass}
                >
                  <option value="">
                    {stopsLoading ? 'Loading stops…' : 'Select origin'}
                  </option>
                  {stops.map((name) => (
                    <option key={name} value={name} className="bg-slate-900">
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Destination
                </span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  disabled={loading || stopsLoading || stops.length === 0}
                  className={inputClass}
                >
                  <option value="">
                    {stopsLoading ? 'Loading stops…' : 'Select destination'}
                  </option>
                  {stops.map((name) => (
                    <option key={name} value={name} className="bg-slate-900">
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Trip time mode
                </span>
                <select
                  value={timeType}
                  onChange={(e) => setTimeType(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="leave_after" className="bg-slate-900">
                    Leave after (time = travel context)
                  </option>
                  <option value="arrive_by" className="bg-slate-900">
                    Arrive by (shows feasible options only)
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Preferred ranking
                </span>
                <select
                  value={preference}
                  onChange={(e) => setPreference(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="fastest" className="bg-slate-900">Fastest</option>
                  <option value="less_crowded" className="bg-slate-900">Less crowded</option>
                  <option value="fewer_transfers" className="bg-slate-900">Fewer transfers</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Time (HH:MM)
                </span>
                <input
                  type="time"
                  step={60}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handlePlanRoute}
              disabled={
                loading ||
                stopsLoading ||
                stops.length === 0 ||
                Boolean(stopsError)
              }
              className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Planning…' : 'Plan Route'}
            </button>

            <AnimatePresence>
              {stopsError ? (
                <motion.p
                  key="stops-err"
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
                >
                  Stops: {stopsError}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.p
                  key="err"
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
                >
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-6">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-base font-medium text-slate-300"
              >
                Calculating best routes...
              </motion.p>
            </div>
          ) : null}

          {!loading && sortedRoutes.length === 0 && !error ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <p className="max-w-sm text-center text-slate-400">
                {hasFetched
                  ? timeType === 'arrive_by'
                    ? 'No feasible routes before your arrival deadline. Try a later arrival time or different stops.'
                    : 'No routes found for this trip. Try a different pair or time.'
                  : 'Enter details to see routes'}
              </p>
            </div>
          ) : null}

          {!loading && sortedRoutes.length > 0 ? (
            <>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-4 text-sm text-cyan-100">
                {nearestBus ? (
                  <div className="mb-3 rounded-lg border border-cyan-300/20 bg-cyan-900/30 px-3 py-2 text-xs">
                    <p className="font-semibold text-cyan-100">Nearest bus to your origin</p>
                    <p className="mt-1">
                      {nearestBus.bus_id} · {cleanRouteName(nearestBus.route_name)} · ETA {nearestBus.eta_to_user_min} min
                    </p>
                    <p className="mt-1 text-cyan-200/80">
                      Now: {nearestBus?.bus_position?.from_stop ?? '—'} → {nearestBus?.bus_position?.to_stop ?? '—'} · Loops: {nearestBus.loop_count_today}
                    </p>
                  </div>
                ) : null}
                {!nearestBus && nearestError ? (
                  <p className="mb-3 text-xs text-amber-200">{nearestError}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p>Simulation tracking for the best option (ETA to you, then ETA to destination).</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveBestRoute}
                      className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
                    >
                      Save Best Route
                    </button>
                    <button
                      type="button"
                      onClick={handleTrackBestRoute}
                      disabled={simLoading}
                      className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
                    >
                      {simLoading ? 'Starting…' : 'Track Best Bus'}
                    </button>
                  </div>
                </div>
                {simError ? <p className="mt-2 text-rose-200">{simError}</p> : null}
                {saveMessage ? <p className="mt-2 text-emerald-200">{saveMessage}</p> : null}
                {simSession ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                    <p>
                      Bus: <span className="font-semibold">{simSession.bus_id}</span> ({simSession.route_name})
                    </p>
                    <p>
                      Status: <span className="font-semibold">{simSession.bus_status}</span>
                    </p>
                    <p>
                      ETA to you: <span className="font-semibold">{simSession.eta_to_user_min ?? '—'} min</span>
                    </p>
                    <p>
                      ETA destination: <span className="font-semibold">{simSession.eta_to_destination_min ?? '—'} min</span>
                    </p>
                    <p>
                      Onboard confirmed: <span className="font-semibold">{simSession.onboard_confirmed ? 'Yes' : 'No'}</span>
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={handleConfirmOnboard}
                        disabled={simLoading || simSession.onboard_confirmed}
                        className="rounded bg-indigo-500/80 px-2 py-1 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-60"
                      >
                        {simSession.onboard_confirmed ? 'Onboard Confirmed' : "I'm on the bus"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <motion.ul
                className="space-y-6"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
                  },
                }}
              >
                {sortedRoutes.map((row, index) => {
                const stopsText = Array.isArray(row?.stops)
                  ? row.stops.join(' → ')
                  : '';
                const lines = Array.isArray(row?.lines) ? row.lines : [];
                const lineCount = lines.length;
                const primaryLine = cleanRouteName(lines[0] ?? row?.route);
                const hasReturn = lines.some((ln) => isReturnRoute(ln));
                const eta = row?.eta;
                const etaLabel = Number.isFinite(Number(eta))
                  ? `${Number(eta)} min`
                  : '—';
                const isBest = index === 0;
                const preferenceLabel =
                  row?.preference === 'less_crowded'
                    ? 'Less crowded'
                    : row?.preference === 'fewer_transfers'
                      ? 'Fewer transfers'
                      : 'Fastest';

                return (
                  <motion.li
                    key={`${row?.route ?? 'route'}-${index}`}
                    variants={routeItemVariants}
                  >
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                              {primaryLine}
                            </h3>
                            {lineCount > 1 ? (
                              <span className="rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300">
                                {lineCount} lines
                              </span>
                            ) : null}
                            {hasReturn ? (
                              <span className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
                                Return direction
                              </span>
                            ) : null}
                            {isBest ? (
                              <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                Best Option ({preferenceLabel})
                              </span>
                            ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <p className="text-white">
                            <span className="text-slate-400">ETA </span>
                            <span className="font-bold">{etaLabel}</span>
                          </p>
                          <p className={crowdTextClass(row?.crowd)}>
                            <span className="text-slate-500">Crowd </span>
                            <span className="font-semibold">{crowdLabel(row?.crowd)}</span>
                          </p>
                          <p className="text-slate-200">
                            <span className="text-slate-500">Transfers </span>
                            <span className="font-semibold">{Number(row?.transfer_count ?? 0)}</span>
                          </p>
                          <p className="text-slate-200">
                            <span className="text-slate-500">Walk </span>
                            <span className="font-semibold">{Number(row?.walk_minutes ?? 0)} min</span>
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm text-slate-400">{stopsText}</p>
                          {lineCount > 1 ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Lines: {lines.map((ln) => cleanRouteName(ln)).join(' · ')}
                            </p>
                          ) : null}
                          {row?.explanation ? (
                            <p className="mt-2 text-xs text-slate-500">{String(row.explanation)}</p>
                          ) : null}
                          {row?.time_note ? (
                            <p className="mt-1 text-xs text-cyan-200/80">{String(row.time_note)}</p>
                          ) : null}
                          {row?.suggested_departure_time ? (
                            <p className="mt-1 text-xs text-indigo-200/80">
                              Suggested departure: {String(row.suggested_departure_time)}
                            </p>
                          ) : null}
                          {Array.isArray(row?.legs) && row.legs.length > 0 ? (
                            <ul className="mt-3 list-inside list-disc text-xs text-slate-500">
                              {row.legs.map((leg, li) => (
                                <li key={`${leg.route}-${leg.from_stop}-${leg.to_stop}-${li}`}>
                                  {leg.kind === 'transfer'
                                    ? `Transfer · +${leg.eta} min`
                                    : leg.kind === 'walk'
                                      ? `Walk: ${leg.from_stop} -> ${leg.to_stop} · ${leg.eta} min`
                                    : `${leg.route}: ${leg.from_stop} → ${leg.to_stop} · ${leg.eta} min · ${crowdLabel(leg.crowd)}`}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
                })}
              </motion.ul>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Planner;
