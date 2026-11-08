import React, { useState } from 'react';
import { Download, SlidersHorizontal, Trophy, RefreshCw } from 'lucide-react';
import { Card, Button, Leaderboard, Modal, Badge } from '../components/UI.jsx';
import { useAction } from './shared.js';
import { useToast } from '../toast.jsx';
import { api } from '../api.js';

export default function Scores({ state }) {
  const { run, busy } = useAction();
  const { push } = useToast();
  const [adjust, setAdjust] = useState(false);
  const [form, setForm] = useState({ candidateId: '', round: 2, delta: 10, reason: '' });

  async function submitAdjust() {
    try {
      await run('score:adjust', {
        candidateId: Number(form.candidateId),
        round: Number(form.round),
        delta: Number(form.delta),
        reason: form.reason
      }, 'Score adjusted');
      setAdjust(false);
      setForm({ candidateId: '', round: 2, delta: 10, reason: '' });
    } catch {}
  }

  async function exportCsv() {
    try {
      const res = await api('/api/admin/export.csv', { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'mssn-ict-quiz-results.csv';
      a.click(); URL.revokeObjectURL(url);
      push('Results exported', 'success');
    } catch (e) { push(e.message, 'error'); }
  }

  return (
    <div className="stack">
      <div className="two-col score-top">
        <Card title="Overall standings" subtitle="Round 1 + Round 2 + Round 3 + manual adjustments" actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}><RefreshCw size={14} /> Refresh</Button>
            <Button variant="gold" size="sm" onClick={exportCsv}><Download size={14} /> CSV</Button>
          </>
        }>
          <Leaderboard rows={state.leaderboard} />
        </Card>
        <Card title="Score control" subtitle="Use sparingly, with a reason">
          <div className="score-rules">
            <div><Trophy size={18} /><span><strong>Round 1</strong> {state.settings.round1PointsPerCorrect} point(s) per correct answer</span></div>
            <div><Trophy size={18} /><span><strong>Round 2</strong> {state.settings.round2BasePoints} base + up to {state.settings.round2SpeedBonus} speed</span></div>
            <div><Trophy size={18} /><span><strong>Round 3</strong> {state.settings.round3BasePoints} base + up to {state.settings.round3SpeedBonus} speed</span></div>
          </div>
          <Button onClick={() => setAdjust(true)}><SlidersHorizontal size={16} /> Adjust a score</Button>
          <p className="muted small">Every adjustment is written to the audit log with the staff username and reason.</p>
        </Card>
      </div>

      <Card title="Manual adjustments" subtitle="Audit trail">
        <p className="muted">Adjustments are included in the total. Open a score adjustment to add points for a corrected answer or deduct points for a rules violation.</p>
        <div className="adjust-strip">
          {state.leaderboard.filter(r => r.adjustments !== 0).map(r => (
            <div key={r.id} className="adjust-chip"><strong>{r.name}</strong><Badge tone={r.adjustments > 0 ? 'green' : 'red'}>{r.adjustments > 0 ? '+' : ''}{r.adjustments}</Badge></div>
          ))}
          {!state.leaderboard.some(r => r.adjustments !== 0) && <span className="muted">No manual adjustments yet.</span>}
        </div>
      </Card>

      <Modal open={adjust} onClose={() => setAdjust(false)} title="Adjust a candidate score"
        footer={<><Button variant="ghost" onClick={() => setAdjust(false)}>Cancel</Button><Button onClick={submitAdjust} loading={busy === 'score:adjust'}>Apply adjustment</Button></>}>
        <div className="form-grid">
          <label><span>Candidate</span>
            <select value={form.candidateId} onChange={e => setForm({ ...form, candidateId: e.target.value })} required>
              <option value="">Choose candidate…</option>
              {state.candidates.map(c => <option key={c.id} value={c.id}>{c.name} · {c.school}</option>)}
            </select>
          </label>
          <label><span>Round</span>
            <select value={form.round} onChange={e => setForm({ ...form, round: e.target.value })}>
              <option value={1}>Round 1</option><option value={2}>Round 2</option><option value={3}>Round 3</option>
            </select>
          </label>
          <label><span>Points (+ or −)</span><input type="number" value={form.delta} onChange={e => setForm({ ...form, delta: e.target.value })} /></label>
          <label className="span-2"><span>Reason (required)</span><input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="e.g. corrected answer accepted after review" /></label>
        </div>
      </Modal>
    </div>
  );
}
