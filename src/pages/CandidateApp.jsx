import React, { useEffect, useState } from 'react';
import {
  LogOut, Wifi, WifiOff, Timer as TimerIcon, CheckCircle2, ChevronLeft, ChevronRight,
  Send, Trophy, Circle, Lock, Zap, School, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../auth.jsx';
import { useSocket } from '../socket.jsx';
import { useToast } from '../toast.jsx';
import { Brand, Badge, Button, Card, Countdown, Empty, Leaderboard, Modal, QuestionOptions, Spinner, Timer } from '../components/UI.jsx';
import { useCountdown, formatTime } from '../useCountdown.js';

export default function CandidateApp() {
  const { user, logout } = useAuth();
  const { state, round1, connected, emitAck, setRound1 } = useSocket();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const { push } = useToast();

  if (!state) return <div className="page-center"><Spinner label="Connecting to the quiz…" /></div>;

  const me = state.candidates.find(c => c.id === user.candidateId) || user;
  const qualified = !!state.leaderboard.find(c => c.id === me.id)?.qualified;
  const phase = state.phase;
  const isRound1 = state.round === 1 || phase === 'round1' || phase === 'round1_closed';

  async function action(event, payload, success) {
    setBusy(event); setError('');
    try {
      const res = await emitAck(event, payload);
      if (res.state) setRound1(res.state);
      if (success) push(success, 'success');
      return res;
    } catch (e) { setError(e.message); push(e.message, 'error'); throw e; }
    finally { setBusy(''); }
  }

  return (
    <div className="candidate-shell">
      <header className="candidate-top">
        <Brand compact />
        <div className="candidate-id">
          <div className="avatar">{me.name?.slice(0, 1)?.toUpperCase()}</div>
          <div><strong>{me.name}</strong><small><School size={12} /> {me.school}</small></div>
        </div>
        <div className="candidate-top-right">
          <Badge tone={connected ? 'green' : 'red'}>{connected ? <><Wifi size={12} /> live</> : <><WifiOff size={12} /> offline</>}</Badge>
          <Badge tone="gold">Round {state.round || '—'}</Badge>
          <button className="icon-btn" onClick={logout} title="Sign out"><LogOut size={17} /></button>
        </div>
      </header>

      <main className="candidate-main">
        {error && <div className="alert error"><AlertTriangle size={16} /> {error}</div>}

        {isRound1 && (
          round1 ? <Round1Test round1={round1} state={state} busy={busy} action={action} setRound1={setRound1} />
            : <Spinner label="Loading your CBT paper…" />
        )}

        {state.round === 2 && (
          qualified
            ? <Round2Play state={state} me={me} busy={busy} action={action} />
            : <Eliminated state={state} me={me} />
        )}

        {state.round === 3 && (
          qualified
            ? <Round3Play state={state} me={me} busy={busy} action={action} />
            : <Eliminated state={state} me={me} />
        )}

        {state.round === 0 && <Lobby state={state} me={me} />}
      </main>
    </div>
  );
}

function Lobby({ state, me }) {
  return (
    <div className="candidate-lobby">
      <div className="candidate-hero">
        <div className="hero-kicker"><span /> MSS Week 2026 · ICT Quiz</div>
        <h1>Welcome,<br />{me.name.split(' ')[0]}.</h1>
        <p>You are checked in for <strong>{state.event.name}</strong>. Keep this tab open. The admin will open Round 1 shortly.</p>
        <div className="lobby-status">
          <div><strong>{state.stats.totalCandidates}</strong><span>candidates</span></div>
          <div><strong>{state.stats.onlineCandidates}</strong><span>online now</span></div>
          <div><strong>{state.settings.round1QuestionCount}</strong><span>CBT questions</span></div>
        </div>
      </div>
      <Card title="How the competition runs" className="candidate-rules">
        <ol>
          <li><b>Round 1 — CBT:</b> {state.settings.round1QuestionCount} MCQs, {state.settings.round1DurationMinutes} minutes. Answer at your own pace.</li>
          <li><b>Round 2 — Pick a number:</b> the top {state.settings.qualifyTopN} qualify. Pick an unused number; the question appears after a {state.settings.countdownSeconds}-second countdown.</li>
          <li><b>Round 3 — First to answer:</b> finalists race. The first submitted answer locks the question; speed and accuracy decide the points.</li>
        </ol>
      </Card>
    </div>
  );
}

function Round1Test({ round1, state, busy, action, setRound1 }) {
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const remaining = useCountdown(round1?.deadlineAt, state.serverTime);
  const questions = round1.questions || [];
  const answers = round1.answers || {};
  const current = questions[index];
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    if (!round1.started || round1.status !== 'active') return;
    if (remaining <= 0 && !autoSubmitted) {
      setAutoSubmitted(true);
      action('round1:submit', {}, 'Time is up — your CBT has been submitted');
    }
  }, [remaining, round1.started, round1.status, autoSubmitted]);

  if (!round1.started) {
    return (
      <div className="candidate-gate">
        <Card title="Round 1 · CBT elimination" subtitle={`${state.settings.round1QuestionCount} questions · ${state.settings.round1DurationMinutes} minutes`}>
          <div className="gate-points">
            <div><strong>{state.settings.round1QuestionCount}</strong><span>MCQs</span></div>
            <div><strong>{state.settings.round1DurationMinutes}m</strong><span>total time</span></div>
            <div><strong>{state.settings.round1PointsPerCorrect}</strong><span>pts / correct</span></div>
          </div>
          <ul className="gate-list">
            <li>One question at a time. You can move back and change an answer before submitting.</li>
            <li>Your progress is saved automatically on this tablet.</li>
            <li>When the timer reaches zero, the test submits automatically.</li>
            <li>Do not refresh or close this tab during the test.</li>
          </ul>
          <Button size="lg" onClick={() => action('round1:start', {}, 'Your CBT has started')} loading={busy === 'round1:start'}>
            Start test <ChevronRight size={17} />
          </Button>
        </Card>
      </div>
    );
  }

  if (round1.status === 'submitted') {
    return (
      <div className="candidate-gate">
        <Card title="CBT submitted" subtitle="Your answers are safely stored">
          <div className="submit-summary">
            <div className="submit-score">{round1.score}<span>pts</span></div>
            <div><strong>{round1.correctCount} / {round1.totalQuestions}</strong><span>correct answers</span></div>
          </div>
          <p className="muted">Wait for the admin to close Round 1 and publish the qualifiers. Keep this tab open.</p>
          <div className="wait-pulse"><span /> Waiting for results…</div>
        </Card>
      </div>
    );
  }

  if (!current) return <Spinner label="Loading questions…" />;

  return (
    <div className="cbt-layout">
      <aside className="cbt-palette">
        <div className="palette-head">
          <strong>Questions</strong>
          <span>{answeredCount}/{questions.length}</span>
        </div>
        <div className="palette-grid">
          {questions.map((q, i) => (
            <button key={q.id} className={`${i === index ? 'current' : ''} ${answers[q.id] ? 'answered' : ''}`} onClick={() => setIndex(i)}>{i + 1}</button>
          ))}
        </div>
        <div className="palette-legend"><span className="answered" /> answered <span className="current" /> current</div>
      </aside>

      <section className="cbt-main">
        <div className="cbt-top">
          <div>
            <Badge tone="gold">Question {index + 1} of {questions.length}</Badge>
            <Badge tone="blue">{current.topic}</Badge>
          </div>
          <div className={`cbt-clock ${remaining <= 60000 ? 'danger' : ''}`}><TimerIcon size={16} /> {formatTime(remaining)}</div>
        </div>

        <Card className="question-card">
          <div className="q-source">{current.source}</div>
          <h2 className="q-prompt">{current.prompt}</h2>
          <QuestionOptions
            options={current.options}
            selectedIndex={answers[current.id]?.selectedIndex}
            onSelect={(i) => action('round1:answer', { questionId: current.id, selectedIndex: i })}
          />
          <div className="cbt-nav">
            <Button variant="ghost" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}><ChevronLeft size={16} /> Previous</Button>
            <Button variant="ghost" onClick={() => setIndex(i => Math.min(questions.length - 1, i + 1))} disabled={index === questions.length - 1}>Next <ChevronRight size={16} /></Button>
            <Button variant="gold" onClick={() => setConfirm(true)}><Send size={16} /> Submit test</Button>
          </div>
        </Card>

        <div className="cbt-foot">
          <span><Circle size={8} /> Every answer is auto-saved</span>
          <span>{answeredCount} answered · {questions.length - answeredCount} remaining</span>
        </div>
      </section>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Submit your CBT?"
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Keep working</Button><Button variant="gold" onClick={async () => { await action('round1:submit', {}, 'CBT submitted'); setConfirm(false); }} loading={busy === 'round1:submit'}>Submit final answers</Button></>}>
        <p>You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions. You cannot change answers after submitting.</p>
      </Modal>
    </div>
  );
}

