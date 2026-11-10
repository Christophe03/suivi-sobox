// Périodes de vente.
// closeDay = 0  → mois civil (du 1er au dernier jour).
// closeDay = 23 → la période « novembre » va du 24 octobre au 23 novembre.
import { pad2, toISO, parseISO, todayISO } from './format.js';

export function periodKey(iso, closeDay) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!closeDay || d <= closeDay) return `${y}-${pad2(m)}`;
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${pad2(next.getMonth() + 1)}`;
}
export function periodRange(key, closeDay) {
  const [y, m] = key.split('-').map(Number);
  if (!closeDay) return { start: `${key}-01`, end: toISO(new Date(y, m, 0)) };
  return { start: toISO(new Date(y, m - 2, closeDay + 1)), end: `${key}-${pad2(closeDay)}` };
}
export function shiftPeriod(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
export const currentPeriod = (closeDay) => periodKey(todayISO(), closeDay);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const month = (key) => cap(new Date(`${key}-15T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
const short = (iso) => parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace(/[  ]/g, ' ');

/** « Novembre 2026 » */
export const periodName = (key) => month(key);
/** « du 24 oct. au 23 nov. » (vide pour un mois civil) */
export function periodDates(key, closeDay) {
  if (!closeDay) return '';
  const { start, end } = periodRange(key, closeDay);
  return `du ${short(start)} au ${short(end)}`;
}
export const inPeriod = (iso, key, closeDay) => periodKey(iso, closeDay) === key;
