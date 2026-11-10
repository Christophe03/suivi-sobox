// État de l'application : un seul objet, gardé dans le navigateur (localStorage).
// Pour brancher un serveur plus tard, il suffit de remplacer load() et save().
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

const KEY = 'suivi-sobox:v1';

export const DEFAULT_SETTINGS = {
  partenaire: '',          // nom du partenaire (facultatif), repris dans l'en-tête et les exports
  zone: '',                // zone de vente (facultatif)
  prix: 20000,             // prix public d'un boîtier
  commission: 5000,        // commission par boîtier vendu
  primeSeuil: 50,          // nombre de boîtiers à vendre dans la période pour avoir la prime
  primeMontant: 50000,     // montant de la prime
  epargne: 500,            // montant mis de côté sur chaque boîtier vendu
  closeDay: 23,            // jour de clôture de la période (0 = mois civil)
  objectif: 100,           // objectif de ventes par période
  stockBas: 10,            // alerte quand le stock passe sous ce seuil
  fraisReemission: 2000,   // frais de remplacement d'une puce défectueuse
  fraisLivraison: [1000, 1500, 2000, 2500, 3000],
};

export const emptyState = () => ({
  v: 1,
  demo: false,
  settings: { ...DEFAULT_SETTINGS },
  receptions: [],   // { id, date, qty, fichier, note }
  puces: [],        // { id, imsi, msisdn, receptionId }
  ventes: [],       // { id, date, prenom, nom, telephone, quartier, qty, prix, commissionUnit, epargneUnit, puceIds, livraison, fraisLivraison, lieuLivraison, dateLivraison, notes, createdAt }
  incidents: [],    // { id, date, type, puceId, numero, client, frais, aCharge, statut, notes }
  ajustements: [],  // { id, date, delta, motif }
  commissions: {},  // { [période]: { date } } quand la commission de la période a été reçue
});

function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base, ...raw,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
    receptions: raw.receptions || [], puces: raw.puces || [], ventes: raw.ventes || [],
    incidents: raw.incidents || [], ajustements: raw.ajustements || [], commissions: raw.commissions || {},
  };
}

function load() {
  try { const s = localStorage.getItem(KEY); return { state: normalize(s ? JSON.parse(s) : null), ok: true }; }
  catch (e) { return { state: emptyState(), ok: false }; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
}

function reducer(state, a) {
  switch (a.type) {
    case 'reception/add': return { ...state, receptions: [...state.receptions, a.reception], puces: [...state.puces, ...(a.puces || [])] };
    case 'reception/delete': return { ...state, receptions: state.receptions.filter((r) => r.id !== a.id), puces: state.puces.filter((p) => p.receptionId !== a.id) };
    case 'vente/add': return { ...state, ventes: [...state.ventes, a.vente] };
    case 'vente/update': return { ...state, ventes: state.ventes.map((v) => (v.id === a.vente.id ? a.vente : v)) };
    case 'vente/delete': return { ...state, ventes: state.ventes.filter((v) => v.id !== a.id) };
    case 'incident/add': return { ...state, incidents: [...state.incidents, a.incident] };
    case 'incident/toggle': return { ...state, incidents: state.incidents.map((i) => (i.id === a.id ? { ...i, statut: i.statut === 'resolu' ? 'en_cours' : 'resolu' } : i)) };
    case 'incident/delete': return { ...state, incidents: state.incidents.filter((i) => i.id !== a.id) };
    case 'stock/adjust': return { ...state, ajustements: [...state.ajustements, a.ajustement] };
    case 'commission/set': {
      const commissions = { ...state.commissions };
      if (a.date) commissions[a.key] = { date: a.date }; else delete commissions[a.key];
      return { ...state, commissions };
    }
    case 'settings/save': return { ...state, settings: { ...state.settings, ...a.settings } };
    case 'load': return normalize(a.state);
    case 'reset': return emptyState();
    default: return state;
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const first = useRef(null);
  if (!first.current) first.current = load();
  const [state, dispatch] = useReducer(reducer, first.current.state);
  const [persisted, setPersisted] = useState(first.current.ok);
  useEffect(() => { setPersisted(save(state)); }, [state]);
  const value = useMemo(() => ({ state, dispatch, persisted }), [state, persisted]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useStore = () => useContext(Ctx);
