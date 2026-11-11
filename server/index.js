import express from 'express';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { Server as SocketServer } from 'socket.io';
import { config } from './config.js';
import { GameEngine } from './game.js';
import { registerSockets } from './socket.js';
import { expressAuth, authenticateStaff, authenticateCandidate, signUser } from './auth.js';
import {
  db, transaction, getCandidates, getCandidateById, getQuestionById, makeCode, getQuestions,
  getLeaderboard, getSettings, setSettings, audit, getSchemaVersion
} from './db.js';
import { listQuestions, createQuestion, updateQuestion, deleteQuestion, assertQuestionEditable, importQuestions, listGroups, createGroup, updateGroup, deleteGroup, normalizeImportRow, bulkDeleteQuestions } from './questionAdmin.js';
import { generateQuestions, parseQuestionsWithAi } from './groq.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e6
});
const engine = new GameEngine(io);
fs.mkdirSync(config.uploadsDir, { recursive: true });
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '1d' }));

app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});


app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', schema: getSchemaVersion(), round: engine.state.round, phase: engine.state.phase, serverTime: Date.now() });
});

app.get('/api/state', (req, res) => res.json(engine.getPublicState()));
app.get('/api/leaderboard', (req, res) => res.json(getLeaderboard()));

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  const user = authenticateStaff(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  audit(user.username, 'auth.login', user.role);
  res.json({ token: signUser(user), user });
});

app.post('/api/auth/candidate', (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (code.length < 3 || code.length > 20) return res.status(400).json({ error: 'Enter your candidate code' });
  const user = authenticateCandidate(code);
  if (!user) return res.status(401).json({ error: 'That code is not valid. Ask the admin for your code.' });
  const candidate = getCandidateById(user.candidateId);
  res.json({
    token: signUser(user),
    user: { role: 'candidate', candidateId: candidate.id, name: candidate.name, school: candidate.school }
  });
});

app.get('/api/me', expressAuth(), (req, res) => {
  res.json({ user: req.user, candidate: req.candidate ? {
    id: req.candidate.id, name: req.candidate.name, school: req.candidate.school,
    qualified: !!req.candidate.qualified, code: req.candidate.code
  } : null });
});

/* ------------------------------- ADMIN API ------------------------------- */
app.get('/api/admin/candidates', expressAuth(['admin','scorekeeper']), (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = getCandidates({ includeInactive }).map(c => ({
    id: c.id, name: c.name, school: c.school, code: c.code,
    qualified: !!c.qualified, active: !!c.active, createdAt: c.created_at,
    online: engine.online.has(c.id)
  }));
  res.json(rows);
});

app.post('/api/admin/candidates', expressAuth(['admin']), (req, res) => {
  const name = String(req.body?.name || '').trim();
  const school = String(req.body?.school || '').trim();
  if (name.length < 2 || name.length > 120 || school.length < 2 || school.length > 160) {
    return res.status(400).json({ error: 'A valid name and school are required' });
  }
  const code = makeCode();
  const info = db.prepare('INSERT INTO candidates (name, school, code, qualified) VALUES (?, ?, ?, ?)')
    .run(name, school, code, req.body?.qualified ? 1 : 0);
  audit(req.user.username, 'candidate.create', { id: info.lastInsertRowid, name });
  engine.broadcast();
  res.status(201).json({ id: info.lastInsertRowid, code, name, school });
});

app.post('/api/admin/candidates/import', expressAuth(['admin']), (req, res) => {
  const csv = String(req.body?.csv || '').trim();
  if (!csv) return res.status(400).json({ error: 'Paste CSV rows with name,school' });
  const rows = parseCsv(csv);
  if (!rows.length) return res.status(400).json({ error: 'No rows found' });
  if (rows.length > 500) return res.status(400).json({ error: 'Import is limited to 500 rows at a time' });
  const created = [];
  const insert = db.prepare('INSERT INTO candidates (name, school, code) VALUES (?, ?, ?)');
  transaction(() => {
    for (const row of rows) {
      const name = (row.name || '').trim();
      const school = (row.school || '').trim();
      if (name.length < 2 || school.length < 2) continue;
      const code = makeCode();
      insert.run(name, school, code);
      created.push({ name, school, code });
    }
  });
  audit(req.user.username, 'candidate.import', { count: created.length });
  engine.broadcast();
  res.json({ created, count: created.length });
});

