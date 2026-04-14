import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Clock,
  MapPin,
  Route,
  TrendingDown,
} from 'lucide-react';

const cardHover =
  'transition duration-300 hover:-translate-y-2 hover:shadow-xl';

const stats = [
  { title: 'Total Incidents', value: '12', icon: AlertTriangle },
  { title: 'High Severity', value: '4', icon: Activity },
  { title: 'Active Routes', value: '18', icon: Route },
  { title: 'Avg Delay', value: '9 min', icon: Clock },
];

const incidents = [
  { type: 'Accident', location: 'Mohakhali', severity: 'HIGH' },
  { type: 'Traffic Jam', location: 'Badda', severity: 'MEDIUM' },
  { type: 'Road Block', location: 'Gulshan', severity: 'HIGH' },
];

const congestionZones = [
  {
    title: 'High Traffic Zones',
    detail: '5 corridors · peak 7–10 & 17–20',
    accent: 'text-red-400',
    dot: 'bg-red-400',
  },
  {
    title: 'Medium Traffic',
    detail: '12 segments · midday & fringe',
    accent: 'text-yellow-400',
    dot: 'bg-yellow-400',
  },
  {
    title: 'Low Traffic',
    detail: '8 zones · off-peak & night',
    accent: 'text-green-400',
    dot: 'bg-green-400',
  },
];

function severityBadge(severity) {
  const s = String(severity).toUpperCase();
  if (s === 'HIGH') {
    return 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30';
  }
  if (s === 'MEDIUM') {
    return 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30';
  }
  if (s === 'LOW') {
    return 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30';
  }
  return 'bg-slate-500/20 text-slate-300 ring-1 ring-white/10';
}

function Dashboard() {
  return (
    <div className="w-full max-w-full overflow-x-hidden px-6 py-24 md:px-12 md:py-32">
      <div className="mx-auto max-w-7xl space-y-12">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-4xl font-bold text-white md:text-6xl">
            System Dashboard
          </h1>
          <p className="mt-2 text-slate-400">
            Real-time monitoring of transit system and incidents
          </p>
        </motion.header>

        {/* Stats */}
        <section aria-labelledby="dashboard-stats-heading">
          <h2 id="dashboard-stats-heading" className="sr-only">
            Key metrics
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ title, value, icon: Icon }) => (
              <div
                key={title}
                className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md ${cardHover}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{title}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                  </div>
                  <span className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-cyan-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent incidents */}
        <section aria-labelledby="recent-incidents-heading">
          <h2
            id="recent-incidents-heading"
            className="text-2xl font-semibold text-white"
          >
            Recent Incidents
          </h2>
          <div className="mt-6 space-y-4">
            {incidents.map((inc) => (
              <div
                key={`${inc.type}-${inc.location}`}
                className={`flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between ${cardHover}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">{inc.type}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-400">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    {inc.location}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${severityBadge(inc.severity)}`}
                >
                  {inc.severity}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Congestion overview */}
        <section aria-labelledby="congestion-heading">
          <h2
            id="congestion-heading"
            className="text-2xl font-semibold text-white"
          >
            Congestion Overview
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {congestionZones.map((zone) => (
              <div
                key={zone.title}
                className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md ${cardHover}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${zone.dot}`}
                      aria-hidden
                    />
                    <span className={zone.accent}>{zone.title}</span>
                  </h3>
                  <TrendingDown className="h-5 w-5 text-slate-500 opacity-80" aria-hidden />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  {zone.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
