import { socketAuth } from './auth.js';
import { getCandidateById } from './db.js';

function reply(ack, payload) { if (typeof ack === 'function') ack(payload); }
function ok(ack, data = {}) { reply(ack, { ok: true, ...data }); }
function fail(ack, err) { reply(ack, { ok: false, error: err?.message || String(err) }); }

export function registerSockets(io, engine) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join('all');
    if (user.role === 'admin' || user.role === 'scorekeeper') socket.join('admins');
    if (user.role === 'display') socket.join('display');
    if (user.role === 'candidate') {
      socket.join(`candidate:${user.candidateId}`);
      engine.setOnline(user.candidateId, true);
      socket.emit('round1:sync', engine.round1CandidateState(user.candidateId));
    }
    socket.emit('state:update', engine.getPublicState());
    if (user.role === 'admin' || user.role === 'scorekeeper') socket.emit('admin:state', engine.getAdminState());

    socket.on('disconnect', () => {
      if (user.role === 'candidate') engine.setOnline(user.candidateId, false);
    });

    socket.on('sync', (ack) => {
      try {
        socket.emit('state:update', engine.getPublicState());
        if (user.role === 'candidate') socket.emit('round1:sync', engine.round1CandidateState(user.candidateId));
        if (user.role === 'admin' || user.role === 'scorekeeper') socket.emit('admin:state', engine.getAdminState());
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    const adminOnly = (fn) => async (payload, ack) => {
      try {
        if (user.role !== 'admin') throw new Error('Admin access required');
        await fn(payload || {});
        ok(ack);
      } catch (e) { fail(ack, e); }
    };

    /* ------------------------------- ROUND 1 ------------------------------- */
    socket.on('round1:open', adminOnly(() => engine.openRound1(user.username || 'admin')));
    socket.on('round1:close', adminOnly(() => engine.closeRound1(user.username || 'admin')));
    socket.on('round1:qualify', adminOnly((payload) => engine.qualifyTop(user.username || 'admin', payload.count)));
    socket.on('round1:reset', adminOnly(() => engine.resetRound1(user.username || 'admin')));

    /* ------------------------------- ROUND 2 ------------------------------- */
    socket.on('round2:start', adminOnly((payload) => engine.startRound2(user.username || 'admin', { shuffleOrder: !!payload.shuffleOrder })));
    socket.on('round2:next', adminOnly(() => engine.nextRound2(user.username || 'admin')));
    socket.on('round2:reset', adminOnly(() => engine.resetRound2(user.username || 'admin')));

    /* ------------------------------- ROUND 3 ------------------------------- */
    socket.on('round3:start', adminOnly((payload) => engine.startRound3(user.username || 'admin', { shuffleQuestions: !!payload.shuffleQuestions })));
    socket.on('round3:next', adminOnly(() => engine.nextRound3(user.username || 'admin')));
    socket.on('round3:reset', adminOnly(() => engine.resetRound3(user.username || 'admin')));

    /* ------------------------------- SCORES -------------------------------- */
    socket.on('score:adjust', async (payload, ack) => {
      try {
        if (!['admin','scorekeeper'].includes(user.role)) throw new Error('Scorekeeper access required');
        engine.adjustScore(user.username || user.role, payload.candidateId, payload.round, payload.delta, payload.reason);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('game:reset', adminOnly(() => engine.resetAll(user.username || 'admin')));

    /* ------------------------------ CANDIDATE ------------------------------ */
    socket.on('round1:start', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        const state = engine.startRound1Session(user.candidateId);
        ok(ack, { state });
      } catch (e) { fail(ack, e); }
    });

    socket.on('round1:answer', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        const state = engine.answerRound1(user.candidateId, payload.questionId, payload.selectedIndex);
        ok(ack, { state });
      } catch (e) { fail(ack, e); }
    });

    socket.on('round1:submit', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        const state = engine.submitRound1(user.candidateId);
        ok(ack, { state });
      } catch (e) { fail(ack, e); }
    });

    socket.on('round2:pick', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        engine.pickRound2(user.candidateId, payload.number);
        ok(ack);
      } catch (e) { fail(ack, e); }
    });

    socket.on('round2:answer', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        const reveal = engine.answerRound2(user.candidateId, payload.selectedIndex);
        ok(ack, { reveal });
      } catch (e) { fail(ack, e); }
    });

    socket.on('round3:answer', async (payload, ack) => {
      try {
        if (user.role !== 'candidate') throw new Error('Candidate access required');
        const reveal = engine.answerRound3(user.candidateId, payload.selectedIndex);
        ok(ack, { reveal });
      } catch (e) { fail(ack, e); }
    });
  });
}
