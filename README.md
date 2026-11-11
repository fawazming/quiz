# MSSN Remo ICT Quiz Arena

A real-time competition web app for the **MSSN Remo Area Council MSS Week 2026 ICT Quiz**. It runs three stages:

1. **Round 1 — CBT elimination:** 50 PDF-sourced MCQs, individual timing and auto-scoring.
2. **Round 2 — Pick a number:** the active candidate chooses an unused number on their tablet. A 5-second countdown runs, then the question appears on the projector and tablet. One answer window, then a projector reveal with name, school and points.
3. **Round 3 — First to answer:** Kahoot-style race. Every finalist sees the question; the first submitted answer locks it. Points combine accuracy and response speed.

Rounds are independently switchable. Enable only Round 1 for a CBT-only event, only Round 2/3 for a standalone live final, or any combination. Round labels and branding are configurable in **Settings**.

Built with **Node.js 24, Express, Socket.IO, SQLite (`node:sqlite`), React and Vite**. No Docker required. The deployment guide targets a plain SSH + Node.js + PM2 + Nginx VPS.

---

## Feature map

### Admin
- Enable any combination of rounds; run only CBT, only a live final, or all three.
- Open/close Round 1, watch live submissions, qualify the top N.
- End and conclude Round 2 or Round 3 at any moment; finish the whole event from the dashboard.
- Start/advance/end Round 2, see the number board, the answer key and the reveal.
- Start/advance Round 3, see the first-answer lock and race result.
- Candidate registry with unique six-character tablet codes, CSV import, qualification toggles.
- Question bank manager: add, edit, delete, import JSON/CSV, and inspect the 94 PDF-sourced questions.
- Theme presets and custom primary/accent/dark colours, applied live to admin, tablets and projector.
- Custom organisation/app names, logos, sponsor logo and background image upload.
- Question groups, CSV/JSON export, and a Groq-powered AI question generator / CSV cleanup assistant.
- Event settings: independent round switches, custom round labels, timers, points, speed bonuses, countdown, qualification count and branding.
- CSV result export and an append-only score-adjustment audit log.

### Scorekeeper
- Same live view as admin for round control and candidate progress.
- Can adjust scores with a mandatory reason; cannot reset the competition, edit candidates or change settings.

### Candidate tablet
- Code-based join, no email or password.
- CBT with a 50-question palette, auto-save, countdown, review and submit.
- Round 2 picker, countdown, question, answer lock and reveal.
- Round 3 race buttons with immediate lock.
- Eliminated/spectator states with live standings.

### Projector display
- Full-screen lobby, CBT progress, number board, countdown, question board, reveal and final leaderboard.
- Opens directly with no pairing key; use the browser full-screen mode on the projector.
- Direct display URL — no pairing key required. Open it on the projector and use the browser's full-screen mode.

---

## Quick start (local)

### Requirements
- Node.js **24 LTS** (Node 22.5+ may work; Node 24 is the tested target).
- npm.
- No database server: SQLite is a local file.

```bash
npm ci
cp .env.example .env
# edit .env: set JWT_SECRET and staff passwords
npm run dev
```

Open:

- `http://localhost:5173` — landing page
- `http://localhost:5173/login` — admin/scorekeeper
- `http://localhost:5173/join` — candidate tablet
- `http://localhost:5173/display` — projector

Production-style local run:

```bash
npm run build
npm start
# http://localhost:3000
```

### First-run accounts

Set these in `.env` **before the first start**:

| Role | Default in `.env.example` |
|---|---|
| Admin | `admin` / `MSSN2026!` |
| Scorekeeper | `scorekeeper` / `SCORE2026!` |

Change them before a real event. If the database already exists, change a password with:

```bash
npm run reset:password -- admin 'YourNewPassword!'
```

### Demo candidates

```bash
npm run seed:demo
```

It prints eight candidate names, schools and six-character codes. Use a code at `/join`.

---

## How the rounds work

### Round 1 — CBT
- Admin opens the round. Each candidate presses **Start test** and gets the same 50-question paper.
- Answers autosave. Candidates can move between questions and change answers before submitting.
- The server enforces the deadline and finalises all active sessions when the admin closes the round (or when time expires).
- Score: `correct × round1_points_per_correct` (default 2 → max 100).
- Admin runs **Qualify top N** to move candidates into Round 2.

### Round 2 — Pick a number
- The server builds a board of unused numbers from the Round 2 pool (22 questions).
- The active candidate taps an unused number.
- `countdown_seconds` (default 5) shows a full-screen countdown on the projector.
- The question appears on the projector and active tablet; the active candidate has `round2_answer_seconds` (default 60).
- Points: base + speed bonus for a correct answer; 0 for wrong/timeout.
- After the reveal, **Next** rotates to the next qualified candidate. The rotation continues over unpicked numbers until the board is empty.

### Round 3 — First to answer
- All qualified candidates see the question and four colour-coded answers.
- The **first answer submitted to the server** locks the question for everyone.
- A correct answer earns base + a speed bonus based on remaining time. A wrong first answer ends the question (configurable penalty, default 0).
- Admin presses **Next question** after each reveal.

The server is the single source of truth for timestamps and locks, so a slow tablet cannot “win” by rendering faster.

---

## Question bank — PDF only

The app ships with **94 PDF-sourced questions**. Admins can add, import, edit or delete questions at runtime; custom questions are stored in SQLite and preserved across restarts.

| Pool | Count | Composition |
|---|---:|---|
| Round 1 | 50 | 45 chapter MCQs + 5 unique mock MCQs |
| Round 2 | 22 | 4 unique mock MCQs + 18 questions derived from PDF chapters |
| Round 3 | 22 | 22 questions derived from PDF chapters |
| **Total** | **94** | |