function Round2Play({ state, me, busy, action }) {
  const r2 = state.round2;
  const active = r2.activeCandidate;
  const isMe = active?.id === me.id;
  const picked = new Set(r2.pickedNumbers || []);
  const total = r2.totalNumbers || 0;
  const [selected, setSelected] = useState(null);
  const phase = r2.phase;

  useEffect(() => { setSelected(null); }, [r2.question?.id, phase]);

  if (!total && phase === 'idle') {
    return <Waiting title="Round 2 is warming up" sub="The admin is preparing the number board." state={state} />;
  }

  if (phase === 'pick') {
    return (
      <div className="candidate-gate wide">
        <Card title={isMe ? 'Your turn — pick a number' : `${active?.name || 'A candidate'} is picking`} subtitle={isMe ? 'Choose one unused number. The question stays hidden until the countdown ends.' : `${active?.school || ''} · the board will update automatically.`}>
          <div className={`number-grid candidate-numbers ${isMe ? 'can-pick' : ''}`}>
            {Array.from({ length: total }, (_, i) => i + 1).map(n => (
              <button key={n} className={`number-cell ${picked.has(n) ? 'is-picked' : ''}`} disabled={!isMe || picked.has(n) || busy === 'round2:pick'} onClick={() => action('round2:pick', { number: n }, `You picked number ${n}`)}>
                <span>{n}</span><small>{picked.has(n) ? 'used' : isMe ? 'pick' : 'open'}</small>
              </button>
            ))}
          </div>
          {!isMe && <div className="wait-pulse"><span /> Waiting for your turn…</div>}
        </Card>
      </div>
    );
  }

  if (phase === 'countdown') {
    return <div className="candidate-gate"><Card><Countdown endsAt={r2.countdownEndsAt} serverTime={state.serverTime} label={`${active?.name || 'Candidate'} picked number ${r2.activeNumber}`} /></Card></div>;
  }

  if (phase === 'question' && r2.question) {
    return (
      <div className="race-play">
        <div className="race-top">
          <Badge tone="gold">Number {r2.activeNumber}</Badge>
          <Badge tone={isMe ? 'green' : 'grey'}>{isMe ? 'Your question' : `${active?.name} is answering`}</Badge>
          <Timer deadline={r2.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round2AnswerSeconds} label="Time left" />
        </div>
        <Card className="question-card">
          <div className="q-source">{r2.question.source}</div>
          <h2 className="q-prompt">{r2.question.prompt}</h2>
          <QuestionOptions options={r2.question.options} selectedIndex={selected} disabled={!isMe || busy === 'round2:answer'} onSelect={setSelected} />
          {isMe ? (
            <Button size="lg" className="w-full" disabled={selected === null} loading={busy === 'round2:answer'} onClick={() => action('round2:answer', { selectedIndex: selected }, 'Answer locked in')}>
              Lock answer <Lock size={16} />
            </Button>
          ) : <div className="spectator-note">Only {active?.name} can answer this question. Watch the projector for the reveal.</div>}
        </Card>
      </div>
    );
  }

  if (phase === 'reveal' && r2.reveal) {
    return <RevealPanel reveal={r2.reveal} state={state} me={me} label="Round 2 reveal" />;
  }

  return <Waiting title="Round 2" sub="Waiting for the admin to start the next turn." state={state} />;
}

