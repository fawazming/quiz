import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Info, Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { Card, Button, Spinner, Modal } from '../components/UI.jsx';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';

const EXTRA_FIELDS = [
  ['round1_enabled','Enable Round 1', 'toggle'],
  ['round2_enabled','Enable Round 2', 'toggle'],
  ['round3_enabled','Enable Round 3', 'toggle'],
  ['round1_label','Round 1 label', 'text'],
  ['round2_label','Round 2 label', 'text'],
  ['round3_label','Round 3 label', 'text'],
  ['theme_primary','Primary colour', 'color'],
  ['theme_accent','Accent colour', 'color'],
  ['theme_ink','Dark background', 'color']
];

const ROUND_GROUP_FIELDS = [
  ['round1_group_id','Round 1 question group'],
  ['round2_group_id','Round 2 question group'],
  ['round3_group_id','Round 3 question group']
];

const PARTNER_FIELDS = [
  ['tech_partner_name','Tech partner name','text'],
  ['tech_partner_url','Tech partner URL','text'],
  ['tech_partner_logo_url','Tech partner logo URL','text']
];

const BRAND_FIELDS = [
  ['brand_org','Organisation name','text'],
  ['brand_app_name','App name','text'],
  ['brand_logo_url','Organisation logo URL','text'],
  ['sponsor_logo_url','Sponsor logo URL','text'],
  ['brand_background_url','Background image URL','text']
];

const PRESETS = [
  ['Emerald', '#0f5c4b', '#c39a2b', '#0c211d'],
  ['Royal blue', '#1d4ed8', '#e0a526', '#0b1733'],
  ['Maroon', '#7b2d3b', '#d6a84b', '#241014'],
  ['Plum', '#5b2a6e', '#e0b34c', '#1d1024'],
  ['Slate', '#334155', '#cbd5e1', '#0f172a']
];

