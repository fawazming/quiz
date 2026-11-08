import React from 'react';
import {
  Users, Wifi, Trophy, Target, Play, Square, ChevronRight, Sparkles, Clock3, MonitorPlay
} from 'lucide-react';
import { Card, Stat, Button, Badge, Leaderboard, Timer, Empty } from '../components/UI.jsx';
import { useAction, phaseLabel, phaseTone } from './shared.js';

export default function Dashboard({ state, setTab }) {
  const { run, busy } = useAction();
  const top = state.leaderboard.slice(0, 8);
  const active = state.round2.activeCandidate;
  const r2q = state.round2.question;
  const r3q = state.round3.question;

  const actions = [];
  if (state.phase === 'lobby' || state.phase === 'round1_closed') {
    actions.push(<Button key="r1" onClick={() => run('round1:open', {}, 'Round 1 is open')} loading={busy === 'round1:open'}><Play size={16} /> Open Round 1</Button>);
  }
  if (state.phase === 'round1') {
    actions.push(<Button key="close" variant="danger" onClick={() => run('round1:close', {}, 'Round 1 closed')} loading={busy === 'round1:close'}><Square size={15} /> Close Round 1</Button>);
    actions.push(<Button key="qual" variant="gold" onClick={() => run('round1:qualify', { count: state.settings.qualifyTopN }, `Top ${state.settings.qualifyTopN} qualified`)}>Qualify top {state.settings.qualifyTopN}</Button>);
  }
  if (state.phase === 'round2_pick' || state.phase === 'round2_reveal') {
    actions.push(<Button key="next2" onClick={() => run('round2:next', {}, 'Next candidate')}>Next candidate <ChevronRight size={16} /></Button>);
  }
  if (state.phase === 'round3_question' || state.phase === 'round3_reveal') {
    actions.push(<Button key="next3" onClick={() => run('round3:next', {}, 'Next question')}>Next question <ChevronRight size={16} /></Button>);
  }

  return (
    <div className="stack">
      <section className="hero-admin">
        <div>
          <div className="hero-kicker"><span /> Live control room</div>
          <h2>{state.event.name}</h2>
          <p>{state.event.theme}</p>
          <div className="hero-admin-meta">
            <Badge tone={phaseTone(state.phase)}>{phaseLabel(state.phase)}</Badge>
            <span><Clock3 size={14} /> {state.event.date}</span>
          </div>
        </div>
        <div className="hero-admin-actions">
          {actions.length ? actions : <Empty title="Waiting for the next round" >Use the round tabs to start or reset a stage.</Empty>}
        </div>
      </section>

      <div className="stat-grid">
        <Stat label="Candidates" value={state.stats.totalCandidates} sub={`${state.stats.qualified} qualified`} icon={Users} />
        <Stat label="Online now" value={state.stats.onlineCandidates} sub="connected tablets" icon={Wifi} tone="blue" />
        <Stat label="CBT submissions" value={state.stats.round1Submitted} sub={`${state.stats.round1Active} still writing`} icon={Target} tone="gold" />
        <Stat label="Current round" value={state.round || '—'} sub={phaseLabel(state.phase)} icon={Trophy} tone="ink" />
      </div>

      <div className="two-col">
        <Card title="Live stage" subtitle="What the hall is seeing right now" actions={<Badge tone={phaseTone(state.phase)}>{phaseLabel(state.phase)}</Badge>}>
          {state.phase === 'lobby' && (
            <div className="live-placeholder">
              <Sparkles size={26} />
              <h4>The arena is in the lobby.</h4>
              <p>Open Round 1 when candidates are seated on their tablets.</p>
              <Button onClick={() => run('round1:open', {}, 'Round 1 is open')} loading={busy === 'round1:open'}><Play size={16} /> Open Round 1</Button>
            </div>
          )}
          {state.phase === 'round1' && (
            <div className="live-block">
              <div className="live-kicker">Round 1 · CBT elimination</div>
              <div className="live-big">{state.stats.round1Submitted}<span>/{state.stats.totalCandidates}</span></div>
              <p>submitted · {state.stats.round1Active} writing now</p>
              <Timer deadline={state.round1.endsAt} serverTime={state.serverTime} totalSeconds={state.settings.round1DurationMinutes * 60} label="CBT closes in" />
            </div>
          )}
          {(state.phase === 'round2_pick' || state.phase === 'round2_countdown' || state.phase === 'round2_question' || state.phase === 'round2_reveal') && (
            <div className="live-block">
              <div className="live-kicker">Round 2 · Pick a number</div>
              {active ? <><div className="live-name">{active.name}</div><p>{active.school}</p></> : <p>Waiting for the next candidate.</p>}
              <div className="live-meta-row">
                <Badge tone="gold">Number {state.round2.activeNumber || '—'}</Badge>
                <Badge tone="blue">{state.round2.pickedNumbers.length}/{state.round2.totalNumbers} picked</Badge>
              </div>
              {state.round2.deadlineAt && <Timer deadline={state.round2.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round2AnswerSeconds} label="Answer window" />}
              {r2q && <p className="clamp-2">{r2q.prompt}</p>}
            </div>
          )}
          {(state.phase === 'round3_question' || state.phase === 'round3_reveal') && (
            <div className="live-block">
              <div className="live-kicker">Round 3 · First to answer</div>
              <div className="live-meta-row">
                <Badge tone="red">Question {state.round3.questionNumber}/{state.round3.totalQuestions}</Badge>
                <Badge tone="blue">{state.round3.answerCount ? 'Locked' : 'Open'}</Badge>
              </div>
              {state.round3.deadlineAt && <Timer deadline={state.round3.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round3AnswerSeconds} label="Race clock" />}
              {r3q && <p className="clamp-2">{r3q.prompt}</p>}
              {state.round3.reveal?.candidate && <p><strong>{state.round3.reveal.candidate.name}</strong> answered first · {state.round3.reveal.points} pts</p>}
            </div>
          )}
          {(state.phase === 'round2_done' || state.phase === 'round3_done') && (
            <div className="live-placeholder">
              <Trophy size={26} />
              <h4>{phaseLabel(state.phase)}</h4>
              <p>Review the leaderboard, then move to the next stage.</p>
              <Button variant="ghost" onClick={() => setTab('scores')}>Open scores <ChevronRight size={16} /></Button>
            </div>
          )}
        </Card>

        <Card title="Top 8" subtitle="Live overall standings" actions={<Button size="sm" variant="ghost" onClick={() => setTab('scores')}>All scores</Button>}>
          <Leaderboard rows={top} compact />
        </Card>
      </div>

      <Card title="Quick stage controls" subtitle="Start the next phase without leaving the dashboard">
        <div className="quick-grid">
          <button className="quick-action" onClick={() => setTab('round1')}><Target size={20} /><strong>Round 1</strong><span>Open, close, qualify</span></button>
          <button className="quick-action" onClick={() => setTab('round2')}><HelpCircleIcon /><strong>Round 2</strong><span>Pick numbers, reveal</span></button>
          <button className="quick-action" onClick={() => setTab('round3')}><Trophy size={20} /><strong>Round 3</strong><span>First-to-answer race</span></button>
          <button className="quick-action" onClick={() => setTab('candidates')}><Users size={20} /><strong>Candidates</strong><span>Codes, schools, import</span></button>
        </div>
      </Card>
    </div>
  );
}

function HelpCircleIcon() {
  return <Target size={20} />;
}
