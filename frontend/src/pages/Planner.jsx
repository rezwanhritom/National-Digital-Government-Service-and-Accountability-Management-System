import { motion } from 'framer-motion';

function Planner() {
  return (
    <div className="w-full max-w-full overflow-x-hidden py-8 md:py-12">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-xl md:p-10"
      >
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Commute Planner
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          Route optimization UI and ETA insights will be available here.
        </p>
      </motion.section>
    </div>
  );
}

export default Planner;
