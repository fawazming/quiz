import React, { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Search } from 'lucide-react';
import { Card, Button, Badge, Stat, Empty, Spinner } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';

const ROUNDS = [
  { n: 1, label: 'Round 1 · CBT' },
  { n: 2, label: 'Round 2 · Pick' },
  { n: 3, label: 'Round 3 · Race' }
];

function when(value) {
  if (!value) return '—';
  const date = new Date(typeof value === 'number' ? value : String(value).replace(' ', 'T') + (String(value).includes('Z') ? '' : 'Z'));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function answerText(item) {
  if (item.selected_index === null || item.selected_index === undefined) return 'No answer';
  return item.options?.[item.selected_index] ?? `Option ${item.selected_index + 1}`;
}

function correctText(item) {
  if (item.correct_index === null || item.correct_index === undefined) return '—';
  return item.options?.[item.correct_index] ?? `Option ${item.correct_index + 1}`;
}

export default function AuditProbe({ state }) {
  const { push } = useToast();
  const [round, setRound] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  async function load(selectedRound = round) {
    setLoading(true);
    try {
      const result = await api(`/api/admin/rounds/${selectedRound}/probe`);
      setData(result);
      setUpdatedAt(Date.now());
      if (selectedRound === 1) {
        setSessionId(current => {
          const stillExists = result.sessions.some(s => String(s.id) === String(current));
          return stillExists ? current : String(result.sessions[0]?.id || '');
        });
      }
    } catch (err) { push(err.message, 'error'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(round); }, [round]);
  useEffect(() => {
    const id = setInterval(() => load(round), 15000);
    return () => clearInterval(id);
  }, [round]);

  const sessions = data?.round === 1 ? data.sessions || [] : [];
  const selectedSession = sessions.find(s => s.id === Number(sessionId));
  const selectedAnswers = data?.round === 1 ? (data.answers || []).filter(a => a.session_id === Number(sessionId)) : [];
  const summary = data?.summary || {};
  const audit = data?.audit || [];

  return (
    <div className="stack">
      <div className="probe-head">
        <div>
          <div className="hero-kicker"><span /> Read-only investigation</div>
          <h2>Audit &amp; probe</h2>
          <p className="muted">Inspect stored answers, picks and the audit trail for any round — even after the round has ended.</p>
        </div>
        <div className="probe-actions">
          <span className="muted small">{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : ''}</span>
          <Button variant="ghost" size="sm" onClick={() => load(round)} loading={loading}><RefreshCw size={14} /> Refresh</Button>
        </div>
      </div>

      <div className="probe-rounds">
        {ROUNDS.map(item => (
          <button key={item.n} className={`probe-round ${round === item.n ? 'is-active' : ''}`} onClick={() => setRound(item.n)}>
            <span>Round {item.n}</span>
            <strong>{item.label.split('·')[1]?.trim()}</strong>
            <small>{state.settings.enabledRounds?.[item.n] ? 'enabled' : 'disabled'}</small>
          </button>
        ))}
      </div>

      {!data ? <Spinner label="Loading round records…" /> : (
        <>
          <div className="stat-grid">
            {round === 1 && <>
              <Stat label="CBT scripts" value={summary.sessions ?? 0} sub={`${summary.submitted ?? 0} submitted · ${summary.active ?? 0} active`} icon={ShieldCheck} tone="gold" />
              <Stat label="Stored answers" value={summary.answers ?? 0} sub="individual question attempts" icon={Search} tone="blue" />
              <Stat label="Round status" value={state.round === 1 ? state.phase : 'closed'} sub="live server state" icon={ShieldCheck} tone="green" />
            </>}
            {round === 2 && <>
              <Stat label="Picks stored" value={summary.picks ?? 0} sub={`${summary.candidates ?? 0} candidates played`} icon={ShieldCheck} tone="gold" />
              <Stat label="Correct picks" value={summary.correct ?? 0} sub={`${summary.points ?? 0} points awarded`} icon={Search} tone="green" />
              <Stat label="Stages" value={summary.stages || 1} sub="configured Round 2 boards" icon={ShieldCheck} tone="blue" />
            </>}
            {round === 3 && <>
              <Stat label="Race answers" value={summary.answers ?? 0} sub="first-answer attempts" icon={ShieldCheck} tone="gold" />
              <Stat label="Correct" value={summary.correct ?? 0} sub={`${summary.points ?? 0} points awarded`} icon={Search} tone="green" />
              <Stat label="Round status" value={state.round === 3 ? state.phase : 'closed'} sub="live server state" icon={ShieldCheck} tone="blue" />
            </>}
          </div>

          {round === 1 && (
            <>
              <Card title="CBT scripts" subtitle="Every candidate session and its stored score">
                {sessions.length ? (
                  <div className="probe-table-wrap">
                    <table className="probe-table">
                      <thead><tr><th>Candidate</th><th>School</th><th>Status</th><th>Score</th><th>Correct</th><th>Answered</th><th>Started</th><th>Submitted</th></tr></thead>
                      <tbody>
                        {sessions.map(s => (
                          <tr key={s.id}>
                            <td><strong>{s.name}</strong></td>
                            <td>{s.school}</td>
                            <td><Badge tone={s.status === 'submitted' ? 'green' : 'gold'}>{s.status}</Badge></td>
                            <td className="mono">{s.score}</td>
                            <td className="mono">{s.correct_count}/{s.total_questions}</td>
                            <td className="mono">{s.answered_count}</td>
                            <td className="small">{when(s.started_at)}</td>
                            <td className="small">{when(s.submitted_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <Empty title="No CBT scripts">Round 1 has not been started yet.</Empty>}
              </Card>

              <Card title="Probe a CBT answer sheet" subtitle="Question-by-question stored selections" actions={
                <select value={String(sessionId)} onChange={e => setSessionId(e.target.value)}>
                  <option value="">Choose a session…</option>
                  {sessions.map(s => <option key={s.id} value={String(s.id)}>{s.name} · {s.school}</option>)}
                </select>
              }>
                {selectedSession ? (
                  <div className="probe-table-wrap">
                    <table className="probe-table">
                      <thead><tr><th>Question</th><th>Topic</th><th>Selected</th><th>Correct</th><th>Result</th><th>Answered</th></tr></thead>
                      <tbody>
                        {selectedAnswers.map(a => (
                          <tr key={a.question_id}>
                            <td><strong>{a.prompt}</strong><small>{a.pdf_ref}</small></td>
                            <td>{a.topic}</td>
                            <td>{answerText(a)}</td>
                            <td>{correctText(a)}</td>
                            <td><Badge tone={a.is_correct ? 'green' : 'red'}>{a.is_correct ? 'correct' : 'wrong'}</Badge></td>
                            <td className="small">{when(a.answered_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!selectedAnswers.length && <p className="muted center">No answers stored for this candidate.</p>}
                  </div>
                ) : <Empty title="Choose a CBT session">Pick a candidate above to inspect their stored answers.</Empty>}
              </Card>
            </>
          )}

          {round === 2 && (
            <Card title="Round 2 picks" subtitle="Every number, question, response and score">
              {data.picks?.length ? (
                <div className="probe-table-wrap">
                  <table className="probe-table">
                    <thead><tr><th>Candidate</th><th>Stage</th><th>No.</th><th>Question</th><th>Selected</th><th>Correct</th><th>Result</th><th>Response</th><th>Points</th></tr></thead>
                    <tbody>
                      {data.picks.map(p => (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong><small>{p.school}</small></td>
                          <td>{p.stageNumber}{p.stage_label ? <small>{p.stage_label}</small> : null}</td>
                          <td className="mono">{p.number}</td>
                          <td>{p.prompt}<small>{p.pdf_ref}</small></td>
                          <td>{p.selected_index === null || p.selected_index === undefined ? 'No answer' : p.options?.[p.selected_index]}</td>
                          <td>{correctText(p)}</td>
                          <td><Badge tone={p.isCorrect ? 'green' : 'red'}>{p.isCorrect ? 'correct' : p.selected_index === null ? 'timeout' : 'wrong'}</Badge></td>
                          <td className="mono">{p.response_ms === null || p.response_ms === undefined ? '—' : `${(p.response_ms / 1000).toFixed(2)}s`}</td>
                          <td className="mono">{p.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No Round 2 picks">Round 2 has not recorded any answers yet.</Empty>}
            </Card>
          )}

          {round === 3 && (
            <Card title="Round 3 race answers" subtitle="First-answer attempts and their timing">
              {data.answers?.length ? (
                <div className="probe-table-wrap">
                  <table className="probe-table">
                    <thead><tr><th>Candidate</th><th>Question</th><th>Selected</th><th>Correct</th><th>Result</th><th>Response</th><th>Points</th><th>Stored</th></tr></thead>
                    <tbody>
                      {data.answers.map(a => (
                        <tr key={a.id}>
                          <td><strong>{a.name}</strong><small>{a.school}</small></td>
                          <td>{a.prompt}<small>{a.pdf_ref}</small></td>
                          <td>{a.selected_index === null || a.selected_index === undefined ? 'No answer' : a.options?.[a.selected_index]}</td>
                          <td>{correctText(a)}</td>
                          <td><Badge tone={a.isCorrect ? 'green' : 'red'}>{a.isCorrect ? 'correct' : 'wrong'}</Badge></td>
                          <td className="mono">{a.response_ms === null || a.response_ms === undefined ? '—' : `${(a.response_ms / 1000).toFixed(2)}s`}</td>
                          <td className="mono">{a.points}</td>
                          <td className="small">{when(a.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="No Round 3 answers">Round 3 has not recorded any race answers yet.</Empty>}
            </Card>
          )}

          <Card title="Round audit trail" subtitle="Server actions recorded for this round">
            {audit.length ? (
              <div className="probe-log">
                {audit.map(row => (
                  <div key={row.id} className="probe-log-row">
                    <Badge tone="blue">{row.action}</Badge>
                    <div><strong>{row.actor}</strong><small>{when(row.created_at)}</small></div>
                    <code>{row.detail || '—'}</code>
                  </div>
                ))}
              </div>
            ) : <Empty title="No audit entries">No round-specific audit actions have been recorded yet.</Empty>}
          </Card>
        </>
      )}
    </div>
  );
}
