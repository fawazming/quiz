# Deploying on alwaysdata (free plan, 100 MB)

This is the small-footprint deployment for the **alwaysdata free plan**. It avoids installing React, Vite, Puppeteer or the full development toolchain on the server. You build the client on your computer, upload the built `dist/`, and install **only the six server dependencies** on alwaysdata.

Measured production footprint:

| Item | Size |
|---|---:|
| Server dependencies (`npm ci --omit=dev`) | **~15 MB** |
| Built client (`dist/`) | **~0.6 MB** |
| Server/source/questions | **~1.5 MB** |
| SQLite database | **< 1 MB** at start |
| **Total** | **~18 MB** |

That leaves ~80 MB for the database, logs and backups on a 100 MB plan. (The current alwaysdata Free offer may show 1 GB; the same steps work.)

---

## 0. One-command install from GitHub (recommended)

The repository includes the built `dist/` client, so the server does **not** need Vite or the full development tree.

On the alwaysdata server:

```bash
ssh YOURACCOUNT@ssh-YOURACCOUNT.alwaysdata.net
mkdir -p ~/www
git clone --depth 1 https://github.com/fawazming/quiz.git ~/www/ict-quiz-arena
bash ~/www/ict-quiz-arena/scripts/install-alwaysdata.sh
```

The script pulls the latest GitHub revision, runs `npm ci --omit=dev`, clears the npm cache and creates `.env` on first run. Then:

```bash
nano ~/www/ict-quiz-arena/.env
```

Create the Node.js site as shown in section 5. For later updates:

```bash
bash ~/www/ict-quiz-arena/scripts/install-alwaysdata.sh
```

then restart the Node.js site from the admin panel.

If the repository is private, clone with an SSH deploy key or a GitHub token before running the script.

---

## 1. Create the account and enable SSH

