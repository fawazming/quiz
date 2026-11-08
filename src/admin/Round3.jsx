import React, { useState } from 'react';
import { Play, ChevronRight, RotateCcw, Zap, Clock3, Trophy, Shuffle, Users } from 'lucide-react';
import { Card, Button, Badge, Timer, QuestionOptions, Modal, Stat, Leaderboard, Empty } from '../components/UI.jsx';
import { useAction, phaseLabel, phaseTone } from './shared.js';

export default function Round3({ state, adminState }) {
  const { run, busy } = useAction();
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const r3 = state.round3;
  const full = adminState?.round3?.questionFull;
  const eligibleIds = state.round3?.eligibleIds || [];
  const finalists = eligibleIds.length
    ? state.candidates.filter(c => eligibleIds.includes(c.id))
    : state.leaderboard.filter(c => c.qualified);
  const phase = r3.phase;
  const reveal = r3.reveal;

  return (
    <div className="stack">
      <div className="stat-grid">
        <Stat label="Round 3 stage" value={phase === 'idle' ? 'READY' : phaseLabel(state.phase)} sub={`Question ${r3.questionNumber || 0}/${r3.totalQuestions || 0}`} icon={Zap} tone="red" />
        <Stat label="Finalists" value={finalists.length} sub="qualified candidates" icon={Users} tone="green" />
        <Stat label="Race clock" value={`${state.settings.round3AnswerSeconds}s`} sub="first answer locks" icon={Clock3} tone="gold" />
        <Stat label="Scoring" value={`${state.settings.round3BasePoints}+${state.settings.round3SpeedBonus}`} sub={`wrong penalty ${state.settings.round3WrongPenalty}`} icon={Trophy} tone="ink" />
      </div>

      <div className="two-col">
        <Card title="First-to-answer control" subtitle="All finalists see the question; the first submitted answer locks it">
          <div className="control-row">
            <Button onClick={() => run('round3:start', { shuffleQuestions }, 'Round 3 started')} loading={busy === 'round3:start'} disabled={phase !== 'idle' && phase !== 'done'}>
              <Play size={16} /> Start Round 3
            </Button>
            <Button variant="ghost" onClick={() => run('round3:next', {}, 'Next question')} loading={busy === 'round3:next'} disabled={!['question','reveal'].includes(phase)}>
              Next question <ChevronRight size={16} />
            </Button>
            <Button variant="danger" onClick={() => run('round3:end', {}, 'Round 3 concluded')} disabled={!['question','reveal'].includes(phase)}>
              End round
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(true)}><RotateCcw size={15} /> Reset</Button>
          </div>
          <label className="check-line">
            <input type="checkbox" checked={shuffleQuestions} onChange={e => setShuffleQuestions(e.target.checked)} />
            <span><Shuffle size={14} /> Shuffle question order</span>
          </label>
          <div className="notice">
            <Zap size={16} />
            <span>Server timestamps decide the winner. Once the first answer is stored, every tablet locks immediately.</span>
          </div>
          {phase === 'question' && <Timer deadline={r3.deadlineAt} serverTime={state.serverTime} totalSeconds={state.settings.round3AnswerSeconds} label="Race clock" />}
          <div className="live-meta-row" style={{ marginTop: '12px' }}>
            <Badge tone={r3.answerCount ? 'red' : 'green'}>{r3.answerCount ? 'Locked' : 'Open'}</Badge>
            <Badge tone="blue">{r3.answerCount} answer(s)</Badge>
          </div>
        </Card>

        <Card title="Question board" subtitle={full ? `${full.pdfRef} · ${full.topic}` : 'No question active'}>
          {full ? (
            <div className="admin-question">
              <div className="q-source">{full.source}</div>
              <h4 className="q-prompt">{full.prompt}</h4>
              <QuestionOptions options={full.options} correctIndex={full.correctIndex} reveal disabled colorMode />
              <div className="answer-note"><strong>Correct:</strong> {full.options[full.correctIndex]}<br /><span>{full.explanation}</span></div>
            </div>
          ) : <Empty title="Question hidden">Start Round 3 to load a PDF-sourced question.</Empty>}
        </Card>
      </div>

      {reveal && (
        <Card title="Race result" subtitle={reveal.candidate ? `${reveal.candidate.name} · ${reveal.candidate.school}` : 'No answer'}>
          <div className="race-result">
            <div className="race-winner">
              <div className="live-kicker">{reveal.timedOut ? 'Time expired' : reveal.isCorrect ? 'First correct answer' : 'First answer — incorrect'}</div>
              <div className="live-name">{reveal.candidate?.name || 'Nobody answered'}</div>
              <p>{reveal.candidate?.school || ''}</p>
            </div>
            <div className="race-points">
              <div className="big-points">{reveal.points > 0 ? '+' : ''}{reveal.points}</div>
              <span>{reveal.responseMs ? `${(reveal.responseMs / 1000).toFixed(2)}s response` : 'no response'}</span>
            </div>
          </div>
        </Card>
      )}

      <div className="two-col">
        <Card title="Finalists" subtitle="Qualified from Round 1">
          {finalists.length ? (
            <div className="finalist-list">
              {finalists.map((c, i) => (
                <div key={c.id} className="finalist-row">
                  <span className="q-rank">{i + 1}</span>
                  <span><strong>{c.name}</strong><small>{c.school}</small></span>
                  <span className="q-score">{c.total} pts</span>
                </div>
              ))}
            </div>
          ) : <Empty title="No finalists">Qualify candidates from Round 1 first.</Empty>}
        </Card>
        <Card title="Overall standings" subtitle="Live after every race">
          <Leaderboard rows={state.leaderboard} limit={8} compact />
        </Card>
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset Round 3?"
        footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await run('round3:reset', {}, 'Round 3 reset'); setConfirmReset(false); }}>Delete answers &amp; reset</Button></>}>
        <p>This deletes every Round 3 answer and score. Finalists stay qualified.</p>
      </Modal>
    </div>
  );
}
