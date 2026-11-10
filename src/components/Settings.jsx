import React, { useRef, useState } from 'react';
import { useStore, DEFAULT_SETTINGS } from '../lib/store.jsx';
import { Card, Field, ConfirmButton, Icon, useToast } from './ui.jsx';
import { digits } from '../lib/format.js';
import { demoState } from '../lib/demo.js';
import { sauvegarder } from '../lib/excel.js';

const NUM = ['prix', 'commission', 'primeSeuil', 'primeMontant', 'epargne', 'closeDay', 'objectif', 'stockBas', 'fraisReemission'];

export default function Settings() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState(() => ({ ...state.settings, fraisLivraison: state.settings.fraisLivraison.join(', ') }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const vide = !state.ventes.length && !state.receptions.length;

  const save = (e) => {
    e.preventDefault();
    const out = { partenaire: f.partenaire.trim(), zone: f.zone.trim() };
    for (const k of NUM) out[k] = Number(digits(f[k])) || 0;
    out.closeDay = Math.min(28, out.closeDay);
    out.fraisLivraison = String(f.fraisLivraison).split(/[,;\s]+/).map((x) => Number(digits(x))).filter((x) => x > 0);
    if (!out.fraisLivraison.length) out.fraisLivraison = [1000];
    dispatch({ type: 'settings/save', settings: out });
    setF({ ...out, fraisLivraison: out.fraisLivraison.join(', ') });
    toast('Réglages enregistrés');
  };
  const restore = async (file) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.ventes) || !data.settings) throw new Error('format');
      dispatch({ type: 'load', state: data }); setF({ ...data.settings, fraisLivraison: (data.settings.fraisLivraison || []).join(', ') }); toast('Sauvegarde restaurée');
    } catch (e) { toast('Ce fichier n’est pas une sauvegarde valide', 'bad'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const num = (k, label, hint) => <Field label={label} id={`st-${k}`} hint={hint}><input id={`st-${k}`} inputMode="numeric" value={f[k]} onChange={(e) => set(k, e.target.value)} /></Field>;

  return (
    <form className="stack" onSubmit={save}>
      <Card title="Partenaire">
        <div className="grid2">
          <Field label="Nom du partenaire (facultatif)" id="st-part" hint="Repris dans l’en-tête et dans les fichiers exportés."><input id="st-part" value={f.partenaire} onChange={(e) => set('partenaire', e.target.value)} autoComplete="off" /></Field>
          <Field label="Zone de vente (facultatif)" id="st-zone"><input id="st-zone" value={f.zone} onChange={(e) => set('zone', e.target.value)} autoComplete="off" /></Field>
        </div>
      </Card>
      <Card title="Tarifs et commission">
        <div className="grid2">
          {num('prix', 'Prix public d’un boîtier (F)')}
          {num('commission', 'Commission par boîtier (F)')}
          {num('primeSeuil', 'Prime : boîtiers à vendre dans la période')}
          {num('primeMontant', 'Montant de la prime (F)')}
          {num('epargne', 'Épargne par boîtier vendu (F)', 'Mise de côté conseillée sur chaque vente.')}
          {num('fraisReemission', 'Frais de réémission d’une puce (F)')}
        </div>
        <Field label="Frais de livraison proposés (F)" id="st-liv" hint="Séparez les montants par une virgule."><input id="st-liv" value={f.fraisLivraison} onChange={(e) => set('fraisLivraison', e.target.value)} /></Field>
        <p className="hint">Un changement de prix ou de commission ne modifie pas les ventes déjà enregistrées.</p>
      </Card>
      <Card title="Période et alertes">
        <div className="grid2">
          {num('closeDay', 'Jour de clôture de la période', '23 = période du 24 au 23. Mettez 0 pour un mois civil.')}
          {num('objectif', 'Objectif de ventes par période')}
          {num('stockBas', 'Alerte de stock bas (boîtiers)')}
        </div>
      </Card>
      <button className="btn primary block" type="submit">Enregistrer les réglages</button>

      <Card title="Données">
        <p className="muted small">Les données sont gardées dans ce navigateur, sur cet appareil. Faites une sauvegarde régulièrement, et avant de changer de téléphone ou d’ordinateur.</p>
        <div className="btn-row">
          <button type="button" className="btn ghost" onClick={() => { sauvegarder(state); toast('Sauvegarde créée'); }}><Icon name="download" size={18} /><span>Sauvegarder</span></button>
          <label className="btn ghost"><input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" onChange={(e) => restore(e.target.files[0])} /><Icon name="upload" size={18} /><span>Restaurer une sauvegarde</span></label>
          {vide && <button type="button" className="btn ghost" onClick={() => { const d = demoState(); dispatch({ type: 'load', state: d }); setF({ ...d.settings, fraisLivraison: d.settings.fraisLivraison.join(', ') }); toast('Données d’exemple chargées'); }}>Charger des données d’exemple</button>}
          <ConfirmButton label="Tout effacer" confirm="Touchez encore pour tout effacer" onConfirm={() => { dispatch({ type: 'reset' }); setF({ ...DEFAULT_SETTINGS, fraisLivraison: DEFAULT_SETTINGS.fraisLivraison.join(', ') }); toast('Données effacées'); }} />
        </div>
      </Card>
      <p className="foot">Suivi SOBOX+ · version 1.0</p>
    </form>
  );
}
