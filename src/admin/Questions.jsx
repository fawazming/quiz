import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Database, BookOpen, Eye, Plus, Upload, Pencil, Trash2, Save,
  Download, FolderPlus, Sparkles, Layers, X
} from 'lucide-react';
import { Card, Badge, Modal, Spinner, Empty, Button } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { useAuth } from '../auth.jsx';

const EMPTY = {
  pool: 'round1', module: 1, topic: 'Custom', prompt: '',
  options: ['', '', '', ''], correctIndex: 0, explanation: '',
  source: 'Custom question', pdfRef: 'Custom', groupId: ''
};

export default function Questions() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const { push } = useToast();
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pool, setPool] = useState('all');
  const [groupFilter, setGroupFilter] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importGroup, setImportGroup] = useState('');
  const [showGroups, setShowGroups] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [ai, setAi] = useState({ mode: 'generate', topic: 'General', count: 5, pool: 'round1', groupId: '', sourceText: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [qs, gs] = await Promise.all([api('/api/admin/questions'), api('/api/admin/groups')]);
      setRows(qs);
      setGroups(gs);
    } catch (e) { push(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const groupName = (id) => groups.find(g => g.id === id)?.name || '';
  const filtered = useMemo(() => rows.filter(q =>
    (pool === 'all' || q.pool === pool) &&
    (!groupFilter || q.groupId === groupFilter) &&
    `${q.prompt} ${q.topic} ${q.source} ${q.pdfRef} ${groupName(q.groupId)}`.toLowerCase().includes(search.toLowerCase())
  ), [rows, groups, pool, groupFilter, search]);

  const counts = useMemo(() => ({
    round1: rows.filter(q => q.pool === 'round1').length,
    round2: rows.filter(q => q.pool === 'round2').length,
    round3: rows.filter(q => q.pool === 'round3').length
  }), [rows]);

  function openNew() {
    setEditing('new');
    setForm({ ...EMPTY, groupId: groupFilter || '' });
  }
  function openEdit(q) {
    setEditing(q.id);
    setForm({ ...q, options: [...q.options], groupId: q.groupId || '' });
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
        explanation: form.explanation, source: form.source, pdfRef: form.pdfRef,
        groupId: form.groupId || null
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
      const res = await api('/api/admin/questions/import', { method: 'POST', body: { data: importText, groupId: importGroup || null } });
      push(`${res.created.length} questions imported${res.errors.length ? ` · ${res.errors.length} skipped` : ''}`, res.errors.length ? 'info' : 'success');
      setShowImport(false);
      setImportText('');
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function createGroup(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/admin/groups', { method: 'POST', body: groupForm });
      push('Group created', 'success');
      setGroupForm({ name: '', description: '' });
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function removeGroup(group) {
    try {
      await api(`/api/admin/groups/${group.id}`, { method: 'DELETE' });
      push(`Group "${group.name}" deleted`, 'success');
      if (groupFilter === group.id) setGroupFilter('');
      await load();
    } catch (err) { push(err.message, 'error'); }
  }

  async function exportQuestions(format) {
    try {
      const qs = new URLSearchParams({ format });
      if (pool !== 'all') qs.set('pool', pool);
      if (groupFilter) qs.set('group', groupFilter);
      const res = await api(`/api/admin/questions/export?${qs}`, { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `question-bank.${format}`;
      a.click(); URL.revokeObjectURL(url);
      push(`Exported ${format.toUpperCase()}`, 'success');
    } catch (err) { push(err.message, 'error'); }
  }

  async function runAi() {
    setBusy(true);
    try {
      const res = await api('/api/admin/questions/ai-generate', { method: 'POST', body: ai });
      push(`${res.created.length} AI questions added${res.errors.length ? ` · ${res.errors.length} skipped` : ''}`, res.errors.length ? 'info' : 'success');
      setAiOpen(false);
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <Card title="Question bank" subtitle="Group, import, export, generate and edit questions. Original 94 are PDF-sourced."
        actions={isAdmin ? (
          <>
            <Button onClick={openNew}><Plus size={16} /> Add</Button>
            <Button variant="ghost" onClick={() => setShowImport(true)}><Upload size={16} /> Import</Button>
            <Button variant="ghost" onClick={() => setShowGroups(true)}><Layers size={16} /> Groups</Button>
            <Button variant="ghost" onClick={() => setAiOpen(true)}><Sparkles size={16} /> AI</Button>
          </>
        ) : null}>
        <div className="bank-summary">
          <div><Database size={18} /><strong>{rows.length}</strong><span>total</span></div>
          <div><span className="dot green" /><strong>{counts.round1}</strong><span>Round 1</span></div>
          <div><span className="dot gold" /><strong>{counts.round2}</strong><span>Round 2</span></div>
          <div><span className="dot red" /><strong>{counts.round3}</strong><span>Round 3</span></div>
        </div>
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search prompt, topic, group or source…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="toolbar-right">
            <select className="compact-select" value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
              <option value="">All groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.questionCount})</option>)}
            </select>
            <div className="segmented">
              {['all','round1','round2','round3'].map(p => (
                <button key={p} className={pool === p ? 'active' : ''} onClick={() => setPool(p)}>{p === 'all' ? 'All' : p.replace('round','R')}</button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => exportQuestions('csv')}><Download size={14} /> CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => exportQuestions('json')}><Download size={14} /> JSON</Button>
          </div>
        </div>
        {loading ? <Spinner label="Loading question bank…" /> : filtered.length ? (
          <div className="table-wrap">
            <table className="data-table question-table">
              <thead><tr><th>Question</th><th>Source / group</th><th>Pool</th><th>Answer</th><th></th></tr></thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td><strong className="clamp-2">{q.prompt}</strong><small>{q.topic} · {q.pdfRef}</small></td>
                    <td>{q.source}<small>{groupName(q.groupId) || 'Ungrouped'}</small></td>
                    <td><Badge tone={q.pool === 'round1' ? 'green' : q.pool === 'round2' ? 'gold' : 'red'}>{q.pool}</Badge></td>
                    <td><strong>{'ABCD'[q.correctIndex]}</strong> · {q.options[q.correctIndex]?.slice(0, 40)}{q.options[q.correctIndex]?.length > 40 ? '…' : ''}</td>
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
        ) : <Empty title="No matching questions">Change the filter, add a question, or import a bank.</Empty>}
      </Card>

      <Modal open={!!active} onClose={() => setActive(null)} title={active?.source || 'Question'} wide>
        {active && (
          <div className="question-detail">
            <div className="q-meta"><Badge tone="gold">{active.pool}</Badge><Badge tone="blue">Module {active.module}</Badge><span>{groupName(active.groupId) || 'Ungrouped'} · {active.pdfRef}</span></div>
            <h3 className="q-prompt">{active.prompt}</h3>
            <div className="detail-options">
              {active.options.map((o, i) => (
                <div key={i} className={`detail-option ${i === active.correctIndex ? 'correct' : ''}`}><b>{'ABCD'[i]}</b><span>{o}</span></div>
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
              <option value="round1">Round 1 · CBT</option><option value="round2">Round 2 · Pick</option><option value="round3">Round 3 · Race</option>
            </select>
          </label>
          <label><span>Question group</span>
            <select value={form.groupId || ''} onChange={e => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Ungrouped</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <label><span>Module (1–3)</span><input type="number" min="1" max="3" value={form.module} onChange={e => setForm({ ...form, module: e.target.value })} /></label>
          <label><span>Topic</span><input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} /></label>
          <label className="span-2"><span>Question prompt</span><textarea rows="3" value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required /></label>
          {['A','B','C','D'].map((letter, i) => (
            <label key={letter}><span>Option {letter}</span><input value={form.options[i]} onChange={e => setOption(i, e.target.value)} required /></label>
          ))}
          <label><span>Correct answer</span><select value={form.correctIndex} onChange={e => setForm({ ...form, correctIndex: e.target.value })}>{['A','B','C','D'].map((l, i) => <option key={l} value={i}>{l}</option>)}</select></label>
          <label><span>Source label</span><input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></label>
          <label><span>PDF / reference</span><input value={form.pdfRef} onChange={e => setForm({ ...form, pdfRef: e.target.value })} /></label>
          <label className="span-2"><span>Explanation</span><textarea rows="2" value={form.explanation} onChange={e => setForm({ ...form, explanation: e.target.value })} /></label>
        </form>
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import questions" wide
        footer={<><Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button><Button onClick={importQuestions} loading={busy}><Upload size={15} /> Import</Button></>}>
        <p className="muted">Paste JSON or CSV. CSV header: <code>pool,prompt,optionA,optionB,optionC,optionD,correct,explanation,topic,source</code>. Correct is A–D.</p>
        <label className="form-inline"><span>Add to group</span>
          <select value={importGroup} onChange={e => setImportGroup(e.target.value)}><option value="">Ungrouped</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        </label>
        <textarea className="csv-box" rows={12} value={importText} onChange={e => setImportText(e.target.value)} placeholder={`pool,prompt,optionA,optionB,optionC,optionD,correct,explanation,topic,source\nround1,What does CPU stand for?,Central processing unit,Computer power unit,Central program utility,Control processing unit,A,The CPU is the central processing unit.,Hardware,Custom`} />
      </Modal>

      <Modal open={showGroups} onClose={() => setShowGroups(false)} title="Question groups" wide>
        <form className="inline-group-form" onSubmit={createGroup}>
          <input placeholder="Group name" value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} required />
          <input placeholder="Description (optional)" value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} />
          <Button type="submit" loading={busy}><FolderPlus size={15} /> Add group</Button>
        </form>
        <div className="group-list">
          {groups.map(g => (
            <div key={g.id} className="group-row">
              <span><strong>{g.name}</strong><small>{g.description || 'No description'} · {g.questionCount} questions</small></span>
              <button className="icon-btn danger" onClick={() => removeGroup(g)} title="Delete group (questions stay)"><Trash2 size={15} /></button>
            </div>
          ))}
          {!groups.length && <p className="muted">No groups yet. Create one to organise imported or AI-generated questions.</p>}
        </div>
      </Modal>

      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="AI question assistant · Groq" wide
        footer={<><Button variant="ghost" onClick={() => setAiOpen(false)}>Cancel</Button><Button onClick={runAi} loading={busy}><Sparkles size={15} /> Run AI</Button></>}>
        <div className="segmented" style={{ marginBottom: '14px' }}>
          <button className={ai.mode === 'generate' ? 'active' : ''} onClick={() => setAi({ ...ai, mode: 'generate' })}>Generate questions</button>
          <button className={ai.mode === 'parse' ? 'active' : ''} onClick={() => setAi({ ...ai, mode: 'parse' })}>Clean up my CSV/text</button>
        </div>
        <div className="form-grid two">
          <label><span>Topic</span><input value={ai.topic} onChange={e => setAi({ ...ai, topic: e.target.value })} /></label>
          <label><span>How many</span><input type="number" min="1" max="30" value={ai.count} onChange={e => setAi({ ...ai, count: e.target.value })} /></label>
          <label><span>Pool</span><select value={ai.pool} onChange={e => setAi({ ...ai, pool: e.target.value })}><option value="round1">Round 1</option><option value="round2">Round 2</option><option value="round3">Round 3</option></select></label>
          <label><span>Group</span><select value={ai.groupId} onChange={e => setAi({ ...ai, groupId: e.target.value })}><option value="">Ungrouped</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="span-2"><span>{ai.mode === 'parse' ? 'Raw CSV / text to clean' : 'Source material (optional)'}</span>
            <textarea className="csv-box" rows={ai.mode === 'parse' ? 10 : 6} value={ai.sourceText} onChange={e => setAi({ ...ai, sourceText: e.target.value })} placeholder={ai.mode === 'parse' ? 'Paste messy CSV or notes; Groq will convert it to valid questions.' : 'Paste the PDF section or notes the questions should be based on. Leave empty for general knowledge.'} />
          </label>
        </div>
        <p className="muted small"><Sparkles size={13} /> Requires <code>GROQ_API_KEY</code> on the server. Generated questions are saved immediately and can be edited or deleted.</p>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete question?"
        footer={<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={removeQuestion} loading={busy}>Delete question</Button></>}>
        <p>Delete this question? Used questions must be reset before deletion.</p><p className="small muted">{deleteTarget?.prompt}</p>
      </Modal>
    </div>
  );
}
