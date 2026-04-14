import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Brain,
  Compass,
  MapPin,
  Navigation,
  ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const easeOut = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: easeOut },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 32 },
  },
};

const viewportOnce = { once: true, margin: '-48px' };

const cardBase =
  'relative rounded-2xl border border-white/10 bg-white/5 p-8 shadow-lg backdrop-blur-md transition duration-300 hover:-translate-y-2 hover:shadow-xl';

function PageSection({ children, className = '' }) {
  return (
    <section
      className={`w-full max-w-full overflow-x-hidden py-24 md:py-32 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

const features = [
  {
    icon: Navigation,
    title: 'Smart Planner',
    description:
      'Multi-route commute search with segment ETAs and crowding fused into one clear recommendation.',
    iconBg: 'bg-primary/15 text-primary ring-1 ring-primary/20',
  },
  {
    icon: ShieldAlert,
    title: 'Incident Detection',
    description:
      'Surface disruptions faster with AI-assisted classification so operators and riders stay ahead.',
    iconBg: 'bg-accent/10 text-accent ring-1 ring-accent/20',
  },
  {
    icon: Activity,
    title: 'Congestion Intelligence',
    description:
      'Understand corridor pressure by time and place, built for Dhaka-scale density and volatility.',
    iconBg: 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-400/15',
  },
];

const steps = [
  {
    step: '01',
    title: 'Enter route',
    copy: 'Pick origin, destination, and time. We match live bus corridors.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'AI processes',
    copy: 'Models score segments with traffic context and crowding in seconds.',
    icon: Brain,
  },
  {
    step: '03',
    title: 'Get best route',
    copy: 'Compare options with total ETA and worst-case crowding at a glance.',
    icon: Compass,
  },
];

function Home() {
  return (
    <div className="w-full max-w-full overflow-x-hidden text-slate-200">
      <section className="relative flex w-full max-w-full min-h-[calc(100dvh-5rem)] items-center justify-center overflow-x-hidden bg-darkbg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617]" />
        <div
          className="pointer-events-none absolute left-4 top-8 h-64 w-64 rounded-full bg-primary/15 blur-2xl md:left-12 md:h-80 md:w-80"
          style={{ animation: 'pulseGlow 6s ease-in-out infinite' }}
        />
        <div
          className="pointer-events-none absolute right-4 top-24 h-56 w-56 rounded-full bg-cyan-400/20 blur-2xl md:right-12 md:h-72 md:w-72"
          style={{ animation: 'pulseGlow 6s ease-in-out infinite' }}
        />

        <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
          <div className="mb-5 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 backdrop-blur-md">
            AI transit platform
          </div>

          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl">
            AI-Powered{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Smart Transit
            </span>{' '}
            for Dhaka
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400 md:text-xl">
            Plan routes, avoid congestion, and travel smarter with real-time AI
            insights.
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Link
              to="/planner"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Plan Your Route &rarr;
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      <PageSection className="border-y border-white/10 bg-[#030a1f]">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={stagger}
          className="text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-semibold uppercase tracking-[0.2em] text-accent/90"
          >
            Capabilities
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-4xl font-bold tracking-tight text-white md:text-6xl"
          >
            Built for complex urban mobility
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-slate-400"
          >
            One stack connecting riders, planners, and operations with explainable
            signals, not black-box guesses.
          </motion.p>
        </motion.div>

        <motion.ul
          className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        >
          {features.map((f) => (
            <motion.li
              key={f.title}
              variants={cardReveal}
              className={cardBase}
            >
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.iconBg}`}
              >
                <f.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {f.description}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </PageSection>

      <PageSection className="relative bg-darkbg">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-darkbg" />
        <div className="relative">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.45, ease: easeOut }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">
              How it works
            </p>
            <h2 className="mt-3 text-4xl font-bold text-white md:text-6xl">
              From query to commute in three steps
            </h2>
          </motion.div>

          <motion.ol
            className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
          >
            {steps.map((s) => (
              <motion.li
                key={s.step}
                variants={cardReveal}
                className={`${cardBase} text-center`}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {s.step}
                </span>
                <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                  <s.icon className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h3 className="mt-5 text-base font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.copy}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </PageSection>

      <PageSection className="pb-8 md:pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.45, ease: easeOut }}
          className={`relative overflow-hidden ${cardBase} px-8 py-14 text-center md:px-12 md:py-16`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute -right-8 top-0 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-36 w-36 rounded-full bg-accent/10 blur-2xl" />
          </div>
          <h2 className="relative text-4xl font-bold tracking-tight text-white md:text-5xl">
            Start Planning Your Commute Today
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm text-slate-400 md:text-base">
            {`Join riders using AI-backed ETAs and crowding signals tuned for Dhaka's corridors.`}
          </p>
          <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              to="/planner"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Go to Planner
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
            >
              View Dashboard
            </Link>
          </div>
        </motion.div>
      </PageSection>
    </div>
  );
}

export default Home;
