import { motion } from 'framer-motion';

function Planner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-xl"
    >
      <h1 className="text-3xl font-semibold text-white">Commute Planner</h1>
      <p className="mt-3 text-slate-200">
        Route optimization UI and ETA insights will be available here.
      </p>
    </motion.section>
  );
}

export default Planner;
