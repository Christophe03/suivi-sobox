// Import du fichier de stock (IMSI / MSISDN) et exports Excel.
import { readXlsx, writeXlsx, download } from './xlsx.js';
import { digits, fmtDate, nameOf, todayISO } from './format.js';
import { periodName, periodDates, periodRange } from './periods.js';
import { statsPeriode, ventesParPuce, incidentsOuvertsParPuce, statutPuce, montantVente, stockDisponible, statsGlobales } from './stats.js';

export const TYPES_INCIDENT = {
  defectueuse: 'Puce défectueuse (réémission)',
  rejet_identification: 'Rejet d’identification',
  rejet_notification: 'Rejet de notification',
  autre: 'Autre',
};

/** Texte collé depuis Excel ou un message → lignes de cellules. */
export function parsePasted(text) {
  const lines = String(text || '').split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : lines[0].includes(',') ? ',' : /\s{2,}| /.test(lines[0]) ? /\s+/ : '\t';
  return lines.map((l) => l.split(delim).map((c) => c.trim()));
}

/** Lit un fichier .xlsx ou .csv choisi par l'utilisateur → lignes de cellules. */
export async function readFileRows(file) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) return parsePasted(await file.text());
  if (name.endsWith('.xls')) throw new Error('Ancien format .xls : ouvrez le fichier dans Excel et enregistrez-le en .xlsx, ou copiez-collez les numéros.');
  return readXlsx(await file.arrayBuffer());
}

/**
 * Repère les colonnes IMSI et MSISDN (par leur titre, sinon par la longueur des numéros)
 * et renvoie la liste des puces lues, sans doublon.
 */
export function extractPuces(rows) {
  // 1. Ligne de titres : une cellule courte « IMSI », « MSISDN », « Numéro », « Téléphone »…
  let header = -1; let cI = -1; let cM = -1;
  for (let r = 0; r < Math.min(rows.length, 10) && header < 0; r++) {
    let i = -1; let m = -1;
    rows[r].forEach((cell, c) => {
      const t = String(cell).trim().toLowerCase();
      if (!t || t.length > 24) return;
      if (i < 0 && /imsi/.test(t)) i = c;
      else if (m < 0 && /msisdn|^num[ée]ro|t[ée]l[ée]phone|^t[ée]l\b|^mobile$/.test(t)) m = c;
    });
    if (i >= 0 || m >= 0) { header = r; cI = i; cM = m; }
  }
  const okImsi = (d) => (d.length >= 13 && d.length <= 16 ? d : '');
  const okNum = (d) => (d.length >= 8 && d.length <= 12 ? d : '');
  const out = []; const seen = new Set(); let doublons = 0;
  rows.slice(header + 1).forEach((row) => {
    let imsi = cI >= 0 ? okImsi(digits(row[cI])) : '';
    let msisdn = cM >= 0 ? okNum(digits(row[cM])) : '';
    // 2. Sans titres (ou colonne vide) : on reconnaît les numéros à leur longueur.
    if (!imsi || !msisdn) {
      const nums = row.map(digits);
      if (!imsi && cI < 0) imsi = nums.find((d) => okImsi(d)) || '';
      if (!msisdn && cM < 0) msisdn = nums.find((d) => okNum(d)) || '';
    }
    if (!imsi && !msisdn) return;
    const key = imsi || msisdn;
    if (seen.has(key)) { doublons++; return; }
    seen.add(key); out.push({ imsi, msisdn });
  });
  return { puces: out, doublons };
}

/** Retire les puces déjà présentes dans le stock (même IMSI ou même numéro). */
export function sansDejaConnues(puces, existantes) {
  const imsis = new Set(existantes.map((p) => p.imsi).filter(Boolean));
  const nums = new Set(existantes.map((p) => p.msisdn).filter(Boolean));
  const nouvelles = puces.filter((p) => !(p.imsi && imsis.has(p.imsi)) && !(p.msisdn && nums.has(p.msisdn)));
  return { nouvelles, dejaLa: puces.length - nouvelles.length };
}

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

