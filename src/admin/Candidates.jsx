import React, { useEffect, useState } from 'react';
import { Plus, Upload, Search, Copy, RefreshCw, Trash2, CheckCircle2, Circle, UserX, UserCheck, RotateCcw, Printer } from 'lucide-react';
import { Card, Button, Badge, Modal, OnlineBadge, Spinner, Empty } from '../components/UI.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import { useBranding } from '../branding.jsx';

export default function Candidates({ adminState }) {
  const { user } = useAuth();
  const { push } = useToast();
  const { branding } = useBranding();
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

  async function resetCbt(row) {
    try {
      await api(`/api/admin/candidates/${row.id}/reset-round1`, { method: 'POST' });
      push(`CBT attempt reset for ${row.name}`, 'success');
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

  function printCodes() {
    const list = (filtered.length ? filtered : rows).filter(r => r.active);
    if (!list.length) return push('No active candidates to print', 'error');
    const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const origin = window.location.origin;
    const logo = branding.logoUrl ? (branding.logoUrl.startsWith('http') ? branding.logoUrl : origin + branding.logoUrl) : '';
    const sponsor = branding.showSponsor && branding.sponsorLogoUrl ? (branding.sponsorLogoUrl.startsWith('http') ? branding.sponsorLogoUrl : origin + branding.sponsorLogoUrl) : '';
    const cards = list.map((r, i) => `
      <article class="card">
        <div class="card-top"><span class="serial">Candidate ${i + 1} of ${list.length}</span><span class="event">${esc(branding.eventName)}</span></div>
        <div class="name">${esc(r.name)}</div>
        <div class="school">${esc(r.school)}</div>
        <div class="label">ACCESS CODE</div>
        <div class="code">${esc(r.code)}</div>
        <div class="hint">Open <strong>${esc(origin)}/join</strong> on your tablet and enter this code.</div>
      </article>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Candidate codes — ${esc(branding.eventName)}</title>
      <style>
        @page{size:A4;margin:11mm}
        *{box-sizing:border-box}
        body{font-family:Segoe UI,Arial,sans-serif;color:#0c211d;margin:0;padding:0}
        header{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:2px solid #0f5c4b;padding-bottom:8px;margin-bottom:8mm}
        .brand{display:flex;align-items:center;gap:8px}
        .brand img{height:28px;width:auto}
        .brand strong{display:block;font-size:13px;letter-spacing:.06em;text-transform:uppercase}
        .brand small{font-size:9px;color:#66766f}
        .meta{text-align:right;font-size:9px;color:#66766f}
        .meta strong{display:block;color:#0c211d;font-size:11px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
        .card{border:1.5px solid #0f5c4b;border-radius:10px;padding:10px 12px;break-inside:avoid;min-height:65mm;display:flex;flex-direction:column}
        .card-top{display:flex;justify-content:space-between;gap:8px;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#66766f}
        .name{font-size:22px;font-weight:800;line-height:1.1;margin-top:8px}
        .school{font-size:11px;color:#3f5650;margin-top:3px;min-height:14px}
        .label{font-size:8px;letter-spacing:.18em;font-weight:800;color:#0f5c4b;margin-top:auto;padding-top:8px}
        .code{font-family:Consolas,monospace;font-size:32px;letter-spacing:.18em;font-weight:800;background:#eff9f4;border:1px dashed #0f5c4b;border-radius:6px;padding:4px 8px;margin:2px 0 5px;text-align:center}
        .hint{font-size:8px;color:#66766f;line-height:1.35}
        footer{display:flex;justify-content:space-between;align-items:center;margin-top:8mm;padding-top:5px;border-top:1px solid #ccd9d2;font-size:8px;color:#66766f}
        footer img{height:16px}
      </style></head><body>
      <header><div class="brand">${logo ? `<img src="${logo}" alt="">` : ''}<div><strong>${esc(branding.org)}</strong><small>${esc(branding.appName)}</small></div></div><div class="meta"><strong>${esc(branding.eventName)}</strong>${esc(branding.eventDate)}<br>Candidate access codes</div></header>
      <div class="grid">${cards}</div>
      <footer><span>Keep this code private. Each code identifies one candidate.</span>${sponsor ? `<img src="${sponsor}" alt="${esc(branding.sponsorName)}">` : ''}</footer>
      </body></html>`;
    const win = window.open('', '_blank', 'width=900,height=760');
    if (!win) return push('Allow pop-ups to print candidate codes', 'error');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
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
            <Button variant="ghost" onClick={printCodes}><Printer size={16} /> Print codes</Button>
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
                        <button className="icon-btn" title="Reset CBT attempt" onClick={() => resetCbt(r)}><RotateCcw size={15} /></button>
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
