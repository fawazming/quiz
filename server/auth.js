import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { db, getCandidateById } from './db.js';

export function signUser(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, username: user.username || null, candidateId: user.candidateId || null },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function authenticateStaff(username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) return null;
  return { id: user.id, username: user.username, role: user.role };
}

export function authenticateCandidate(code) {
  const candidate = db.prepare('SELECT * FROM candidates WHERE code = ? AND active = 1')
    .get(String(code || '').trim().toUpperCase());
  if (!candidate) return null;
  return { id: candidate.id, role: 'candidate', candidateId: candidate.id, username: candidate.name };
}

export function expressAuth(roles = null) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
      const payload = verifyToken(token);
      if (roles && !roles.includes(payload.role)) return res.status(403).json({ error: 'Not allowed' });
      req.user = payload;
      if (payload.role === 'candidate' && payload.candidateId) {
        req.candidate = getCandidateById(payload.candidateId);
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

export function socketAuth(socket, next) {
  const auth = socket.handshake.auth || {};
  if (auth.display) {
    if (config.displayKey && auth.key !== config.displayKey) return next(new Error('Invalid display key'));
    socket.user = { role: 'display' };
    return next();
  }
  if (!auth.token) return next(new Error('Authentication required'));
  try {
    socket.user = verifyToken(auth.token);
    if (socket.user.role === 'candidate') {
      const c = getCandidateById(socket.user.candidateId);
      if (!c || !c.active) return next(new Error('Candidate account inactive'));
      socket.user.candidateId = c.id;
    }
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}
