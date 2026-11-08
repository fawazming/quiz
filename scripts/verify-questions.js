import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const questions = JSON.parse(fs.readFileSync(path.join(root, 'data', 'questions.json'), 'utf8'));
const pools = { round1: [], round2: [], round3: [] };
const ids = new Set();
const prompts = new Set();
let errors = 0;

for (const q of questions) {
  const fail = (msg) => { console.error(`✗ ${q.id}: ${msg}`); errors++; };
  if (!q.id || ids.has(q.id)) fail('missing or duplicate id'); else ids.add(q.id);
  if (!q.prompt || q.prompt.length < 8) fail('prompt too short');
  if (!Array.isArray(q.options) || q.options.length !== 4) fail('must have exactly 4 options');
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) fail('correctIndex must be 0–3');
  if (!q.explanation || q.explanation.length < 8) fail('explanation too short');
  if (!q.pdfRef || !q.source) fail('missing PDF provenance');
  if (!['round1','round2','round3'].includes(q.pool)) fail('invalid pool');
  else pools[q.pool].push(q);
  const normalized = q.prompt.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  if (prompts.has(normalized)) fail('duplicate prompt');
  prompts.add(normalized);
}

const expected = { round1: 50, round2: 22, round3: 22 };
for (const [pool, n] of Object.entries(expected)) {
  if (pools[pool].length !== n) {
    console.error(`✗ pool ${pool}: expected ${n}, found ${pools[pool].length}`);
    errors++;
  }
}
if (questions.length !== 94) {
  console.error(`✗ total questions: expected 94, found ${questions.length}`);
  errors++;
}

console.log(`Total: ${questions.length}`);
console.log(`Round 1: ${pools.round1.length} · Round 2: ${pools.round2.length} · Round 3: ${pools.round3.length}`);
console.log(`PDF-sourced entries: ${questions.filter(q => q.source.includes('PDF')).length}`);
if (errors) {
  console.error(`\n${errors} problem(s) found.`);
  process.exit(1);
}
console.log('Question bank is valid.');
