import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Wifi, WifiOff, Trophy, Zap, Clock3, Users, Hash } from 'lucide-react';
import { Brand, Badge, Countdown, Leaderboard, QuestionOptions, Spinner, Timer, Empty } from '../components/UI.jsx';

export default function DisplayApp() {
  const [params] = useSearchParams();
  const key = params.get('key') || '';
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ auth: { display: true, key }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('state:update', setState);
    socket.on('connect_error', () => setConnected(false));
    return () => socket.disconnect();
  }, [key]);

  if (!state) return <div className="display-loading"><Spinner label="Connecting the projector…" /></div>;

  return (
    <div className="display-shell">
      <header className="display-top">
        <Brand light />
        <div className="display-top-mid">
          <span>{state.event.name}</span>
          <small>{state.event.theme}</small>
        </div>
        <div className="display-top-right">
          <Badge tone={connected ? 'green' : 'red'}>{connected ? <><Wifi size={12} /> live</> : <><WifiOff size={12} /> offline</>}</Badge>
          <Badge tone="gold">Round {state.round || '—'}</Badge>
        </div>
      </header>

      <main className="display-main">
        {state.phase === 'lobby' && <DisplayLobby state={state} />}
        {state.phase === 'round1' && <DisplayRound1 state={state} />}
        {(state.phase === 'round2_pick' || state.phase === 'round2_countdown' || state.phase === 'round2_question' || state.phase === 'round2_reveal') && <DisplayRound2 state={state} />}
        {(state.phase === 'round3_question' || state.phase === 'round3_reveal') && <DisplayRound3 state={state} />}
        {(state.phase === 'round2_done' || state.phase === 'round3_done' || state.phase === 'round1_closed') && <DisplayBoard state={state} />}
      </main>

      <footer className="display-foot">
        <span>MSSN Remo Area Council · MSS Week 2026</span>
        <span>Proudly supported by <img src="/brand/rayyan.png" alt="Rayyan Technologies" /></span>
        <span>{state.event.date}</span>
      </footer>
    </div>
  );
}

function DisplayLobby({ state }) {
  return (
    <section className="display-lobby">
      <div className="hero-kicker"><span /> MSS Week 2026 · ICT Quiz</div>
      <h1>Anchored in Deen,<br /><em>Illuminated in Dunya &amp; Digital.</em></h1>
      <p>{state.event.theme}</p>
      <div className="display-lobby-stats">
        <div><strong>{state.stats.totalCandidates}</strong><span>candidates</span></div>
        <div><strong>{state.stats.onlineCandidates}</strong><span>tablets online</span></div>
        <div><strong>{state.settings.round1QuestionCount}</strong><span>CBT questions</span></div>
      </div>
      <div className="display-wait"><span className="pulse-dot" /> Waiting for the admin to open Round 1</div>
      <div className="display-sponsor">Proudly supported by <img src="/brand/rayyan.png" alt="Rayyan Technologies" /></div>
    </section>
  );
}

function DisplayRound1({ state }) {
  return (
    <section className="display-race">
      <div className="display-title">
        <Badge tone="gold">Round 1</Badge>
        <h2>CBT elimination</h2>
        <p>{state.settings.round1QuestionCount} questions · {state.settings.round1DurationMinutes} minutes · auto-scored</p>
      </div>
      <div className="display-round1-grid">
        <div className="display-progress">
          <div className="display-big-number">{state.stats.round1Submitted}<span>/{state.stats.totalCandidates}</span></div>
          <p>papers submitted</p>
          <Timer deadline={state.round1.endsAt} serverTime={state.serverTime} totalSeconds={state.settings.round1DurationMinutes * 60} label="CBT closes in" />
          <div className="display-pills">
            <Badge tone="green">{state.stats.round1Active} writing</Badge>
            <Badge tone="blue">{state.stats.qualified} qualified</Badge>
          </div>
        </div>
        <div className="display-lb">
          <div className="display-lb-head"><Trophy size={18} /> Live top 8</div>
          <Leaderboard rows={state.leaderboard.slice(0, 8)} compact />
        </div>
      </div>
    </section>
  );
}

