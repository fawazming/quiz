import React, { useState } from 'react';
import { Play, Square, RotateCcw, Trophy, Clock3, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Button, Badge, Timer, Modal, Stat, Empty } from '../components/UI.jsx';
import { useAction, phaseLabel, phaseTone } from './shared.js';

export default function Round1({ state, adminState }) {
  const { run, busy } = useAction();
  const [confirmReset, setConfirmReset] = useState(false);
  const [qualifyCount, setQualifyCount] = useState(state.settings.qualifyTopN || 8);
  const sessions = adminState?.round1Sessions || [];
  const done = sessions.filter(s => s.status === 'submitted');
  const active = sessions.filter(s => s.status === 'active');
  const open = state.round1.open;
  const hasNextRound = !!(state.settings.enabledRounds?.[2] || state.settings.enabledRounds?.[3]);

  return (
    <div className="stack">
      <div className="stat-grid">
        <Stat label="Round 1 state" value={open ? 'OPEN' : 'CLOSED'} sub={phaseLabel(state.phase)} icon={Clock3} tone={open ? 'green' : 'gold'} />
        <Stat label="Submitted" value={done.length} sub={`${sessions.length} started`} icon={CheckCircle2} tone="blue" />
        <Stat label="Still writing" value={active.length} sub="tablets in progress" icon={Users} tone="gold" />
        <Stat label="Qualified" value={state.stats.qualified} sub={`top ${state.settings.qualifyTopN} target`} icon={Trophy} tone="ink" />
      </div>

      <div className="two-col">
        <Card title="CBT control" subtitle={`${state.settings.round1QuestionCount} PDF-sourced questions · individual timing · auto-scored`}>
          <div className="control-row">
            {!open ? (
              <Button onClick={() => run('round1:open', {}, 'Round 1 is open')} loading={busy === 'round1:open'}><Play size={16} /> Start fresh CBT</Button>
            ) : (
              <Button variant="danger" onClick={() => run('round1:close', {}, 'Round 1 closed and finalised')} loading={busy === 'round1:close'}><Square size={15} /> End &amp; finalise</Button>
            )}
            <Button variant="ghost" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Reset Round 1</Button>
          </div>
          {open && state.round1.endsAt && (
            <Timer deadline={state.round1.endsAt} serverTime={state.serverTime} totalSeconds={state.settings.round1DurationMinutes * 60} label="CBT closes in" />
          )}
          <div className="notice">
            <AlertTriangle size={16} />
            <span>Starting a fresh CBT clears previous CBT sessions and answers. Closing finalises every active session at its current score.</span>
          </div>
        </Card>

        {hasNextRound ? (
          <Card title="Qualification" subtitle="Rank by Round 1 score, then move candidates to the next stage">
            <div className="qualify-box">
              <label>Qualify top</label>
              <div className="inline-form">
                <input type="number" min="1" max={state.stats.totalCandidates || 1} value={qualifyCount} onChange={e => setQualifyCount(e.target.value)} />
                <Button variant="gold" onClick={() => run('round1:qualify', { count: Number(qualifyCount) }, `Top ${qualifyCount} qualified`)} loading={busy === 'round1:qualify'}>
                  <Trophy size={16} /> Qualify
                </Button>
              </div>
              <p className="muted small">Ties are broken by overall total, then name. You can manually adjust qualification in the Candidates tab.</p>
            </div>
            <div className="qualify-list">
              {state.leaderboard.slice(0, Number(qualifyCount) || 8).map((r, i) => (
                <div key={r.id} className={`qualify-row ${r.qualified ? 'is-qualified' : ''}`}>
                  <span className="q-rank">{i + 1}</span>
                  <span><strong>{r.name}</strong><small>{r.school}</small></span>
                  <span className="q-score">{r.round1} pts</span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card title="CBT-only event" subtitle="No qualification needed">
            <p className="muted">Rounds 2 and 3 are disabled. Close the CBT when finished; candidates see the final leaderboard immediately.</p>
            <div className="notice"><AlertTriangle size={16} /><span>You can enable other rounds later in Settings.</span></div>
          </Card>
        )}
      </div>

      <Card title="Candidate progress" subtitle="Live CBT sessions" actions={<Badge tone={phaseTone(state.phase)}>{phaseLabel(state.phase)}</Badge>}>
        {sessions.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Candidate</th><th>School</th><th>Status</th><th>Correct</th><th>Score</th><th>Deadline</th></tr></thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.candidateId}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.school}</td>
                    <td><Badge tone={s.status === 'submitted' ? 'green' : s.status === 'active' ? 'gold' : 'grey'}>{s.status}</Badge></td>
                    <td>{s.correctCount}/{s.totalQuestions}</td>
                    <td><strong>{s.score}</strong></td>
                    <td>{s.status === 'submitted' ? 'Submitted' : new Date(s.deadlineAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No CBT sessions yet">Open Round 1, then ask candidates to press “Start test” on their tablets.</Empty>}
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset Round 1?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { await run('round1:reset', {}, 'Round 1 reset'); setConfirmReset(false); }}>Delete sessions &amp; answers</Button>
        </>}
      >
        <p>This permanently deletes every CBT session and answer, and clears the Round 1 scores. Use it only before a fresh rehearsal or a new competition.</p>
      </Modal>
    </div>
  );
}