function Round3Play({ state, me, busy, action }) {
  const r3 = state.round3;
  const phase = r3.phase;
  const [locked, setLocked] = useState(false);

  useEffect(() => { setLocked(false); }, [r3.question?.id, phase]);

  if (phase === 'question' && r3.question) {
    return (
      <div className="race-play">
        <div className="race-banner"><Zap size={18} /> First to answer — the first submitted answer locks the question</div>
        <div className="race-top">
          <Badge tone="red">Race question {r3.questionNumber}/{r3.totalQuestions}</Badge>
          <Badge tone={r3.answerCount ? 'gold' : 'green'}>{r3.answerCount ? 'Locked' : 'Open'}</Badge>
          <Timer deadline={r3.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round3AnswerSeconds} label="Race clock" />
        </div>
        <Card className="question-card race-card">
          <div className="q-source">{r3.question.source}</div>
          <h2 className="q-prompt">{r3.question.prompt}</h2>
          <QuestionOptions
            options={r3.question.options}
            colorMode
            disabled={locked || r3.answerCount > 0 || busy === 'round3:answer'}
            onSelect={(i) => {
              setLocked(true);
              action('round3:answer', { selectedIndex: i }, 'Answer submitted');
            }}
          />
          <div className="spectator-note">{locked ? 'Your answer is in. Waiting for the result…' : 'Tap an answer once. There is no second chance.'}</div>
        </Card>
      </div>
    );
  }

  if (phase === 'reveal' && r3.reveal) {
    return <RevealPanel reveal={r3.reveal} state={state} me={me} label="Round 3 reveal" />;
  }

  if (phase === 'done') {
    return <FinalBoard state={state} me={me} />;
  }

  return <Waiting title="Round 3" sub="Waiting for the next race question." state={state} />;
}

