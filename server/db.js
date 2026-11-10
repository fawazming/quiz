import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { config, SETTINGS_DEFAULTS, NUMERIC_SETTINGS } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;');

export function transaction(fn) {
  db.exec('BEGIN');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (err) { db.exec('ROLLBACK'); throw err; }
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','scorekeeper')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  school TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  qualified INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  pdf_ref TEXT NOT NULL,
  module INTEGER NOT NULL DEFAULT 1,
  topic TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  explanation TEXT NOT NULL,
  pool TEXT NOT NULL CHECK (pool IN ('round1','round2','round3')),
  group_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS round1_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  deadline_at INTEGER NOT NULL,
  submitted_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','submitted','expired')),
  score INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS round1_answers (
  session_id INTEGER NOT NULL REFERENCES round1_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  selected_index INTEGER,
  is_correct INTEGER NOT NULL DEFAULT 0,
  answered_at INTEGER NOT NULL,
  PRIMARY KEY (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS round2_picks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  question_id TEXT NOT NULL REFERENCES questions(id),
  selected_index INTEGER,
  is_correct INTEGER,
  response_ms INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (question_id)
);

CREATE TABLE IF NOT EXISTS round3_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL UNIQUE REFERENCES questions(id),
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  selected_index INTEGER,
  is_correct INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS score_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round INTEGER NOT NULL CHECK (round BETWEEN 1 AND 3),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_candidates_code ON candidates(code);
CREATE INDEX IF NOT EXISTS idx_questions_pool ON questions(pool, sort_order);
CREATE INDEX IF NOT EXISTS idx_round2_candidate ON round2_picks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_round3_candidate ON round3_answers(candidate_id);
`);

const questionColumns = db.prepare('PRAGMA table_info(questions)').all();
if (!questionColumns.some(c => c.name === 'group_id')) db.exec('ALTER TABLE questions ADD COLUMN group_id TEXT');

function seedUser(username, password, role) {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return;
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, bcrypt.hashSync(password, 10), role);
}

seedUser(config.adminUsername, config.adminPassword, 'admin');
seedUser(config.scorekeeperUsername, config.scorekeeperPassword, 'scorekeeper');

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) insertSetting.run(key, String(value));

const questions = JSON.parse(fs.readFileSync(config.questionsFile, 'utf8'));
const upsertQuestion = db.prepare(`
  INSERT INTO questions (id, source, pdf_ref, module, topic, prompt, options_json, correct_index, explanation, pool, group_id, sort_order)
  VALUES (@id, @source, @pdf_ref, @module, @topic, @prompt, @options_json, @correct_index, @explanation, @pool, @group_id, @sort_order)
  ON CONFLICT(id) DO NOTHING
`);
const seedQuestions = (list) => transaction(() => {
  for (const q of list) {
    upsertQuestion.run({
      id: q.id, source: q.source, pdf_ref: q.pdfRef, module: q.module, topic: q.topic,
      prompt: q.prompt, options_json: JSON.stringify(q.options), correct_index: q.correctIndex,
      explanation: q.explanation, pool: q.pool, group_id: q.groupId || null, sort_order: q.sortOrder
    });
  }
});
const existingQuestionCount = db.prepare('SELECT COUNT(*) AS n FROM questions').get().n;
if (existingQuestionCount === 0) seedQuestions(questions);

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out = { ...SETTINGS_DEFAULTS };
  for (const row of rows) {
    out[row.key] = NUMERIC_SETTINGS.has(row.key) ? Number(row.value) : row.value;
  }
  return out;
}

export function setSetting(key, value) {
  if (!(key in SETTINGS_DEFAULTS)) throw new Error(`Unknown setting: ${key}`);
  const text = NUMERIC_SETTINGS.has(key) ? String(Number(value)) : String(value);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, text);
}

export function setSettings(patch) {
  transaction(() => {
    for (const [k, v] of Object.entries(patch)) setSetting(k, v);
  });
}

export function defaultGameState() {
  return {
    round: 0,
    phase: 'lobby',
    round1: { open: false, startedAt: null, endsAt: null },
    round2: {
      phase: 'idle', order: [], turnIndex: 0, activeCandidateId: null,
      numbers: {}, pickedNumbers: [], totalNumbers: 0, activeNumber: null,
      questionId: null, startedAt: null, countdownEndsAt: null, deadlineAt: null,
      reveal: null, answerSeconds: 60, countdownSeconds: 5
    },
    round3: {
      phase: 'idle', questionIds: [], index: -1, questionId: null,
      startedAt: null, deadlineAt: null, reveal: null, eligibleIds: [], answerSeconds: 30
    },
    updatedAt: Date.now()
  };
}

export function getGameState() {
  const row = db.prepare('SELECT json FROM game_state WHERE id = 1').get();
  if (!row) {
    const state = defaultGameState();
    saveGameState(state);
    return state;
  }
  try {
    return { ...defaultGameState(), ...JSON.parse(row.json) };
  } catch {
    const state = defaultGameState();
    saveGameState(state);
    return state;
  }
}

export function saveGameState(state) {
  state.updatedAt = Date.now();
  db.prepare(`INSERT INTO game_state (id, json, updated_at) VALUES (1, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`)
    .run(JSON.stringify(state));
}

export function publicCandidate(c) {
  return { id: c.id, name: c.name, school: c.school, qualified: !!c.qualified, active: !!c.active };
}

export function getCandidates({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE active = 1';
  return db.prepare(`SELECT * FROM candidates ${where} ORDER BY name COLLATE NOCASE`).all();
}

export function getCandidateById(id) {
  return db.prepare('SELECT * FROM candidates WHERE id = ?').get(id) || null;
}

export function getCandidateByCode(code) {
  return db.prepare('SELECT * FROM candidates WHERE code = ? AND active = 1').get(String(code).trim().toUpperCase()) || null;
}

export function getQuestions(pool = null) {
  const rows = pool
    ? db.prepare('SELECT * FROM questions WHERE pool = ? ORDER BY sort_order').all(pool)
    : db.prepare('SELECT * FROM questions ORDER BY pool, sort_order').all();
  return rows.map(q => ({ ...q, options: JSON.parse(q.options_json), correctIndex: q.correct_index }));
}

export function getQuestionById(id) {
  const q = db.prepare('SELECT * FROM questions WHERE id = ?').get(id);
  if (!q) return null;
  return { ...q, options: JSON.parse(q.options_json), correctIndex: q.correct_index };
}

export function getLeaderboard() {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.school, c.qualified, c.active,
      COALESCE((SELECT score FROM round1_sessions s WHERE s.candidate_id=c.id AND s.status='submitted'),0) AS round1,
      COALESCE((SELECT SUM(points) FROM round2_picks p WHERE p.candidate_id=c.id),0) AS round2,
      COALESCE((SELECT SUM(points) FROM round3_answers r WHERE r.candidate_id=c.id),0) AS round3,
      COALESCE((SELECT SUM(delta) FROM score_adjustments a WHERE a.candidate_id=c.id),0) AS adjustments
    FROM candidates c
    WHERE c.active = 1
    ORDER BY (round1 + round2 + round3 + adjustments) DESC, round3 DESC, round2 DESC, c.name COLLATE NOCASE
  `).all();
  return rows.map((r, i) => ({
    rank: i + 1, id: r.id, name: r.name, school: r.school,
    qualified: !!r.qualified, round1: r.round1, round2: r.round2, round3: r.round3,
    adjustments: r.adjustments, total: r.round1 + r.round2 + r.round3 + r.adjustments
  }));
}

export function audit(actor, action, detail = '') {
  const text = typeof detail === 'string' ? detail : JSON.stringify(detail);
  db.prepare('INSERT INTO audit_log (actor, action, detail) VALUES (?, ?, ?)').run(actor, action, text);
}

export function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!db.prepare('SELECT 1 FROM candidates WHERE code = ?').get(code)) return code;
  }
  throw new Error('Could not generate a unique candidate code');
}
