# Deployment guide — SSH + Node.js (no Docker)

This app runs as **one Node.js process** with **SQLite** and **Socket.IO**. It needs a persistent disk for `data/quiz.db`, outbound email is not used, and the browser must be able to reach WebSocket traffic.

Recommended host: any Ubuntu 22.04/24.04 VPS (DigitalOcean, Hetzner, Contabo, Linode) or a school server with a public IP. You need SSH access and a domain name (or a subdomain such as `quiz.yourschool.ng`).

> **Node version:** use **Node.js 24 LTS**. The app uses the built-in `node:sqlite` module, so there is no native database compilation step. Node 22.5+ may work, but Node 24 is the tested target.

---

## 1. Push the app to GitHub

From the `ict-quiz-arena` folder on your computer:

```bash
git init
git add .
git commit -m "MSSN Remo ICT Quiz Arena - realtime CBT, pick-a-number, first-to-answer"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mssn-ict-quiz-arena.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `dist`, `build`, `.env` and the SQLite database. **Never commit `.env`.** `data/questions.json` and `data/SOURCES.md` are intentionally committed.

The bundled GitHub Actions workflow runs `npm ci`, the question-bank check, tests and a production build on every push.

---

## 2. Prepare the server over SSH

```bash
ssh root@YOUR_SERVER_IP
```

Create a non-root user and give it sudo:

```bash
adduser quiz
usermod -aG sudo quiz
rsync --archive --chown=quiz:quiz ~/.ssh /home/quiz/.ssh
su - quiz
```

Update the OS and install the basics:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx sqlite3 ufw
```

Install Node.js 24 from NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # should print v24.x.x
npm -v
```

Install PM2 globally:

```bash
sudo npm install -g pm2
```

Open only the ports you need:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 3. Clone and configure

```bash
cd /home/quiz
git clone https://github.com/YOUR_USERNAME/mssn-ict-quiz-arena.git
cd mssn-ict-quiz-arena
npm ci
```

Create the production environment file:

```bash
cp .env.example .env
nano .env
```

Set at minimum:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<paste output of: openssl rand -hex 32>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<a strong password>
SCOREKEEPER_USERNAME=scorekeeper
SCOREKEEPER_PASSWORD=<a different strong password>
DISPLAY_KEY=<optional long random string>
DB_PATH=/home/quiz/mssn-ict-quiz-arena/data/quiz.db
```

Generate a secret quickly:

```bash
openssl rand -hex 32
```

**Important:** the seeded staff accounts are created only when the database has no users. Set the passwords **before the first start**. If you change `ADMIN_PASSWORD` after the database exists, use the reset command in section 7.

Build and verify:

```bash
npm run questions:verify
npm test
npm run build
```

Start the app under PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
# Run the command PM2 prints, then:
pm2 status
pm2 logs mssn-ict-quiz --lines 50
```

Check locally:

```bash
curl http://127.0.0.1:3000/api/health
```

Expected:

```json
{"ok":true,"version":"1.0.0","round":0,"phase":"lobby","serverTime":...}
```

---

## 4. Put Nginx and HTTPS in front

Copy the provided Nginx example:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/mssn-ict-quiz
sudo nano /etc/nginx/sites-available/mssn-ict-quiz
# Change server_name quiz.example.com to your domain
sudo ln -s /etc/nginx/sites-available/mssn-ict-quiz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Point your domain’s DNS `A` record at the server IP. Then install a free certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d quiz.example.com
sudo certbot renew --dry-run
```

Open:

- Admin/scorekeeper: `https://quiz.example.com/login`
- Candidate tablets: `https://quiz.example.com/join`
- Projector: `https://quiz.example.com/display` (or `.../display?key=YOUR_DISPLAY_KEY`)

Nginx **must** forward WebSocket upgrade headers. The included config does. If live updates fail but pages load, check the browser console for `socket.io` errors and confirm those two `proxy_set_header` lines are present.

---

## 5. First event checklist

1. Log in as admin at `/login`.
2. Open **Candidates** → add candidates or import a CSV (`name,school`).
3. Give each candidate their six-character code. They open `/join` on a tablet and enter it.
4. Open the projector at `/display` on the hall computer; press `F11` for full screen.
5. **Round 1:** open the CBT. Candidates press **Start test**. Watch submissions in Round 1. Close the round, then **Qualify top N**.
6. **Round 2:** start the round. The active candidate picks an unused number on their tablet. A 5-second countdown runs, then the question appears on the projector and active tablet. The answer is revealed with points, name and school. Press **Next** for the next candidate.
7. **Round 3:** start the race. All finalists see the question. The first submitted answer locks it. Press **Next question** after each reveal.
8. Export results from **Scores → CSV**.

