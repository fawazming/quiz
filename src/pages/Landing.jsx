import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MonitorPlay, ShieldCheck, Tablet, Trophy, Users, Zap } from 'lucide-react';
import { Brand, Button } from '../components/UI.jsx';
import { useAuth } from '../auth.jsx';

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="landing">
      <div className="landing-pattern" />
      <header className="landing-nav">
        <Brand />
        <nav>
          <Link to="/display" className="nav-link">Projector display</Link>
          <Link to="/join" className="nav-link">Candidate join</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-kicker"><span /> MSS Week 2026 · ICT Quiz</div>
          <h1>Anchored in Deen,<br /><em>Illuminated in Dunya &amp; Digital.</em></h1>
          <p className="hero-sub">A live competition arena for the Muslim student in the digital age: knowledge, skills and responsibility.</p>
          <div className="hero-meta">
            <span><strong>Thursday</strong> 26 November 2026</span>
            <span><strong>MSSN</strong> Remo Area Council</span>
            <span><strong>3 rounds</strong> CBT · Pick a number · First to answer</span>
          </div>
          <div className="hero-actions">
            <Link to={user?.role === 'candidate' ? '/play' : '/admin'}>
              <Button size="lg">Open the arena <ArrowRight size={18} /></Button>
            </Link>
            <Link to="/join"><Button variant="ghost" size="lg">I am a candidate</Button></Link>
          </div>
          <div className="hero-sponsor">Proudly supported by <img src="/brand/rayyan.png" alt="Rayyan Technologies" /></div>
        </section>

        <section className="mode-grid">
          <Link to="/admin" className="mode-card">
            <ShieldCheck size={24} />
            <h3>Admin console</h3>
            <p>Open rounds, qualify candidates, control timers and run the live show.</p>
            <span>Staff sign in <ArrowRight size={15} /></span>
          </Link>
          <Link to="/login?role=scorekeeper" className="mode-card">
            <Trophy size={24} />
            <h3>Scorekeeper</h3>
            <p>Watch the live leaderboard, verify answers and adjust scores with an audit trail.</p>
            <span>Staff sign in <ArrowRight size={15} /></span>
          </Link>
          <Link to="/join" className="mode-card">
            <Tablet size={24} />
            <h3>Candidate tablet</h3>
            <p>Take the 50-question CBT, pick your number in Round 2, and race in Round 3.</p>
            <span>Enter your code <ArrowRight size={15} /></span>
          </Link>
          <Link to="/display" className="mode-card mode-display">
            <MonitorPlay size={24} />
            <h3>Projector display</h3>
            <p>Full-screen question board, countdown, reveals and live rankings for the hall.</p>
            <span>Open display <ArrowRight size={15} /></span>
          </Link>
        </section>

        <section className="round-strip">
          <div><span>01</span><strong>CBT elimination</strong><p>50 MCQs · individual timing · auto-scored</p></div>
          <div><span>02</span><strong>Pick a number</strong><p>5-second countdown · 60s answer · projector reveal</p></div>
          <div><span>03</span><strong>First to answer</strong><p>Speed + accuracy · one lock · live winner</p></div>
        </section>
      </main>

      <footer className="landing-foot">
        <span>MSSN Remo Area Council · MSS Week 2026</span>
        <span><Zap size={14} /> Real-time Socket.IO + SQLite</span>
        <span><Users size={14} /> Built for every school</span>
      </footer>
    </div>
  );
}
