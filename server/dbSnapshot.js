import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { db, getSchemaVersion } from './db.js';
import { backupDatabase } from '../scripts/db-backup-lib.js';

const TABLES = [
  'round1_answers',
  'round1_sessions',
  'round2_picks',
  'round3_answers',
  'score_adjustments',
  'candidates',
  'questions',
  'question_groups',
  'settings',
  'game_state',
  'users',
  'audit_log',
  'schema_migrations'
];

function quote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function createDatabaseSnapshot(label = 'download') {
  return backupDatabase(label);
}

export function validateDatabaseSnapshot(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size < 4096) throw new Error('The uploaded file is not a valid database snapshot');
  if (stat.size > 64 * 1024 * 1024) throw new Error('The snapshot must be smaller than 64 MB');

  const header = Buffer.alloc(16);
  const fd = fs.openSync(file, 'r');
  try { fs.readSync(fd, header, 0, 16, 0); } finally { fs.closeSync(fd); }
  if (header.toString('utf8', 0, 15) !== 'SQLite format 3') {
    throw new Error('The uploaded file is not a SQLite database');
  }

  const snap = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = snap.prepare('PRAGMA integrity_check').all();
    if (!integrity.length || integrity[0].integrity_check !== 'ok') {
      throw new Error('The database snapshot failed its integrity check');
    }
    const names = new Set(snap.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
    const missing = TABLES.filter(table => !names.has(table));
    if (missing.length) throw new Error(`Snapshot is missing required tables: ${missing.join(', ')}`);
    const foreignKeyErrors = snap.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeyErrors.length) throw new Error('The snapshot contains broken database relationships');
    const version = snap.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get()?.version;
    const current = getSchemaVersion();
    if (version !== current) {
      throw new Error(`Snapshot schema ${version || 'unknown'} does not match this server (${current}). Use a snapshot from the same release.`);
    }
  } finally {
    snap.close();
  }
  return { size: stat.size };
}

export function restoreDatabaseSnapshot(file) {
  validateDatabaseSnapshot(file);
  const backup = backupDatabase('pre-restore');
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec(`ATTACH DATABASE ${quote(file)} AS snapshot`);
    try {
      db.exec('BEGIN');
      for (const table of TABLES) db.exec(`DELETE FROM main."${table}"`);
      for (const table of TABLES) db.exec(`INSERT INTO main."${table}" SELECT * FROM snapshot."${table}"`);
      db.exec('COMMIT');
    } catch (err) {
      try { db.exec('ROLLBACK'); } catch {}
      throw err;
    } finally {
      try { db.exec('DETACH DATABASE snapshot'); } catch {}
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
  return { backup };
}

export function snapshotDirectory() {
  return path.join(path.dirname(config.dbPath), 'backups');
}
