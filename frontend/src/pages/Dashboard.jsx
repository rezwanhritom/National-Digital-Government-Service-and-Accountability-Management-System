import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getDashboardStats, getIncidentsHeatmap } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse, heatmapResponse] = await Promise.all([
          getDashboardStats(),
          getIncidentsHeatmap()
        ]);
        setStats(statsResponse.data);
        setHeatmap(heatmapResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/30 bg-white/20 p-8 backdrop-blur-xl shadow-lg"
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </motion.section>
    );
  }

  if (error) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/30 bg-white/20 p-8 backdrop-blur-xl shadow-lg"
      >
        <div className="text-red-400 text-center text-lg">{error}</div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="rounded-2xl border border-white/30 bg-white/20 p-8 backdrop-blur-xl shadow-lg">
        <h1 className="text-3xl font-semibold text-white">Public Transparency Dashboard</h1>
        <p className="mt-3 text-slate-200">
          Real-time insights into incident reporting, resolution times, and system performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
        >
          <h3 className="text-lg font-semibold text-white">Total Incidents</h3>
          <p className="text-3xl font-bold text-blue-400 mt-2">{stats?.totalIncidents || 0}</p>
          <p className="text-sm text-slate-300 mt-1">Reported this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
        >
          <h3 className="text-lg font-semibold text-white">Resolution Rate</h3>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {stats?.totalIncidents ? Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100) : 0}%
          </p>
          <p className="text-sm text-slate-300 mt-1">{stats?.resolvedIncidents || 0} resolved</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
        >
          <h3 className="text-lg font-semibold text-white">Avg Resolution Time</h3>
          <p className="text-3xl font-bold text-yellow-400 mt-2">{stats?.averageResolutionTime || 0} days</p>
          <p className="text-sm text-slate-300 mt-1">System-wide average</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl"
        >
          <h3 className="text-lg font-semibold text-white">Active Issues</h3>
          <p className="text-3xl font-bold text-red-400 mt-2">{stats?.pendingIncidents || 0}</p>
          <p className="text-sm text-slate-300 mt-1">Pending resolution</p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents by Category */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Incidents by Category</h3>
          <div className="space-y-3">
            {stats?.incidentsByCategory && Object.entries(stats.incidentsByCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-slate-200 capitalize">{category.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-blue-400 h-2 rounded-full"
                      style={{ width: `${(count / stats.totalIncidents) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Resolution Times by Zone */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Resolution Times by Zone</h3>
          <div className="space-y-3">
            {stats?.resolutionTimeByZone && Object.entries(stats.resolutionTimeByZone).map(([zone, time]) => (
              <div key={zone} className="flex items-center justify-between">
                <span className="text-slate-200">{zone}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-white/20 rounded-full h-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{ width: `${Math.min((time / 5) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-white font-semibold w-12 text-right">{time}d</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
      >
        <h3 className="text-xl font-semibold text-white mb-4">Recent Activity (Last 5 Days)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-slate-200">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left py-2">Date</th>
                <th className="text-center py-2">New Incidents</th>
                <th className="text-center py-2">Resolved</th>
                <th className="text-center py-2">Net Change</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentActivity?.map((activity, index) => (
                <tr key={index} className="border-b border-white/10">
                  <td className="py-2">{new Date(activity.date).toLocaleDateString()}</td>
                  <td className="text-center py-2">
                    <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded">
                      +{activity.incidents}
                    </span>
                  </td>
                  <td className="text-center py-2">
                    <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded">
                      -{activity.resolved}
                    </span>
                  </td>
                  <td className="text-center py-2">
                    <span className={`px-2 py-1 rounded ${
                      activity.incidents - activity.resolved > 0
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {activity.incidents - activity.resolved > 0 ? '+' : ''}
                      {activity.incidents - activity.resolved}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Zone Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
      >
        <h3 className="text-xl font-semibold text-white mb-4">Incidents by Zone</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.incidentsByZone && Object.entries(stats.incidentsByZone).map(([zone, count]) => (
            <div key={zone} className="text-center">
              <div className="text-2xl font-bold text-blue-400">{count}</div>
              <div className="text-slate-300">{zone}</div>
              <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-400 h-2 rounded-full"
                  style={{ width: `${(count / stats.totalIncidents) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.9 }}
        className="rounded-2xl border border-white/30 bg-white/20 p-6 backdrop-blur-xl shadow-lg"
      >
        <div className="text-center text-slate-300">
          <p className="text-sm">
            All data is anonymized and aggregated to protect user privacy while ensuring transparency.
            <br />
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </motion.div>
    </motion.section>
  );
}

export default Dashboard;
