// Petites fonctions de mise en forme (dates, montants, numéros).
export const pad2 = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const parseISO = (iso) => new Date(`${iso}T12:00:00`);
export const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };

const clean = (s) => s.replace(/[  ]/g, ' ');
export const fmtN = (n) => clean(Math.round(n || 0).toLocaleString('fr-FR'));
export const fmtF = (n) => `${fmtN(n)} F`;
export const fmtDate = (iso) => (iso ? clean(parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })) : '');
export const fmtDay = (iso) => (iso ? clean(parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) : '');
export const fmtWeekday = (iso) => parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const digits = (v) => String(v ?? '').replace(/\D/g, '');
/** 8 chiffres → « 70 00 01 23 ». L'indicatif 223 est retiré à l'affichage. */
export const fmtPhone = (v) => {
  let d = digits(v);
  if (d.length === 11 && d.startsWith('223')) d = d.slice(3);
  return d.length === 8 ? d.replace(/(\d{2})(?=\d)/g, '$1 ') : d;
};
export const nameOf = (v) => `${v.prenom || ''} ${v.nom || ''}`.trim();
export const plural = (n, one, many) => `${fmtN(n)} ${Math.abs(n) > 1 ? many : one}`;