function RevealPanel({ reveal, state, me, label }) {
  const isMe = reveal.candidate?.id === me.id;
  return (
    <div className="candidate-gate wide">
      <Card title={label} subtitle={reveal.candidate ? `${reveal.candidate.name} · ${reveal.candidate.school}` : 'No answer submitted'}>
        <div className={`reveal-hero ${reveal.isCorrect ? 'good' : 'bad'}`}>
          <div className="reveal-badge">{reveal.timedOut ? 'TIME UP' : reveal.isCorrect ? 'CORRECT' : 'INCORRECT'}</div>
          <div className="reveal-name">{reveal.candidate?.name || 'Nobody answered'}</div>
          <div className="reveal-school">{reveal.candidate?.school || ''}</div>
          <div className="reveal-points">{reveal.points > 0 ? '+' : ''}{reveal.points} <span>pts</span></div>
          {reveal.responseMs && <div className="reveal-time">{(reveal.responseMs / 1000).toFixed(2)}s response</div>}
          {isMe && <div className="you-tag">That was you</div>}
        </div>
        {reveal.question && (
          <div className="reveal-answer">
            <div className="q-source">{reveal.question.source}</div>
            <h3>{reveal.question.prompt}</h3>
            <QuestionOptions options={reveal.question.options} selectedIndex={reveal.selectedIndex} correctIndex={reveal.question.correctIndex} reveal disabled />
            <div className="answer-note"><strong>Correct answer:</strong> {reveal.question.options[reveal.question.correctIndex]}<br /><span>{reveal.question.explanation}</span></div>
          </div>
        )}
        <div className="wait-pulse"><span /> Waiting for the next question…</div>
      </Card>
    </div>
  );
}

function Waiting({ title, sub, state }) {
  return (
    <div className="candidate-gate">
      <Card title={title} subtitle={sub}>
        <div className="wait-art"><div className="pulse-ring" /><Trophy size={26} /></div>
        <p className="muted center">Keep this tablet open. The screen will update automatically.</p>
        <Leaderboard rows={state.leaderboard.slice(0, 5)} compact />
      </Card>
    </div>
  );
}

function Eliminated({ state, me }) {
  const row = state.leaderboard.find(c => c.id === me.id);
  return (
    <div className="candidate-gate">
      <Card title="Round complete for you" subtitle="Thank you for taking part">
        <div className="eliminated">
          <div className="eliminated-icon"><Trophy size={30} /></div>
          <h3>{row ? `${row.total} points` : 'Your result'}</h3>
          <p>You did not qualify for the next stage. Stay in the hall and support your school — the live leaderboard is on the projector.</p>
          <Leaderboard rows={state.leaderboard.slice(0, 8)} compact />
        </div>
      </Card>
    </div>
  );
}

function FinalBoard({ state, me }) {
  return (
    <div className="candidate-gate wide">
      <Card title="Final standings" subtitle="MSSN Remo ICT Quiz 2026">
        <Leaderboard rows={state.leaderboard} highlightId={me.id} />
        <p className="muted center">Jazakum Allahu khayran for competing with knowledge, skill and responsibility.</p>
      </Card>
    </div>
  );
}
