import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Modal, Field, ConfirmButton, Icon, useToast } from './ui.jsx';
import { fmtF, fmtPhone, todayISO, uid, digits } from '../lib/format.js';
import { pucesDisponibles, stockDisponible } from '../lib/stats.js';

export default function SaleForm({ vente, onClose }) {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const s = state.settings;
  const [f, setF] = useState(() => vente ? { ...vente, puceIds: [...(vente.puceIds || [])] } : {
    date: todayISO(), prenom: '', nom: '', telephone: '', quartier: '', qty: 1, puceIds: [],
    livraison: false, fraisLivraison: s.fraisLivraison[0] || 0, lieuLivraison: '', dateLivraison: todayISO(), notes: '',
  });
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const dispo = useMemo(() => pucesDisponibles(state, vente?.id), [state, vente]);
  const byId = useMemo(() => new Map(state.puces.map((p) => [p.id, p])), [state.puces]);
  const d = digits(q);
  const matches = dispo.filter((p) => !f.puceIds.includes(p.id) && (!d || p.msisdn.includes(d) || p.imsi.includes(d))).slice(0, 6);
  const stock = stockDisponible(state) + (vente ? vente.qty : 0);
  const prix = vente ? vente.prix : s.prix;
  const total = f.qty * prix + (f.livraison ? Number(f.fraisLivraison) || 0 : 0);
  const quartiers = useMemo(() => [...new Set(state.ventes.map((v) => (v.quartier || '').trim()).filter(Boolean))].sort(), [state.ventes]);

  const addPuce = (id) => { setF((x) => { const puceIds = [...x.puceIds, id]; return { ...x, puceIds, qty: Math.max(x.qty, puceIds.length) }; }); setQ(''); };
  const removePuce = (id) => setF((x) => ({ ...x, puceIds: x.puceIds.filter((i) => i !== id) }));

  const submit = (e) => {
    e.preventDefault();
    const qty = Math.max(1, Math.round(Number(f.qty) || 1));
    if (!f.prenom.trim() || !f.nom.trim()) return setErr('Écrivez le prénom et le nom du client.');
    if (qty > stock) return setErr(`Stock insuffisant : il reste ${stock} boîtier${stock > 1 ? 's' : ''}. Enregistrez d’abord la réception dans Stock.`);
    if (f.puceIds.length > qty) return setErr('Il y a plus de puces choisies que de boîtiers vendus.');
    const v = {
      id: vente?.id || uid(), createdAt: vente?.createdAt || new Date().toISOString(),
      date: f.date || todayISO(), prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: digits(f.telephone), quartier: f.quartier.trim(),
      qty, prix, commissionUnit: vente?.commissionUnit ?? s.commission, epargneUnit: vente?.epargneUnit ?? s.epargne,
      puceIds: f.puceIds, livraison: !!f.livraison, fraisLivraison: f.livraison ? Number(f.fraisLivraison) || 0 : 0,
      lieuLivraison: f.livraison ? f.lieuLivraison.trim() : '', dateLivraison: f.livraison ? f.dateLivraison : '', notes: f.notes.trim(),
    };
    dispatch({ type: vente ? 'vente/update' : 'vente/add', vente: v });
    toast(vente ? 'Vente modifiée' : 'Vente enregistrée');
    onClose();
    return undefined;
  };
  const remove = () => { dispatch({ type: 'vente/delete', id: vente.id }); toast('Vente supprimée'); onClose(); };

  return (
    <Modal title={vente ? 'Modifier la vente' : 'Nouvelle vente'} onClose={onClose}
      footer={<><div className="total"><span>Total à payer</span><b>{fmtF(total)}</b></div><button className="btn primary block" form="sale-form" type="submit">{vente ? 'Enregistrer' : 'Enregistrer la vente'}</button></>}>
      <form id="sale-form" className="form" onSubmit={submit} noValidate>
        {err && <div className="banner bad" role="alert">{err}</div>}
        <div className="grid2">
          <Field label="Prénom" id="sf-prenom"><input id="sf-prenom" value={f.prenom} onChange={(e) => set('prenom', e.target.value)} autoComplete="off" /></Field>
          <Field label="Nom" id="sf-nom"><input id="sf-nom" value={f.nom} onChange={(e) => set('nom', e.target.value)} autoComplete="off" /></Field>
        </div>
        <div className="grid2">
          <Field label="Téléphone du client" id="sf-tel"><input id="sf-tel" inputMode="tel" value={f.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="Ex : 70 00 00 00" autoComplete="off" /></Field>
          <Field label="Quartier" id="sf-quartier"><input id="sf-quartier" list="sf-quartiers" value={f.quartier} onChange={(e) => set('quartier', e.target.value)} autoComplete="off" /><datalist id="sf-quartiers">{quartiers.map((x) => <option key={x} value={x} />)}</datalist></Field>
        </div>
        <div className="grid2">
          <Field label="Date de la vente" id="sf-date"><input id="sf-date" type="date" value={f.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Nombre de boîtiers" id="sf-qty" hint={`Prix : ${fmtF(prix)} le boîtier · stock : ${stock}`}>
            <div className="stepper"><button type="button" onClick={() => set('qty', Math.max(1, f.qty - 1))} aria-label="Moins">−</button><input id="sf-qty" inputMode="numeric" value={f.qty} onChange={(e) => set('qty', Math.max(1, Number(digits(e.target.value)) || 1))} /><button type="button" onClick={() => set('qty', f.qty + 1)} aria-label="Plus">+</button></div>
          </Field>
        </div>

        <Field label={`Puce remise au client (${f.puceIds.length} sur ${f.qty})`} id="sf-puce" hint={state.puces.length ? 'Tapez les derniers chiffres du numéro ou de l’IMSI.' : 'Aucun fichier de stock importé : vous pouvez enregistrer la vente sans numéro.'}>
          {f.puceIds.length > 0 && <div className="chips">{f.puceIds.map((id) => { const p = byId.get(id); return <span className="chip on" key={id}><span className="mono">{p ? fmtPhone(p.msisdn) || p.imsi : 'puce'}</span><button type="button" onClick={() => removePuce(id)} aria-label="Retirer cette puce"><Icon name="x" size={14} /></button></span>; })}</div>}
          {state.puces.length > 0 && f.puceIds.length < f.qty && (
            <>
              <div className="search"><Icon name="search" size={18} /><input id="sf-puce" inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher une puce en stock" autoComplete="off" /></div>
              <div className="picker">
                {matches.length === 0 ? <span className="muted small">Aucune puce en stock ne correspond.</span> : matches.map((p) => (
                  <button type="button" key={p.id} onClick={() => addPuce(p.id)}><b className="mono">{fmtPhone(p.msisdn) || '—'}</b><small className="mono">IMSI {p.imsi || '—'}</small></button>
                ))}
              </div>
            </>
          )}
        </Field>

        <label className="check"><input type="checkbox" checked={!!f.livraison} onChange={(e) => set('livraison', e.target.checked)} /><span>Livraison à domicile</span></label>
        {f.livraison && (
          <>
            <Field label="Frais de livraison" id="sf-frais">
              <div className="chips">{s.fraisLivraison.map((m) => <button type="button" key={m} className="chip" aria-pressed={Number(f.fraisLivraison) === m} onClick={() => set('fraisLivraison', m)}>{fmtF(m)}</button>)}</div>
            </Field>
            <div className="grid2">
              <Field label="Lieu de livraison" id="sf-lieu"><input id="sf-lieu" value={f.lieuLivraison} onChange={(e) => set('lieuLivraison', e.target.value)} autoComplete="off" /></Field>
              <Field label="Date de livraison" id="sf-dliv"><input id="sf-dliv" type="date" value={f.dateLivraison || ''} onChange={(e) => set('dateLivraison', e.target.value)} /></Field>
            </div>
          </>
        )}
        <Field label="Notes (facultatif)" id="sf-notes"><input id="sf-notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} autoComplete="off" /></Field>
        {vente && <ConfirmButton label="Supprimer cette vente" confirm="Touchez encore pour supprimer" onConfirm={remove} className="btn danger block" />}
      </form>
    </Modal>
  );
}
