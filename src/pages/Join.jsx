import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ScanLine } from 'lucide-react';
import { Brand, Button } from '../components/UI.jsx';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';

export default function Join() {
  const { user, loginCandidate } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user?.role === 'candidate') return <Navigate to="/play" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const c = await loginCandidate(code.trim().toUpperCase());
      push(`Welcome, ${c.name}`, 'success');
      navigate('/play', { replace: true });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page candidate-auth">
      <div className="auth-aside">
        <Brand light />
        <div>
          <div className="hero-kicker light"><span /> Candidate access</div>
          <h1>Your tablet.<br />Your turn.</h1>
          <p>Enter the six-character code from your school coordinator. One code per candidate.</p>
        </div>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to arena</Link>
      </div>
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-icon"><ScanLine size={22} /></div>
          <h2>Join the quiz</h2>
          <p className="muted">Type the code exactly as printed. Letters are not case-sensitive.</p>
          <label>
            <span>Candidate code</span>
            <input
              className="code-input"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="A7K2Q9"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              required
              minLength={4}
            />
          </label>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" size="lg" loading={busy} className="w-full">Start <ArrowRight size={16} /></Button>
          <p className="auth-foot">No code? Ask your ICT teacher or the MSSN coordinator at the venue.</p>
        </form>
      </main>
    </div>
  );
}