app.patch('/api/admin/candidates/:id', expressAuth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  const existing = getCandidateById(id);
  if (!existing) return res.status(404).json({ error: 'Candidate not found' });
  const patch = {};
  if (typeof req.body.name === 'string') patch.name = req.body.name.trim();
  if (typeof req.body.school === 'string') patch.school = req.body.school.trim();
  if (typeof req.body.qualified === 'boolean') patch.qualified = req.body.qualified ? 1 : 0;
  if (typeof req.body.active === 'boolean') patch.active = req.body.active ? 1 : 0;
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update' });
  const keys = Object.keys(patch);
  db.prepare(`UPDATE candidates SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`)
    .run(...keys.map(k => patch[k]), id);
  audit(req.user.username, 'candidate.update', { id, patch });
  engine.broadcast();
  res.json({ ok: true });
});

app.delete('/api/admin/candidates/:id', expressAuth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  const existing = getCandidateById(id);
  if (!existing) return res.status(404).json({ error: 'Candidate not found' });
  db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
  audit(req.user.username, 'candidate.delete', { id, name: existing.name });
  engine.broadcast();
  res.json({ ok: true });
});

app.post('/api/admin/candidates/:id/reset-round1', expressAuth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  if (!getCandidateById(id)) return res.status(404).json({ error: 'Candidate not found' });
  engine.resetCandidateRound1(id, req.user.username);
  res.json({ ok: true });
});

app.post('/api/admin/candidates/:id/regenerate-code', expressAuth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  if (!getCandidateById(id)) return res.status(404).json({ error: 'Candidate not found' });
  const code = makeCode();
  db.prepare('UPDATE candidates SET code = ? WHERE id = ?').run(code, id);
  audit(req.user.username, 'candidate.code', { id });
  engine.broadcast();
  res.json({ code });
});

