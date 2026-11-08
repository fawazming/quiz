import React, { useEffect, useMemo, useState } from 'react';
import { Search, Database, BookOpen, Eye, Plus, Upload, Pencil, Trash2, Save } from 'lucide-react';
import { Card, Badge, Modal, Spinner, Empty, Button } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { useAuth } from '../auth.jsx';

const EMPTY = {
  pool: 'round1', module: 1, topic: 'Custom', prompt: '',
  options: ['', '', '', ''], correctIndex: 0, explanation: '',
  source: 'Custom question', pdfRef: 'Custom'
};

export default function Questions() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try { setRows(await api('/api/admin/questions')); }
    catch (e) { push(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(q =>
    (pool === 'all' || q.pool === pool) &&
    `${q.prompt} ${q.topic} ${q.source} ${q.pdfRef}`.toLowerCase().includes(search.toLowerCase())
  ), [rows, pool, search]);

  const counts = useMemo(() => ({
    round1: rows.filter(q => q.pool === 'round1').length,
    round2: rows.filter(q => q.pool === 'round2').length,
    round3: rows.filter(q => q.pool === 'round3').length
  }), [rows]);

  function openNew() {
    setEditing('new');
    setForm(EMPTY);
  }
  function openEdit(q) {
    setEditing(q.id);
    setForm({ ...q, options: [...q.options] });
  }
  function setOption(index, value) {
    const options = [...form.options];
    options[index] = value;
    setForm({ ...form, options });
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        pool: form.pool, module: Number(form.module), topic: form.topic,
        prompt: form.prompt, options: form.options, correctIndex: Number(form.correctIndex),
        explanation: form.explanation, source: form.source, pdfRef: form.pdfRef
      };
      if (editing === 'new') await api('/api/admin/questions', { method: 'POST', body: payload });
      else await api(`/api/admin/questions/${editing}`, { method: 'PATCH', body: payload });
      push(editing === 'new' ? 'Question added' : 'Question updated', 'success');
      setEditing(null);
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function removeQuestion() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' });
      push('Question deleted', 'success');
      setDeleteTarget(null);
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function importQuestions() {
    setBusy(true);
    try {
      const res = await api('/api/admin/questions/import', { method: 'POST', body: { data: importText } });
      push(`${res.created.length} questions imported${res.errors.length ? ` · ${res.errors.length} skipped` : ''}`, res.errors.length ? 'info' : 'success');
      if (res.errors.length) console.warn('Import errors', res.errors);
      setShowImport(false);
      setImportText('');
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <Card title="Question bank" subtitle="Add, import, edit or remove questions. The original 94 are PDF-sourced; custom questions are yours."
        actions={isAdmin ? (
          <>
            <Button onClick={openNew}><Plus size={16} /> Add question</Button>
            <Button variant="ghost" onClick={() => setShowImport(true)}><Upload size={16} /> Import</Button>
          </>
        ) : null}>
        <div className="bank-summary">
          <div><Database size={18} /><strong>{rows.length}</strong><span>total questions</span></div>
          <div><span className="dot green" /><strong>{counts.round1}</strong><span>Round 1 pool</span></div>
          <div><span className="dot gold" /><strong>{counts.round2}</strong><span>Round 2 pool</span></div>
          <div><span className="dot red" /><strong>{counts.round3}</strong><span>Round 3 pool</span></div>
        </div>
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search prompt, topic or source…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="segmented">
            {['all','round1','round2','round3'].map(p => (
              <button key={p} className={pool === p ? 'active' : ''} onClick={() => setPool(p)}>{p === 'all' ? 'All' : p.replace('round','R')}</button>
            ))}
          </div>
        </div>
        {loading ? <Spinner label="Loading question bank…" /> : filtered.length ? (
          <div className="table-wrap">
            <table className="data-table question-table">
              <thead><tr><th>Question</th><th>Source</th><th>Pool</th><th>Answer</th><th></th></tr></thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td><strong className="clamp-2">{q.prompt}</strong><small>{q.topic} · {q.pdfRef}</small></td>
                    <td>{q.source}</td>
                    <td><Badge tone={q.pool === 'round1' ? 'green' : q.pool === 'round2' ? 'gold' : 'red'}>{q.pool}</Badge></td>
                    <td><strong>{'ABCD'[q.correctIndex]}</strong> · {q.options[q.correctIndex]?.slice(0, 42)}{q.options[q.correctIndex]?.length > 42 ? '…' : ''}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => setActive(q)} title="View"><Eye size={15} /></button>
                      {isAdmin && <>
                        <button className="icon-btn" onClick={() => openEdit(q)} title="Edit"><Pencil size={15} /></button>
                        <button className="icon-btn danger" onClick={() => setDeleteTarget(q)} title="Delete"><Trash2 size={15} /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No matching questions">Change the filter or add a question.</Empty>}
      </Card>

      <Modal open={!!active} onClose={() => setActive(null)} title={active?.source || 'Question'} wide>
        {active && (
          <div className="question-detail">
            <div className="q-meta"><Badge tone="gold">{active.pool}</Badge><Badge tone="blue">Module {active.module}</Badge><span>{active.pdfRef}</span></div>
            <h3 className="q-prompt">{active.prompt}</h3>
            <div className="detail-options">
              {active.options.map((o, i) => (
                <div key={i} className={`detail-option ${i === active.correctIndex ? 'correct' : ''}`}>
                  <b>{'ABCD'[i]}</b><span>{o}</span>
                </div>
              ))}
            </div>
            <div className="answer-note"><strong>Answer:</strong> {active.options[active.correctIndex]}<br /><span>{active.explanation}</span></div>
            <p className="muted small"><BookOpen size={13} /> Source: {active.source} · {active.pdfRef}</p>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Add question' : 'Edit question'} wide
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveQuestion} loading={busy}><Save size={15} /> Save question</Button></>}>
        <form className="form-grid two" onSubmit={saveQuestion}>
          <label><span>Pool</span>
            <select value={form.pool} onChange={e => setForm({ ...form, pool: e.target.value })}>
              <option value="round1">Round 1 · CBT</option>
              <option value="round2">Round 2 · Pick</option>
              <option value="round3">Round 3 · Race</option>
            </select>
          </label>
          <label><span>Module (1–3)</span><input type="number" min="1" max="3" value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} /></label>
          <label className="span-2"><span>Question prompt</span><textarea rows="3" value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required /></label>
          {['A','B','C','D'].map((letter, i) => (
            <label key={letter}><span>Option {letter}</span><input value={form.options[i]} onChange={e => setOption(i, e.target.value)} required /></label>
          ))}
          <label><span>Correct answer</span>
            <select value={form.correctIndex} onChange={e => setForm({ ...form, correctIndex: e.target.value })}>
              {['A','B','C','D'].map((l, i) => <option key={l} value={i}>{l}</option>)}
            </select>
          </label>
          <label><span>Topic</span><input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></label>
          <label><span>Source label</span><input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></label>
          <label><span>PDF / reference</span><input value={form.pdfRef} onChange={e => setForm({ ...form, pdfRef: e.target.value })} /></label>
          <label className="span-2"><span>Explanation</span><textarea rows="2" value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} /></label>
        </form>
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import questions" wide
        footer={<><Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button><Button onClick={importQuestions} loading={busy}><Upload size={15} /> Import</Button></>}>
        <p className="muted">Paste JSON or CSV. CSV header: <code>pool,prompt,optionA,optionB,optionC,optionD,correct,explanation,topic,source</code>. Use <code>round1</code>, <code>round2</code> or <code>round3</code> for the pool; correct is A–D.</p>
        <textarea className="csv-box" rows={12} value={importText} onChange={e => setImportText(e.target.value)} placeholder={`pool,prompt,optionA,optionB,optionC,optionD,correct,explanation,topic,source\nround1,What does CPU stand for?,Central processing unit,Computer power unit,Central program utility,Control processing unit,A,The CPU is the central processing unit.,Hardware,Custom`} />
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete question?"
        footer={<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={removeQuestion} loading={busy}>Delete question</Button></>}>
        <p>Delete this question? Questions already used in a round cannot be deleted until that round is reset.</p>
        <p className="small muted">{deleteTarget?.prompt}</p>
      </Modal>
    </div>
  );
}