function parseStages(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

const FIELDS = [
  ['event_name','Event name','text'],
  ['event_theme','Theme','text'],
  ['event_date','Date','text'],
  ['sponsor_name','Sponsor name','text'],
  ['sponsor_url','Sponsor URL','text'],
  ['qualify_top_n','Qualify top N','number'],
  ['round1_question_count','Round 1 question count','number'],
  ['round1_duration_minutes','Round 1 duration (minutes)','number'],
  ['round1_points_per_correct','Round 1 points per correct','number'],
  ['countdown_seconds','Round 2 reveal countdown (seconds)','number'],
  ['round2_question_count','Round 2 number of questions','number'],
  ['round2_answer_seconds','Round 2 answer time (seconds)','number'],
  ['round2_base_points','Round 2 base points','number'],
  ['round2_speed_bonus','Round 2 max speed bonus','number'],
  ['round3_question_count','Round 3 question count','number'],
  ['round3_answer_seconds','Round 3 answer time (seconds)','number'],
  ['round3_base_points','Round 3 base points','number'],
  ['round3_speed_bonus','Round 3 max speed bonus','number'],
  ['round3_wrong_penalty','Round 3 wrong-answer penalty (points deducted)','number']
];

export default function Settings() {
  const { push } = useToast();
  const [settings, setSettings] = useState(null);
  const [groups, setGroups] = useState([]);
  const [r2Stages, setR2Stages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [databaseBusy, setDatabaseBusy] = useState('');
  useEffect(() => {
    Promise.all([api('/api/admin/settings'), api('/api/admin/groups')])
      .then(([s, g]) => { setSettings(s); setGroups(g); setR2Stages(parseStages(s.round2_stages)); })
      .catch(e => push(e.message, 'error'));
  }, []);
  if (!settings) return <Spinner label="Loading settings…" />;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {};
      for (const [key, , type] of [...FIELDS, ...EXTRA_FIELDS, ...BRAND_FIELDS, ...ROUND_GROUP_FIELDS, ...PARTNER_FIELDS]) {
        if (type === 'toggle') payload[key] = settings[key] ? 1 : 0;
        else if (type === 'number') payload[key] = Number(settings[key]);
        else payload[key] = settings[key];
      }
      payload.brand_show_sponsor = settings.brand_show_sponsor ? 1 : 0;
      payload.display_theme = settings.display_theme || 'light';
      payload.round1_shuffle = settings.round1_shuffle ? 1 : 0;
      payload.round3_auto_run = settings.round3_auto_run ? 1 : 0;
      payload.round3_auto_advance_seconds = Number(settings.round3_auto_advance_seconds || 5);
      payload.round2_qualify_top_n = Number(settings.round2_qualify_top_n || 4);
      payload.round2_qualify_basis = settings.round2_qualify_basis || 'total';
      payload.round3_unlock_delay_seconds = Number(settings.round3_unlock_delay_seconds || 0);
      payload.round2_stages = JSON.stringify(r2Stages.map(st => ({
        groupId: st.groupId || '',
        count: Number(st.count) || Number(settings.round2_question_count) || 1,
        label: st.label || ''
      })));
      const res = await api('/api/admin/settings', { method: 'PATCH', body: payload });
      setSettings(res.settings);
      setR2Stages(parseStages(res.settings.round2_stages));
      window.dispatchEvent(new Event('branding:refresh'));
      push('Settings saved', 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function upload(file, key) {
    if (!file) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api('/api/admin/upload', { method: 'POST', body: { dataUrl, name: file.name } });
      setSettings({ ...settings, [key]: res.url });
      push('Image uploaded — save settings to publish it', 'success');
    } catch (err) { push(err.message, 'error'); }
  }

  function addStage() {
    setR2Stages([...r2Stages, { groupId: '', count: Number(settings.round2_question_count) || 22, label: '' }]);
  }

  function updateStage(index, patch) {
    setR2Stages(r2Stages.map((stage, i) => i === index ? { ...stage, ...patch } : stage));
  }

  function removeStage(index) {
    setR2Stages(r2Stages.filter((_, i) => i !== index));
  }

  async function downloadSnapshot() {
    setDatabaseBusy('download');
    try {
      const res = await api('/api/admin/database/snapshot', { raw: true });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mssn-quiz-snapshot-${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
      URL.revokeObjectURL(url);
      push('Database snapshot downloaded', 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setDatabaseBusy(''); }
  }

  async function restoreSnapshot() {
    if (!restoreFile) return;
    setDatabaseBusy('restore');
    try {
      const token = localStorage.getItem('mssn_ict_token') || '';
      const res = await fetch('/api/admin/database/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
        body: restoreFile
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Restore failed (${res.status})`);
      setConfirmRestore(false);
      push('Snapshot loaded. Reloading the live arena…', 'success');
      setTimeout(() => window.location.reload(), 900);
    } catch (err) { push(err.message, 'error'); }
    finally { setDatabaseBusy(''); }
  }

  return (
    <form className="stack" onSubmit={save}>
      <Card title="Event identity" subtitle="Shown on the projector, login screens and exports">
        <div className="form-grid two">
          {FIELDS.slice(0, 5).map(([key,label,type]) => (
            <label key={key} className={key === 'event_theme' ? 'span-2' : ''}>
              <span>{label}</span>
              <input type={type} value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />
            </label>
          ))}
        </div>
      </Card>

      <Card title="Logo, background & names" subtitle="White-label the arena for any event">
        <div className="form-grid two">
          {BRAND_FIELDS.slice(0, 2).map(([key,label]) => (
            <label key={key}><span>{label}</span><input value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
          {BRAND_FIELDS.slice(2).map(([key,label]) => (
            <label key={key} className={key === 'brand_background_url' ? 'span-2' : ''}>
              <span>{label}</span>
              <div className="upload-line">
                <input value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} placeholder="/uploads/... or https://..." />
                <label className="file-btn">Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => upload(e.target.files?.[0], key)} /></label>
              </div>
            </label>
          ))}
        </div>
        <div className="partner-block">
          <div className="form-grid two">
            {PARTNER_FIELDS.slice(0, 2).map(([key,label]) => (
              <label key={key}><span>{label}</span><input value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
            ))}
            <label className="span-2"><span>Tech partner logo URL</span>
              <div className="upload-line">
                <input value={settings.tech_partner_logo_url ?? ''} onChange={e => setSettings({ ...settings, tech_partner_logo_url: e.target.value })} placeholder="/uploads/... or https://..." />
                <label className="file-btn">Upload<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => upload(e.target.files?.[0], 'tech_partner_logo_url')} /></label>
              </div>
            </label>
          </div>
        </div>
        <div className="brand-preview-row">
          {settings.brand_logo_url && <span className="brand-preview"><img src={settings.brand_logo_url} alt="Organisation logo preview" /><small>Organisation logo</small></span>}
          {settings.sponsor_logo_url && <span className="brand-preview"><img src={settings.sponsor_logo_url} alt="Sponsor logo preview" /><small>Sponsor logo</small></span>}
          {settings.tech_partner_logo_url && <span className="brand-preview"><img src={settings.tech_partner_logo_url} alt="Tech partner logo preview" /><small>Tech partner</small></span>}
          {settings.brand_background_url && <span className="brand-preview cover" style={{ backgroundImage: `url(${settings.brand_background_url})` }}><small>Background</small></span>}
        </div>
        <label className="check-line"><input type="checkbox" checked={!!settings.brand_show_sponsor} onChange={e => setSettings({ ...settings, brand_show_sponsor: e.target.checked ? 1 : 0 })} /> Show sponsor lockup in the header</label>
      </Card>

      <Card title="Rounds & branding" subtitle="Choose which stages your event uses and recolour the arena">
        <div className="round-toggle-grid">
          {EXTRA_FIELDS.slice(0, 3).map(([key,label]) => (
            <label key={key} className={`switch-card ${settings[key] ? 'is-on' : ''}`}>
              <input type="checkbox" checked={!!settings[key]} onChange={e => setSettings({ ...settings, [key]: e.target.checked ? 1 : 0 })} />
              <span><strong>{label}</strong><small>{key === 'round1_enabled' ? 'CBT / MCQ elimination' : key === 'round2_enabled' ? 'Pick-a-number round' : 'First-to-answer race'}</small></span>
            </label>
          ))}
        </div>
        <div className="form-grid two" style={{ marginTop: '14px' }}>
          {EXTRA_FIELDS.slice(3, 6).map(([key,label]) => (
            <label key={key}><span>{label}</span><input value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
          <label><span>Projector theme</span>
            <select value={settings.display_theme || 'light'} onChange={e => setSettings({ ...settings, display_theme: e.target.value })}>
              <option value="light">Light (recommended)</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <div className="form-grid two" style={{ marginTop: '12px' }}>
          {ROUND_GROUP_FIELDS.map(([key,label]) => (
            <label key={key}><span>{label}</span>
              <select value={settings[key] || ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })}>
                <option value="">All groups in this pool</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.questionCount})</option>)}
              </select>
            </label>
          ))}
        </div>
        <div className="theme-row">
          <div className="theme-preview" style={{ background: settings.theme_primary, borderColor: settings.theme_accent }} />
          {PRESETS.map(([name, primary, accent, ink]) => (
            <button type="button" key={name} className="preset-chip" onClick={() => setSettings({ ...settings, theme_primary: primary, theme_accent: accent, theme_ink: ink })}>
              <span style={{ background: primary }} /><span style={{ background: accent }} />{name}
            </button>
          ))}
        </div>
        <div className="form-grid two" style={{ marginTop: '12px' }}>
          {EXTRA_FIELDS.slice(6).map(([key,label]) => (
            <label key={key}><span>{label}</span><input type="color" value={settings[key] || '#000000'} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
        </div>
      </Card>

      <Card title="Qualification & Round 1" subtitle="CBT elimination">
        <div className="form-grid two">
          {FIELDS.slice(5, 9).map(([key,label,type]) => (
            <label key={key}><span>{label}</span><input type={type} min="1" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
        </div>
        <label className="check-line"><input type="checkbox" checked={!!settings.round1_shuffle} onChange={e => setSettings({ ...settings, round1_shuffle: e.target.checked ? 1 : 0 })} /> Shuffle questions differently for each CBT candidate</label>
      </Card>

      <Card title="Round 2 · Pick a number" subtitle="Countdown, answer window, scoring, stages and Round 3 qualification">
        <div className="form-grid two">
          {FIELDS.slice(9, 14).map(([key,label,type]) => (
            <label key={key}><span>{label}</span><input type={type} min="0" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
          <label><span>Round 3 qualifiers after Round 2</span><input type="number" min="1" max="500" value={settings.round2_qualify_top_n ?? 4} onChange={e => setSettings({ ...settings, round2_qualify_top_n: e.target.value })} /></label>
          <label><span>Qualify by</span>
            <select value={settings.round2_qualify_basis || 'total'} onChange={e => setSettings({ ...settings, round2_qualify_basis: e.target.value })}>
              <option value="total">Overall total</option>
              <option value="round2">Round 2 score</option>
              <option value="round1">Round 1 score</option>
            </select>
          </label>
        </div>
        <div className="stage-editor">
          <div className="stage-editor-head">
            <div>
              <strong>Multiple Round 2 stages</strong>
              <p>Optional. Each stage runs its own pick-a-number board for one question group. Leave empty to use the single group above.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addStage}>Add stage</Button>
          </div>
          {r2Stages.length ? (
            <div className="stage-rows">
              {r2Stages.map((stage, i) => (
                <div className="stage-row" key={i}>
                  <span className="stage-index">Stage {i + 1}</span>
                  <label><span>Question group</span>
                    <select value={stage.groupId || ''} onChange={e => updateStage(i, { groupId: e.target.value })}>
                      <option value="">All groups</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.questionCount})</option>)}
                    </select>
                  </label>
                  <label><span>Questions</span>
                    <input type="number" min="1" max="200" value={stage.count ?? settings.round2_question_count} onChange={e => updateStage(i, { count: e.target.value })} />
                  </label>
                  <button type="button" className="icon-btn danger" title="Remove stage" onClick={() => removeStage(i)}>×</button>
                </div>
              ))}
            </div>
          ) : <div className="notice inline"><Info size={16} /><span>No extra stages configured. Round 2 uses the single group and question count above.</span></div>}
          <p className="muted small">Stages run in order. The admin presses Next after the final reveal of each stage to move to the next group. Round 2 qualification uses all stages combined.</p>
        </div>
      </Card>

      <Card title="Round 3 · First to answer" subtitle="Read-in delay, race clock and speed scoring">
        <div className="form-grid two">
          {FIELDS.slice(14).map(([key,label,type]) => (
            <label key={key}><span>{label}</span><input type={type} min="0" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
          <label><span>Question read-in before answers unlock (seconds)</span><input type="number" min="0" max="120" value={settings.round3_unlock_delay_seconds ?? 5} onChange={e => setSettings({ ...settings, round3_unlock_delay_seconds: e.target.value })} /></label>
        </div>
        <p className="muted small">The question is displayed first while a countdown runs. The server rejects every answer until the read-in ends, then starts the race clock. Set 0 for immediate answering.</p>
        <div className="auto-run-row">
          <label className="check-line"><input type="checkbox" checked={!!settings.round3_auto_run} onChange={e => setSettings({ ...settings, round3_auto_run: e.target.checked ? 1 : 0 })} /> Auto-run Round 3 continuously</label>
          <label><span>Seconds on reveal before next</span><input type="number" min="1" max="60" value={settings.round3_auto_advance_seconds || 5} onChange={e => setSettings({ ...settings, round3_auto_advance_seconds: e.target.value })} /></label>
        </div>
      </Card>

      <Card title="Database snapshot" subtitle="Download or restore the complete competition database">
        <div className="database-actions">
          <Button type="button" variant="ghost" onClick={downloadSnapshot} loading={databaseBusy === 'download'}><Download size={16} /> Download snapshot</Button>
          <label className="file-btn"><Upload size={15} /> Choose snapshot<input type="file" accept=".db,.sqlite,.sqlite3,application/octet-stream" onChange={e => setRestoreFile(e.target.files?.[0] || null)} /></label>
          <Button type="button" variant="gold" disabled={!restoreFile} onClick={() => setConfirmRestore(true)} loading={databaseBusy === 'restore'}><Database size={16} /> Load snapshot</Button>
        </div>
        {restoreFile && <div className="notice inline"><Info size={16} /><span>Selected: <strong>{restoreFile.name}</strong> ({Math.ceil(restoreFile.size / 1024)} KB)</span></div>}
        <p className="muted small">A snapshot is a single SQLite file containing candidates, questions, settings, scores and the audit log. Loading a snapshot validates the file and schema, backs up the current database, then reloads the live arena. Use snapshots from the same app release.</p>
      </Card>

      <div className="sticky-actions">
        <div className="notice inline"><Info size={16} /><span>Changes apply when the next round or question starts. Disabled rounds are hidden from the admin navigation and cannot be started. Question counts are capped to the questions currently assigned to that pool.</span></div>
        <Button type="submit" loading={busy}><Save size={16} /> Save settings</Button>
      </div>

      <Modal open={confirmRestore} onClose={() => setConfirmRestore(false)} title="Load this database snapshot?"
        footer={<><Button type="button" variant="ghost" onClick={() => setConfirmRestore(false)}>Cancel</Button><Button type="button" variant="danger" onClick={restoreSnapshot} loading={databaseBusy === 'restore'}>Back up &amp; load snapshot</Button></>}>
        <div className="alert warning"><AlertTriangle size={16} /> This replaces the live candidates, questions, settings, scores, game state and staff accounts with the uploaded snapshot.</div>
        <p>The current database is backed up first in <code>data/backups/</code>. The arena will reload automatically after the snapshot is loaded.</p>
        <p className="muted small">Only load a snapshot you trust. Loading an incompatible or older schema is rejected.</p>
      </Modal>
    </form>
  );
}
