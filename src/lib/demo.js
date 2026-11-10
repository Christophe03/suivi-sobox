// Données d'exemple (fictives) pour montrer l'outil sans rien saisir.
import { emptyState } from './store.jsx';
import { addDays, todayISO, pad2 } from './format.js';

const PRENOMS = ['Awa', 'Moussa', 'Fatoumata', 'Ibrahim', 'Mariam', 'Seydou', 'Kadiatou', 'Oumar', 'Aminata', 'Bakary', 'Djénéba', 'Souleymane', 'Rokia', 'Adama', 'Assitan', 'Modibo', 'Salimata', 'Boubacar', 'Hawa', 'Lassana'];
const NOMS = ['Traoré', 'Coulibaly', 'Keïta', 'Diarra', 'Koné', 'Sidibé', 'Sangaré', 'Touré', 'Dembélé', 'Cissé', 'Doumbia', 'Maïga', 'Sissoko', 'Konaté', 'Camara'];
const QUARTIERS = ['Koulikoro Ba', 'Koulikoro Gare', 'Plateau', 'Kolébougou', 'Souban', 'Katibougou', 'Gouni', 'Kayo'];

export function demoState() {
  let seed = 20261110; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const s = emptyState(); s.demo = true;
  s.settings = { ...s.settings, partenaire: 'Partenaire Démo', zone: 'Koulikoro' };
  const today = todayISO(); let n = 0;
  const reception = (id, daysAgo, qty, fichier) => {
    s.receptions.push({ id, date: addDays(today, -daysAgo), qty, fichier, note: '' });
    for (let i = 0; i < qty; i++) { n++; s.puces.push({ id: `p${n}`, imsi: `6100299${String(n).padStart(8, '0')}`, msisdn: `7000${String(1000 + n)}`, receptionId: id }); }
  };
  reception('r1', 34, 60, 'stock-lot-1.xlsx'); reception('r2', 12, 50, 'stock-lot-2.xlsx');
  let next = 0; let k = 0;
  for (let d = 30; d >= 0; d--) {
    const dispo = d > 12 ? 60 : 110; const nb = d === 0 ? 2 : Math.floor(rnd() * 4.2);
    for (let i = 0; i < nb && next < dispo - 14; i++) {
      const qty = rnd() < 0.08 ? 2 : 1; const livraison = rnd() < 0.45; const date = addDays(today, -d);
      const puceIds = []; for (let q = 0; q < qty; q++) puceIds.push(`p${++next}`);
      k++;
      s.ventes.push({ id: `v${k}`, date, prenom: pick(PRENOMS), nom: pick(NOMS), telephone: `7${Math.floor(rnd() * 9)}${pad2(Math.floor(rnd() * 99))}${pad2(Math.floor(rnd() * 99))}${pad2(Math.floor(rnd() * 99))}`, quartier: pick(QUARTIERS), qty, prix: 20000, commissionUnit: 5000, epargneUnit: 500, puceIds, livraison, fraisLivraison: livraison ? pick([1000, 1500, 2000]) : 0, lieuLivraison: '', dateLivraison: livraison ? date : '', notes: '', createdAt: `${date}T${pad2(8 + Math.floor(rnd() * 10))}:${pad2(Math.floor(rnd() * 59))}:00` });
    }
  }
  const v1 = s.ventes[4]; const v2 = s.ventes[s.ventes.length - 6];
  s.incidents.push({ id: 'i1', date: addDays(v1.date, 2), type: 'rejet_identification', puceId: v1.puceIds[0], numero: '', client: `${v1.prenom} ${v1.nom}`, frais: 0, aCharge: 'client', statut: 'resolu', notes: 'Pièce d’identité illisible, dossier renvoyé.' });
  s.incidents.push({ id: 'i2', date: addDays(v2.date, 1), type: 'defectueuse', puceId: v2.puceIds[0], numero: '', client: `${v2.prenom} ${v2.nom}`, frais: 2000, aCharge: 'partenaire', statut: 'en_cours', notes: 'Puce non reconnue par le boîtier.' });
  s.incidents.push({ id: 'i3', date: addDays(today, -1), type: 'rejet_notification', puceId: `p${next + 3}`, numero: '', client: '', frais: 0, aCharge: 'client', statut: 'en_cours', notes: '' });
  return s;
}
