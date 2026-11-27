import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSocket } from './socket.jsx';
import { initSound, play, setSoundEnabled, setUiSounds, soundEnabled } from './sound.js';

export function SoundBridge({ state, mode = 'ui' }) {
  const { state: liveState } = useSocket();
  const current = state || liveState;
  const prev = useRef({ phase: null, qid: null, reveal: null, submitted: 0, stage: 0 });

  useEffect(() => {
    initSound();
    setUiSounds(mode !== 'off');
    return () => setUiSounds(false);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'show' || !current) return;
    const p = prev.current;
    const phase = current.phase;
    const qid = current.round2?.question?.id || current.round3?.question?.id || null;
    const reveal = current.round2?.reveal || current.round3?.reveal || null;
    const revealKey = reveal ? `${reveal.question?.id || ''}:${reveal.candidate?.id || ''}:${reveal.points}:${reveal.responseMs}` : null;
    const stage = current.round2?.stageIndex || 0;

    if (phase !== p.phase) {
      if (phase === 'round1') play('start');
      if (phase === 'round2_countdown') play('countdown');
      if (phase === 'round3_question' && p.phase !== 'round3_question') play('readin');
      if (phase === 'round2_pick' && p.phase === 'round2_reveal') play(stage !== p.stage ? 'stage' : 'select');
      if (phase === 'round2_pick' && p.phase === 'round1_closed') play('stage');
      if (phase === 'round2_done') play('stage');
      if (['finished', 'round1_closed'].includes(phase) && !['finished', 'round1_closed'].includes(p.phase)) {
        play('fanfare');
        play('applause');
      }
    }
    if (qid && qid !== p.qid) {
      play('whoosh');
      play('question');
    }
    if (revealKey && revealKey !== p.reveal) {
      play(reveal.timedOut ? 'timeup' : reveal.isCorrect ? 'correct' : 'wrong');
    }
    if (phase === 'round1' && current.round1?.submitted > p.submitted) play('submit');

    prev.current = { phase, qid, reveal: revealKey, submitted: current.round1?.submitted || 0, stage };
  }, [current, mode]);

  useEffect(() => {
    if (mode !== 'show' || current?.phase !== 'round2_countdown') return;
    const id = setInterval(() => play('tick'), 1000);
    return () => clearInterval(id);
  }, [mode, current?.phase, current?.round2?.countdownEndsAt]);

  useEffect(() => {
    if (mode !== 'show' || current?.phase !== 'round3_question' || !current?.round3?.unlockAt) return;
    const unlockAt = current.round3.unlockAt;
    let last = null;
    let released = false;
    let id = null;
    const tick = () => {
      const left = unlockAt - Date.now();
      if (left <= 0) {
        if (!released) { released = true; play('unlock'); }
        if (id) clearInterval(id);
        return;
      }
      const second = Math.ceil(left / 1000);
      if (second !== last) { last = second; play('tick'); }
    };
    tick();
    if (!released) id = setInterval(tick, 250);
    return () => { if (id) clearInterval(id); };
  }, [mode, current?.phase, current?.round3?.unlockAt]);

  useEffect(() => {
    if (mode !== 'show' || current?.phase !== 'round3_question' || !current?.round3?.deadlineAt) return;
    const deadlineAt = current.round3.deadlineAt;
    let last = null;
    const id = setInterval(() => {
      const left = deadlineAt - Date.now();
      if (left <= 0 || left > 10000) { last = null; return; }
      const second = Math.ceil(left / 1000);
      if (second !== last) { last = second; play('tick'); }
    }, 250);
    return () => clearInterval(id);
  }, [mode, current?.phase, current?.round3?.deadlineAt]);

  return null;
}

export function SoundToggle() {
  const [on, setOn] = useState(soundEnabled());
  useEffect(() => {
    const update = () => setOn(soundEnabled());
    window.addEventListener('sound:change', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('sound:change', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return (
    <button
      className="icon-btn"
      title={on ? 'Mute sound effects' : 'Enable sound effects'}
      onClick={() => setSoundEnabled(!on)}
      data-sound="off"
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
