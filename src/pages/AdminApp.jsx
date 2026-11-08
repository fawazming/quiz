import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, ListChecks, Users, HelpCircle, Trophy, Settings as SettingsIcon,
  MonitorPlay, LogOut, Wifi, WifiOff, ShieldCheck, Menu, X
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useSocket } from '../socket.jsx';
import { Brand, Badge, Spinner } from '../components/UI.jsx';
import Dashboard from '../admin/Dashboard.jsx';
import Round1 from '../admin/Round1.jsx';
import Round2 from '../admin/Round2.jsx';
import Round3 from '../admin/Round3.jsx';
import Candidates from '../admin/Candidates.jsx';
import Questions from '../admin/Questions.jsx';
import Scores from '../admin/Scores.jsx';
import Settings from '../admin/Settings.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'round1', label: 'Round 1 · CBT', icon: ListChecks, round: 1 },
  { id: 'round2', label: 'Round 2 · Pick', icon: HelpCircle, round: 2 },
  { id: 'round3', label: 'Round 3 · Race', icon: Trophy, round: 3 },
  { id: 'candidates', label: 'Candidates', icon: Users },
  { id: 'questions', label: 'Question bank', icon: ListChecks },
  { id: 'scores', label: 'Scores', icon: Trophy },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
];

export default function AdminApp() {
  const { user, logout } = useAuth();
  const { state, adminState, connected } = useSocket();
  const [tab, setTab] = useState('dashboard');
  const [mobile, setMobile] = useState(false);

  if (!state) return <div className="page-center"><Spinner label="Connecting to the arena…" /></div>;

  const isAdmin = user.role === 'admin';
  const labels = {
    round1: state.settings.round1Label || 'CBT',
    round2: state.settings.round2Label || 'Pick',
    round3: state.settings.round3Label || 'Race'
  };
  const items = (isAdmin ? NAV : NAV.filter(n => ['dashboard','round1','round2','round3','candidates','questions','scores'].includes(n.id)))
    .filter(n => !n.round || !!state.settings.enabledRounds?.[n.round])
    .map(n => n.round ? { ...n, label: `Round ${n.round} · ${labels['round' + n.round]}` } : n);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><Brand compact light /></div>
        <div className="sidebar-event">
          <span>MSS Week 2026</span>
          <strong>{state.event.name}</strong>
        </div>
        <nav className="side-nav">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); setMobile(false); }}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="staff-chip">
            <ShieldCheck size={16} />
            <div><strong>{user.username}</strong><small>{user.role}</small></div>
          </div>
          <Link to="/display" target="_blank" className="side-link"><MonitorPlay size={16} /> Open display</Link>
          <button className="side-link danger" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <button className="icon-btn mobile-only" onClick={() => setMobile(v => !v)}>{mobile ? <X size={20} /> : <Menu size={20} />}</button>
          <div className="topbar-title">
            <h1>{items.find(n => n.id === tab)?.label || 'Dashboard'}</h1>
            <span>{state.event.theme}</span>
          </div>
          <div className="topbar-right">
            <Badge tone={connected ? 'green' : 'red'}>{connected ? <><Wifi size={12} /> live</> : <><WifiOff size={12} /> offline</>}</Badge>
            <Badge tone="gold">Round {state.round || '—'}</Badge>
            <Link to="/display" target="_blank" className="btn btn-ghost btn-sm"><MonitorPlay size={15} /> Display</Link>
          </div>
        </header>
        <main className="app-content">
          {tab === 'dashboard' && <Dashboard state={state} adminState={adminState} setTab={setTab} />}
          {tab === 'round1' && <Round1 state={state} adminState={adminState} />}
          {tab === 'round2' && <Round2 state={state} adminState={adminState} />}
          {tab === 'round3' && <Round3 state={state} adminState={adminState} />}
          {tab === 'candidates' && <Candidates adminState={adminState} />}
          {tab === 'questions' && <Questions />}
          {tab === 'scores' && <Scores state={state} adminState={adminState} />}
          {tab === 'settings' && isAdmin && <Settings />}
        </main>
      </div>
    </div>
  );
}