1. Sign up at [alwaysdata](https://www.alwaysdata.com/) and choose the **Free** plan.
2. Your account name becomes your address: `https://YOURACCOUNT.alwaysdata.net`.
3. In the admin panel, open **Remote access → SSH/SFTP** and create/enable an SSH user.
4. Connect from your computer:

```bash
ssh YOURACCOUNT@ssh-YOURACCOUNT.alwaysdata.net
```

If you use Windows, the built-in OpenSSH client, PuTTY, or WinSCP all work. For key-based login, add your public key under **SSH/SFTP → SSH keys**.

---

## 2. Build the app on your computer

From the project folder:

```bash
npm ci
npm run questions:verify
npm test
npm run build
npm run package:alwaysdata
```

`npm run package:alwaysdata` creates a deployment folder:

```
deploy/alwaysdata/
├── dist/                 built React client
├── server/               Express + Socket.IO + SQLite API
├── data/questions.json   94 PDF-sourced questions
├── data/SOURCES.md
├── scripts/              seed, reset-password, verify
├── package.json
├── package-lock.json
├── .env.example
├── README.md
├── DEPLOYMENT-ALWAYSDATA.md
└── UPLOAD.txt
```

It deliberately excludes `node_modules`, the local SQLite database, `.git`, screenshots and development files.

Upload the **contents** of that folder to your alwaysdata home:

```bash
cd deploy/alwaysdata
scp -r . YOURACCOUNT@ssh-YOURACCOUNT.alwaysdata.net:~/www/ict-quiz-arena/
```

Or use WinSCP/FileZilla (SFTP) and upload to `~/www/ict-quiz-arena`.

> **Do not upload your local `node_modules`.** It contains Windows binaries and development packages. You will install the production dependencies on alwaysdata in step 4.

---

## 3. Set the Node.js version

In the alwaysdata admin panel:

- **Environment → Node.js** → choose **24** as the default version.
- Or set the site’s Node.js version to **24** when creating the site.

Check over SSH:

```bash
node -v
# v24.x.x
```

The app uses Node’s built-in `node:sqlite` module. Alwaysdata supports Node.js 24. Node 22.5+ may work, but Node 24 is the tested version.

---

## 4. Install only production dependencies

```bash
cd ~/www/ict-quiz-arena
npm ci --omit=dev
npm cache clean --force
```

This installs only: Express, Socket.IO, `jsonwebtoken`, `bcryptjs`, `dotenv`, `zod` — about **15 MB**. It does **not** install React, Vite or the 33 MB icon package, which are only needed for the local build.

Create the environment file:

```bash
cp .env.example .env
nano .env
```

Use values like:

```env
NODE_ENV=production
JWT_SECRET=<paste: openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong password>
SCOREKEEPER_USERNAME=scorekeeper
SCOREKEEPER_PASSWORD=<different strong password>
DB_PATH=/home/YOURACCOUNT/www/ict-quiz-arena/data/quiz.db
GROQ_API_KEY=<optional; enables AI question generation>
GROQ_MODEL=llama-3.3-70b-versatile
```

Do **not** set `PORT`. alwaysdata provides `PORT` and `IP`; the app binds to them automatically.

Check the footprint:

```bash
du -sh ~/www/ict-quiz-arena
du -sh ~/www/ict-quiz-arena/node_modules
```

If you are close to the quota, clear npm’s cache again and remove old backups.

---

## 5. Create the Node.js site

In the alwaysdata admin panel:

1. **Web → Sites → Add a site**.
2. Choose **Node.js** as the type.
3. Address: `YOURACCOUNT.alwaysdata.net` (or your enabled domain).
4. Working directory: `/home/YOURACCOUNT/www/ict-quiz-arena`.
5. Command:

```bash
node /home/YOURACCOUNT/www/ict-quiz-arena/server/index.js
```

6. Node.js version: **24**.
7. Save, then open:

```
https://YOURACCOUNT.alwaysdata.net
```

The first request initialises SQLite, seeds the 94 questions, and creates the admin/scorekeeper accounts from `.env`.

If the free plan requires HTTPS to be enabled explicitly, open the site’s **SSL** section and enable the free Let’s Encrypt certificate.

### Why no PM2?

alwaysdata manages the Node.js site process for you. Do not install PM2 just to run one site on the free plan; it would add files and an unnecessary process. Use the site’s **Restart** action after deployments.

---

## 6. First login and event setup

- Admin: `https://YOURACCOUNT.alwaysdata.net/login`
- Candidate tablets: `https://YOURACCOUNT.alwaysdata.net/join`
- Projector: `https://YOURACCOUNT.alwaysdata.net/display`

Log in with the credentials from `.env`, then:

1. Add candidates or import a CSV (`name,school`).
2. Give each candidate their six-character code.
3. Open `/display` on the hall projector.
4. Run Round 1, qualify, then Round 2 and Round 3.

### AI question assistant (optional)

Set `GROQ_API_KEY` in `.env` to enable **Question bank → AI**. The key stays on the server; the browser never receives it. Leave it empty if you do not want AI features.

### Demo candidates

If you want sample codes immediately:

```bash
cd ~/www/ict-quiz-arena
node scripts/seed-demo.js
```

This adds eight demo candidates and prints their codes. It does not delete existing data.

### Reset a staff password

```bash
cd ~/www/ict-quiz-arena
node scripts/reset-password.js admin 'NewStrongPassword!'
node scripts/reset-password.js scorekeeper 'AnotherStrongPassword!'
```

Restart the site from the alwaysdata panel if the process does not pick it up immediately.

---

## 7. WebSocket check

alwaysdata supports WebSocket applications. This app uses Socket.IO on the same origin, so no extra port or Nginx configuration is needed.

To verify:

1. Open `/display` on one device.
2. Open `/admin` on another and change a state (for example, open Round 1).
3. The display should update immediately.

If it does not, check the browser console for Socket.IO errors and the alwaysdata site logs. Socket.IO is configured to fall back to HTTP long-polling if a WebSocket upgrade is blocked.

---

## 8. Staying under 100 MB

Storage on the free plan includes files, mail and databases. Keep it lean:

```bash
# What is using space?
du -sh ~/www/ict-quiz-arena/*
du -sh ~/.npm 2>/dev/null

# Clear the npm cache after installs
npm cache clean --force

# Keep at most a few database backups
ls -lh ~/www/ict-quiz-arena/data
```

Recommendations:

- Never run `npm ci` **without** `--omit=dev` on the server. The full development tree is ~114 MB and will exceed 100 MB.
- Build `dist/` on your computer and upload it; alwaysdata does not need Vite or React.
- Delete old `dist` bundles before uploading a new one if space is tight.
- Keep one or two `.db` backups, not dozens.
- Do not install PM2, Puppeteer, Chrome or a second copy of the app.
- The database starts tiny but grows with answers, custom questions, theme/settings and audit logs. One competition will remain well under 10 MB.

If you run out of space:

```bash
# Safe cleanup: old backups and npm cache
rm -f ~/www/ict-quiz-arena/data/quiz-*.backup.db
npm cache clean --force
du -sh ~/www/ict-quiz-arena/* | sort -h
```

---

## 9. Updating the app

On your computer:

```bash
npm run build
npm run package:alwaysdata
```

Upload the new `deploy/alwaysdata/` contents over the old folder (keep `data/quiz.db` on the server). Then:

```bash
cd ~/www/ict-quiz-arena
npm ci --omit=dev
npm cache clean --force
```

Restart the Node.js site from the alwaysdata panel.

The database schema is created if missing, and the initial 94 questions are seeded only when the question table is empty. Admin edits, imports, custom questions, scores, theme and candidates are stored in `data/quiz.db`; back it up before updates.

### Back up the database first

```bash
cd ~/www/ict-quiz-arena
cp data/quiz.db data/quiz-$(date +%F-%H%M).backup.db
```

Download it with SFTP if you want an off-server copy.

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` / site unavailable | Check the site command and working directory in **Web → Sites**. Check alwaysdata logs. |
| `Cannot find module 'express'` | Run `npm ci --omit=dev` in the app directory. |
| `SQLITE_CANTOPEN` | `DB_PATH` must point inside your home, and the `data` directory must be writable. |
| `EADDRINUSE` | The site process is already running, or your command starts a second copy. Restart the site. |
| Page loads but no live updates | Check WebSocket in the browser console; verify the site is the Node.js site, not a static site. |
| 404 on `/admin` or `/display` | Upload the built `dist/` folder. The server serves the SPA from `dist/`. |
| Quota exceeded | Run `du -sh *`, remove old backups, `npm cache clean --force`, ensure you did not install dev dependencies. |
| Admin password not changing from `.env` | The database already exists; use `node scripts/reset-password.js`. |
| Node version error for `node:sqlite` | Set Node.js 24 in **Environment → Node.js** and restart the site. |

Useful checks:

```bash
node -v
curl -s https://YOURACCOUNT.alwaysdata.net/api/health
du -sh ~/www/ict-quiz-arena
```

The health endpoint should return:

```json
{"ok":true,"version":"1.0.0","round":0,"phase":"lobby","serverTime":...}
```

---

## 11. Security checklist

- [ ] `JWT_SECRET` is long and random.
- [ ] Admin and scorekeeper passwords are changed from the defaults.
- [ ] HTTPS is enabled.
- [ ] The database file is inside `~/www/ict-quiz-arena/data`, not in `dist`.
- [ ] A backup was taken before the event.
- [ ] Only the production dependency tree is installed.
- [ ] Candidate codes are distributed individually.
- [ ] The scorekeeper reviews any manual score adjustments in the audit log.

The free plan is suitable for a school competition (personal, non-profit use). If the event becomes a recurring public service, move to a paid alwaysdata plan or a VPS so you have more RAM, disk and process isolation.
