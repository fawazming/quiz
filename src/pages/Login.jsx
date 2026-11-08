import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, UserRound } from 'lucide-react';
import { Brand, Button } from '../components/UI.jsx';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';

export default function Login() {
  const { user, loginStaff } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState(params.get('role') === 'scorekeeper' ? 'scorekeeper' : 'admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user && user.role !== 'candidate') return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await loginStaff(username, password);
      push(`Welcome, ${u.username}`, 'success');
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Brand light />
        <div>
          <div className="hero-kicker light"><span /> Staff access</div>
          <h1>Run a fair,<br />fast quiz.</h1>
          <p>Open the CBT, manage candidates, run the pick-a-number round and lock the first answer in Round 3.</p>
        </div>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to arena</Link>
      </div>
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-icon"><KeyRound size={22} /></div>
          <h2>Staff sign in</h2>
          <p className="muted">Admin and scorekeeper accounts use the same door. Your role decides what you can change.</p>
          <label>
            <span><UserRound size={14} /> Username</span>
            <input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" loading={busy} className="w-full">Enter console</Button>
          <p className="auth-foot">First run? Read <code>DEPLOYMENT.md</code> for the seeded accounts and how to change them.</p>
        </form>
      </main>
    </div>
  );
}
