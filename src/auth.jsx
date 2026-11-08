import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, saveSession, readSession, clearSession } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(() => readSession());
  const [loading, setLoading] = useState(!!readSession().token);

  useEffect(() => {
    let alive = true;
    if (!token) { setLoading(false); return; }
    api('/api/me', { token })
      .then(data => {
        if (!alive) return;
        const nextUser = data.user.role === 'candidate'
          ? { ...data.user, ...data.candidate, role: 'candidate' }
          : data.user;
        setSession({ token, user: nextUser });
        saveSession(token, nextUser);
      })
      .catch(() => {
        if (!alive) return;
        clearSession();
        setSession({ token: null, user: null });
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);

  const loginStaff = useCallback(async (username, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { username, password }, token: null });
    saveSession(data.token, data.user);
    setSession({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const loginCandidate = useCallback(async (code) => {
    const data = await api('/api/auth/candidate', { method: 'POST', body: { code }, token: null });
    saveSession(data.token, data.user);
    setSession({ token: data.token, user: data.user });
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, loginStaff, loginCandidate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
