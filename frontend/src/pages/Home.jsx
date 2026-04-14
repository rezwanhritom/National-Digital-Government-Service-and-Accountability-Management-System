import { motion } from 'framer-motion';
import { ArrowRight, MapPinned } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: 'easeOut' },
};

function Home() {
  return (
    <motion.section {...fadeIn} className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 px-6 py-14 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl sm:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/15 px-4 py-1 text-sm text-cyan-100">
          <MapPinned size={16} />
          Smart mobility for Dhaka
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Dhaka Smart Transit
        </h1>
        <p className="mt-4 text-lg text-slate-200">
          AI-powered commute and congestion intelligence
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/planner"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition-colors hover:bg-cyan-300"
            >
              Go to Planner
              <ArrowRight size={18} />
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
            <Link
              to="/dashboard"
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/20"
            >
              View Dashboard
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

export default Home;
