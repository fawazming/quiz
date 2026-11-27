let ctx = null;
let master = null;
let compressor = null;
let enabled = (() => { try { return localStorage.getItem('ict_sound') !== 'off'; } catch { return true; } })();
let uiAllowed = false;
let preloaded = false;
let inited = false;
const cache = new Map();

const KEY = 'ict_sound';

function context() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 20;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.22;
    master = ctx.createGain();
    master.gain.value = 1.18;
    master.connect(compressor);
    compressor.connect(ctx.destination);
  }
  return ctx;
}

function ensure() {
  const c = context();
  if (!c) return null;
  if (c.state === 'suspended') c.resume().catch(() => {});
  return c;
}

function wave(type, phase) {
  if (type === 'sine') return Math.sin(phase * Math.PI * 2);
  if (type === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase * Math.PI * 2));
  if (type === 'saw') return 2 * (phase - Math.floor(phase + 0.5));
  if (type === 'square') return Math.sin(phase * Math.PI * 2) >= 0 ? 1 : -1;
  return Math.sin(phase * Math.PI * 2);
}

function render(seconds, fn) {
  const c = ensure();
  if (!c) return null;
  const length = Math.max(1, Math.floor(c.sampleRate * seconds));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  const rate = c.sampleRate;
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    data[i] = Math.max(-1, Math.min(1, fn(t, i / length, rate)));
  }
  return buffer;
}

function env(t, attack, decay) {
  if (t < attack) return t / attack;
  return Math.exp(-(t - attack) / decay);
}

function tone(t, freq, type = 'sine', volume = 0.3, attack = 0.005, decay = 0.2, slide = 0) {
  const f = freq + slide * t;
  return wave(type, f * t) * env(t, attack, decay) * volume;
}

