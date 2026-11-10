import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api.js';
import { applyBranding } from './theme.js';

const DEFAULTS = {
  org: 'MSSN Remo',
  appName: 'ICT Quiz Arena',
  logoUrl: '/brand/mssn.webp',
  sponsorName: 'Rayyan Technologies',
  sponsorLogoUrl: '/brand/rayyan.png',
  backgroundUrl: '',
  showSponsor: true,
  eventName: 'MSSN Remo ICT Quiz 2026',
  eventTheme: 'Anchored in Deen, Illuminated in Dunya and Digital',
  eventDate: 'Thursday, 26th November 2026'
};

const BrandingContext = createContext({ branding: DEFAULTS, refresh: () => {} });

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULTS);
  const refresh = useCallback(async () => {
    try {
      const state = await api('/api/state', { token: null });
      const b = state?.settings?.branding || {};
      const next = {
        ...DEFAULTS,
        ...b,
        eventName: state?.event?.name || DEFAULTS.eventName,
        eventTheme: state?.event?.theme || DEFAULTS.eventTheme,
        eventDate: state?.event?.date || DEFAULTS.eventDate
      };
      setBranding(next);
      applyBranding(next);
    } catch {}
  }, []);
  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('branding:refresh', handler);
    const timer = setInterval(refresh, 60000);
    return () => { window.removeEventListener('branding:refresh', handler); clearInterval(timer); };
  }, [refresh]);
  return <BrandingContext.Provider value={{ branding, refresh }}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