app.post('/api/admin/upload', expressAuth(['admin']), (req, res) => {
  try {
    const { dataUrl, name } = req.body || {};
    const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Upload a PNG, JPEG, WEBP or GIF image' });
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[match[1]];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 3 * 1024 * 1024) return res.status(400).json({ error: 'Image must be under 3 MB' });
    const safe = path.parse(String(name || 'image')).name.replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || 'image';
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}.${ext}`;
    fs.writeFileSync(path.join(config.uploadsDir, filename), buffer);
    audit(req.user.username, 'brand.upload', { filename, bytes: buffer.length });
    res.json({ url: `/uploads/${filename}` });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/admin/groups', expressAuth(['admin','scorekeeper']), (req, res) => res.json(listGroups()));

app.post('/api/admin/groups', expressAuth(['admin']), (req, res) => {
  try {
    const group = createGroup(req.body || {});
    audit(req.user.username, 'group.create', { id: group.id, name: group.name });
    engine.broadcast();
    res.status(201).json(group);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.patch('/api/admin/groups/:id', expressAuth(['admin']), (req, res) => {
  try {
    const group = updateGroup(req.params.id, req.body || {});
    audit(req.user.username, 'group.update', { id: group.id });
    engine.broadcast();
    res.json(group);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/groups/:id', expressAuth(['admin']), (req, res) => {
  try {
    deleteGroup(req.params.id);
    audit(req.user.username, 'group.delete', { id: req.params.id });
    engine.broadcast();
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/questions/ai-generate', expressAuth(['admin']), async (req, res) => {
  try {
    const { mode = 'generate', count = 5, pool = 'round1', topic = 'General', sourceText = '', groupId = null } = req.body || {};
    if (!['generate','parse'].includes(mode)) throw new Error('Unknown AI mode');
    const items = mode === 'parse'
      ? await parseQuestionsWithAi(sourceText)
      : await generateQuestions({ count, pool, topic, sourceText });
    const created = [];
    const errors = [];
    for (const [index, item] of items.entries()) {
      try {
        const row = normalizeImportRow(item);
        created.push(createQuestion({
          ...row,
          pool: ['round1','round2','round3'].includes(row.pool) ? row.pool : pool,
          source: row.source === 'AI generated' ? `Groq AI · ${topic}` : row.source,
          pdfRef: row.pdfRef === 'AI generated' ? `Groq AI · ${new Date().toISOString().slice(0,10)}` : row.pdfRef,
          groupId
        }));
      } catch (err) { errors.push({ row: index + 1, error: err.message }); }
    }
    audit(req.user.username, 'question.ai', { mode, created: created.length, errors: errors.length, model: config.groqModel });
    engine.broadcast();
    res.json({ created, errors, model: config.groqModel });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/admin/questions/export', expressAuth(['admin','scorekeeper']), (req, res) => {
  const pool = req.query.pool;
  const group = req.query.group;
  const format = req.query.format === 'json' ? 'json' : 'csv';
  let rows = listQuestions();
  if (['round1','round2','round3'].includes(pool)) rows = rows.filter(q => q.pool === pool);
  if (group) rows = rows.filter(q => q.groupId === group);
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mssn-question-bank.json"');
    return res.send(JSON.stringify(rows, null, 2));
  }
  const header = ['id','pool','group','module','topic','prompt','optionA','optionB','optionC','optionD','correct','explanation','source','pdfRef'];
  const lines = [header.join(',')];
  const groups = new Map(listGroups().map(g => [g.id, g.name]));
  for (const q of rows) {
    lines.push([
      q.id, q.pool, groups.get(q.groupId) || '', q.module, q.topic, q.prompt,
      q.options[0], q.options[1], q.options[2], q.options[3], 'ABCD'[q.correctIndex],
      q.explanation, q.source, q.pdfRef
    ].map(csvCell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mssn-question-bank.csv"');
  res.send('\uFEFF' + lines.join('\r\n'));
});

app.get('/api/admin/questions', expressAuth(['admin','scorekeeper']), (req, res) => {
  const pool = req.query.pool;
  const rows = listQuestions();
  res.json(['round1','round2','round3'].includes(pool) ? rows.filter(q => q.pool === pool) : rows);
});

app.post('/api/admin/questions', expressAuth(['admin']), (req, res) => {
  try {
    const q = createQuestion(req.body || {});
    audit(req.user.username, 'question.create', { id: q.id, pool: q.pool });
    engine.broadcast();
    res.status(201).json(q);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.patch('/api/admin/questions/:id', expressAuth(['admin']), (req, res) => {
  try {
    const existing = getQuestionById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Question not found' });
    assertQuestionEditable(engine, existing);
    const q = updateQuestion(req.params.id, req.body || {});
    audit(req.user.username, 'question.update', { id: q.id });
    engine.broadcast();
    res.json(q);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete('/api/admin/questions/:id', expressAuth(['admin']), (req, res) => {
  try {
    const existing = getQuestionById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Question not found' });
    assertQuestionEditable(engine, existing);
    deleteQuestion(req.params.id);
    audit(req.user.username, 'question.delete', { id: req.params.id, prompt: existing.prompt });
    engine.broadcast();
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/questions/bulk-delete', expressAuth(['admin']), (req, res) => {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids)) throw new Error('ids must be an array');
    if (engine.state.round1.open) {
      const active = listQuestions().filter(q => ids.includes(q.id) && q.pool === 'round1');
      if (active.length) throw new Error('Round 1 is open. Close it before deleting CBT questions.');
    }
    if ((engine.state.round2.questionId && ids.includes(engine.state.round2.questionId)) ||
        (engine.state.round3.questionId && ids.includes(engine.state.round3.questionId))) {
      throw new Error('A selected question is currently on screen. End or advance the round first.');
    }
    const result = bulkDeleteQuestions(ids);
    audit(req.user.username, 'question.bulk_delete', { deleted: result.deleted.length, skipped: result.skipped.length });
    engine.broadcast();
    res.json(result);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/admin/questions/import', expressAuth(['admin']), (req, res) => {
  try {
    const result = importQuestions(req.body?.data || req.body?.csv || req.body?.json || '', req.body?.groupId || null);
    audit(req.user.username, 'question.import', { created: result.created.length, errors: result.errors.length });
    engine.broadcast();
    res.json({ created: result.created, errors: result.errors });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/admin/settings', expressAuth(['admin','scorekeeper']), (req, res) => res.json(getSettings()));

app.patch('/api/admin/settings', expressAuth(['admin']), (req, res) => {
  try {
    const current = getSettings();
    const allowed = new Set(Object.keys(current));
    const patch = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (!allowed.has(k)) continue;
      if (k === 'brand_background_url' || k === 'brand_logo_url' || k === 'sponsor_logo_url') {
        const url = String(v || '').trim();
        if (url && !/^(\/uploads\/|\/brand\/|https?:\/\/)/i.test(url)) throw new Error(`${k} must be an uploaded image or a valid URL`);
        patch[k] = url;
      } else if (k.startsWith('theme_')) {
        if (!/^#[0-9a-f]{6}$/i.test(String(v))) throw new Error(`${k} must be a 6-digit hex colour`);
        patch[k] = String(v);
      } else if (['round1_enabled','round2_enabled','round3_enabled'].includes(k)) {
        patch[k] = v ? 1 : 0;
      } else if (['round1_label','round2_label','round3_label'].includes(k)) {
        if (!String(v).trim() || String(v).length > 80) throw new Error(`${k} must be 1–80 characters`);
        patch[k] = String(v).trim();
      } else if (typeof current[k] === 'number') {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a non-negative number`);
        patch[k] = n;
      } else {
        patch[k] = String(v);
      }
    }
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'No valid settings supplied' });
    setSettings(patch);
    audit(req.user.username, 'settings.update', patch);
    engine.broadcast();
    res.json({ settings: getSettings() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/export.csv', expressAuth(['admin','scorekeeper']), (req, res) => {
  const lb = getLeaderboard();
  const rows = [
    ['Rank','Candidate','School','Round 1','Round 2','Round 3','Adjustments','Total','Qualified'],
    ...lb.map(x => [x.rank, x.name, x.school, x.round1, x.round2, x.round3, x.adjustments, x.total, x.qualified ? 'Yes' : 'No'])
  ];
  const csv = rows.map(r => r.map(csvCell).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mssn-ict-quiz-results.csv"');
  res.send('\uFEFF' + csv);
});

app.get('/api/admin/audit', expressAuth(['admin']), (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all());
});

