function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex([r,g,b]) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function mix(a, b, weight) {
  const A = hexToRgb(a), B = hexToRgb(b);
  if (!A || !B) return a;
  return rgbToHex(A.map((v,i) => v * (1 - weight) + B[i] * weight));
}

export function applyTheme(theme = {}) {
  const root = document.documentElement;
  const primary = hexToRgb(theme.primary) ? theme.primary : '#0f5c4b';
  const accent = hexToRgb(theme.accent) ? theme.accent : '#c39a2b';
  const ink = hexToRgb(theme.ink) ? theme.ink : '#0c211d';
  root.style.setProperty('--emerald', primary);
  root.style.setProperty('--emerald-2', mix(primary, '#ffffff', 0.18));
  root.style.setProperty('--mint', mix(primary, '#ffffff', 0.84));
  root.style.setProperty('--mint-2', mix(primary, '#ffffff', 0.94));
  root.style.setProperty('--gold', accent);
  root.style.setProperty('--gold-2', mix(accent, '#ffffff', 0.32));
  root.style.setProperty('--sand', mix(accent, '#ffffff', 0.86));
  root.style.setProperty('--ink', ink);
  root.style.setProperty('--ink-2', mix(ink, '#ffffff', 0.08));
}
