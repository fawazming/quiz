import { backupDatabase } from './db-backup-lib.js';

const out = backupDatabase('manual');
if (!out) {
  console.log('No database exists yet. Nothing to back up.');
  process.exit(0);
}
console.log(out);
