import { config } from './config.js';

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

const system = `You create multiple-choice quiz questions. Return JSON only.
The object must have a "questions" array. Every item must have:
prompt (string), options (array of exactly 4 strings), correctIndex (0-3),
explanation (string), topic (string).
Never use "all of the above" or "none of the above". Exactly one option is correct.
Keep language clear for secondary school students.`;

export async function generateQuestions({ count = 5, pool = 'round1', topic = 'General', sourceText = '' }) {
  const n = Math.max(1, Math.min(30, Number(count) || 5));
  const content = await chat([
    { role: 'system', content: system },
    { role: 'user', content: `Generate ${n} ${pool} questions for the topic "${topic}". If source material is supplied, use only facts in it; otherwise use accurate general knowledge.\n\nSOURCE MATERIAL:\n${String(sourceText || '').slice(0, 12000)}` }
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
