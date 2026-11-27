import React, { useState } from 'react';
import { Play, ChevronRight, RotateCcw, Shuffle, Hash, Clock3, Trophy, Eye, Award } from 'lucide-react';
import { Card, Button, Badge, Timer, Countdown, QuestionOptions, Modal, Empty, Stat, Leaderboard } from '../components/UI.jsx';
import { useAction, phaseLabel, phaseTone } from './shared.js';

export default function Round2({ state, adminState }) {
  const { run, busy } = useAction();
  const [shuffleOrder, setShuffleOrder] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const r2 = state.round2;
  const full = adminState?.round2?.questionFull;
  const active = r2.activeCandidate;
  const phase = r2.phase;
  const picked = new Set(r2.pickedNumbers || []);
  const total = r2.totalNumbers || 0;
  const stages = r2.stages || [];
  const round2Qualifiers = state.candidates.filter(c => c.round2Qualified);
  const basisLabel = state.settings.round2QualifyBasis === 'round2' ? 'Round 2 score' : state.settings.round2QualifyBasis === 'round1' ? 'Round 1 score' : 'overall total';

  return (
    <div className="stack">
      <div className="stat-grid">
        <Stat label="Round 2 stage" value={phase === 'idle' ? 'READY' : phaseLabel(state.phase)} sub={`${r2.pickedNumbers.length}/${total} numbers picked${r2.stageCount > 1 ? ` · Stage ${r2.stageNumber}/${r2.stageCount}` : ''}`} icon={Hash} tone="gold" />
        <Stat label="Active candidate" value={active?.name || '—'} sub={active?.school || 'waiting'} icon={Trophy} tone="green" />
        <Stat label="Answer timer" value={`${state.settings.round2AnswerSeconds}s`} sub={`${state.settings.countdownSeconds}s reveal countdown`} icon={Clock3} tone="blue" />
        <Stat label="Round 3 qualifiers" value={round2Qualifiers.length || '—'} sub={`top ${state.settings.round2QualifyTopN || 4} by ${basisLabel}`} icon={Award} tone="ink" />
      </div>

      {stages.length > 1 && (
        <Card title="Round 2 stages" subtitle="Each stage has its own number board and question group">
          <div className="stage-strip">
            {stages.map((stage, i) => (
              <div key={i} className={`stage-pill ${i === r2.stageIndex ? 'is-active' : ''} ${stage.pickedCount >= stage.count ? 'is-done' : ''}`}>
                <span>Stage {i + 1}</span>
                <strong>{stage.groupName || stage.label || 'All groups'}</strong>
                <small>{stage.pickedCount}/{stage.count} picked</small>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="two-col">
        <Card title="Run the pick-a-number round" subtitle="The active candidate picks an unused number on their tablet">
          <div className="control-row">
            <Button onClick={() => run('round2:start', { shuffleOrder }, 'Round 2 started')} loading={busy === 'round2:start'} disabled={phase !== 'idle' && phase !== 'done'}>
              <Play size={16} /> Start Round 2
            </Button>
            <Button variant="ghost" onClick={() => run('round2:next', {}, 'Next candidate')} loading={busy === 'round2:next'} disabled={!['pick','countdown','question','reveal'].includes(phase)}>
              Next <ChevronRight size={16} />
            </Button>
            <Button variant="danger" onClick={() => run('round2:end', {}, 'Round 2 concluded')} disabled={!['pick','countdown','question','reveal'].includes(phase)}>
              End round
            </Button>
            <Button variant="gold" onClick={() => run('round2:qualify', { count: state.settings.round2QualifyTopN, basis: state.settings.round2QualifyBasis }, `Top ${state.settings.round2QualifyTopN} qualified for Round 3`)} loading={busy === 'round2:qualify'} disabled={!r2.pickedNumbers.length}>
              <Award size={16} /> Qualify top {state.settings.round2QualifyTopN || 4}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Reset</Button>
          </div>
          <label className="check-line">
            <input type="checkbox" checked={shuffleOrder} onChange={e => setShuffleOrder(e.target.checked)} />
            <span><Shuffle size={14} /> Randomise candidate turn order</span>
          </label>
          <div className="notice">
            <Eye size={16} />
            <span>The question stays hidden until the {state.settings.countdownSeconds}-second countdown ends, then appears on the projector and on the active tablet. After play, qualify the configured top candidates for Round 3.</span>
          </div>
          {phase === 'countdown' && <Countdown endsAt={r2.countdownEndsAt} serverTime={state.serverTime} />}
          {phase === 'question' && <Timer deadline={r2.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round2AnswerSeconds} label={`${active?.name || 'Candidate'} is answering`} />}
          {phase === 'pick' && active && (
            <div className="active-callout">
              <div className="live-kicker">Privilege to pick</div>
              <div className="live-name">{active.name}</div>
              <p>{active.school}</p>
              <span className="muted">Waiting for a number on the candidate tablet…</span>
            </div>
          )}
        </Card>

        <Card title="Question board" subtitle={full ? `${full.pdfRef} · ${full.topic}` : 'No question active'}>
          {full ? (
            <div className="admin-question">
              <div className="q-source">{full.source}</div>
              <h4 className="q-prompt">{full.prompt}</h4>
              <QuestionOptions options={full.options} correctIndex={full.correctIndex} reveal disabled />
              <div className="answer-note"><strong>Correct:</strong> {full.options[full.correctIndex]}<br /><span>{full.explanation}</span></div>
            </div>
          ) : <Empty title="Question hidden">The active question will appear here for the admin and scorekeeper.</Empty>}
        </Card>
      </div>

      <Card title="Number board" subtitle={`${total - picked.size} numbers still available${r2.stageCount > 1 ? ` · Stage ${r2.stageNumber}/${r2.stageCount} · ${r2.stageGroupName || r2.stageLabel}` : ''}`}>
        {total ? (
          <div className="number-grid">
            {Array.from({ length: total }, (_, i) => i + 1).map(n => (
              <div key={n} className={`number-cell ${picked.has(n) ? 'is-picked' : ''} ${r2.activeNumber === n ? 'is-active' : ''}`}>
                <span>{n}</span>
                {picked.has(n) ? <small>picked</small> : <small>open</small>}
              </div>
            ))}
          </div>
        ) : <Empty title="Round 2 not started">Start the round to generate the number board from the PDF question bank.</Empty>}
      </Card>

      {r2.reveal && (
        <Card title="Last reveal" subtitle={`${r2.reveal.candidate?.name || 'Candidate'} · ${r2.reveal.candidate?.school || ''}`}>
          <div className="reveal-admin">
            <Badge tone={r2.reveal.isCorrect ? 'green' : 'red'}>{r2.reveal.isCorrect ? 'Correct' : r2.reveal.timedOut ? 'Timed out' : 'Wrong'}</Badge>
            <span className="big-points">{r2.reveal.points} pts</span>
            <span>{r2.reveal.responseMs ? `${(r2.reveal.responseMs / 1000).toFixed(1)}s` : '—'}</span>
          </div>
        </Card>
      )}

      <Card title="Round 3 qualifiers" subtitle={round2Qualifiers.length ? `${round2Qualifiers.length} candidate(s) selected by ${basisLabel}` : `Press “Qualify top ${state.settings.round2QualifyTopN || 4}” after play to lock the Round 3 field`}>
        {round2Qualifiers.length ? (
          <div className="finalist-list">
            {round2Qualifiers.map((c, i) => (
              <div key={c.id} className="finalist-row">
                <span className="q-rank">{i + 1}</span>
                <span><strong>{c.name}</strong><small>{c.school}</small></span>
                <span className="q-score">{state.leaderboard.find(x => x.id === c.id)?.total ?? 0} pts</span>
              </div>
            ))}
          </div>
        ) : <p className="muted">No Round 3 qualifiers have been selected yet. Qualification does not happen automatically — press the qualify button when Round 2 is finished.</p>}
      </Card>

      <Card title="Standings after Round 2" subtitle="Overall total across rounds">
        <Leaderboard rows={state.leaderboard} limit={12} compact />
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset Round 2?"
        footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await run('round2:reset', {}, 'Round 2 reset'); setConfirmReset(false); }}>Delete picks &amp; reset</Button></>}>
        <p>This deletes every Round 2 pick and score. Candidates stay qualified.</p>
      </Modal>
    </div>
  );
}
