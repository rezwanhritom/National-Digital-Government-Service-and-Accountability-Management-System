import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/planner', label: 'Planner' },
  { to: '/nearby-live', label: 'Nearby Live' },
  { to: '/congestion', label: 'Congestion' },
  { to: '/incident', label: 'Incidents' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/fleet-performance', label: 'Fleet Performance' },
  { to: '/observability', label: 'Observability' },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed left-0 top-0 z-50 w-full max-w-full border-b border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="font-display text-xl font-semibold tracking-tight text-white"
          onClick={() => setOpen(false)}
        >
          Dhaka Smart Transit
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm text-slate-300 transition hover:text-white ${
                  isActive ? 'font-medium text-white' : ''
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <Link
            to="/planner"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-slate-200 transition hover:bg-white/5 md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="w-full max-w-full border-t border-white/10 bg-darkbg/95 px-6 py-4 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white ${
                    isActive ? 'bg-white/10 font-medium text-white' : ''
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <Link
              to="/planner"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

export default Navbar;
