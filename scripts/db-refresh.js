import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { refreshDatabase } from './db-backup-lib.js';

const yes = process.argv.includes('--yes') || process.env.CONFIRM_REFRESH === 'YES';
if (!yes) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question('This will back up and then DELETE the current SQLite database. Type REFRESH to continue: ');
  rl.close();
  if (answer.trim() !== 'REFRESH') {
    console.log('Cancelled.');
    process.exit(0);
  }
}
const result = refreshDatabase();
console.log(result.backup ? `Backup: ${result.backup}` : 'No existing database to back up.');
console.log(`Removed: ${result.removed}`);
console.log('The next server start will create a fresh database and seed the initial questions/admin accounts from .env.');
