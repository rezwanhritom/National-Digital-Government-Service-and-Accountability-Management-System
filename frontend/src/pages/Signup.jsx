import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await signup(form);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-2xl font-semibold text-white">Create account</h1>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <input className="w-full rounded-lg bg-slate-900 p-3" placeholder="Full name" required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
        <input className="w-full rounded-lg bg-slate-900 p-3" placeholder="Username" required value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} />
        <input className="w-full rounded-lg bg-slate-900 p-3" placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
        <input className="w-full rounded-lg bg-slate-900 p-3" placeholder="Password (min 10, upper/lower/number/special)" type="password" required value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <button disabled={saving} className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-white">{saving ? 'Creating account...' : 'Sign up'}</button>
      </form>
      <p className="mt-4 text-sm text-slate-300">
        Already registered? <Link to="/login" className="text-primary">Log in</Link>
      </p>
    </div>
  );
}

export default Signup;
