# AI Build Prompt — Public-Join Kahoot-Style Quiz App (30 MB deploy)

Copy everything below into your AI coding agent. It is written as a **single build brief**. The target is a production-ready app whose alwaysdata/GitHub deployment stays **under 30 MB installed**, excluding the SQLite database.

---

## Prompt

You are a senior full-stack engineer and product designer. Build a **public-join, Kahoot-style live quiz platform** called **“QuizRoom”**. It must be deployable on a small Node.js host (alwaysdata free plan) with a production install **under 30 MB**. Do not use Docker. Do not require a build toolchain on the server: commit the built client or provide a prebuilt deployment bundle.

### Core experience

1. **Host creates a room**
   - Host signs in with a simple staff password or a one-time host PIN.
   - Host creates a room with a short **6-character room code** (e.g. `A7K2Q9`) and optional title/theme.
   - Host can open/close the lobby, start questions, skip, end the quiz, and show final standings.

2. **Players join publicly**
   - A player opens the public URL and enters:
     - room code,
     - nickname (2–20 characters),
     - optional school/team.
   - No player account, email, password or app install.
   - The join screen shows the room title, number of players and connection status.
   - Players can reconnect to the same room with the same nickname/device token.
   - Duplicate nicknames get a suffix (`Amina`, `Amina 2`) or are rejected with a clear message.

3. **Host / projector screen**
   - Full-screen host screen shows:
     - room code and join URL,
     - live player count,
     - countdown,
     - question and four answer tiles,
     - number of answers received,
     - reveal: correct answer, distribution, fastest correct players,
     - live leaderboard.
   - Use large typography that is readable from the back of a hall.
   - No key/pairing step: open the host URL on the projector and press full-screen.

4. **Live question loop**
   - Host starts a question. A configurable countdown (default 20s) begins.
   - Every player sees the four answers on their phone/tablet.
   - Each player may submit **once**. Once submitted, their buttons lock.
   - When the timer ends or all connected players answer, the host can reveal.
   - Scoring:
     - correct answer = base points (default 1000),
     - speed bonus proportional to remaining time (up to +500),
     - wrong answer = 0 (configurable negative penalty),
     - optional streak bonus.
   - Leaderboard updates after every question.
   - Fastest correct answer gets a “Fastest” badge.

5. **Question management**
   - Host can create questions manually: prompt, four options, correct index, explanation, time limit, points.
   - Import questions from CSV and JSON.
   - Export the room’s questions as CSV and JSON.
   - Group questions into packs (e.g. “Hardware”, “Python”, “AI”).
   - AI helper optional: if `GROQ_API_KEY` is configured, generate questions or clean up pasted CSV/text through a server-side endpoint. The browser must never see the key.
   - Provide a preview before publishing a question pack.

6. **Public-join safety and fairness**
   - Server is the single source of truth for timers, locks and scoring.
   - Never trust client timestamps.
   - Rate-limit joins and answer submissions per socket/IP.
   - Validate every event with a schema.
   - A player cannot answer twice, answer after the lock, or join a closed room.
   - Host can remove a player and reset a player’s answer for a question.
   - Show a clear “connection lost — reconnecting” state and resume the player automatically.

7. **Customisation**
   - Room title, welcome text, logo, background image, primary colour, accent colour and dark colour.
   - Upload logo/background (PNG/JPEG/WEBP/GIF, ≤3 MB) to local `data/uploads` and serve from `/uploads`.
   - Theme applies to host, player and join screens.
   - All names, sponsors and footer text are editable.

8. **Persistence**
   - SQLite database stores rooms, players, questions, answers, scores and audit events.
   - The app must survive restarts: active room state is persisted or cleanly resumable.
   - Provide a backup command and document the database path.
   - No external database is required.

### Required stack and size budget

Use:

- **Node.js 24** (Node 22.5+ acceptable if documented)
- **Express**
- **Socket.IO**
- **SQLite** via `node:sqlite` (no native compilation) or `better-sqlite3` if prebuilt
- **React + Vite** for the client
- Plain CSS; avoid heavy UI libraries and icon packages

**Production footprint target:** ≤30 MB installed, including `node_modules`, server code and built client.

Rules:

- Keep runtime dependencies to Express, Socket.IO, a JWT/auth library, a password hash library and a validation library.
- Put React, Vite, icon libraries and testing tools in `devDependencies`.
- Build the client locally; deploy the built `dist/`.
- Server install command must be `npm ci --omit=dev`.
- Do not install PM2, Puppeteer, Playwright, a browser, a second framework, or a large icon pack on the production host.
- Return a size report: `du -sh node_modules dist .`.

### Suggested data model

```sql
rooms(id, code, title, status, host_token_hash, settings_json, created_at)
players(id, room_id, nickname, school, reconnect_token_hash, score, connected, created_at)
question_groups(id, name, description)
questions(id, group_id, prompt, options_json, correct_index, explanation, time_limit, points, position)
game_state(room_id, phase, question_id, started_at, deadline_at, reveal_json, updated_at)
answers(id, room_id, question_id, player_id, selected_index, is_correct, response_ms, points, created_at)
```

Add indexes on room code, player room, answers question and answers player.

### Required screens

1. `/` — public join / create room landing.
2. `/host` — host login, room creation, question pack selection.
3. `/host/:code` — host console with lobby, live question, reveal, leaderboard, settings.
4. `/play/:code` — player join and live game.
5. `/display/:code` — projector view; no auth key required.
6. `/print/:code` — printable room code / join instructions (optional).

### Realtime events (minimum)

Host: `room:create`, `lobby:open`, `lobby:close`, `question:start`, `question:reveal`, `question:skip`, `game:end`, `score:adjust`, `player:remove`.
Player: `player:join`, `player:reconnect`, `answer:submit`, `player:leave`.
Server → clients: `state:update`, `player:state`, `question:started`, `answer:locked`, `question:revealed`, `leaderboard:update`, `room:closed`.

All events must return `{ ok: true }` or `{ ok: false, error }` acknowledgements. Do not silently fail.

### Acceptance tests

- 50 players can join one room and answer a question without server errors.
- A player cannot submit twice.
- The first submitted answer locks only that player; the “fastest correct” badge is server-timed.
- Refreshing a player page reconnects and restores their score.
- The projector shows the room code, countdown, answer count, reveal and leaderboard.
- Host can end the game at any point and final standings remain available.
- Question CSV/JSON import and export round-trip correctly.
- Theme/logo/background changes appear on all screens after save.
- Production install is ≤30 MB.
- `curl /api/health` returns `{ "ok": true }`.
- The app runs on alwaysdata with Node 24, a single Node site, and SQLite in `data/`.

### Deployment deliverables

- `README.md` with local setup.
- `DEPLOYMENT-ALWAYSDATA.md` with SSH + Node 24 + GitHub clone + `npm ci --omit=dev` steps.
- One install script: `scripts/install-alwaysdata.sh`.
- `package.json` scripts: `dev`, `build`, `start`, `test`, `questions:verify`, `package:alwaysdata`.
- `.env.example` with:
  - `PORT`, `HOST`/`IP`, `JWT_SECRET`, `DB_PATH`, `GROQ_API_KEY`, `GROQ_MODEL`.
- A size-check script that fails if production `node_modules + dist` exceeds 30 MB.

Return the complete implementation, not pseudocode. Include all files, commands, and a short verification report with page counts/route list and the measured production size.