function feuilleVentes(state, ventes) {
  const byId = new Map(state.puces.map((p) => [p.id, p]));
  const rows = [['Date', 'Prénom', 'Nom', 'Téléphone', 'Quartier', 'Quantité', 'IMSI', 'Numéro (MSISDN)', 'Prix unitaire', 'Montant boîtiers', 'Frais de livraison', 'Total payé', 'Lieu de livraison', 'Date de livraison', 'Notes']];
  [...ventes].sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt)).forEach((v) => {
    const ps = (v.puceIds || []).map((id) => byId.get(id)).filter(Boolean);
    rows.push([fmtDate(v.date), v.prenom, v.nom, digits(v.telephone), v.quartier || '', v.qty,
      ps.map((p) => p.imsi).filter(Boolean).join(' / '), ps.map((p) => p.msisdn).filter(Boolean).join(' / '),
      v.prix, v.qty * v.prix, v.livraison ? v.fraisLivraison || 0 : 0, montantVente(v), v.lieuLivraison || '', v.dateLivraison ? fmtDate(v.dateLivraison) : '', v.notes || '']);
  });
  return { name: 'Ventes', rows };
}
function feuilleStock(state) {
  const sold = ventesParPuce(state); const flagged = incidentsOuvertsParPuce(state);
  const recs = new Map(state.receptions.map((r) => [r.id, r]));
  const rows = [['IMSI', 'Numéro (MSISDN)', 'Statut', 'Reçue le', 'Client', 'Vendue le']];
  state.puces.forEach((p) => {
    const st = statutPuce(p, sold, flagged); const v = sold.get(p.id); const r = recs.get(p.receptionId);
    rows.push([p.imsi, p.msisdn, { stock: 'En stock', vendue: 'Vendue', signalee: 'Signalée' }[st], r ? fmtDate(r.date) : '', v ? nameOf(v) : '', v ? fmtDate(v.date) : '']);
  });
  return { name: 'Stock', rows };
}
function feuilleIncidents(state) {
  const byId = new Map(state.puces.map((p) => [p.id, p]));
  const rows = [['Date', 'Type', 'IMSI', 'Numéro', 'Client', 'Frais', 'À la charge de', 'Statut', 'Notes']];
  state.incidents.forEach((i) => { const p = byId.get(i.puceId); rows.push([fmtDate(i.date), TYPES_INCIDENT[i.type] || i.type, p ? p.imsi : '', p ? p.msisdn : digits(i.numero), i.client || '', i.frais || 0, i.aCharge === 'partenaire' ? 'Partenaire' : 'Client', i.statut === 'resolu' ? 'Résolu' : 'En cours', i.notes || '']); });
  return { name: 'Incidents', rows };
}

/** Classeur d'une période : ventes + récapitulatif + stock + incidents. */
export async function exporterPeriode(state, key) {
  const s = state.settings; const p = statsPeriode(state, key); const { start, end } = periodRange(key, s.closeDay);
  const recap = [['Récapitulatif', periodName(key)],
    ['Période', `${fmtDate(start)} au ${fmtDate(end)}`],
    ...(s.partenaire ? [['Partenaire', s.partenaire]] : []), ...(s.zone ? [['Zone', s.zone]] : []),
    ['Boîtiers vendus', p.qty], ['Montant des ventes', p.montant], ['Frais de livraison', p.livraison],
    ['Commission', p.commission], [`Prime (dès ${s.primeSeuil} boîtiers)`, p.prime], ['Total commission et prime', p.total],
    ['Commission reçue', p.recue ? `Oui, le ${fmtDate(p.recue.date)}` : 'Non'],
    ['Épargne de la période', p.epargne], ['Stock disponible à ce jour', stockDisponible(state)], [],
    ['Quartier', 'Boîtiers'], ...p.quartiers.map((q) => [q.nom, q.n])];
  const blob = await writeXlsx([feuilleVentes(state, p.ventes), { name: 'Récapitulatif', rows: recap, widths: [34, 30], bold: [recap.findIndex((r) => r[0] === 'Quartier')] }, feuilleStock(state), feuilleIncidents(state)]);
  download(blob, `ventes-sobox-${key}${s.partenaire ? `-${slug(s.partenaire)}` : ''}.xlsx`);
}

/** Classeur complet : toutes les ventes depuis le début. */
export async function exporterTout(state) {
  const g = statsGlobales(state);
  const recap = [['Période', 'Boîtiers', 'Montant des ventes', 'Commission', 'Prime', 'Total', 'Commission reçue', 'Épargne'],
    ...g.periodes.map((k) => { const p = statsPeriode(state, k); return [`${periodName(k)} ${periodDates(k, state.settings.closeDay)}`.trim(), p.qty, p.montant, p.commission, p.prime, p.total, p.recue ? 'Oui' : 'Non', p.epargne]; })];
  const blob = await writeXlsx([feuilleVentes(state, state.ventes), { name: 'Par période', rows: recap }, feuilleStock(state), feuilleIncidents(state)]);
  download(blob, `ventes-sobox-complet-${todayISO()}.xlsx`);
}

/** Modèle de fichier de stock à remplir. */
export async function telechargerModele() {
  const blob = await writeXlsx([{ name: 'Stock', rows: [['IMSI', 'MSISDN'], ['610020000000001', '70000001'], ['610020000000002', '70000002']], widths: [22, 16] }]);
  download(blob, 'modele-stock-sobox.xlsx');
}

/** Sauvegarde complète (fichier .json) pour changer d'appareil ou garder une copie. */
export function sauvegarder(state) {
  download(new Blob([JSON.stringify(state)], { type: 'application/json' }), `sauvegarde-sobox-${todayISO()}.json`);
}
