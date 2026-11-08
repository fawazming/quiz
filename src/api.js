const TOKEN_KEY = 'mssn_ict_token';
const USER_KEY = 'mssn_ict_user';

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function readSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  let user = null;
  try { user = JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch {}
  return { token, user };
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = token ?? localStorage.getItem(TOKEN_KEY);
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  if (raw) return res;
  return res.json();
}
