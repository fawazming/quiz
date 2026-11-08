import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, Info } from 'lucide-react';
import { Card, Button, Spinner } from '../components/UI.jsx';
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

const PRESETS = [
  ['Emerald', '#0f5c4b', '#c39a2b', '#0c211d'],
  ['Royal blue', '#1d4ed8', '#e0a526', '#0b1733'],
  ['Maroon', '#7b2d3b', '#d6a84b', '#241014'],
  ['Plum', '#5b2a6e', '#e0b34c', '#1d1024'],
  ['Slate', '#334155', '#cbd5e1', '#0f172a']
];

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
  ['round3_wrong_penalty','Round 3 wrong-answer penalty','number']
];

export default function Settings() {
  const { push } = useToast();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/admin/settings').then(setSettings).catch(e => push(e.message, 'error'));
  }, []);
  if (!settings) return <Spinner label="Loading settings…" />;

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {};
      for (const [key, , type] of [...FIELDS, ...EXTRA_FIELDS]) {
        if (type === 'toggle') payload[key] = settings[key] ? 1 : 0;
        else if (type === 'number') payload[key] = Number(settings[key]);
        else payload[key] = settings[key];
      }
      const res = await api('/api/admin/settings', { method: 'PATCH', body: payload });
      setSettings(res.settings);
      push('Settings saved', 'success');
    } catch (err) { push(err.message, 'error'); }
    finally { setBusy(false); }
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
      </Card>

      <Card title="Round 2 · Pick a number" subtitle="Countdown, answer window and scoring">
        <div className="form-grid two">
          {FIELDS.slice(9, 14).map(([key,label,type]) => (
            <label key={key}><span>{label}</span><input type={type} min="0" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
        </div>
      </Card>

      <Card title="Round 3 · First to answer" subtitle="Race clock and speed scoring">
        <div className="form-grid two">
          {FIELDS.slice(14).map(([key,label,type]) => (
            <label key={key}><span>{label}</span><input type={type} min="0" value={settings[key] ?? ''} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /></label>
          ))}
        </div>
      </Card>

      <div className="sticky-actions">
        <div className="notice inline"><Info size={16} /><span>Changes apply when the next round or question starts. Disabled rounds are hidden from the admin navigation and cannot be started. Question counts are capped to the questions currently assigned to that pool.</span></div>
        <Button type="submit" loading={busy}><Save size={16} /> Save settings</Button>
      </div>
    </form>
  );
}
