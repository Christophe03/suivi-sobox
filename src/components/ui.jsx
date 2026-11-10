// Briques d'interface réutilisées partout : icônes, cartes, fenêtre, champs, messages.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const P = {
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  cart: 'M3 4h2l2.4 11h11l2-8H6.2M9 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z',
  box: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  alert: 'M12 3l9.5 17h-19L12 3zM12 10v5M12 17.5v.5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 17.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM20 20l-4-4',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4l10-10-4-4L4 16v4zM13 7l4 4',
  sim: 'M7 3h7l5 5v13H7V3zM10 12h6v6h-6z',
  clip: 'M9 4h6v3H9zM6 6H5v15h14V6h-1M8 12h8M8 16h5',
};
export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || ''} />
    </svg>
  );
}

export const Card = ({ title, action, children, className = '' }) => (
  <section className={`card ${className}`}>
    {(title || action) && <div className="card-head">{title && <h2>{title}</h2>}{action}</div>}
    {children}
  </section>
);
export const Kpi = ({ label, value, sub, tone }) => (
  <div className={`kpi ${tone || ''}`}><span className="kpi-label">{label}</span><b className="kpi-value">{value}</b>{sub && <span className="kpi-sub">{sub}</span>}</div>
);
export const Badge = ({ tone = 'neutral', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const Empty = ({ title, children }) => <div className="empty"><b>{title}</b>{children && <p>{children}</p>}</div>;
export const Progress = ({ value, max, tone }) => (
  <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
    <i className={tone || ''} style={{ width: `${max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0}%` }} />
  </div>
);

export function Field({ label, hint, children, id }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Fenêtre : plein écran sur téléphone, boîte centrée sur ordinateur. */
export function Modal({ title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button></header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/** Bouton à confirmer : le premier appui demande, le second exécute. */
export function ConfirmButton({ label, confirm = 'Confirmer ?', onConfirm, className = 'btn danger' }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => { if (!ask) return undefined; const t = setTimeout(() => setAsk(false), 4000); return () => clearTimeout(t); }, [ask]);
  return <button type="button" className={className} onClick={() => (ask ? (setAsk(false), onConfirm()) : setAsk(true))}>{ask ? confirm : label}</button>;
}

const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const toast = useCallback((text, tone = 'ok') => { setMsg({ text, tone }); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(null), 2800); }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast ${msg ? 'show' : ''} ${msg?.tone || ''}`} role="status" aria-live="polite">{msg?.text}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
