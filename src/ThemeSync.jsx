import { useEffect } from 'react';
import { useSocket } from './socket.jsx';
import { applyTheme } from './theme.js';

export default function ThemeSync() {
  const { state } = useSocket();
  useEffect(() => {
    applyTheme(state?.settings?.theme);
  }, [state?.settings?.theme?.primary, state?.settings?.theme?.accent, state?.settings?.theme?.ink]);
  return null;
}
