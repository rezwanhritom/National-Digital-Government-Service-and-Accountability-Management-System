import { motion } from 'framer-motion';
import { BusFront, LayoutDashboard, Siren, Route as RouteIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: BusFront },
  { to: '/planner', label: 'Planner', icon: RouteIcon },
  { to: '/incident', label: 'Incident', icon: Siren },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

function Navbar() {
  return (
    <header className="fixed top-0 z-50 w-full px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg shadow-cyan-500/10 backdrop-blur-xl">
        <NavLink to="/" className="text-lg font-semibold tracking-tight text-white">
          Dhaka Smart Transit
        </NavLink>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <motion.div key={to} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-cyan-400/20 text-cyan-100'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            </motion.div>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
