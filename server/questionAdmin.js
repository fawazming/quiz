import crypto from 'node:crypto';
import { db, getQuestionById, getQuestions } from './db.js';

const POOLS = ['round1', 'round2', 'round3'];

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeQuestion(input, { partial = false } = {}) {
  const out = {};
  if (!partial || input.prompt !== undefined) {
    const prompt = text(input.prompt);
    if (prompt.length < 5) throw new Error('Prompt must be at least 5 characters');
    out.prompt = prompt;
  }
  if (!partial || input.options !== undefined) {
    let options = input.options;
    if (!Array.isArray(options)) options = [input.optionA, input.optionB, input.optionC, input.optionD];
    options = (options || []).map(v => text(v));
    if (options.length !== 4 || options.some(v => !v)) throw new Error('Exactly four non-empty options are required');
    out.options = options;
  }
  if (!partial || input.correctIndex !== undefined || input.correct !== undefined) {
    let correct = input.correctIndex !== undefined ? input.correctIndex : input.correct;
    if (typeof correct === 'string' && /^[A-Da-d]$/.test(correct.trim())) correct = 'ABCD'.indexOf(correct.trim().toUpperCase());
    correct = Number(correct);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) throw new Error('Correct answer must be A–D or 0–3');
    out.correctIndex = correct;
  }
  if (!partial || input.pool !== undefined) {
    const pool = text(input.pool || 'round1');
    if (!POOLS.includes(pool)) throw new Error('Pool must be round1, round2 or round3');
    out.pool = pool;
  }
  if (!partial || input.explanation !== undefined) out.explanation = text(input.explanation) || 'No explanation supplied.';
  if (!partial || input.topic !== undefined) out.topic = text(input.topic) || 'Custom';
  if (!partial || input.source !== undefined) out.source = text(input.source) || 'Custom question';
  if (!partial || input.pdfRef !== undefined) out.pdfRef = text(input.pdfRef) || 'Custom';
  if (!partial || input.module !== undefined) {
    const module = Number(input.module ?? 1);
    out.module = [1,2,3].includes(module) ? module : 1;
  }
  if (!partial || input.groupId !== undefined) out.groupId = input.groupId ? String(input.groupId) : null;
  return out;
}

function nextSortOrder(pool) {
  const row = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS n FROM questions WHERE pool = ?').get(pool);
  return Number(row.n) + 1;
}

export function createQuestion(input) {
  const q = normalizeQuestion(input);
  const id = input.id && !db.prepare('SELECT 1 FROM questions WHERE id = ?').get(input.id)
    ? String(input.id) : `custom-${crypto.randomUUID()}`;
  db.prepare(`INSERT INTO questions
    (id, source, pdf_ref, module, topic, prompt, options_json, correct_index, explanation, pool, group_id, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, q.source, q.pdfRef, q.module, q.topic, q.prompt, JSON.stringify(q.options), q.correctIndex, q.explanation, q.pool, q.groupId || null, nextSortOrder(q.pool));
  return getQuestionById(id);
}

export function updateQuestion(id, input) {
  const existing = getQuestionById(id);
  if (!existing) throw new Error('Question not found');
  const q = normalizeQuestion(input, { partial: true });
  const fields = [];
  const values = [];
  if (q.prompt !== undefined) { fields.push('prompt = ?'); values.push(q.prompt); }
  if (q.options !== undefined) { fields.push('options_json = ?'); values.push(JSON.stringify(q.options)); }
  if (q.correctIndex !== undefined) { fields.push('correct_index = ?'); values.push(q.correctIndex); }
  if (q.pool !== undefined) { fields.push('pool = ?'); values.push(q.pool); if (q.pool !== existing.pool) { fields.push('sort_order = ?'); values.push(nextSortOrder(q.pool)); } }
  if (q.explanation !== undefined) { fields.push('explanation = ?'); values.push(q.explanation); }
  if (q.topic !== undefined) { fields.push('topic = ?'); values.push(q.topic); }
  if (q.source !== undefined) { fields.push('source = ?'); values.push(q.source); }
  if (q.pdfRef !== undefined) { fields.push('pdf_ref = ?'); values.push(q.pdfRef); }
  if (q.module !== undefined) { fields.push('module = ?'); values.push(q.module); }
  if (q.groupId !== undefined) { fields.push('group_id = ?'); values.push(q.groupId); }
  if (!fields.length) throw new Error('Nothing to update');
  db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
  return getQuestionById(id);
}

export function deleteQuestion(id) {
  const existing = getQuestionById(id);
  if (!existing) throw new Error('Question not found');
  const used = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM round1_answers WHERE question_id = ?) +
      (SELECT COUNT(*) FROM round2_picks WHERE question_id = ?) +
      (SELECT COUNT(*) FROM round3_answers WHERE question_id = ?) AS n
  `).get(id, id, id).n;
  if (used > 0) throw new Error('This question has already been used. Reset the relevant round before deleting it.');
  db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  return existing;
}

