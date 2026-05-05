import { useEffect, useState } from 'react';
import api, {
  listRoleRequests,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from '../services/api';

const tabs = [
  'users',
  'transit',
  'fleet',
  'incidents',
  'mlops',
  'observability',
];

function AdminConsole() {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roleRequests, setRoleRequests] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [models, setModels] = useState([]);
  const [runtimeManifest, setRuntimeManifest] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  const loadUsers = async () => {
    const [u, r] = await Promise.all([listUsers(), listRoleRequests()]);
    setUsers(u.data?.data || []);
    setRoleRequests(r.data?.data || []);
  };

  const loadTransit = async () => {
    const res = await api.get('/admin/routes');
    setRoutes(res.data?.data || []);
  };

  const loadFleet = async () => {
    const res = await api.get('/fleet/performance');
    setFleet(res.data?.data || []);
  };

  const loadMlops = async () => {
    const [m, man] = await Promise.all([api.get('/ml/models'), api.get('/ml/runtime-manifest')]);
    setModels(m.data?.data || []);
    setRuntimeManifest(man.data || null);
  };

  const loadObservability = async () => {
    const res = await api.get('/observability/dashboard');
    setDashboard(res.data?.data || null);
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    if (tab === 'transit') loadTransit();
    if (tab === 'fleet') loadFleet();
    if (tab === 'mlops') loadMlops();
    if (tab === 'observability') loadObservability();
  }, [tab]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Admin Console</h1>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 text-sm ${tab === t ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">User and role management</h2>
          <div className="space-y-2">
            <p className="text-sm text-slate-300">Pending role requests: {roleRequests.length}</p>
            {roleRequests.map((user) => (
              <div key={user._id} className="flex items-center justify-between rounded border border-white/10 p-2 text-sm">
                <span>{user.name} ({user.email}) requested {user.role}</span>
                <div className="flex gap-2">
                  <button className="rounded bg-emerald-600 px-2 py-1" onClick={() => updateUserStatus(user._id, 'active').then(loadUsers)}>Approve</button>
                  <button className="rounded bg-rose-600 px-2 py-1" onClick={() => updateUserStatus(user._id, 'suspended').then(loadUsers)}>Suspend</button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {users.slice(0, 25).map((user) => (
              <div key={user._id} className="flex items-center justify-between rounded border border-white/10 p-2 text-sm">
                <span>{user.name} - {user.role} - {user.accountStatus}</span>
                <div className="flex gap-2">
                  <button className="rounded bg-slate-700 px-2 py-1" onClick={() => updateUserRole(user._id, 'commuter').then(loadUsers)}>Commuter</button>
                  <button className="rounded bg-slate-700 px-2 py-1" onClick={() => updateUserRole(user._id, 'transport_officer').then(loadUsers)}>Officer</button>
                  <button className="rounded bg-slate-700 px-2 py-1" onClick={() => updateUserRole(user._id, 'system_admin').then(loadUsers)}>Admin</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'transit' && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">Routes and stops</h2>
          <p className="text-sm text-slate-300">Routes loaded: {routes.length}</p>
        </section>
      )}

      {tab === 'fleet' && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">Fleet and operator metrics</h2>
          <p className="text-sm text-slate-300">Fleet rows: {fleet.length}</p>
        </section>
      )}

      {tab === 'incidents' && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">Incident governance</h2>
          <p className="text-sm text-slate-300">Use incident dashboard and status APIs for SLA management.</p>
        </section>
      )}

      {tab === 'mlops' && (
        <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">ML and AI operations</h2>
          <p className="text-sm text-slate-300">Registered models: {models.length}</p>
          <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
            {JSON.stringify(runtimeManifest, null, 2)}
          </pre>
        </section>
      )}

      {tab === 'observability' && (
        <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-xl font-semibold text-white">System statistics and health</h2>
          <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-200">
            {JSON.stringify(dashboard, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

export default AdminConsole;