### Before the real event

Run a full rehearsal with 2–3 candidates:

- Round 1: start, answer, submit, close, qualify.
- Round 2: pick, wait for the countdown, answer, reveal, next.
- Round 3: answer from two tablets; confirm the faster tablet wins and the second is rejected.
- Refresh one tablet mid-round to confirm it reconnects.

---

## 6. Network and firewall notes

- Use **HTTPS** in production. Socket.IO runs on the same origin, so no separate port is required.
- The app needs **one Node process** because SQLite is local. Do not run PM2 cluster mode or multiple instances against the same database file.
- If the venue has a captive portal or a firewall that blocks WebSockets, test `/display` on the actual venue Wi-Fi before the event. Socket.IO falls back to polling automatically, but Nginx must still proxy `/socket.io/`.
- The projector screen and tablets should be on the same network or able to reach the public domain.

---

## 7. Updating, backups and password resets

### Deploy an update

```bash
cd /home/quiz/mssn-ict-quiz-arena
git pull
npm ci
npm run build
pm2 restart mssn-ict-quiz
pm2 logs mssn-ict-quiz --lines 30
```

Schema changes are applied automatically on boot (`CREATE TABLE IF NOT EXISTS`). The question bank is upserted from `data/questions.json` on every boot; existing scores are preserved.

### Back up the database

Stop writes briefly for a clean copy:

```bash
pm2 stop mssn-ict-quiz
mkdir -p /home/quiz/backups
cp data/quiz.db /home/quiz/backups/quiz-$(date +%F-%H%M).db
pm2 start mssn-ict-quiz
```

Or use SQLite’s online backup command:

```bash
sqlite3 data/quiz.db ".backup '/home/quiz/backups/quiz-$(date +%F-%H%M).db'"
```

Download a backup to your computer:

```bash
scp quiz@YOUR_SERVER_IP:/home/quiz/backups/quiz-*.db .
```

### Reset a staff password

```bash
cd /home/quiz/mssn-ict-quiz-arena
npm run reset:password -- admin 'NewStrongPassword!'
npm run reset:password -- scorekeeper 'AnotherStrongPassword!'
pm2 restart mssn-ict-quiz
```

### Start a fresh competition (keep candidates)

Use **Admin → Settings** or the reset controls. To wipe everything and start from scratch, stop PM2, move the database, and start again:

```bash
pm2 stop mssn-ict-quiz
mv data/quiz.db data/quiz-$(date +%F).backup.db
pm2 start mssn-ict-quiz
```

The app recreates the database, seeds the 94 PDF-sourced questions and recreates the staff accounts from `.env`.

### Demo candidates

```bash
npm run seed:demo
```

This creates eight sample candidates and prints their codes. It does **not** delete existing data.

---

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| `EADDRINUSE` on start | Another process is on port 3000. `sudo lsof -i :3000` or change `PORT`. |
| Page loads but live state does not update | Nginx WebSocket headers, browser console, `pm2 logs`. |
| `SQLITE_CANTOPEN` | `DB_PATH` directory must exist and be writable by the `quiz` user. |
| `node:sqlite` warning | Expected on Node 24; it is an experimental-module warning, not a failure. |
| Candidates cannot log in | Code must be six characters, candidate must be **active**, admin may need to regenerate the code. |
| Round 2 will not start | At least two active candidates are required; qualify candidates first. |
| Round 3 will not start | At least one candidate must be qualified from Round 1. |
| Display is blank | Open `/display` directly; if `DISPLAY_KEY` is set, add `?key=...`. |
| Timer seems wrong | The server is authoritative; tablets use server timestamps. Check the server clock: `timedatectl`. |

### Health and logs

```bash
curl https://quiz.example.com/api/health
pm2 status
pm2 logs mssn-ict-quiz
sudo tail -f /var/log/nginx/error.log
```

---

## 9. Security checklist for the event

- [ ] `JWT_SECRET` is long, random and not the example value.
- [ ] Admin and scorekeeper passwords are changed from the defaults.
- [ ] `DISPLAY_KEY` is set if the projector URL is public.
- [ ] HTTPS is active and HTTP redirects to HTTPS.
- [ ] Only ports 22, 80 and 443 are open.
- [ ] `data/quiz.db` is not inside the public web root (it is outside `dist/`).
- [ ] A backup was taken before the event.
- [ ] Staff phones/laptops are locked; candidate codes are distributed individually.
- [ ] The scorekeeper’s adjustments are reviewed after the event in the audit log.

The app is designed for a trusted school/competition network. It is not a general-purpose public SaaS; add rate limiting and a WAF if you expose it to the open internet for long periods.