export function assertQuestionEditable(engine, question) {
  if (!question) return;
  if (engine.state.round2.questionId === question.id || engine.state.round3.questionId === question.id) {
    throw new Error('This question is currently on screen. End or advance the round first.');
  }
  if (engine.state.round1.open && question.pool === 'round1') {
    throw new Error('Round 1 is open. Close it before editing or deleting CBT questions.');
  }
  const used = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM round1_answers WHERE question_id = ?) +
      (SELECT COUNT(*) FROM round2_picks WHERE question_id = ?) +
      (SELECT COUNT(*) FROM round3_answers WHERE question_id = ?) AS n
  `).get(question.id, question.id, question.id).n;
  if (used > 0) throw new Error('This question has already been used. Reset the relevant round before editing it.');
}

export function importQuestions(raw, groupId = null) {
  const input = String(raw ?? '').trim();
  if (!input) throw new Error('Paste JSON or CSV question data');
  let rows;
  if (input.startsWith('[')) {
    rows = JSON.parse(input);
    if (!Array.isArray(rows)) throw new Error('JSON must be an array of questions');
  } else {
    rows = parseCsv(input);
  }
  if (!rows.length) throw new Error('No questions found');
  if (rows.length > 1000) throw new Error('Import is limited to 1,000 questions at a time');
  const created = [];
  const errors = [];
  for (const [index, row] of rows.entries()) {
    try {
      created.push(createQuestion({ ...normalizeImportRow(row), groupId }));
    } catch (err) {
      errors.push({ row: index + 1, error: err.message });
    }
  }
  return { created, errors };
}

export function normalizeImportRow(row) {
  if (Array.isArray(row)) {
    return {
      pool: row[0], prompt: row[1], options: [row[2], row[3], row[4], row[5]],
      correct: row[6], explanation: row[7], topic: row[8], source: row[9], pdfRef: row[10], module: row[11]
    };
  }
  if (Array.isArray(row.options)) {
    return {
      pool: row.pool || 'round1', prompt: row.prompt || row.question,
      options: row.options, correct: row.correctIndex ?? row.correct ?? row.answer,
      explanation: row.explanation, topic: row.topic,
      source: row.source || 'AI generated', pdfRef: row.pdfRef || 'AI generated', module: row.module || 1
    };
  }
  const get = (name) => {
    const key = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z]/g, '') === name);
    return key ? row[key] : undefined;
  };
  return {
    pool: get('pool') || get('round') || 'round1',
    prompt: get('prompt') || get('question'),
    options: [get('optiona') || get('a'), get('optionb') || get('b'), get('optionc') || get('c'), get('optiond') || get('d')],
    correct: get('correct') ?? get('correctindex') ?? get('answer'),
    explanation: get('explanation') || get('why'),
    topic: get('topic') || get('chapter'),
    source: get('source') || 'Imported question',
    pdfRef: get('pdfref') || get('reference') || 'Custom',
    module: get('module') || 1
  };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
}

function splitCsvLine(line) {
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
  return cells;
}

export function bulkDeleteQuestions(ids) {
  const unique = [...new Set((ids || []).map(String))].slice(0, 1000);
  if (!unique.length) throw new Error('Select at least one question');
  const deleted = [];
  const skipped = [];
  for (const id of unique) {
    const q = getQuestionById(id);
    if (!q) { skipped.push({ id, reason: 'Not found' }); continue; }
    try {
      const used = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM round1_answers WHERE question_id = ?) +
          (SELECT COUNT(*) FROM round2_picks WHERE question_id = ?) +
          (SELECT COUNT(*) FROM round3_answers WHERE question_id = ?) AS n
      `).get(id, id, id).n;
      if (used > 0) { skipped.push({ id, reason: 'Already used in a round' }); continue; }
      db.prepare('DELETE FROM questions WHERE id = ?').run(id);
      deleted.push(id);
    } catch (err) { skipped.push({ id, reason: err.message }); }
  }
  return { deleted, skipped };
}

export function listGroups() {
  return db.prepare(`SELECT g.*, (SELECT COUNT(*) FROM questions q WHERE q.group_id = g.id) AS questionCount
    FROM question_groups g ORDER BY g.name COLLATE NOCASE`).all();
}

export function createGroup(input) {
  const name = text(input.name);
  if (!name || name.length > 80) throw new Error('Group name must be 1–80 characters');
  const id = `group-${crypto.randomUUID()}`;
  db.prepare('INSERT INTO question_groups (id, name, description) VALUES (?, ?, ?)')
    .run(id, name, text(input.description));
  return db.prepare('SELECT * FROM question_groups WHERE id = ?').get(id);
}

export function updateGroup(id, input) {
  const existing = db.prepare('SELECT * FROM question_groups WHERE id = ?').get(id);
  if (!existing) throw new Error('Group not found');
  const name = text(input.name ?? existing.name);
  if (!name || name.length > 80) throw new Error('Group name must be 1–80 characters');
  db.prepare('UPDATE question_groups SET name = ?, description = ? WHERE id = ?')
    .run(name, text(input.description ?? existing.description), id);
  return db.prepare('SELECT * FROM question_groups WHERE id = ?').get(id);
}

export function deleteGroup(id) {
  const existing = db.prepare('SELECT * FROM question_groups WHERE id = ?').get(id);
  if (!existing) throw new Error('Group not found');
  db.prepare('UPDATE questions SET group_id = NULL WHERE group_id = ?').run(id);
  db.prepare('DELETE FROM question_groups WHERE id = ?').run(id);
  return existing;
}

export function listQuestions() {
  return getQuestions().map(q => ({
    id: q.id, source: q.source, pdfRef: q.pdf_ref, module: q.module, topic: q.topic,
    prompt: q.prompt, options: q.options, correctIndex: q.correct_index,
    explanation: q.explanation, pool: q.pool, groupId: q.group_id || null
  }));
}
