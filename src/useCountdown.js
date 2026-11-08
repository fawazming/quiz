import { useEffect, useRef, useState } from 'react';

export function useCountdown(deadline, serverTime, tick = 200) {
  const offsetRef = useRef(0);
  const [remaining, setRemaining] = useState(() => Math.max(0, (deadline || 0) - Date.now()));

  useEffect(() => {
    if (serverTime) offsetRef.current = serverTime - Date.now();
  }, [serverTime]);

  useEffect(() => {
    if (!deadline) { setRemaining(0); return; }
    const update = () => setRemaining(Math.max(0, deadline - (Date.now() + offsetRef.current)));
    update();
    const id = setInterval(update, tick);
    return () => clearInterval(id);
  }, [deadline, tick]);

  return remaining;
}

export function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatSeconds(ms) {
  return Math.max(0, Math.ceil(ms / 1000));
}