app.get('/api/admin/state', expressAuth(['admin','scorekeeper']), (req, res) => res.json(engine.getAdminState()));

/* Candidate: current round1 package (also delivered by socket) */
app.get('/api/candidate/round1', expressAuth(['candidate']), (req, res) => {
  res.json(engine.round1CandidateState(req.candidate.id));
});

/* ------------------------------ SPA / STATIC ------------------------------ */
if (fs.existsSync(config.clientDist)) {
  app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(config.clientDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.type('text/plain').send('MSSN ICT Quiz Arena API is running. Run `npm run build` to serve the client, or use `npm run dev`.');
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Server error' });
});

registerSockets(io, engine);

server.listen(config.port, config.host, () => {
  console.log(`MSSN ICT Quiz Arena listening on http://${config.host}:${config.port}`);
  console.log(`Round: ${engine.state.round} · Phase: ${engine.state.phase}`);
  if (config.nodeEnv === 'production' && config.jwtSecret.startsWith('change-this')) {
    console.warn('WARNING: set a strong JWT_SECRET before exposing this server.');
  }
});

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const first = lines[0].toLowerCase();
  if (first.includes('name') && first.includes('school')) lines.shift();
  return lines.map(line => {
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return { name: cells[0] || '', school: cells[1] || '' };
  });
}

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
