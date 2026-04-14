import { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Users } from 'lucide-react';

/** Same stop names as `ai-services/data/stops.json` (dataset order). */
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

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') ||
  'http://localhost:5000/api';

const COMMUTE_URL = `${API_BASE}/planner/commute`;

function crowdStyles(level) {
  const key = String(level || '')
    .trim()
    .toUpperCase();
  if (key === 'LOW')
    return {
      label: 'Low',
      dot: 'bg-emerald-400',
      text: 'text-emerald-200',
      ring: 'ring-emerald-400/40',
    };
  if (key === 'MEDIUM')
    return {
      label: 'Medium',
      dot: 'bg-amber-400',
      text: 'text-amber-200',
      ring: 'ring-amber-400/40',
    };
  if (key === 'HIGH')
    return {
      label: 'High',
      dot: 'bg-rose-500',
      text: 'text-rose-200',
      ring: 'ring-rose-400/40',
    };
  return {
    label: String(level),
    dot: 'bg-slate-400',
    text: 'text-slate-200',
    ring: 'ring-white/20',
  };
}

const pageMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
};

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const itemMotion = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
};

function Planner() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [hour, setHour] = useState(9);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handlePlan = async () => {
    setError('');
    setResults([]);
    setHasSearched(false);

    if (!origin || !destination) {
      setError('Please choose both origin and destination.');
      return;
    }
    if (origin === destination) {
      setError('Origin and destination must be different.');
      return;
    }
    const h = Number(hour);
    if (!Number.isInteger(h) || h < 0 || h > 23) {
      setError('Hour must be an integer from 0 to 23.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        COMMUTE_URL,
        { origin, destination, hour: h },
        { headers: { 'Content-Type': 'application/json' }, timeout: 120_000 },
      );
      const list = Array.isArray(data?.data) ? data.data : [];
      setResults(list);
      setHasSearched(true);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Could not load commute options.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6"
      {...pageMotion}
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-indigo-950/80 to-slate-900" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.35),transparent)]" />

      <header className="mb-10 text-center">
        <motion.h1
          className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
        >
          Commute planner
        </motion.h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          AI-powered routes, ETAs, and crowding for Dhaka transit
        </p>
      </header>

      <motion.section
        className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.4 }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-1">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Origin
            </span>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-white/0 transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Select stop</option>
              {STOPS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-1">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              Destination
            </span>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="">Select stop</option>
              {STOPS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Hour (0–23)
            </span>
            <input
              type="number"
              min={0}
              max={23}
              value={hour}
              onChange={(e) => {
                const t = e.target.value;
                if (t === '') return;
                const n = parseInt(t, 10);
                if (!Number.isNaN(n)) {
                  setHour(Math.min(23, Math.max(0, n)));
                }
              }}
              className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/30"
            />
          </label>
        </div>

        <motion.button
          type="button"
          onClick={handlePlan}
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.02 }}
          whileTap={loading ? {} : { scale: 0.98 }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition enabled:hover:from-indigo-400 enabled:hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[200px]"
        >
          {loading ? (
            <>
              <Clock className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden />
              Plan commute
            </>
          )}
        </motion.button>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="err"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.section>

      <div className="mt-10">
        {loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm font-medium text-indigo-200"
          >
            Loading…
          </motion.p>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 py-10 text-center text-slate-300 backdrop-blur-md"
          >
            No routes found for this pair and hour.
          </motion.p>
        )}

        {!loading && results.length > 0 && (
          <motion.ul
            className="space-y-4"
            variants={listMotion}
            initial="hidden"
            animate="show"
          >
            {results.map((row, i) => {
              const crowd = crowdStyles(row.crowd);
              const path = Array.isArray(row.stops)
                ? row.stops.join(' → ')
                : '';
              return (
                <motion.li
                  key={`${row.route}-${i}`}
                  variants={itemMotion}
                  className="rounded-2xl border border-white/12 bg-white/[0.08] p-5 shadow-lg shadow-black/25 backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-indigo-300/90">
                        Route
                      </p>
                      <h2 className="text-lg font-semibold text-white">
                        {row.route}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/10">
                        <Clock className="h-4 w-4 text-indigo-300" />
                        {row.eta} min
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1.5 text-sm ring-2 ${crowd.ring} ${crowd.text}`}
                      >
                        <Users className="h-4 w-4 opacity-90" />
                        <span className={`inline-block h-2 w-2 rounded-full ${crowd.dot}`} />
                        {crowd.label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {path}
                  </p>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </motion.div>
  );
}

export default Planner;
