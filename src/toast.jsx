import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setItems(prev => [...prev, { id, message, type }]);
    setTimeout(() => setItems(prev => prev.filter(x => x.id !== id)), 4500);
  }, []);
  const remove = (id) => setItems(prev => prev.filter(x => x.id !== id));
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} /> : t.type === 'error' ? <AlertTriangle size={18} /> : <Info size={18} />}
            <span>{t.message}</span>
            <button onClick={() => remove(t.id)} aria-label="Dismiss"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
