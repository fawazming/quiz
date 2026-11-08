import bcrypt from 'bcryptjs';
import { db } from '../server/db.js';

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 8) {
  console.error('Usage: npm run reset:password -- <username> <password-at-least-8-chars>');
  process.exit(1);
}
const existing = db.prepare('SELECT id, role FROM users WHERE username = ?').get(username);
if (!existing) {
  console.error(`No user named "${username}".`);
  process.exit(1);
}
db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), existing.id);
console.log(`Password updated for ${username} (${existing.role}).`);