All questions trace to the MSSN Remo ICT Quiz 2026 study guide. `data/SOURCES.md` records the provenance and the “derived from PDF” rules. Check the bank any time:

```bash
npm run questions:verify
```

The admin question manager shows the source, PDF reference, options, answer and explanation, and provides add/edit/delete plus JSON/CSV import. Use **Add question** or **Import** in the Question bank tab.

---

## Project structure

```
├── server/
│   ├── index.js        Express API, static client, Socket.IO bootstrap
│   ├── db.js           SQLite schema, seeding, leaderboard
│   ├── game.js         Round state machine and server timers
│   ├── socket.js       Authenticated socket events
│   ├── auth.js         JWT, staff/candidate auth, socket auth
│   ├── scoring.js      Pure scoring/turn-order functions
│   └── config.js       Environment and settings defaults
├── src/
│   ├── pages/          Landing, login, join, admin, candidate, display
│   ├── admin/          Dashboard and round/candidate/question/settings tabs
│   ├── components/     Shared UI, timer, leaderboard, question options
│   ├── styles.css      Responsive emerald/gold design system
│   └── api.js / auth.jsx / socket.jsx / toast.jsx
├── data/
│   ├── questions.json  94 PDF-sourced questions
│   └── SOURCES.md      Provenance and verification rules
├── scripts/            verify, seed, reset-password, smoke test
├── tests/              Vitest scoring tests
├── nginx.conf.example  WebSocket-ready reverse proxy
├── ecosystem.config.cjs PM2 single-instance config
└── DEPLOYMENT.md       SSH + Node.js production guide
```

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite client + nodemon server |
| `npm run build` | Production client bundle in `dist/` |
| `npm start` | Serve API + built client on `PORT` |
| `npm test` | Scoring unit tests |
| `npm run questions:verify` | Validate 94 questions, pools, options and provenance |
| `npm run seed:demo` | Add eight demo candidates and print codes |
| `npm run package:alwaysdata` | Build a minimal upload folder in `deploy/alwaysdata/` |
| `bash scripts/install-alwaysdata.sh` | Server-side install/update from GitHub (Node 24, production deps only) |
| `npm run reset:password -- <user> <password>` | Reset an admin/scorekeeper password |
| `npm run db:backup` | Create a consistent SQLite backup in `data/backups/` |
| `npm run db:refresh` | Back up, then delete the database; the next start reseeds it |
| `node scripts/smoke-test.js` | End-to-end server test; first run a test server on port 3100 with `DB_PATH=data/smoke.db PORT=3100 node server/index.js` |
| `node scripts/capacity-test.js 100 http://localhost:3100` | Hold N live Socket.IO connections for a capacity check |

---

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | Node HTTP port; alwaysdata supplies this automatically |
| `HOST` / `IP` | `0.0.0.0` | Bind address; alwaysdata supplies `IP` automatically |
| `NODE_ENV` | `development` | Set `production` on the server |
| `DB_PATH` | `./data/quiz.db` | Must be on a persistent disk |
| `JWT_SECRET` | dev placeholder | **Change in production** |
| `JWT_EXPIRES_IN` | `12h` | Staff/candidate session length |
| `GROQ_API_KEY` | empty | Enables the AI question assistant (server-side only) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model used for generation/CSV cleanup |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `MSSN2026!` | Seeded on first boot only |
| `SCOREKEEPER_USERNAME` / `SCOREKEEPER_PASSWORD` | `scorekeeper` / `SCORE2026!` | Seeded on first boot only |

---

## Extra build prompt

`KAHOOT_PUBLIC_JOIN_PROMPT.md` contains a ready-to-paste AI prompt for a separate **public-join Kahoot-style quiz app** with a 30 MB production deployment budget.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a general SSH + Node.js VPS guide, or **[DEPLOYMENT-ALWAYSDATA.md](DEPLOYMENT-ALWAYSDATA.md)** for the alwaysdata free-plan procedure.

One-command alwaysdata install from GitHub:

```bash
ssh YOURACCOUNT@ssh-YOURACCOUNT.alwaysdata.net
mkdir -p ~/www
git clone --depth 1 https://github.com/fawazming/quiz.git ~/www/ict-quiz-arena
bash ~/www/ict-quiz-arena/scripts/install-alwaysdata.sh
```

The built `dist/` is committed, so the server installs only production dependencies (~10 MB). The install script preserves `.env` and backs up the existing database before applying new code; schema migrations run automatically on boot. Create the Node.js site with `node /home/YOURACCOUNT/www/ict-quiz-arena/server/index.js` and Node 24.

The general guide covers:

- install Node 24 and PM2;
- clone from GitHub;
- configure `.env`;
- run `npm ci && npm run build`;
- start with PM2;
- put Nginx + Let’s Encrypt in front with WebSocket upgrade;
- backup SQLite;
- reset passwords, logs and troubleshooting.

No Docker is required. Run **one** PM2 instance because SQLite is a local file.

---

## Design and safety notes

- The UI uses a self-hosted Manrope/Fraunces/JetBrains Mono type system and the MSSN/Rayyan brand assets in `public/`.
- Correct answers are never sent to candidate or display clients before a reveal. Admin/scorekeeper sockets receive the full question for verification.
- Score adjustments are written to an audit log with the actor’s username and reason.
- The app is built for a trusted school competition network. Add rate limiting/WAF if exposing it publicly for long periods.
- To start a fresh competition, use the reset controls or move `data/quiz.db` aside and restart (see DEPLOYMENT.md).

---

## Credits

**MSSN Remo Area Council** · MSS Week 2026 · *Anchored in Deen, Illuminated in Dunya and Digital.*  
Proudly supported by **Rayyan Technologies** — [rayyantech.sgm.ng](https://rayyantech.sgm.ng).
