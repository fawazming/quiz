import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../server/config.js';

export function backupDatabase(label = 'manual') {
  if (!fs.existsSync(config.dbPath)) return null;
  const dir = path.join(path.dirname(config.dbPath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const base = path.basename(config.dbPath, path.extname(config.dbPath));
  const out = path.join(dir, `${base}-${stamp}-${label}.db`);
  const db = new DatabaseSync(config.dbPath);
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}';`);
  } finally {
    db.close();
  }
  return out;
}

export function refreshDatabase() {
  const backup = backupDatabase('pre-refresh');
  for (const suffix of ['', '-wal', '-shm']) {
    const file = config.dbPath + suffix;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
  return { removed: config.dbPath, backup };
}
