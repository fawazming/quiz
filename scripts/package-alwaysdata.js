import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'deploy', 'alwaysdata');

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = (from, to = from) => {
  const src = path.join(root, from);
  const dest = path.join(out, to);
  fs.cpSync(src, dest, { recursive: true });
};
copy('dist');
copy('server');
fs.mkdirSync(path.join(out, 'scripts'), { recursive: true });
for (const file of ['seed-demo.js','reset-password.js','verify-questions.js','smoke-test.js','db-backup.js','db-refresh.js','db-backup-lib.js']) copy(path.join('scripts', file), path.join('scripts', file));
copy('package.json');
copy('package-lock.json');
copy('.env.example');
copy('README.md');
copy('DEPLOYMENT-ALWAYSDATA.md');
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
copy('data/questions.json', 'data/questions.json');
copy('data/SOURCES.md', 'data/SOURCES.md');

fs.writeFileSync(path.join(out, 'UPLOAD.txt'), `MSSN Remo ICT Quiz Arena — alwaysdata bundle

1. Upload this folder to ~/www/ict-quiz-arena on alwaysdata (SFTP/SCP).
2. SSH in:
   ssh ACCOUNT@ssh-ACCOUNT.alwaysdata.net
3. Install only server dependencies:
   cd ~/www/ict-quiz-arena
   npm ci --omit=dev
   npm cache clean --force
4. Create .env:
   cp .env.example .env
   nano .env
   (set JWT_SECRET, ADMIN_PASSWORD, SCOREKEEPER_PASSWORD, DB_PATH)
5. In alwaysdata: Web > Sites > Add a site
   Type: Node.js
   Working directory: /home/ACCOUNT/www/ict-quiz-arena
   Command: node /home/ACCOUNT/www/ict-quiz-arena/server/index.js
   Node.js version: 24
6. Open https://ACCOUNT.alwaysdata.net and test login.
`, 'utf8');

console.log('Created', out);
console.log('Upload the folder contents, then follow UPLOAD.txt or DEPLOYMENT-ALWAYSDATA.md.');
