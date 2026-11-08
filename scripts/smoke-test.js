import { io } from 'socket.io-client';

const base = 'http://localhost:3100';
const fetchJson = async (path, opts = {}) => {
  const res = await fetch(base + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${path}: ${data.error || res.status}`);
  return data;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function connect(token, display = false) {
  return new Promise((resolve, reject) => {
    const s = io(base, { auth: display ? { display: true } : { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}
function ack(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (err, res) => {
      if (err) return reject(new Error(`${event}: timeout`));
      if (!res?.ok) return reject(new Error(`${event}: ${res?.error || 'failed'}`));
      resolve(res);
    });
  });
}

const admin = await fetchJson('/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'MSSN2026!' })
});
const adminSocket = await connect(admin.token);
const displaySocket = await connect(null, true);
let lastState = null;
displaySocket.on('state:update', s => { lastState = s; });

const names = ['Smoke One', 'Smoke Two'];
const candidates = [];
for (const [i, name] of names.entries()) {
  const c = await fetchJson('/api/admin/candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
    body: JSON.stringify({ name, school: `School ${i + 1}` })
  });
  candidates.push(c);
}
const tokens = [];
for (const c of candidates) {
  const login = await fetchJson('/api/auth/candidate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: c.code })
  });
  tokens.push(login.token);
}
const s1 = await connect(tokens[0]);
const s2 = await connect(tokens[1]);
let r1 = null;
s1.on('round1:sync', s => { r1 = s; });

await ack(adminSocket, 'round1:open');
await sleep(250);
await ack(s1, 'round1:start');
await sleep(250);
if (!r1?.questions?.length) throw new Error('No Round 1 questions delivered');
await ack(s1, 'round1:answer', { questionId: r1.questions[0].id, selectedIndex: 0 });
await ack(s1, 'round1:answer', { questionId: r1.questions[1].id, selectedIndex: 1 });
await ack(s1, 'round1:submit');
await ack(s2, 'round1:start');
await ack(s2, 'round1:answer', { questionId: r1.questions[0].id, selectedIndex: 2 });
await ack(s2, 'round1:submit');
await ack(adminSocket, 'round1:close');
await ack(adminSocket, 'round1:qualify', { count: 2 });
console.log('Round 1 OK, state:', lastState?.phase, 'submitted:', lastState?.round1?.submitted);

// shorten the reveal countdown for the smoke test
await fetchJson('/api/admin/settings', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.token}` },
  body: JSON.stringify({ countdown_seconds: 0, round2_answer_seconds: 5, round3_answer_seconds: 5 })
});
await ack(adminSocket, 'round2:start', { shuffleOrder: false });
await sleep(250);
const active = lastState.round2.activeCandidate;
const picker = active.id === candidates[0].id ? s1 : s2;
await ack(picker, 'round2:pick', { number: 1 });
await sleep(900);
if (lastState.round2.phase !== 'question') throw new Error('Round 2 did not reach question, phase=' + lastState.round2.phase);
await ack(picker, 'round2:answer', { selectedIndex: 0 });
await sleep(250);
if (lastState.round2.phase !== 'reveal') throw new Error('Round 2 did not reveal');
console.log('Round 2 OK, reveal:', lastState.round2.reveal.isCorrect, lastState.round2.reveal.points);
await ack(adminSocket, 'round2:next');
await ack(adminSocket, 'round3:start', { shuffleQuestions: true });
await sleep(250);
await ack(s1, 'round3:answer', { selectedIndex: 0 });
await sleep(300);
if (!['round3_reveal','round3_question'].includes(lastState.phase)) throw new Error('Round 3 reveal missing: ' + lastState.phase);
console.log('Round 3 OK, phase:', lastState.phase, 'reveal:', lastState.round3.reveal?.candidate?.name);

await ack(adminSocket, 'game:reset');
console.log('Reset OK, phase:', lastState.phase);
adminSocket.close(); s1.close(); s2.close(); displaySocket.close();
console.log('SMOKE TEST PASSED');
process.exit(0);