function build(name) {
  if (cache.has(name)) return cache.get(name);
  let buffer = null;
  switch (name) {
    case 'click':
      buffer = render(0.055, (t) => tone(t, 1650, 'sine', 0.32, 0.001, 0.018) + tone(t, 920, 'triangle', 0.15, 0.001, 0.012) + (Math.random() - 0.5) * 0.055 * Math.exp(-t * 90));
      break;
    case 'select':
      buffer = render(0.11, (t) => tone(t, 620, 'sine', 0.34, 0.002, 0.035, 260) + tone(t, 1240, 'triangle', 0.1, 0.002, 0.025));
      break;
    case 'tick':
      buffer = render(0.07, (t) => tone(t, 1180, 'sine', 0.3, 0.001, 0.022) + tone(t, 2360, 'sine', 0.07, 0.001, 0.015));
      break;
    case 'question':
      buffer = render(0.32, (t) => tone(t, 300, 'sine', 0.26, 0.01, 0.12, 540) + tone(t, 900, 'triangle', 0.08, 0.01, 0.09, 240) + (Math.random() - 0.5) * 0.035 * Math.exp(-t * 8));
      break;
    case 'countdown':
      buffer = render(0.18, (t) => tone(t, 520, 'triangle', 0.28, 0.005, 0.08, 140) + tone(t, 1040, 'sine', 0.09, 0.005, 0.06));
      break;
    case 'correct': {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      buffer = render(0.7, (t) => {
        let s = 0;
        notes.forEach((f, i) => {
          const start = i * 0.09;
          if (t >= start) s += tone(t - start, f, 'sine', 0.27 - i * 0.02, 0.004, 0.34) + tone(t - start, f * 2, 'sine', 0.06, 0.004, 0.22);
        });
        return s + (Math.random() - 0.5) * 0.012 * Math.exp(-t * 10);
      });
      break;
    }
    case 'wrong':
      buffer = render(0.48, (t) => tone(t, 190, 'saw', 0.26, 0.005, 0.16, -110) + tone(t, 95, 'square', 0.14, 0.005, 0.16, -30) + tone(t, 380, 'triangle', 0.07, 0.005, 0.09));
      break;
    case 'timeup':
      buffer = render(0.85, (t) => {
        let s = 0;
        [0, 0.22, 0.44].forEach((start, i) => {
          if (t >= start) s += tone(t - start, 440 - i * 60, 'square', 0.18, 0.005, 0.12);
        });
        return s;
      });
      break;
    case 'submit':
      buffer = render(0.22, (t) => tone(t, 880, 'sine', 0.28, 0.003, 0.1) + tone(t, 1320, 'sine', 0.09, 0.003, 0.08));
      break;
    case 'join':
      buffer = render(0.28, (t) => tone(t, 660, 'sine', 0.26, 0.004, 0.08) + tone(t, 990, 'triangle', 0.11, 0.004, 0.06));
      break;
    case 'start':
      buffer = render(0.42, (t) => tone(t, 392, 'triangle', 0.24, 0.006, 0.16, 240) + tone(t, 784, 'sine', 0.09, 0.006, 0.13, 180));
      break;
    case 'fanfare': {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
      buffer = render(1.2, (t) => {
        let s = 0;
        notes.forEach((f, i) => {
          const start = i * 0.13;
          if (t >= start) s += tone(t - start, f, 'sine', 0.24, 0.005, 0.38) + tone(t - start, f * 0.5, 'triangle', 0.075, 0.005, 0.3);
        });
        return s;
      });
      break;
    }
    case 'error':
      buffer = render(0.3, (t) => tone(t, 150, 'square', 0.2, 0.004, 0.1) + tone(t, 110, 'saw', 0.13, 0.004, 0.1));
      break;
    case 'pick':
      buffer = render(0.2, (t) => tone(t, 240, 'triangle', 0.3, 0.004, 0.12, 520) + tone(t, 720, 'sine', 0.1, 0.004, 0.08));
      break;
    case 'lock':
      buffer = render(0.24, (t) => tone(t, 150, 'square', 0.24, 0.002, 0.06) + tone(t, 900, 'sine', 0.16, 0.002, 0.09) + (Math.random() - 0.5) * 0.08 * Math.exp(-t * 40));
      break;
    case 'win':
      buffer = render(0.55, (t) => {
        let s = 0;
        [523.25, 659.25, 1046.5].forEach((f, i) => { if (t >= i * 0.07) s += tone(t - i * 0.07, f, 'sine', 0.28, 0.004, 0.32); });
        return s;
      });
      break;
    case 'lose':
      buffer = render(0.45, (t) => tone(t, 330, 'triangle', 0.25, 0.004, 0.2, -120) + tone(t, 165, 'sine', 0.12, 0.004, 0.18));
      break;
    case 'applause':
      buffer = render(1.35, (t) => {
        const envA = Math.min(1, t / 0.07) * Math.exp(-Math.max(0, t - 0.18) / 0.55);
        const claps = (Math.random() - 0.5) * 0.32 * envA;
        const body = tone(t, 180, 'sine', 0.035, 0.02, 0.5) + tone(t, 260, 'triangle', 0.025, 0.02, 0.4);
        return claps + body;
      });
      break;
    case 'whoosh':
      buffer = render(0.42, (t) => {
        const sweep = 240 + 2100 * (t / 0.42);
        return tone(t, sweep, 'saw', 0.055, 0.01, 0.16) + (Math.random() - 0.5) * 0.24 * Math.exp(-t * 4.5);
      });
      break;
    case 'stage':
      buffer = render(0.58, (t) => {
        let s = tone(t, 196, 'triangle', 0.22, 0.004, 0.18, 160) + tone(t, 392, 'sine', 0.07, 0.004, 0.16);
        if (t >= 0.17) s += tone(t - 0.17, 523.25, 'triangle', 0.2, 0.004, 0.25, 120) + tone(t - 0.17, 1046.5, 'sine', 0.055, 0.004, 0.2);
        s += tone(t, 82, 'sine', 0.12, 0.003, 0.14);
        return s;
      });
      break;
    case 'unlock':
      buffer = render(0.65, (t) => {
        let s = 0;
        [659.25, 987.77, 1318.51].forEach((f, i) => {
          const start = i * 0.065;
          if (t >= start) s += tone(t - start, f, i === 1 ? 'triangle' : 'sine', 0.24 - i * 0.035, 0.003, 0.26) + tone(t - start, f * 2, 'sine', 0.045, 0.003, 0.16);
        });
        return s + (Math.random() - 0.5) * 0.03 * Math.exp(-t * 8);
      });
      break;
    case 'readin':
      buffer = render(0.9, (t) => {
        const pulse = Math.max(0, Math.sin(t * Math.PI * 5)) ** 2 * Math.exp(-t * 1.2);
        return tone(t, 130.81, 'sine', 0.16, 0.01, 0.3) + tone(t, 261.63, 'triangle', 0.05, 0.01, 0.22) + pulse * 0.035;
      });
      break;
    default:
      buffer = render(0.05, (t) => tone(t, 1000, 'sine', 0.1, 0.001, 0.015));
  }
  if (buffer) cache.set(name, buffer);
  return buffer;
}

export function preload() {
  if (preloaded) return;
  const c = ensure();
  if (!c) return;
  preloaded = true;
  ['click', 'select', 'tick', 'question', 'countdown', 'correct', 'wrong', 'timeup', 'submit', 'join', 'start', 'fanfare', 'error', 'pick', 'lock', 'win', 'lose', 'applause', 'whoosh', 'stage', 'unlock', 'readin'].forEach(build);
}

export function play(name) {
  if (!enabled || !uiAllowed) return;
  const c = ensure();
  if (!c) return;
  preload();
  const buffer = build(name);
  if (!buffer) return;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = 1;
  src.connect(gain);
  gain.connect(master);
  src.start();
}

export function setSoundEnabled(value) {
  enabled = !!value;
  try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch {}
  if (enabled) ensure();
  window.dispatchEvent(new Event('sound:change'));
}

export function soundEnabled() { return enabled; }

export function setUiSounds(value) {
  uiAllowed = !!value;
  if (value) ensure();
}

export function initSound() {
  if (inited) return;
  inited = true;
  const unlock = () => { if (!uiAllowed) return; ensure(); preload(); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('pointerdown', (e) => {
    if (!enabled || !uiAllowed) return;
    const target = e.target.closest && e.target.closest('button, a, [role="button"]');
    if (!target || target.dataset.sound === 'off') return;
    play(target.dataset.sound || 'click');
  }, true);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) enabled = e.newValue !== 'off';
  });
}
