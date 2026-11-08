import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';
import { config } from './config.js';
import { GameEngine } from './game.js';
import { registerSockets } from './socket.js';
import { expressAuth, authenticateStaff, authenticateCandidate, signUser } from './auth.js';
import {
  db, transaction, getCandidates, getCandidateById, makeCode, getQuestions,
  getLeaderboard, getSettings, setSettings, audit
} from './db.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: true, credentials: true },
  maxHttpBufferSize: 1e6
});
const engine = new GameEngine(io);

app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const codeSchema = z.object({ code: z.string().min(3).max(20) });
const candidateSchema = z.object({
  name: z.string().min(2).max(120),
  school: z.string().min(2).max(160),
  qualified: z.boolean().optional(),
  active: z.boolean().optional()
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '1.0.0', round: engine.state.round, phase: engine.state.phase, serverTime: Date.now() });
});

app.get('/api/state', (req, res) => res.json(engine.getPublicState()));
app.get('/api/leaderboard', (req, res) => res.json(getLeaderboard()));

app.post('/api/auth/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Username and password are required' });
  const user = authenticateStaff(parsed.data.username, parsed.data.password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  audit(user.username, 'auth.login', user.role);
  res.json({ token: signUser(user), user });
});

app.post('/api/auth/candidate', (req, res) => {
  const parsed = codeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter your candidate code' });
  const user = authenticateCandidate(parsed.data.code);
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
  const parsed = candidateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Name and school are required' });
  const code = makeCode();
  const info = db.prepare('INSERT INTO candidates (name, school, code, qualified) VALUES (?, ?, ?, ?)')
    .run(parsed.data.name.trim(), parsed.data.school.trim(), code, parsed.data.qualified ? 1 : 0);
  audit(req.user.username, 'candidate.create', { id: info.lastInsertRowid, name: parsed.data.name });
  engine.broadcast();
  res.status(201).json({ id: info.lastInsertRowid, code, name: parsed.data.name.trim(), school: parsed.data.school.trim() });
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

app.post('/api/admin/candidates/:id/regenerate-code', expressAuth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  if (!getCandidateById(id)) return res.status(404).json({ error: 'Candidate not found' });
  const code = makeCode();
  db.prepare('UPDATE candidates SET code = ? WHERE id = ?').run(code, id);
  audit(req.user.username, 'candidate.code', { id });
  engine.broadcast();
  res.json({ code });
});

app.get('/api/admin/questions', expressAuth(['admin','scorekeeper']), (req, res) => {
  const pool = req.query.pool;
  const rows = getQuestions(['round1','round2','round3'].includes(pool) ? pool : null);
  res.json(rows.map(q => ({
    id: q.id, source: q.source, pdfRef: q.pdf_ref, module: q.module, topic: q.topic,
    prompt: q.prompt, options: q.options, correctIndex: q.correct_index,
    explanation: q.explanation, pool: q.pool
  })));
});

app.get('/api/admin/settings', expressAuth(['admin','scorekeeper']), (req, res) => res.json(getSettings()));

app.patch('/api/admin/settings', expressAuth(['admin']), (req, res) => {
  try {
    const allowed = new Set(Object.keys(getSettings()));
    const patch = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (!allowed.has(k)) continue;
      patch[k] = v;
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
