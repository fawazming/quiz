import {
  db, transaction, getSettings, getGameState, saveGameState, getQuestions, getQuestionById,
  getCandidates, getCandidateById, getLeaderboard, publicCandidate, audit
} from './db.js';
import { round2Points, round3Points, speedFraction, nextTurnIndex } from './scoring.js';
import { config } from './config.js';

const adminsRoom = 'admins';

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function safeQuestion(q, reveal = false) {
  if (!q) return null;
  const base = {
    id: q.id, prompt: q.prompt, options: q.options, source: q.source,
    pdfRef: q.pdf_ref, topic: q.topic, module: q.module
  };
  if (reveal) {
    base.correctIndex = q.correct_index;
    base.explanation = q.explanation;
  }
  return base;
}

export class GameEngine {
  constructor(io) {
    this.io = io;
    this.state = getGameState();
    this.timers = new Map();
    this.online = new Set();
    this.resumeTimers();
  }

  settings() { return getSettings(); }
  save() { saveGameState(this.state); }
  schedule(key, at, fn) {
    this.clearTimer(key);
    const delay = Math.max(0, Number(at) - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(key);
      try { fn(); } catch (err) { console.error('[timer]', key, err); }
    }, delay);
    this.timers.set(key, timer);
  }
  clearTimer(key) {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }
  clearRoundTimers() {
    for (const key of [...this.timers.keys()]) this.clearTimer(key);
  }

  setOnline(candidateId, isOnline) {
    if (!candidateId) return;
    if (isOnline) this.online.add(Number(candidateId));
    else this.online.delete(Number(candidateId));
    this.broadcast();
  }

  log(actor, action, detail = '') {
    try { audit(actor, action, typeof detail === 'string' ? detail : JSON.stringify(detail)); } catch {}
  }

  publicQuestion(q, reveal = false) { return safeQuestion(q, reveal); }

  round1QuestionList() {
    const group = this.settings().round1_group_id;
    return getQuestions('round1')
      .filter(q => !group || q.group_id === group)
      .map(q => safeQuestion(q, false));
  }

  candidateSession(candidateId) {
    return db.prepare('SELECT * FROM round1_sessions WHERE candidate_id = ?').get(candidateId) || null;
  }

  round1CandidateState(candidateId) {
    const session = this.candidateSession(candidateId);
    const s = this.settings();
    if (!session) {
      return {
        open: this.state.round1.open,
        started: false,
        totalQuestions: Math.min(s.round1_question_count, this.round1QuestionList().length),
        deadlineAt: this.state.round1.endsAt,
        serverTime: Date.now()
      };
    }
    const answers = db.prepare('SELECT question_id, selected_index, is_correct FROM round1_answers WHERE session_id = ?').all(session.id);
    const answerMap = {};
    for (const a of answers) answerMap[a.question_id] = { selectedIndex: a.selected_index, isCorrect: !!a.is_correct };
    const all = getQuestions('round1').map(q => safeQuestion(q, false));
    let questions = all;
    if (session.question_order) {
      try {
        const byId = new Map(all.map(q => [q.id, q]));
        questions = JSON.parse(session.question_order).map(id => byId.get(id)).filter(Boolean);
      } catch {}
    }
    return {
      open: this.state.round1.open,
      started: true,
      sessionId: session.id,
      status: session.status,
      startedAt: session.started_at,
      deadlineAt: session.deadline_at,
      submittedAt: session.submitted_at,
      score: session.score,
      correctCount: session.correct_count,
      totalQuestions: session.total_questions,
      questions: questions.slice(0, session.total_questions),
      answers: answerMap,
      serverTime: Date.now()
    };
  }

  getPublicState() {
    const s = this.settings();
    const candidates = getCandidates().map(publicCandidate).map(c => ({ ...c, online: this.online.has(c.id) }));
    const leaderboard = getLeaderboard();
    const round1Sessions = db.prepare('SELECT status, COUNT(*) AS n FROM round1_sessions GROUP BY status').all();
    const submitted = round1Sessions.find(r => r.status === 'submitted')?.n || 0;
    const active = round1Sessions.find(r => r.status === 'active')?.n || 0;

    const round2 = this.state.round2;
    const round3 = this.state.round3;
    const activeCandidate = round2.activeCandidateId ? getCandidateById(round2.activeCandidateId) : null;
    const r2q = round2.questionId ? getQuestionById(round2.questionId) : null;
    const r3q = round3.questionId ? getQuestionById(round3.questionId) : null;

    return {
      serverTime: Date.now(),
      event: {
        name: s.event_name,
        theme: s.event_theme,
        date: s.event_date,
        sponsor: s.sponsor_name,
        sponsorUrl: s.sponsor_url
      },
      settings: {
        round1QuestionCount: s.round1_question_count,
        round1DurationMinutes: s.round1_duration_minutes,
        round1PointsPerCorrect: s.round1_points_per_correct,
        qualifyTopN: s.qualify_top_n,
        countdownSeconds: s.countdown_seconds,
        round2QuestionCount: s.round2_question_count,
        round2AnswerSeconds: s.round2_answer_seconds,
        round2BasePoints: s.round2_base_points,
        round2SpeedBonus: s.round2_speed_bonus,
        round2QualifyTopN: s.round2_qualify_top_n,
        round2QualifyBasis: s.round2_qualify_basis,
        round3QuestionCount: s.round3_question_count,
        round3AnswerSeconds: s.round3_answer_seconds,
        round3UnlockDelaySeconds: s.round3_unlock_delay_seconds,
        round3BasePoints: s.round3_base_points,
        round3SpeedBonus: s.round3_speed_bonus,
        round3WrongPenalty: s.round3_wrong_penalty,
        displayTheme: s.display_theme,
        round1GroupId: s.round1_group_id || '',
        round2GroupId: s.round2_group_id || '',
        round3GroupId: s.round3_group_id || '',
        round3LockOnFirstAnswer: !!s.round3_lock_on_first_answer,
        round1Shuffle: !!s.round1_shuffle,
        round3AutoRun: !!s.round3_auto_run,
        round3AutoAdvanceSeconds: s.round3_auto_advance_seconds,
        enabledRounds: { 1: !!s.round1_enabled, 2: !!s.round2_enabled, 3: !!s.round3_enabled },
        round1Label: s.round1_label,
        round2Label: s.round2_label,
        round3Label: s.round3_label,
        theme: { primary: s.theme_primary, accent: s.theme_accent, ink: s.theme_ink },
        branding: {
          org: s.brand_org,
          appName: s.brand_app_name,
          logoUrl: s.brand_logo_url,
          sponsorName: s.sponsor_name,
          sponsorLogoUrl: s.sponsor_logo_url,
          techPartnerName: s.tech_partner_name,
          techPartnerUrl: s.tech_partner_url,
          techPartnerLogoUrl: s.tech_partner_logo_url,
          backgroundUrl: s.brand_background_url,
          showSponsor: !!s.brand_show_sponsor
        }
      },
      round: this.state.round,
      phase: this.state.phase,
      candidates,
      leaderboard,
      stats: {
        totalCandidates: candidates.length,
        onlineCandidates: this.online.size,
        round1Submitted: submitted,
        round1Active: active,
        qualified: candidates.filter(c => c.qualified).length,
        round2Qualified: candidates.filter(c => c.round2Qualified).length
      },
      round1: {
        open: this.state.round1.open,
        startedAt: this.state.round1.startedAt,
        endsAt: this.state.round1.endsAt,
        totalQuestions: s.round1_question_count,
        submitted,
        active
      },
      round2: {
        phase: round2.phase,
        activeCandidate: activeCandidate ? publicCandidate(activeCandidate) : null,
        order: (round2.order || []).map(id => {
          const c = getCandidateById(id);
          return c ? publicCandidate(c) : null;
        }).filter(Boolean),
        turnIndex: round2.turnIndex,
        stageIndex: round2.stageIndex || 0,
        stageNumber: (round2.stageIndex || 0) + 1,
        stageCount: (round2.stages || []).length || round2.stageCount || 1,
        stageGroupId: round2.stageGroupId || '',
        stageGroupName: round2.stageGroupName || '',
        stageLabel: round2.stageLabel || '',
        stages: (round2.stages || []).map((st, i) => ({
          index: i,
          groupId: st.groupId || '',
          groupName: st.groupName || '',
          label: st.label || st.groupName || 'All groups',
          count: st.count || 0,
          pickedCount: i === (round2.stageIndex || 0) ? (round2.pickedNumbers || []).length : (st.pickedCount || 0)
        })),
        pickedNumbers: round2.pickedNumbers || [],
        totalNumbers: round2.totalNumbers || 0,
        activeNumber: round2.activeNumber,
        countdownEndsAt: round2.countdownEndsAt,
        deadlineAt: round2.deadlineAt,
        startedAt: round2.startedAt,
        question: r2q && (round2.phase === 'question' || round2.phase === 'reveal')
          ? safeQuestion(r2q, round2.phase === 'reveal') : null,
        reveal: round2.reveal,
        answerSeconds: s.round2_answer_seconds,
        countdownSeconds: s.countdown_seconds
      },
      round3: {
        phase: round3.phase,
        question: r3q && (round3.phase === 'question' || round3.phase === 'reveal')
          ? safeQuestion(r3q, round3.phase === 'reveal') : null,
        deadlineAt: round3.deadlineAt,
        startedAt: round3.startedAt,
        unlockAt: round3.unlockAt || round3.startedAt || null,
        unlockDelaySeconds: s.round3_unlock_delay_seconds,
        reveal: round3.reveal,
        autoAdvanceAt: round3.autoAdvanceAt || null,
        answerCount: r3q
          ? db.prepare('SELECT COUNT(*) AS n FROM round3_answers WHERE question_id = ?').get(r3q.id).n : 0,
        questionNumber: (round3.index ?? -1) + 1,
        totalQuestions: (round3.questionIds || []).length,
        eligibleIds: round3.eligibleIds || [],
        answerSeconds: s.round3_answer_seconds
      }
    };
  }

  getAdminState() {
    const pub = this.getPublicState();
    const s = this.settings();
    const sessions = db.prepare(`
      SELECT s.*, c.name, c.school FROM round1_sessions s
      JOIN candidates c ON c.id = s.candidate_id ORDER BY c.name
    `).all();
    const r2q = this.state.round2.questionId ? getQuestionById(this.state.round2.questionId) : null;
    const r3q = this.state.round3.questionId ? getQuestionById(this.state.round3.questionId) : null;
    return {
      ...pub,
      settings: s,
      candidates: getCandidates({ includeInactive: true }).map(c => ({
        ...publicCandidate(c), code: c.code, createdAt: c.created_at,
        disqualifiedReason: c.disqualified_reason || '', disqualifiedAt: c.disqualified_at || '', online: this.online.has(c.id)
      })),
      round1Sessions: sessions.map(x => ({
        candidateId: x.candidate_id, name: x.name, school: x.school, status: x.status,
        score: x.score, correctCount: x.correct_count, totalQuestions: x.total_questions,
        deadlineAt: x.deadline_at, submittedAt: x.submitted_at
      })),
      round2: {
        ...pub.round2,
        questionFull: r2q ? safeQuestion(r2q, true) : null
      },
      round3: {
        ...pub.round3,
        questionFull: r3q ? safeQuestion(r3q, true) : null
      }
    };
  }

  broadcast() {
    const pub = this.getPublicState();
    this.io.emit('state:update', pub);
    this.io.to(adminsRoom).emit('admin:state', this.getAdminState());
  }

  emitRound1(candidateId) {
    this.io.to(`candidate:${candidateId}`).emit('round1:sync', this.round1CandidateState(candidateId));
  }

  /* ------------------------------- ROUND 1 ------------------------------- */
  openRound1(actor = 'admin') {
    if (['round2_pick','round2_countdown','round2_question','round2_reveal','round3_question','round3_reveal'].includes(this.state.phase)) {
      throw new Error('Finish or reset the current round before reopening Round 1');
    }
    const s = this.settings();
    if (!s.round1_enabled) throw new Error('Round 1 is disabled in Settings');
    const now = Date.now();
    transaction(() => {
      db.prepare('DELETE FROM round1_answers').run();
      db.prepare('DELETE FROM round1_sessions').run();
      db.prepare('UPDATE candidates SET qualified = 0, round2_qualified = 0, disqualified = 0, disqualified_reason = NULL, disqualified_at = NULL').run();
    });
    this.state.round = 1;
    this.state.phase = 'round1';
    this.state.round1 = { open: true, startedAt: now, endsAt: now + s.round1_duration_minutes * 60_000 };
    this.save();
    for (const candidate of getCandidates()) this.emitRound1(candidate.id);
    this.schedule('round1:close', this.state.round1.endsAt, () => this.closeRound1('system'));
    this.log(actor, 'round1.open', { endsAt: this.state.round1.endsAt });
    this.broadcast();
    return this.getPublicState();
  }

  startRound1Session(candidateId) {
    const s = this.settings();
    if (!this.state.round1.open || this.state.phase !== 'round1') throw new Error('Round 1 is not open');
    if (Date.now() >= this.state.round1.endsAt) {
      this.closeRound1('system');
      throw new Error('Round 1 has ended');
    }
    const candidate = getCandidateById(candidateId);
    if (!candidate || !candidate.active) throw new Error('Candidate not found');
    if (candidate.disqualified) throw new Error('This candidate has been disqualified');
    let session = this.candidateSession(candidateId);
    if (session?.status === 'submitted') throw new Error('You have already submitted Round 1');
    if (!session) {
      const pool = this.round1QuestionList();
      const total = Math.min(s.round1_question_count, pool.length);
      if (total < 1) throw new Error('No Round 1 questions are available. Add or import questions first.');
      const selected = s.round1_shuffle ? shuffle(pool).slice(0, total) : pool.slice(0, total);
      const deadline = Math.min(this.state.round1.endsAt, Date.now() + s.round1_duration_minutes * 60_000);
      const info = db.prepare(`INSERT INTO round1_sessions
        (candidate_id, started_at, deadline_at, status, total_questions, question_order) VALUES (?, ?, ?, 'active', ?, ?)`)
        .run(candidateId, Date.now(), deadline, total, JSON.stringify(selected.map(q => q.id)));
      session = this.candidateSession(candidateId);
      this.log('candidate:' + candidateId, 'round1.start', { sessionId: info.lastInsertRowid });
    }
    this.emitRound1(candidateId);
    this.broadcast();
    return this.round1CandidateState(candidateId);
  }

  answerRound1(candidateId, questionId, selectedIndex) {
    const session = this.candidateSession(candidateId);
    if (!session) throw new Error('Start the test first');
    if (session.status !== 'active') throw new Error('This test has already been submitted');
    if (Date.now() > session.deadline_at) throw new Error('Time is up');
    const q = getQuestionById(questionId);
    if (!q || q.pool !== 'round1') throw new Error('Unknown Round 1 question');
    if (selectedIndex === null || selectedIndex === undefined) {
      db.prepare('DELETE FROM round1_answers WHERE session_id = ? AND question_id = ?').run(session.id, questionId);
    } else {
      const idx = Number(selectedIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error('Invalid option');
      const correct = idx === q.correct_index ? 1 : 0;
      db.prepare(`INSERT INTO round1_answers (session_id, question_id, selected_index, is_correct, answered_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(session_id, question_id) DO UPDATE SET selected_index=excluded.selected_index,
          is_correct=excluded.is_correct, answered_at=excluded.answered_at`)
        .run(session.id, questionId, idx, correct, Date.now());
    }
    this.emitRound1(candidateId);
    return this.round1CandidateState(candidateId);
  }

  submitRound1(candidateId) {
    const session = this.candidateSession(candidateId);
    if (!session) throw new Error('Start the test first');
    if (session.status === 'submitted') return this.round1CandidateState(candidateId);
    const s = this.settings();
    const row = db.prepare('SELECT COUNT(*) AS n FROM round1_answers WHERE session_id = ? AND is_correct = 1').get(session.id);
    const score = row.n * s.round1_points_per_correct;
    db.prepare(`UPDATE round1_sessions SET status='submitted', submitted_at=?, score=?, correct_count=? WHERE id=?`)
      .run(Date.now(), score, row.n, session.id);
    this.log('candidate:' + candidateId, 'round1.submit', { score, correct: row.n });
    this.emitRound1(candidateId);
    this.broadcast();
    return this.round1CandidateState(candidateId);
  }

  closeRound1(actor = 'admin') {
    this.clearTimer('round1:close');
    const s = this.settings();
    const sessions = db.prepare(`SELECT id, candidate_id FROM round1_sessions WHERE status='active'`).all();
    transaction(() => {
      for (const sess of sessions) {
        const row = db.prepare('SELECT COUNT(*) AS n FROM round1_answers WHERE session_id = ? AND is_correct = 1').get(sess.id);
        db.prepare(`UPDATE round1_sessions SET status='submitted', submitted_at=?, score=?, correct_count=? WHERE id=?`)
          .run(Date.now(), row.n * s.round1_points_per_correct, row.n, sess.id);
        this.emitRound1(sess.candidate_id);
      }
    });
    this.state.round1.open = false;
    this.state.phase = (s.round2_enabled || s.round3_enabled) ? 'round1_closed' : 'finished';
    this.state.round = 1;
    this.save();
    this.log(actor, 'round1.close', { finalized: sessions.length });
    this.broadcast();
    return this.getPublicState();
  }

  qualifyTop(actor = 'admin', count = null) {
    const s = this.settings();
    const eligible = getCandidates().filter(c => !c.disqualified);
    const n = Math.max(1, Math.min(Number(count || s.qualify_top_n), eligible.length));
    const lb = getLeaderboard().filter(x => !x.disqualified);
    const winnerIds = new Set(lb.slice(0, n).map(x => x.id));
    transaction(() => {
      for (const c of getCandidates()) {
        db.prepare('UPDATE candidates SET qualified = ?, round2_qualified = 0 WHERE id = ?')
          .run(winnerIds.has(c.id) && !c.disqualified ? 1 : 0, c.id);
      }
    });
    this.log(actor, 'round1.qualify', { count: n, ids: [...winnerIds] });
    this.broadcast();
    return { qualified: n };
  }

  qualifyRound2(actor = 'admin', count = null, basis = null) {
    const s = this.settings();
    const basisValue = ['total', 'round2', 'round1'].includes(basis) ? basis : (s.round2_qualify_basis || 'total');
    const participants = new Set(db.prepare('SELECT DISTINCT candidate_id FROM round2_picks').all().map(r => r.candidate_id));
    let pool = getCandidates().filter(c => !c.disqualified && (!participants.size || participants.has(c.id)));
    if (!pool.length) pool = getCandidates().filter(c => !c.disqualified);
    if (!pool.length) throw new Error('No eligible Round 2 candidates');
    const leaderboard = getLeaderboard();
    const score = (row) => basisValue === 'round2' ? row.round2 : basisValue === 'round1' ? row.round1 : row.total;
    const sorted = pool
      .map(c => leaderboard.find(x => x.id === c.id) || { id: c.id, name: c.name, school: c.school, total: 0, round1: 0, round2: 0, round3: 0 })
      .sort((a, b) => (score(b) - score(a)) || (b.total - a.total) || (b.round2 - a.round2) || (b.round3 - a.round3) || a.name.localeCompare(b.name));
    const n = Math.max(1, Math.min(Number(count ?? s.round2_qualify_top_n) || 1, sorted.length));
    const winnerIds = new Set(sorted.slice(0, n).map(x => x.id));
    transaction(() => {
      for (const c of getCandidates()) {
        db.prepare('UPDATE candidates SET round2_qualified = ? WHERE id = ?')
          .run(winnerIds.has(c.id) && !c.disqualified ? 1 : 0, c.id);
      }
    });
    if (this.state.round3?.eligibleIds?.length) {
      this.state.round3.eligibleIds = [...winnerIds];
      this.save();
    }
    this.log(actor, 'round2.qualify', { count: n, basis: basisValue, ids: [...winnerIds] });
    this.broadcast();
    return { qualified: n, basis: basisValue, ids: [...winnerIds] };
  }

  disqualifyCandidate(candidateId, reason, actor = 'admin') {
    const candidate = getCandidateById(candidateId);
    if (!candidate) throw new Error('Candidate not found');
    const why = String(reason || '').trim();
    if (why.length < 3) throw new Error('A disqualification reason is required');
    db.prepare(`UPDATE candidates SET disqualified = 1, disqualified_reason = ?, disqualified_at = datetime('now'), qualified = 0, round2_qualified = 0 WHERE id = ?`)
      .run(why, candidateId);
    if (this.state.round3?.eligibleIds) {
      this.state.round3.eligibleIds = this.state.round3.eligibleIds.filter(id => Number(id) !== Number(candidateId));
    }
    this.save();
    this.log(actor, 'candidate.disqualify', { candidateId, reason: why });
    this.broadcast();
  }

  reinstateCandidate(candidateId, actor = 'admin') {
    const candidate = getCandidateById(candidateId);
    if (!candidate) throw new Error('Candidate not found');
    db.prepare('UPDATE candidates SET disqualified = 0, disqualified_reason = NULL, disqualified_at = NULL WHERE id = ?').run(candidateId);
    this.save();
    this.log(actor, 'candidate.reinstate', { candidateId });
    this.broadcast();
  }

  resetRound1(actor = 'admin') {
    this.clearTimer('round1:close');
    db.prepare('DELETE FROM round1_answers').run();
    db.prepare('DELETE FROM round1_sessions').run();
    db.prepare('UPDATE candidates SET qualified = 0, round2_qualified = 0, disqualified = 0, disqualified_reason = NULL, disqualified_at = NULL').run();
    this.state.round1 = { open: false, startedAt: null, endsAt: null };
    if (this.state.round === 1) { this.state.round = 0; this.state.phase = 'lobby'; }
    this.save();
    for (const candidate of getCandidates()) this.emitRound1(candidate.id);
    this.log(actor, 'round1.reset');
    this.broadcast();
  }

  resetCandidateRound1(candidateId, actor = 'admin') {
    const session = this.candidateSession(candidateId);
    if (session) {
      db.prepare('DELETE FROM round1_answers WHERE session_id = ?').run(session.id);
      db.prepare('DELETE FROM round1_sessions WHERE id = ?').run(session.id);
    }
    this.emitRound1(candidateId);
    this.broadcast();
    this.log(actor, 'round1.reset_candidate', { candidateId });
  }

  /* ------------------------------- ROUND 2 ------------------------------- */
  buildRound2Stages(s) {
    let raw = s.round2_stages;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw || '[]'); } catch { raw = []; }
    }
    const configs = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item) continue;
        const cfg = typeof item === 'string' ? { groupId: item } : item;
        const groupId = String(cfg.groupId ?? cfg.group ?? '').trim();
        const count = Math.max(1, Number(cfg.count) || Number(s.round2_question_count) || 1);
        const label = String(cfg.label || '').trim().slice(0, 80);
        configs.push({ groupId, count, label });
      }
    }
    if (!configs.length) {
      configs.push({ groupId: s.round2_group_id || '', count: Number(s.round2_question_count) || 22, label: '' });
    }

    const groups = new Map(db.prepare('SELECT id, name FROM question_groups').all().map(g => [g.id, g.name]));
    const allRound2 = getQuestions('round2');
    const used = new Set();
    const stages = [];
    for (const cfg of configs) {
      let pool = allRound2
        .filter(q => !cfg.groupId || q.group_id === cfg.groupId)
        .map(q => q.id)
        .filter(id => !used.has(id));
      pool = shuffle(pool);
      const count = Math.min(cfg.count, pool.length);
      if (!count) continue;
      const numbers = {};
      for (let i = 0; i < count; i++) {
        numbers[String(i + 1)] = pool[i];
        used.add(pool[i]);
      }
      const groupName = cfg.groupId ? (groups.get(cfg.groupId) || '') : '';
      stages.push({
        index: stages.length,
        groupId: cfg.groupId,
        groupName,
        label: cfg.label || groupName || 'All groups',
        count,
        numbers,
        pickedCount: 0
      });
    }
    return stages;
  }

  applyRound2Stage(index) {
    const r2 = this.state.round2;
    const stage = (r2.stages || [])[index];
    if (!stage) return false;
    r2.stageIndex = index;
    r2.stageCount = r2.stages.length;
    r2.stageGroupId = stage.groupId || '';
    r2.stageGroupName = stage.groupName || '';
    r2.stageLabel = stage.label || stage.groupName || 'All groups';
    r2.numbers = stage.numbers || {};
    r2.totalNumbers = stage.count || 0;
    r2.pickedNumbers = [];
    r2.phase = 'pick';
    r2.turnIndex = 0;
    r2.activeCandidateId = (r2.order || [])[0] || null;
    r2.activeNumber = null;
    r2.questionId = null;
    r2.startedAt = null;
    r2.countdownEndsAt = null;
    r2.deadlineAt = null;
    r2.reveal = null;
    stage.pickedCount = 0;
    return true;
  }

  startRound2(actor = 'admin', { shuffleOrder = false } = {}) {
    if (!this.settings().round2_enabled) throw new Error('Round 2 is disabled in Settings');
    if (!['idle','done'].includes(this.state.round2.phase)) throw new Error('Round 2 is already in progress or awaiting a reset');
    const s = this.settings();
    db.prepare('DELETE FROM round2_picks').run();
    db.prepare('UPDATE candidates SET round2_qualified = 0').run();
    let qualified = getCandidates().filter(c => c.qualified && !c.disqualified);
    if (!qualified.length) qualified = getCandidates().filter(c => !c.disqualified);
    if (qualified.length < 1) throw new Error('At least one active candidate is required');
    let order;
    if (shuffleOrder) order = shuffle(qualified).map(c => c.id);
    else {
      const lb = getLeaderboard();
      order = qualified.map(c => c.id).sort((a, b) => {
        const ra = lb.find(x => x.id === a)?.round1 ?? 0;
        const rb = lb.find(x => x.id === b)?.round1 ?? 0;
        return rb - ra;
      });
    }
    const stages = this.buildRound2Stages(s);
    if (!stages.length) throw new Error('No Round 2 questions are available for the configured stages. Add or import questions first.');
    this.clearRoundTimers();
    this.state.round = 2;
    this.state.phase = 'round2_pick';
    this.state.round2 = {
      phase: 'pick', stages, stageIndex: 0, stageCount: stages.length,
      stageGroupId: '', stageGroupName: '', stageLabel: '',
      order, turnIndex: 0, activeCandidateId: null,
      numbers: {}, pickedNumbers: [], totalNumbers: 0, activeNumber: null,
      questionId: null, startedAt: null, countdownEndsAt: null, deadlineAt: null,
      reveal: null, answerSeconds: s.round2_answer_seconds, countdownSeconds: s.countdown_seconds
    };
    this.applyRound2Stage(0);
    this.save();
    this.log(actor, 'round2.start', {
      candidates: order.length,
      stages: stages.map(st => ({ group: st.groupName || st.label, questions: st.count }))
    });
    this.broadcast();
    return this.getPublicState();
  }

  pickRound2(candidateId, number) {
    const candidate = getCandidateById(candidateId);
    if (!candidate || candidate.disqualified) throw new Error('You are not eligible for this round');
    const r2 = this.state.round2;
    if (r2.phase !== 'pick') throw new Error('It is not time to pick a number');
    if (Number(r2.activeCandidateId) !== Number(candidateId)) throw new Error('It is not your turn');
    const key = String(number);
    if (!r2.numbers[key]) throw new Error('That number is not available');
    if (r2.pickedNumbers.map(String).includes(key)) throw new Error('That number has been picked');
    const s = this.settings();
    r2.pickedNumbers.push(Number(number));
    const stage = (r2.stages || [])[r2.stageIndex];
    if (stage) stage.pickedCount = r2.pickedNumbers.length;
    r2.activeNumber = Number(number);
    r2.questionId = r2.numbers[key];
    r2.phase = 'countdown';
    r2.countdownEndsAt = Date.now() + s.countdown_seconds * 1000;
    r2.deadlineAt = null;
    r2.startedAt = null;
    r2.reveal = null;
    r2.countdownSeconds = s.countdown_seconds;
    this.state.phase = 'round2_countdown';
    this.save();
    this.log('candidate:' + candidateId, 'round2.pick', { number, questionId: r2.questionId });
    this.broadcast();
    this.schedule('round2:question', r2.countdownEndsAt, () => this.beginRound2Question());
    return this.getPublicState();
  }

  beginRound2Question() {
    const r2 = this.state.round2;
    if (r2.phase !== 'countdown' || !r2.questionId) return;
    const s = this.settings();
    r2.phase = 'question';
    r2.startedAt = Date.now();
    r2.deadlineAt = Date.now() + s.round2_answer_seconds * 1000;
    r2.countdownEndsAt = null;
    this.state.phase = 'round2_question';
    const exists = db.prepare('SELECT id FROM round2_picks WHERE question_id = ?').get(r2.questionId);
    if (!exists) {
      db.prepare(`INSERT INTO round2_picks (candidate_id, number, stage, stage_label, question_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`)
        .run(r2.activeCandidateId, r2.activeNumber, r2.stageIndex || 0, r2.stageLabel || '', r2.questionId, Date.now());
    }
    this.save();
    this.broadcast();
    this.schedule('round2:timeout', r2.deadlineAt, () => this.timeoutRound2());
  }

  answerRound2(candidateId, selectedIndex) {
    const candidate = getCandidateById(candidateId);
    if (!candidate || candidate.disqualified) throw new Error('You are not eligible for this round');
    const r2 = this.state.round2;
    if (r2.phase !== 'question') throw new Error('The question is not open');
    if (Number(r2.activeCandidateId) !== Number(candidateId)) throw new Error('It is not your turn');
    if (Date.now() > r2.deadlineAt) { this.timeoutRound2(); throw new Error('Time is up'); }
    const idx = Number(selectedIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error('Invalid option');
    const q = getQuestionById(r2.questionId);
    if (!q) throw new Error('Question not found');
    const s = this.settings();
    const isCorrect = idx === q.correct_index;
    const points = round2Points({
      isCorrect, startedAt: r2.startedAt, deadlineAt: r2.deadlineAt,
      basePoints: s.round2_base_points, speedBonus: s.round2_speed_bonus
    });
    const response = Date.now() - r2.startedAt;
    db.prepare(`UPDATE round2_picks SET selected_index=?, is_correct=?, response_ms=?, points=?
      WHERE question_id=? AND candidate_id=?`)
      .run(idx, isCorrect ? 1 : 0, response, points, r2.questionId, candidateId);
    r2.phase = 'reveal';
    r2.reveal = {
      type: 'round2',
      candidate: publicCandidate(getCandidateById(candidateId)),
      question: safeQuestion(q, true),
      selectedIndex: idx,
      isCorrect,
      points,
      responseMs: response,
      number: r2.activeNumber,
      stageNumber: (r2.stageIndex || 0) + 1,
      stageCount: (r2.stages || []).length || 1,
      stageLabel: r2.stageLabel || '',
      timedOut: false
    };
    this.state.phase = 'round2_reveal';
    this.clearTimer('round2:timeout');
    this.save();
    this.log('candidate:' + candidateId, 'round2.answer', { isCorrect, points, questionId: r2.questionId });
    this.broadcast();
    return r2.reveal;
  }

  timeoutRound2() {
    const r2 = this.state.round2;
    if (r2.phase !== 'question') return;
    const q = getQuestionById(r2.questionId);
    db.prepare(`UPDATE round2_picks SET selected_index=NULL, is_correct=0, response_ms=NULL, points=0
      WHERE question_id=? AND candidate_id=?`).run(r2.questionId, r2.activeCandidateId);
    r2.phase = 'reveal';
    r2.reveal = {
      type: 'round2', candidate: publicCandidate(getCandidateById(r2.activeCandidateId)),
      question: q ? safeQuestion(q, true) : null, selectedIndex: null, isCorrect: false,
      points: 0, responseMs: null, number: r2.activeNumber,
      stageNumber: (r2.stageIndex || 0) + 1,
      stageCount: (r2.stages || []).length || 1,
      stageLabel: r2.stageLabel || '', timedOut: true
    };
    this.state.phase = 'round2_reveal';
    this.clearTimer('round2:timeout');
    this.save();
    this.broadcast();
  }

  nextRound2(actor = 'admin') {
    const r2 = this.state.round2;
    this.clearTimer('round2:timeout');
    this.clearTimer('round2:question');
    const remaining = (r2.totalNumbers || 0) - (r2.pickedNumbers || []).length;
    if (!r2.order.length) {
      r2.phase = 'done';
      r2.activeCandidateId = null;
      r2.questionId = null;
      r2.deadlineAt = null;
      this.state.phase = this.settings().round3_enabled ? 'round2_done' : 'finished';
      this.save();
      this.broadcast();
      return;
    }
    if (remaining <= 0) {
      const nextStage = (r2.stageIndex || 0) + 1;
      if ((r2.stages || []).length > nextStage) {
        const shift = nextStage % r2.order.length;
        r2.order = [...r2.order.slice(shift), ...r2.order.slice(0, shift)];
        this.applyRound2Stage(nextStage);
        this.state.phase = 'round2_pick';
        this.save();
        this.log(actor, 'round2.stage', {
          stage: nextStage + 1,
          totalStages: r2.stages.length,
          group: r2.stageGroupName || r2.stageLabel || 'All groups'
        });
        this.broadcast();
        return;
      }
      r2.phase = 'done';
      r2.activeCandidateId = null;
      r2.questionId = null;
      r2.deadlineAt = null;
      this.state.phase = this.settings().round3_enabled ? 'round2_done' : 'finished';
      this.save();
      this.broadcast();
      return;
    }
    r2.turnIndex = nextTurnIndex(r2.order, r2.turnIndex, remaining);
    r2.activeCandidateId = r2.order[r2.turnIndex];
    r2.phase = 'pick';
    r2.activeNumber = null;
    r2.questionId = null;
    r2.startedAt = null;
    r2.countdownEndsAt = null;
    r2.deadlineAt = null;
    r2.reveal = null;
    this.state.phase = 'round2_pick';
    this.save();
    this.log(actor, 'round2.next', { activeCandidateId: r2.activeCandidateId });
    this.broadcast();
  }

  endRound2(actor = 'admin') {
    this.clearRoundTimers();
    const r2 = this.state.round2;
    r2.phase = 'done';
    r2.activeCandidateId = null;
    r2.questionId = null;
    r2.deadlineAt = null;
    r2.countdownEndsAt = null;
    this.state.phase = this.settings().round3_enabled ? 'round2_done' : 'finished';
    this.save();
    this.log(actor, 'round2.end');
    this.broadcast();
  }

  resetRound2(actor = 'admin') {
    this.clearRoundTimers();
    db.prepare('DELETE FROM round2_picks').run();
    db.prepare('UPDATE candidates SET round2_qualified = 0').run();
    this.state.round2 = {
      phase: 'idle', order: [], turnIndex: 0, activeCandidateId: null,
      stages: [], stageIndex: 0, stageCount: 1, stageGroupId: '', stageGroupName: '', stageLabel: '',
      numbers: {}, pickedNumbers: [], totalNumbers: 0, activeNumber: null, questionId: null,
      startedAt: null, countdownEndsAt: null, deadlineAt: null, reveal: null,
      eligibleIds: [], answerSeconds: this.settings().round2_answer_seconds, countdownSeconds: this.settings().countdown_seconds
    };
    if (this.state.round === 2) { this.state.round = 0; this.state.phase = 'lobby'; }
    this.save();
    this.log(actor, 'round2.reset');
    this.broadcast();
  }

  /* ------------------------------- ROUND 3 ------------------------------- */
  startRound3(actor = 'admin', { shuffleQuestions = false } = {}) {
    if (!this.settings().round3_enabled) throw new Error('Round 3 is disabled in Settings');
    if (!['idle','done'].includes(this.state.round3.phase)) throw new Error('Round 3 is already in progress or awaiting a reset');
    const s = this.settings();
    let eligible = getCandidates().filter(c => c.round2_qualified && !c.disqualified);
    if (!eligible.length) eligible = getCandidates().filter(c => c.qualified && !c.disqualified);
    if (!eligible.length) eligible = getCandidates().filter(c => !c.disqualified);
    if (!eligible.length) throw new Error('Add or activate candidates before starting Round 3');
    db.prepare('DELETE FROM round3_answers').run();
    const r3group = s.round3_group_id;
    let pool = getQuestions('round3').filter(q => !r3group || q.group_id === r3group).map(q => q.id);
    if (shuffleQuestions) pool = shuffle(pool);
    const count = Math.min(s.round3_question_count, pool.length);
    pool = pool.slice(0, count);
    if (!pool.length) throw new Error('No Round 3 questions available');
    const delayMs = Math.max(0, Number(s.round3_unlock_delay_seconds || 0)) * 1000;
    const unlockAt = Date.now() + delayMs;
    this.clearRoundTimers();
    this.state.round = 3;
    this.state.round3 = {
      phase: 'question', questionIds: pool, index: 0, questionId: pool[0],
      startedAt: unlockAt, unlockAt, deadlineAt: unlockAt + s.round3_answer_seconds * 1000,
      reveal: null, autoAdvanceAt: null, eligibleIds: eligible.map(c => c.id),
      answerSeconds: s.round3_answer_seconds, unlockDelaySeconds: Math.round(delayMs / 1000)
    };
    this.state.phase = 'round3_question';
    this.save();
    this.schedule('round3:timeout', this.state.round3.deadlineAt, () => this.timeoutRound3());
    this.log(actor, 'round3.start', { questions: count, finalists: eligible.length, unlockDelaySeconds: Math.round(delayMs / 1000) });
    this.broadcast();
  }

  armRound3Auto() {
    this.clearTimer('round3:auto');
    const s = this.settings();
    if (!s.round3_auto_run) {
      this.state.round3.autoAdvanceAt = null;
      return;
    }
    const at = Date.now() + Math.max(1, Number(s.round3_auto_advance_seconds || 5)) * 1000;
    this.state.round3.autoAdvanceAt = at;
    this.schedule('round3:auto', at, () => {
      if (this.state.round3.phase === 'reveal') this.nextRound3('auto');
    });
  }

  answerRound3(candidateId, selectedIndex) {
    const r3 = this.state.round3;
    if (this.state.round !== 3 || r3.phase !== 'question') throw new Error('Round 3 is not open');
    const unlockAt = r3.unlockAt || r3.startedAt || 0;
    if (Date.now() < unlockAt) {
      const seconds = Math.max(1, Math.ceil((unlockAt - Date.now()) / 1000));
      throw new Error(`Question unlocks in ${seconds} second${seconds === 1 ? '' : 's'}`);
    }
    if (Date.now() > r3.deadlineAt) { this.timeoutRound3(); throw new Error('Time is up'); }
    const candidate = getCandidateById(candidateId);
    if (!candidate || !candidate.active) throw new Error('Candidate not found');
    if (candidate.disqualified) throw new Error('This candidate has been disqualified');
    const eligibleIds = r3.eligibleIds || [];
    if (eligibleIds.length ? !eligibleIds.includes(candidateId) : !candidate.qualified) {
      throw new Error('You are not eligible for Round 3');
    }
    if (db.prepare('SELECT 1 FROM round3_answers WHERE question_id = ?').get(r3.questionId)) {
      throw new Error('Someone answered first — this question is locked');
    }
    const idx = Number(selectedIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) throw new Error('Invalid option');
    const q = getQuestionById(r3.questionId);
    if (!q) throw new Error('Question not found');
    const s = this.settings();
    const isCorrect = idx === q.correct_index;
    const response = Date.now() - r3.startedAt;
    const points = round3Points({
      isCorrect, startedAt: r3.startedAt, deadlineAt: r3.deadlineAt,
      basePoints: s.round3_base_points, speedBonus: s.round3_speed_bonus,
      wrongPenalty: s.round3_wrong_penalty
    });
    db.prepare(`INSERT INTO round3_answers (question_id, candidate_id, selected_index, is_correct, response_ms, points, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(r3.questionId, candidateId, idx, isCorrect ? 1 : 0, response, points, Date.now());
    r3.phase = 'reveal';
    r3.reveal = {
      type: 'round3', candidate: publicCandidate(candidate), question: safeQuestion(q, true),
      selectedIndex: idx, isCorrect, points, responseMs: response, timedOut: false
    };
    this.state.phase = 'round3_reveal';
    this.clearTimer('round3:timeout');
    this.armRound3Auto();
    this.save();
    this.log('candidate:' + candidateId, 'round3.answer', { isCorrect, points, responseMs: response, questionId: r3.questionId });
    this.broadcast();
    return r3.reveal;
  }

  timeoutRound3() {
    const r3 = this.state.round3;
    if (r3.phase !== 'question') return;
    const q = getQuestionById(r3.questionId);
    r3.phase = 'reveal';
    r3.reveal = {
      type: 'round3', candidate: null, question: q ? safeQuestion(q, true) : null,
      selectedIndex: null, isCorrect: false, points: 0, responseMs: null, timedOut: true
    };
    this.state.phase = 'round3_reveal';
    this.clearTimer('round3:timeout');
    this.armRound3Auto();
    this.save();
    this.broadcast();
  }

  nextRound3(actor = 'admin') {
    const r3 = this.state.round3;
    this.clearTimer('round3:timeout');
    this.clearTimer('round3:auto');
    r3.autoAdvanceAt = null;
    const next = (r3.index ?? -1) + 1;
    if (next >= (r3.questionIds || []).length) {
      r3.phase = 'done';
      this.state.phase = 'round3_done';
      this.save();
      this.broadcast();
      return;
    }
    const s = this.settings();
    const delayMs = Math.max(0, Number(s.round3_unlock_delay_seconds || 0)) * 1000;
    r3.index = next;
    r3.questionId = r3.questionIds[next];
    r3.phase = 'question';
    r3.unlockAt = Date.now() + delayMs;
    r3.startedAt = r3.unlockAt;
    r3.deadlineAt = r3.unlockAt + s.round3_answer_seconds * 1000;
    r3.unlockDelaySeconds = Math.round(delayMs / 1000);
    r3.reveal = null;
    this.state.phase = 'round3_question';
    this.save();
    this.schedule('round3:timeout', r3.deadlineAt, () => this.timeoutRound3());
    this.log(actor, 'round3.next', { index: next, unlockDelaySeconds: Math.round(delayMs / 1000) });
    this.broadcast();
  }

  endRound3(actor = 'admin') {
    this.clearRoundTimers();
    this.clearTimer('round3:auto');
    const r3 = this.state.round3;
    r3.phase = 'done';
    this.state.phase = 'finished';
    this.save();
    this.log(actor, 'round3.end');
    this.broadcast();
  }

  finishEvent(actor = 'admin') {
    this.clearRoundTimers();
    this.clearTimer('round3:auto');
    this.state.phase = 'finished';
    this.save();
    this.log(actor, 'event.finish');
    this.broadcast();
  }

  resetRound3(actor = 'admin') {
    this.clearRoundTimers();
    db.prepare('DELETE FROM round3_answers').run();
    this.state.round3 = {
      phase: 'idle', questionIds: [], index: -1, questionId: null,
      startedAt: null, unlockAt: null, deadlineAt: null, reveal: null,
      answerSeconds: this.settings().round3_answer_seconds,
      unlockDelaySeconds: this.settings().round3_unlock_delay_seconds
    };
    if (this.state.round === 3) { this.state.round = 0; this.state.phase = 'lobby'; }
    this.save();
    this.log(actor, 'round3.reset');
    this.broadcast();
  }

  getRoundProbe(round) {
    const n = Number(round);
    if (![1, 2, 3].includes(n)) throw new Error('Round must be 1, 2 or 3');
    const q = (row) => {
      if (!row) return row;
      const { options_json, ...rest } = row;
      let options = [];
      try { options = JSON.parse(options_json || '[]'); } catch {}
      return { ...rest, options, isCorrect: rest.is_correct === 1 };
    };
    let summary = {};
    let sessions = [];
    let answers = [];
    let picks = [];
    if (n === 1) {
      sessions = db.prepare(`
        SELECT s.id, s.candidate_id, c.name, c.school, s.status, s.score, s.correct_count,
          s.total_questions, s.started_at, s.submitted_at, s.deadline_at,
          (SELECT COUNT(*) FROM round1_answers a WHERE a.session_id = s.id) AS answered_count
        FROM round1_sessions s JOIN candidates c ON c.id = s.candidate_id
        ORDER BY c.name COLLATE NOCASE
      `).all();
      answers = db.prepare(`
        SELECT a.session_id, a.question_id, a.selected_index, a.is_correct, a.answered_at,
          q.prompt, q.options_json, q.correct_index, q.topic, q.pdf_ref, q.source
        FROM round1_answers a JOIN questions q ON q.id = a.question_id
        ORDER BY a.session_id, q.sort_order
      `).all().map(q);
      summary = {
        sessions: sessions.length,
        submitted: sessions.filter(x => x.status === 'submitted').length,
        active: sessions.filter(x => x.status === 'active').length,
        answers: answers.length
      };
    } else if (n === 2) {
      picks = db.prepare(`
        SELECT p.id, p.candidate_id, c.name, c.school, p.number, p.stage, p.stage_label,
          p.question_id, q.prompt, q.options_json, q.correct_index, q.topic, q.pdf_ref, q.source,
          p.selected_index, p.is_correct, p.response_ms, p.points, p.created_at
        FROM round2_picks p
        JOIN candidates c ON c.id = p.candidate_id
        JOIN questions q ON q.id = p.question_id
        ORDER BY p.created_at, p.id
      `).all().map(q).map(r => ({ ...r, stageNumber: (r.stage || 0) + 1 }));
      summary = {
        picks: picks.length,
        candidates: new Set(picks.map(x => x.candidate_id)).size,
        correct: picks.filter(x => x.isCorrect).length,
        points: picks.reduce((sum, x) => sum + (x.points || 0), 0),
        stages: (this.state.round2.stages || []).length
      };
    } else {
      answers = db.prepare(`
        SELECT a.id, a.question_id, a.candidate_id, c.name, c.school,
          q.prompt, q.options_json, q.correct_index, q.topic, q.pdf_ref, q.source,
          a.selected_index, a.is_correct, a.response_ms, a.points, a.created_at
        FROM round3_answers a
        JOIN candidates c ON c.id = a.candidate_id
        JOIN questions q ON q.id = a.question_id
        ORDER BY a.created_at, a.id
      `).all().map(q).map(r => ({ ...r, isCorrect: r.isCorrect === true || r.is_correct === 1 }));
      summary = {
        answers: answers.length,
        correct: answers.filter(x => x.isCorrect).length,
        points: answers.reduce((sum, x) => sum + (x.points || 0), 0)
      };
    }
    const auditRows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 500').all();
    const auditTrail = auditRows.filter(row => {
      if (row.action.startsWith(`round${n}.`)) return true;
      if (row.action === 'score.adjust') {
        try { return Number(JSON.parse(row.detail).round) === n; } catch { return false; }
      }
      return false;
    }).map(row => ({ ...row, detail: row.detail || '' }));
    return { round: n, generatedAt: Date.now(), summary, sessions, answers, picks, audit: auditTrail };
  }

  adjustScore(actor, candidateId, round, delta, reason) {
    const d = Number(delta);
    if (!Number.isInteger(d) || d === 0) throw new Error('Delta must be a non-zero integer');
    if (![1,2,3].includes(Number(round))) throw new Error('Round must be 1, 2 or 3');
    if (!getCandidateById(candidateId)) throw new Error('Candidate not found');
    if (!reason || String(reason).trim().length < 3) throw new Error('A reason is required');
    db.prepare('INSERT INTO score_adjustments (candidate_id, round, delta, reason, actor) VALUES (?, ?, ?, ?, ?)')
      .run(candidateId, Number(round), d, String(reason).trim(), String(actor));
    this.log(actor, 'score.adjust', { candidateId, round, delta: d, reason });
    this.broadcast();
  }

  resetAll(actor = 'admin') {
    this.clearRoundTimers();
    db.prepare('DELETE FROM round1_answers').run();
    db.prepare('DELETE FROM round1_sessions').run();
    db.prepare('DELETE FROM round2_picks').run();
    db.prepare('DELETE FROM round3_answers').run();
    db.prepare('DELETE FROM score_adjustments').run();
    db.prepare('UPDATE candidates SET qualified = 0, round2_qualified = 0, disqualified = 0, disqualified_reason = NULL, disqualified_at = NULL').run();
    this.state = {
      round: 0, phase: 'lobby',
      round1: { open: false, startedAt: null, endsAt: null },
      round2: {
        phase: 'idle', order: [], turnIndex: 0, activeCandidateId: null,
        stages: [], stageIndex: 0, stageCount: 1, stageGroupId: '', stageGroupName: '', stageLabel: '',
        numbers: {}, pickedNumbers: [], totalNumbers: 0, activeNumber: null, questionId: null,
        startedAt: null, countdownEndsAt: null, deadlineAt: null, reveal: null,
        answerSeconds: this.settings().round2_answer_seconds, countdownSeconds: this.settings().countdown_seconds
      },
      round3: {
        phase: 'idle', questionIds: [], index: -1, questionId: null,
        startedAt: null, unlockAt: null, deadlineAt: null, reveal: null, eligibleIds: [],
        answerSeconds: this.settings().round3_answer_seconds, unlockDelaySeconds: this.settings().round3_unlock_delay_seconds
      },
      updatedAt: Date.now()
    };
    this.save();
    for (const candidate of getCandidates()) this.emitRound1(candidate.id);
    this.log(actor, 'game.reset');
    this.broadcast();
  }

  reloadFromDatabase() {
    this.clearRoundTimers();
    this.state = getGameState();
    this.resumeTimers();
    this.broadcast();
  }

  resumeTimers() {
    const now = Date.now();
    const r1 = this.state.round1;
    if (r1.open && r1.endsAt) {
      if (now >= r1.endsAt) setTimeout(() => this.closeRound1('system'), 100);
      else this.schedule('round1:close', r1.endsAt, () => this.closeRound1('system'));
    }
    const r2 = this.state.round2;
    if (r2.phase === 'countdown' && r2.countdownEndsAt) {
      if (now >= r2.countdownEndsAt) setTimeout(() => this.beginRound2Question(), 100);
      else this.schedule('round2:question', r2.countdownEndsAt, () => this.beginRound2Question());
    }
    if (r2.phase === 'question' && r2.deadlineAt) {
      if (now >= r2.deadlineAt) setTimeout(() => this.timeoutRound2(), 100);
      else this.schedule('round2:timeout', r2.deadlineAt, () => this.timeoutRound2());
    }
    const r3 = this.state.round3;
    if (r3.phase === 'reveal' && r3.autoAdvanceAt) {
      if (now >= r3.autoAdvanceAt) setTimeout(() => this.nextRound3('auto'), 100);
      else this.schedule('round3:auto', r3.autoAdvanceAt, () => { if (this.state.round3.phase === 'reveal') this.nextRound3('auto'); });
    }
    if (r3.phase === 'question' && r3.deadlineAt) {
      if (now >= r3.deadlineAt) setTimeout(() => this.timeoutRound3(), 100);
      else this.schedule('round3:timeout', r3.deadlineAt, () => this.timeoutRound3());
    }
  }
}
