// Calculs : stock, périodes, commission, épargne. Rien n'est stocké en cumul,
// tout est recalculé à partir des ventes et des réceptions.
import { periodKey, inPeriod } from './periods.js';
import { todayISO, addDays } from './format.js';

const sum = (list, f) => list.reduce((s, x) => s + (f(x) || 0), 0);

export const qtyVendue = (s) => sum(s.ventes, (v) => v.qty);
export const qtyRecue = (s) => sum(s.receptions, (r) => r.qty);
export const stockDisponible = (s) => qtyRecue(s) + sum(s.ajustements, (a) => a.delta) - qtyVendue(s);

/** Pour chaque puce vendue : la vente correspondante. */
export function ventesParPuce(s) {
  const map = new Map();
  for (const v of s.ventes) for (const id of v.puceIds || []) map.set(id, v);
  return map;
}
export function incidentsOuvertsParPuce(s) {
  const map = new Map();
  for (const i of s.incidents) if (i.puceId && i.statut !== 'resolu') map.set(i.puceId, i);
  return map;
}
/** 'vendue' | 'signalee' | 'stock' */
export function statutPuce(p, sold, flagged) {
  if (sold.has(p.id)) return 'vendue';
  if (flagged.has(p.id)) return 'signalee';
  return 'stock';
}
export function pucesDisponibles(s, saufVenteId) {
  const sold = new Map();
  for (const v of s.ventes) if (v.id !== saufVenteId) for (const id of v.puceIds || []) sold.set(id, v);
  const flagged = incidentsOuvertsParPuce(s);
  return s.puces.filter((p) => !sold.has(p.id) && !flagged.has(p.id));
}

export const montantVente = (v) => v.qty * v.prix + (v.livraison ? v.fraisLivraison || 0 : 0);

export function statsPeriode(s, key) {
  const cd = s.settings.closeDay;
  const ventes = s.ventes.filter((v) => inPeriod(v.date, key, cd));
  const qty = sum(ventes, (v) => v.qty);
  const montant = sum(ventes, (v) => v.qty * v.prix);
  const livraison = sum(ventes, (v) => (v.livraison ? v.fraisLivraison : 0));
  const commission = sum(ventes, (v) => v.qty * (v.commissionUnit ?? s.settings.commission));
  const primeOK = qty >= s.settings.primeSeuil;
  const prime = primeOK ? s.settings.primeMontant : 0;
  const epargne = sum(ventes, (v) => v.qty * (v.epargneUnit ?? s.settings.epargne));
  const quartiers = new Map();
  for (const v of ventes) { const q = (v.quartier || '').trim() || 'Non précisé'; quartiers.set(q, (quartiers.get(q) || 0) + v.qty); }
  return {
    key, ventes, qty, montant, livraison, commission, primeOK, prime, total: commission + prime, epargne,
    resteePrime: Math.max(0, s.settings.primeSeuil - qty),
    recue: s.commissions[key] || null,
    quartiers: [...quartiers.entries()].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n),
  };
}

export function statsGlobales(s) {
  const cd = s.settings.closeDay;
  const keys = [...new Set(s.ventes.map((v) => periodKey(v.date, cd)))].sort();
  let enAttente = 0;
  for (const k of keys) { const p = statsPeriode(s, k); if (!p.recue) enAttente += p.total; }
  return {
    periodes: keys,
    epargne: sum(s.ventes, (v) => v.qty * (v.epargneUnit ?? s.settings.epargne)),
    commissionEnAttente: enAttente,
  };
}

/** Ventes des n derniers jours : [{ date, qty }] du plus ancien au plus récent. */
export function ventesParJour(s, n = 14) {
  const today = todayISO(); const days = [];
  for (let i = n - 1; i >= 0; i--) days.push({ date: addDays(today, -i), qty: 0 });
  const idx = new Map(days.map((d, i) => [d.date, i]));
  for (const v of s.ventes) { const i = idx.get(v.date); if (i != null) days[i].qty += v.qty; }
  return days;
}
export const qtyDuJour = (s, iso = todayISO()) => sum(s.ventes.filter((v) => v.date === iso), (v) => v.qty);
