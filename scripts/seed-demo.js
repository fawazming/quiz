import { db, makeCode } from '../server/db.js';

const demo = [
  ['Amina Yusuf', 'Remo Secondary School'],
  ['Ibrahim Adeyemi', 'MSSN Model College'],
  ['Fatima Ogunleye', 'Sagamu Grammar School'],
  ['Yusuf Balogun', 'Remo Stars Academy'],
  ['Zainab Adebayo', 'Ijebu Ode Girls College'],
  ['Abdulrahman Salami', 'Ansar-Ud-Deen College'],
  ['Maryam Ojo', 'Remo Anglican Grammar School'],
  ['Muhammad Lawal', 'MSSN Comprehensive College']
];

const existing = new Set(db.prepare('SELECT name FROM candidates').all().map(r => r.name));
const insert = db.prepare('INSERT INTO candidates (name, school, code) VALUES (?, ?, ?)');
let created = 0;
for (const [name, school] of demo) {
  if (existing.has(name)) continue;
  insert.run(name, school, makeCode());
  created++;
}
console.log(`Demo candidates created: ${created}`);
for (const row of db.prepare('SELECT name, school, code FROM candidates ORDER BY id').all()) {
  console.log(`${row.code}  ${row.name} — ${row.school}`);
}
console.log('\nOpen /join on a tablet and enter a code. Admin login: see .env.example.');
