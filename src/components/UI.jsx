import React from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Clock3, Check, X, Loader2, ChevronRight, Wifi, WifiOff, ShieldCheck
} from 'lucide-react';
import { useCountdown, formatTime } from '../useCountdown.js';

export function Brand({ compact = false, light = false }) {
  return (
    <Link to="/" className={`brand ${compact ? 'brand-compact' : ''} ${light ? 'brand-light' : ''}`}>
      <img src="/brand/mssn.webp" alt="MSSN" className="brand-mssn" />
      <span className="brand-divider" />
      <span className="brand-text">
        <strong>MSSN Remo</strong>
        <small>ICT Quiz Arena</small>
      </span>
      {!compact && (
        <>
          <span className="brand-spacer" />
          <span className="brand-sponsored">Proudly supported by <img src="/brand/rayyan.png" alt="Rayyan Technologies" /></span>
        </>
      )}
    </Link>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className = '', loading, disabled, ...props }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="spin" /> : null}
      {children}
    </button>
  );
}

export function Card({ title, subtitle, actions, children, className = '', tone = '' }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ''} ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone = 'green', icon: Icon }) {
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-icon">{Icon ? <Icon size={20} /> : <Trophy size={20} />}</div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Badge({ children, tone = 'green' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function OnlineBadge({ online }) {
  return (
    <span className={`online ${online ? 'is-on' : ''}`}>
      {online ? <Wifi size={12} /> : <WifiOff size={12} />}
      {online ? 'online' : 'offline'}
    </span>
  );
}

export function Timer({ deadline, serverTime, totalSeconds, label = 'Time left', compact = false }) {
  const remaining = useCountdown(deadline, serverTime);
  const total = Math.max(1, (totalSeconds || 0) * 1000);
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  const danger = remaining <= 10000;
  return (
    <div className={`timer ${danger ? 'timer-danger' : ''} ${compact ? 'timer-compact' : ''}`}>
      <div className="timer-top">
        <span><Clock3 size={14} /> {label}</span>
        <strong>{formatTime(remaining)}</strong>
      </div>
      <div className="timer-bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Countdown({ endsAt, serverTime, label = 'Question in' }) {
  const remaining = useCountdown(endsAt, serverTime, 100);
  const n = Math.max(1, Math.ceil(remaining / 1000));
  return (
    <div className="big-countdown">
      <div className="countdown-label">{label}</div>
      <div className="countdown-number" key={n}>{n}</div>
      <div className="countdown-sub">Get ready…</div>
    </div>
  );
}

export function Leaderboard({ rows, highlightId, compact = false, limit = 100 }) {
  const list = (rows || []).slice(0, limit);
  return (
    <div className={`leaderboard ${compact ? 'leaderboard-compact' : ''}`}>
      <div className="lb-row lb-head">
        <span>#</span><span>Candidate</span><span>R1</span><span>R2</span><span>R3</span><span>Total</span>
      </div>
      {list.map((r) => (
        <div key={r.id} className={`lb-row ${highlightId === r.id ? 'lb-highlight' : ''}`}>
          <span className="lb-rank">{r.rank}</span>
          <span className="lb-person">
            <strong>{r.name}</strong>
            <small>{r.school}</small>
          </span>
          <span className="lb-num">{r.round1}</span>
          <span className="lb-num">{r.round2}</span>
          <span className="lb-num">{r.round3}</span>
          <span className="lb-total">{r.total}</span>
        </div>
      ))}
      {!list.length && <div className="empty">No candidates yet.</div>}
    </div>
  );
}

export function QuestionOptions({
  options = [], selectedIndex = null, correctIndex = null, onSelect, disabled = false,
  colorMode = false, reveal = false
}) {
  const letters = ['A','B','C','D'];
  const colors = ['red','blue','yellow','green'];
  return (
    <div className={`options ${colorMode ? 'options-color' : ''}`}>
      {options.map((opt, i) => {
        const selected = selectedIndex === i;
        const correct = reveal && correctIndex === i;
        const wrong = reveal && selected && correctIndex !== i;
        return (
          <button
            key={i}
            type="button"
            className={`option ${selected ? 'is-selected' : ''} ${correct ? 'is-correct' : ''} ${wrong ? 'is-wrong' : ''} ${colorMode ? `option-${colors[i]}` : ''}`}
            onClick={() => !disabled && onSelect && onSelect(i)}
            disabled={disabled}
          >
            <span className="option-letter">{letters[i]}</span>
            <span className="option-text">{opt}</span>
            {correct && <Check size={18} className="option-mark" />}
            {wrong && <X size={18} className="option-mark" />}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={e => e.stopPropagation()}>
        <header className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return <div className="spinner-box"><Loader2 className="spin" size={22} /><span>{label}</span></div>;
}

export function Empty({ title, children }) {
  return <div className="empty-state"><ShieldCheck size={26} /><strong>{title}</strong><p>{children}</p></div>;
}

export function ArrowLink({ to, children }) {
  return <Link className="arrow-link" to={to}>{children}<ChevronRight size={16} /></Link>;
}
