import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';

/** Stop names aligned with `ai-services/data/stops.json` */
const STOPS = [
  'Mirpur 10',
  'Mirpur 2',
  'Shewrapara',
  'Kazipara',
  'Agargaon',
  'Shyamoli',
  'Mohammadpur',
  'Dhanmondi 27',
  'Dhanmondi 32',
  'Kalabagan',
  'Science Lab',
  'Shahbag',
  'Paltan',
  'Motijheel',
  'Farmgate',
  'Karwan Bazar',
  'Tejgaon',
  'Mohakhali',
  'Banani',
  'Kakoli',
  'Airport',
  'Uttara Sector 10',
  'Uttara Sector 12',
  'Uttara House Building',
  'Kuril',
  'Bashundhara',
  'Gulshan 1',
  'Gulshan 2',
  'Badda',
  'Uttor Badda',
  'Notun Bazar',
  'Rampura',
  'Malibagh',
  'Mouchak',
  'Khilgaon',
  'Banasree',
  'Demra',
];

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

function Planner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [hour, setHour] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  const sortedRoutes = useMemo(() => {
    if (!Array.isArray(results) || results.length === 0) return [];
    return [...results].sort((a, b) => {
      const ea = Number(a?.eta);
      const eb = Number(b?.eta);
      if (!Number.isFinite(ea) && !Number.isFinite(eb)) return 0;
      if (!Number.isFinite(ea)) return 1;
      if (!Number.isFinite(eb)) return -1;
      return ea - eb;
    });
  }, [results]);

  const handlePlanRoute = async () => {
    setError('');
    setResults([]);

    if (!origin?.trim() || !destination?.trim()) {
      setError('Please select both origin and destination.');
      return;
    }
    if (origin === destination) {
      setError('Origin and destination must be different.');
      return;
    }

    const h = hour === '' ? NaN : Number(hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      setError('Enter an hour between 0 and 23.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/planner/commute', {
        origin: origin.trim(),
        destination: destination.trim(),
        hour: h,
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

  return (
    <div className="w-full max-w-full overflow-x-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Input panel */}
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
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="">Select origin</option>
                  {STOPS.map((name) => (
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
                  disabled={loading}
                  className={inputClass}
                >
                  <option value="">Select destination</option>
                  {STOPS.map((name) => (
                    <option key={name} value={name} className="bg-slate-900">
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Hour (0–23)
                </span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  placeholder="e.g. 9"
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  disabled={loading}
                  className={inputClass}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handlePlanRoute}
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-primary py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Planning…' : 'Plan Route'}
            </button>

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

        {/* Results panel */}
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
                  ? 'No routes found for this trip. Try a different pair or hour.'
                  : 'Enter details to see routes'}
              </p>
            </div>
          ) : null}

          {!loading && sortedRoutes.length > 0 ? (
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
                const eta = row?.eta;
                const etaLabel = Number.isFinite(Number(eta))
                  ? `${Number(eta)} min`
                  : '—';
                const isBest = index === 0;

                return (
                  <motion.li
                    key={`${row?.route ?? 'route'}-${index}`}
                    variants={routeItemVariants}
                  >
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                              {row?.route ?? 'Route'}
                            </h3>
                            {isBest ? (
                              <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400">
                                Best Option
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-slate-400">{stopsText}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
                          <p className="text-white">
                            <span className="text-slate-400">ETA </span>
                            <span className="font-bold">{etaLabel}</span>
                          </p>
                          <p className={crowdTextClass(row?.crowd)}>
                            <span className="text-slate-500">Crowd </span>
                            <span className="font-semibold">
                              {crowdLabel(row?.crowd)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Planner;