function DisplayRound2({ state }) {
  const r2 = state.round2;
  const phase = r2.phase;
  const active = r2.activeCandidate;
  const reveal = r2.reveal;
  const picked = new Set(r2.pickedNumbers || []);
  const total = r2.totalNumbers || 0;

  if (phase === 'countdown') {
    return (
      <section className="display-countdown">
        <div className="display-active-chip">
          <span className="avatar">{active?.name?.slice(0, 1)}</span>
          <div><strong>{active?.name}</strong><small>{active?.school}</small></div>
          <Badge tone="gold">Number {r2.activeNumber}</Badge>
        </div>
        <Countdown endsAt={r2.countdownEndsAt} serverTime={state.serverTime} label="Question revealed in" />
      </section>
    );
  }

  if (phase === 'question' && r2.question) {
    return (
      <section className="display-question">
        <div className="display-question-top">
          <div className="display-active-chip">
            <span className="avatar">{active?.name?.slice(0, 1)}</span>
            <div><strong>{active?.name}</strong><small>{active?.school}</small></div>
          </div>
          <Badge tone="gold">Number {r2.activeNumber} · {r2.question.topic}</Badge>
          <Timer deadline={r2.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round2AnswerSeconds} label="Time left" />
        </div>
        <h2 className="display-question-text">{r2.question.prompt}</h2>
        <QuestionOptions options={r2.question.options} disabled />
        <div className="display-source">{r2.question.source}</div>
      </section>
    );
  }

  if (phase === 'reveal' && reveal) {
    return <DisplayReveal reveal={reveal} state={state} kicker="Round 2 · Pick a number" />;
  }

  return (
    <section className="display-pick">
      <div className="display-pick-head">
        <div className="display-active-chip big">
          <span className="avatar">{active?.name?.slice(0, 1)}</span>
          <div><strong>{active?.name || 'Waiting'}</strong><small>{active?.school || 'next candidate'}</small></div>
        </div>
        <div>
          <Badge tone="gold">Pick a number</Badge>
          <h2>{total - picked.size} numbers still open</h2>
          <p>The candidate chooses an unused number on their tablet.</p>
        </div>
      </div>
      <div className="number-grid display-numbers">
        {Array.from({ length: total }, (_, i) => i + 1).map(n => (
          <div key={n} className={`number-cell ${picked.has(n) ? 'is-picked' : ''}`}><span>{n}</span><small>{picked.has(n) ? 'used' : 'open'}</small></div>
        ))}
      </div>
    </section>
  );
}

function DisplayRound3({ state }) {
  const r3 = state.round3;
  const reveal = r3.reveal;
  if (r3.phase === 'reveal' && reveal) {
    return <DisplayReveal reveal={reveal} state={state} kicker="Round 3 · First to answer" />;
  }
  if (!r3.question) return <Empty title="Waiting for the next question">The admin will start the race.</Empty>;
  return (
    <section className="display-question race-display">
      <div className="display-race-banner"><Zap size={20} /> FIRST TO ANSWER · ONE ANSWER LOCKS THE QUESTION</div>
      <div className="display-question-top">
        <Badge tone="red">Race {r3.questionNumber} / {r3.totalQuestions}</Badge>
        <Badge tone="blue">{r3.answerCount ? 'LOCKED' : 'OPEN'}</Badge>
        <Timer deadline={r3.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round3AnswerSeconds} label="Race clock" />
      </div>
      <h2 className="display-question-text">{r3.question.prompt}</h2>
      <QuestionOptions options={r3.question.options} colorMode disabled />
      <div className="display-source">{r3.question.source}</div>
    </section>
  );
}

function DisplayReveal({ reveal, state, kicker }) {
  return (
    <section className="display-reveal">
      <div className={`display-reveal-banner ${reveal.isCorrect ? 'good' : 'bad'}`}>{reveal.timedOut ? 'TIME UP' : reveal.isCorrect ? 'CORRECT' : 'INCORRECT'}</div>
      <div className="display-reveal-main">
        <div className="display-winner">
          <div className="display-winner-name">{reveal.candidate?.name || 'Nobody answered'}</div>
          <div className="display-winner-school">{reveal.candidate?.school || ''}</div>
          <div className="display-points">{reveal.points > 0 ? '+' : ''}{reveal.points}<span> pts</span></div>
          {reveal.responseMs && <div className="display-response"><Clock3 size={16} /> {(reveal.responseMs / 1000).toFixed(2)} seconds</div>}
        </div>
        {reveal.question && (
          <div className="display-answer">
            <div className="display-answer-q">{reveal.question.prompt}</div>
            <QuestionOptions options={reveal.question.options} selectedIndex={reveal.selectedIndex} correctIndex={reveal.question.correctIndex} reveal disabled />
            <div className="display-correct"><strong>Correct:</strong> {reveal.question.options[reveal.question.correctIndex]}</div>
          </div>
        )}
      </div>
      <div className="display-lb-strip"><Leaderboard rows={state.leaderboard.slice(0, 5)} compact /></div>
    </section>
  );
}

function DisplayBoard({ state }) {
  return (
    <section className="display-board">
      <div className="display-title">
        <Badge tone="gold">{state.phase.replaceAll('_',' ')}</Badge>
        <h2>Live standings</h2>
        <p>{state.event.name}</p>
      </div>
      <Leaderboard rows={state.leaderboard} limit={12} />
      <div className="display-wait"><span className="pulse-dot" /> Waiting for the next stage</div>
    </section>
  );
}
