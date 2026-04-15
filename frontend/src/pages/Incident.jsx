import { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api.js';

function severityBadgeClass(severity) {
  const s = String(severity ?? '').toUpperCase();
  if (s === 'HIGH') {
    return 'bg-red-500/20 text-red-200 ring-1 ring-red-400/40';
  }
  if (s === 'MEDIUM') {
    return 'bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35';
  }
  if (s === 'LOW') {
    return 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/35';
  }
  return 'bg-white/10 text-slate-200 ring-1 ring-white/15';
}

function Incident() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { data } = await api.post('/incidents/classify', {
        description: description.trim(),
        location: location.trim(),
      });
      setResult(data);
    } catch (err) {
      const msg =
        err.response?.data?.message ??
        err.message ??
        'Could not classify incident. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden py-8 md:py-12">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"
      >
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Incident Intelligence
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          Describe what happened and where. The system classifies the incident with AI and
          routes it to the right team by severity.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-5">
          <div>
            <label htmlFor="incident-description" className="mb-2 block text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              id="incident-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What happened?"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label htmlFor="incident-location" className="mb-2 block text-sm font-medium text-slate-300">
              Location
            </label>
            <input
              id="incident-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Road, area, or landmark"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Reporting…' : 'Report Incident'}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-8 max-w-xl rounded-xl border border-white/10 bg-black/20 p-6">
            <h2 className="text-lg font-semibold text-white">Classification result</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-slate-400">Category</dt>
                <dd className="font-medium text-slate-100">{String(result.category)}</dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-slate-400">Severity</dt>
                <dd>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${severityBadgeClass(result.severity)}`}
                  >
                    {String(result.severity)}
                  </span>
                </dd>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <dt className="text-slate-400">Assigned team</dt>
                <dd className="font-medium text-slate-100">{result.assigned_to}</dd>
              </div>
            </dl>
          </div>
        )}
      </motion.section>
    </div>
  );
}

export default Incident;
