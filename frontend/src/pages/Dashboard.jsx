import { motion } from 'framer-motion';

function Dashboard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
    >
      <h1 className="text-3xl font-semibold text-white">Transit Dashboard</h1>
      <p className="mt-3 text-slate-200">
        Real-time congestion trends, crowding signals, and route KPIs will appear here.
      </p>
    </motion.section>
  );
}

export default Dashboard;
