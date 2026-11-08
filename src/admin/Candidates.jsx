import React, { useEffect, useState } from 'react';
import { Plus, Upload, Search, Copy, RefreshCw, Trash2, CheckCircle2, Circle, UserX, UserCheck } from 'lucide-react';
import { Card, Button, Badge, Modal, OnlineBadge, Spinner, Empty } from '../components/UI.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';

export default function Candidates({ adminState }) {
  const { user } = useAuth();
  const { push } = useToast();
  const isAdmin = user.role === 'admin';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ name: '', school: '' });
  const [csv, setCsv] = useState('name,school\nAmina Yusuf,Remo Secondary School\n');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    try { setRows(await api('/api/admin/candidates?all=1')); }
    catch (e) { push(e.message, 'error'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (adminState) load(); }, [adminState?.candidates?.length]);

  const filtered = rows.filter(r =>
    `${r.name} ${r.school} ${r.code}`.toLowerCase().includes(search.toLowerCase())
  );

  async function addCandidate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api('/api/admin/candidates', { method: 'POST', body: form });
      push(`${created.name} added · code ${created.code}`, 'success');
      setForm({ name: '', school: '' });
      setShowAdd(false);
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function patch(row, patch, message) {
    try {
      await api(`/api/admin/candidates/${row.id}`, { method: 'PATCH', body: patch });
      push(message, 'success');
      await load();
    } catch (err) { push(err.message, 'error'); }
  }

  async function remove() {
    if (!deleteTarget) return;
    try {
      await api(`/api/admin/candidates/${deleteTarget.id}`, { method: 'DELETE' });
      push(`${deleteTarget.name} removed`, 'success');
      setDeleteTarget(null);
      await load();
    } catch (err) { push(err.message, 'error'); }
  }

  async function regenerate(row) {
    try {
      const res = await api(`/api/admin/candidates/${row.id}/regenerate-code`, { method: 'POST' });
      push(`New code for ${row.name}: ${res.code}`, 'success');
      await load();
    } catch (err) { push(err.message, 'error'); }
  }

  async function importCsv() {
    setBusy(true);
    try {
      const res = await api('/api/admin/candidates/import', { method: 'POST', body: { csv } });
      push(`${res.count} candidates imported`, 'success');
      setShowImport(false);
      await load();
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function copy(code) {
    try { await navigator.clipboard.writeText(code); push('Code copied', 'success'); }
    catch { push(`Code: ${code}`, 'info'); }
  }

  return (
    <div className="stack">
      <Card
        title="Candidates & tablet codes"
        subtitle={`${rows.length} registered · ${rows.filter(r => r.qualified).length} qualified`}
        actions={isAdmin ? (
          <>
            <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add candidate</Button>
            <Button variant="ghost" onClick={() => setShowImport(true)}><Upload size={16} /> Import CSV</Button>
          </>
        ) : <Button variant="ghost" onClick={load}><RefreshCw size={15} /> Refresh</Button>}
      >
        <div className="toolbar">
          <div className="search-box"><Search size={16} /><input placeholder="Search name, school or code…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Badge tone="blue">{filtered.length} shown</Badge>
        </div>
        {loading ? <Spinner label="Loading candidates…" /> : filtered.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Candidate</th><th>School</th><th>Code</th><th>Status</th><th>Qualified</th><th></th></tr></thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className={!r.active ? 'row-muted' : ''}>
                    <td><strong>{r.name}</strong><div><OnlineBadge online={r.online} /></div></td>
                    <td>{r.school}</td>
                    <td>
                      <button className="code-chip" onClick={() => copy(r.code)}>{r.code} <Copy size={12} /></button>
                    </td>
                    <td><Badge tone={r.active ? 'green' : 'grey'}>{r.active ? 'active' : 'inactive'}</Badge></td>
                    <td>
                      {isAdmin ? (
                        <button className={`toggle-pill ${r.qualified ? 'on' : ''}`} onClick={() => patch(r, { qualified: !r.qualified }, r.qualified ? 'Qualification removed' : 'Candidate qualified')}>
                          {r.qualified ? <CheckCircle2 size={14} /> : <Circle size={14} />} {r.qualified ? 'qualified' : 'not yet'}
                        </button>
                      ) : <Badge tone={r.qualified ? 'gold' : 'grey'}>{r.qualified ? 'qualified' : 'not yet'}</Badge>}
                    </td>
                    <td className="row-actions">
                      {isAdmin && <>
                        <button className="icon-btn" title="Regenerate code" onClick={() => regenerate(r)}><RefreshCw size={15} /></button>
                        <button className="icon-btn" title={r.active ? 'Deactivate' : 'Activate'} onClick={() => patch(r, { active: !r.active }, r.active ? 'Candidate deactivated' : 'Candidate activated')}>
                          {r.active ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                        <button className="icon-btn danger" title="Delete" onClick={() => setDeleteTarget(r)}><Trash2 size={15} /></button>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty title="No candidates found">Add candidates manually or import a CSV with name and school columns.</Empty>}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add candidate"
        footer={<><Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button><Button onClick={addCandidate} loading={busy}>Create &amp; generate code</Button></>}>
        <form className="form-grid" onSubmit={addCandidate}>
          <label><span>Full name</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required minLength={2} /></label>
          <label><span>School</span><input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} required minLength={2} /></label>
        </form>
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import candidates (CSV)" wide
        footer={<><Button variant="ghost" onClick={() => setShowImport(false)}>Cancel</Button><Button onClick={importCsv} loading={busy}><Upload size={15} /> Import</Button></>}>
        <p className="muted">Use columns <code>name,school</code>. A header row is optional. Each candidate gets a unique six-character code.</p>
        <textarea className="csv-box" rows={10} value={csv} onChange={e => setCsv(e.target.value)} />
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove candidate?"
        footer={<><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete permanently</Button></>}>
        <p>Delete <strong>{deleteTarget?.name}</strong> from {deleteTarget?.school}? Their CBT and round answers will also be deleted.</p>
      </Modal>
    </div>
  );
}
