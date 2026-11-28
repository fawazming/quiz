import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './config.js';

let guideCache = null;

function studyGuide() {
  if (guideCache !== null) return guideCache;
  const dir = path.join(ROOT, 'data', 'guide');
  try {
    guideCache = fs.readdirSync(dir)
      .filter(file => file.endsWith('.md'))
      .sort()
      .map(file => {
        const text = fs.readFileSync(path.join(dir, file), 'utf8');
        return `# SOURCE: ${file}\n${text.split(/\n## Assessment Suite/)[0].trim()}`;
      })
      .join('\n\n');
  } catch { guideCache = ''; }
  return guideCache;
}

function relevantGuide(topic = '', extra = '') {
  const text = studyGuide();
  if (!text) return '';
  const words = new Set((`${topic} ${extra}`.toLowerCase().match(/[a-z0-9]{4,}/g) || []));
  const sections = text.split(/\n(?=## )/);
  const ranked = sections.map((section, index) => {
    const haystack = section.toLowerCase();
    let score = 0;
    for (const word of words) if (haystack.includes(word)) score += 1;
    return { section, index, score };
  }).sort((a, b) => (b.score - a.score) || (a.index - b.index));
  const chosen = [];
  let size = 0;
  for (const item of ranked) {
    if (size + item.section.length > 14000) continue;
    chosen.push(item);
    size += item.section.length;
    if (size >= 11000) break;
  }
  return (chosen.length ? chosen.sort((a, b) => a.index - b.index) : ranked.slice(0, 8))
    .map(item => item.section).join('\n\n').slice(0, 14000);
}

function extractJson(text) {
  const raw = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
  throw new Error('The AI response was not valid JSON');
}

async function chat(messages) {
  if (!config.groqApiKey) throw new Error('GROQ_API_KEY is not set on the server');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.groqApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages
    }),
    signal: AbortSignal.timeout(60000)
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch {}
    throw new Error(`Groq request failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

const system = `You create multiple-choice quiz questions with answers. Return JSON only.
The object must have a "questions" array. Every item must have:
prompt (string), options (array of exactly 4 strings), correctIndex (0-3),
explanation (string), topic (string).
Never use "all of the above" or "none of the above". Exactly one option is correct.
Every generated question must include its correct answer and an explanation.
When source material is supplied, every fact and answer must be supported by it. Do not invent facts.
Keep language clear for secondary school students.`;

export async function generateQuestions({ count = 5, pool = 'round1', topic = 'General', sourceText = '', useGuide = true }) {
  const n = Math.max(1, Math.min(30, Number(count) || 5));
  const guide = useGuide ? relevantGuide(topic, sourceText) : '';
  const material = [
    guide ? `STUDY GUIDE EXCERPTS (authoritative):\n${guide}` : '',
    sourceText ? `ADDITIONAL ADMIN NOTES:\n${String(sourceText).slice(0, 8000)}` : ''
  ].filter(Boolean).join('\n\n');
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: `Generate ${n} ${pool} questions with answers for the topic "${topic}". Use only facts supported by the source material below. Each question must have one correct answer and a short explanation grounded in the source.\n\nSOURCE MATERIAL:\n${material || 'No source supplied; use accurate general knowledge.'}` }
  ]);
  const parsed = extractJson(content);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list) || !list.length) throw new Error('The AI returned no questions');
  return list.slice(0, n);
}

export async function parseQuestionsWithAi(text) {
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: `Convert the following raw question data into the JSON format. Keep the original facts and answers. If a correct answer is not clear, infer it from the explanation. Return a "questions" array.\n\nRAW DATA:\n${String(text || '').slice(0, 14000)}` }
  ]);
  const parsed = extractJson(content);
  const list = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(list) || !list.length) throw new Error('The AI could not extract any questions');
  return list;
}
