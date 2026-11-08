import { useState, useCallback } from 'react';
import { useSocket } from '../socket.jsx';
import { useToast } from '../toast.jsx';

export function useAction() {
  const { emitAck } = useSocket();
  const { push } = useToast();
  const [busy, setBusy] = useState('');
  const run = useCallback(async (event, payload = {}, success = 'Done') => {
    setBusy(event);
    try {
      const res = await emitAck(event, payload);
      if (success) push(success, 'success');
      return res;
    } catch (err) {
      push(err.message, 'error');
      throw err;
    } finally { setBusy(''); }
  }, [emitAck, push]);
  return { run, busy };
}

export function phaseLabel(phase) {
  const map = {
    lobby: 'Lobby', round1: 'CBT in progress', round1_closed: 'CBT closed',
    round2_pick: 'Pick a number', round2_countdown: 'Get ready', round2_question: 'Answering',
    round2_reveal: 'Reveal', round2_done: 'Round 2 complete',
    round3_question: 'First to answer', round3_reveal: 'Reveal', round3_done: 'Round 3 complete',
    finished: 'Finished'
  };
  return map[phase] || phase;
}

export function phaseTone(phase) {
  if (!phase) return 'grey';
  if (phase.includes('reveal')) return 'gold';
  if (phase.includes('question') || phase.includes('countdown')) return 'red';
  if (phase.includes('done') || phase.includes('closed')) return 'blue';
  return 'green';
}
