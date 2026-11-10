import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Card, Kpi, Badge, Empty, Modal, Field, Icon, ConfirmButton, useToast } from './ui.jsx';
import { fmtF, fmtN, fmtDate, fmtPhone, todayISO, uid, digits, nameOf } from '../lib/format.js';
import { ventesParPuce } from '../lib/stats.js';
import { TYPES_INCIDENT } from '../lib/excel.js';

export default function Incidents() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [filtre, setFiltre] = useState('en_cours');
  const puces = useMemo(() => new Map(state.puces.map((p) => [p.id, p])), [state.puces]);
  const enCours = state.incidents.filter((i) => i.statut !== 'resolu');
  const list = state.incidents.filter((i) => filtre === 'tous' || i.statut !== 'resolu').sort((a, b) => b.date.localeCompare(a.date));
  const frais = state.incidents.filter((i) => i.aCharge === 'partenaire').reduce((s, i) => s + (i.frais || 0), 0);

  return (
    <div className="stack">
      <div className="kpis two">
        <Kpi label="En cours" value={fmtN(enCours.length)} tone={enCours.length ? 'warn' : 'good'} sub={`${fmtN(state.incidents.length)} au total`} />
        <Kpi label="Frais à la charge du partenaire" value={fmtF(frais)} sub="réémissions de puces" />
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Incidents affichés"><button aria-pressed={filtre === 'en_cours'} onClick={() => setFiltre('en_cours')}>En cours</button><button aria-pressed={filtre === 'tous'} onClick={() => setFiltre('tous')}>Tous</button></div>
        <button className="btn primary" onClick={() => setOpen(true)}><Icon name="plus" size={18} /><span>Signaler un incident</span></button>
      </div>
      <Card>
        {list.length === 0 ? <Empty title={filtre === 'tous' ? 'Aucun incident enregistré' : 'Aucun incident en cours'}>Puce défectueuse, rejet d’identification ou de notification : signalez-les ici pour en garder la trace.</Empty> : (
          <ul className="list">
            {list.map((i) => { const p = puces.get(i.puceId); return (
              <li key={i.id}><div className="row static col">
                <span className="row-main">
                  <b>{TYPES_INCIDENT[i.type] || i.type}</b>
                  <small>{fmtDate(i.date)}{i.client ? ` · ${i.client}` : ''}{i.frais ? ` · frais ${fmtF(i.frais)} (${i.aCharge === 'partenaire' ? 'partenaire' : 'client'})` : ''}</small>
                  <small className="mono">{p ? `${fmtPhone(p.msisdn) || '—'} · IMSI ${p.imsi || '—'}` : i.numero ? `N° ${i.numero}` : 'Puce non précisée'}</small>
                  {i.notes && <small>{i.notes}</small>}
                </span>
                <span className="row-actions">
                  <Badge tone={i.statut === 'resolu' ? 'good' : 'warn'}>{i.statut === 'resolu' ? 'Résolu' : 'En cours'}</Badge>
                  <button className="btn ghost sm" onClick={() => dispatch({ type: 'incident/toggle', id: i.id })}>{i.statut === 'resolu' ? 'Rouvrir' : 'Marquer résolu'}</button>
                  <ConfirmButton label="Supprimer" confirm="Sûr ?" className="btn danger sm" onConfirm={() => { dispatch({ type: 'incident/delete', id: i.id }); toast('Incident supprimé'); }} />
                </span>
              </div></li>
            ); })}
          </ul>
        )}
      </Card>
      {open && <IncidentForm onClose={() => setOpen(false)} />}
    </div>
  );
}

function IncidentForm({ onClose }) {
  const { state, dispatch } = useStore(); const toast = useToast();
  const s = state.settings;
  const [f, setF] = useState({ date: todayISO(), type: 'defectueuse', puceId: '', numero: '', client: '', frais: s.fraisReemission, aCharge: 'client', notes: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const sold = useMemo(() => ventesParPuce(state), [state]);
  const d = digits(f.numero);
  const matches = !f.puceId && d.length >= 3 ? state.puces.filter((p) => p.msisdn.includes(d) || p.imsi.includes(d)).slice(0, 5) : [];
  const chosen = state.puces.find((p) => p.id === f.puceId);
  const pick = (p) => { const v = sold.get(p.id); setF((x) => ({ ...x, puceId: p.id, numero: '', client: x.client || (v ? nameOf(v) : '') })); };
  const save = () => {
    dispatch({ type: 'incident/add', incident: { id: uid(), date: f.date, type: f.type, puceId: f.puceId || null, numero: f.puceId ? '' : digits(f.numero), client: f.client.trim(), frais: f.type === 'defectueuse' ? Number(digits(f.frais)) || 0 : 0, aCharge: f.aCharge, statut: 'en_cours', notes: f.notes.trim() } });
    toast('Incident enregistré'); onClose();
  };
  return (
    <Modal title="Signaler un incident" onClose={onClose} footer={<button className="btn primary block" onClick={save}>Enregistrer l’incident</button>}>
      <div className="form">
        <Field label="Type d’incident" id="if-type"><div className="chips">{Object.entries(TYPES_INCIDENT).map(([k, l]) => <button type="button" key={k} className="chip" aria-pressed={f.type === k} onClick={() => set('type', k)}>{l}</button>)}</div></Field>
        <Field label="Puce concernée" id="if-num" hint={chosen ? '' : 'Tapez les derniers chiffres du numéro ou de l’IMSI, puis choisissez la puce.'}>
          {chosen ? (
            <div className="chips"><span className="chip on"><span className="mono">{fmtPhone(chosen.msisdn) || chosen.imsi}</span><button type="button" onClick={() => set('puceId', '')} aria-label="Changer de puce"><Icon name="x" size={14} /></button></span></div>
          ) : (
            <>
              <input id="if-num" inputMode="numeric" value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Numéro ou IMSI" autoComplete="off" />
              {matches.length > 0 && <div className="picker">{matches.map((p) => <button type="button" key={p.id} onClick={() => pick(p)}><b className="mono">{fmtPhone(p.msisdn) || '—'}</b><small className="mono">IMSI {p.imsi || '—'}{sold.get(p.id) ? ` · ${nameOf(sold.get(p.id))}` : ''}</small></button>)}</div>}
            </>
          )}
        </Field>
        <div className="grid2">
          <Field label="Client (facultatif)" id="if-client"><input id="if-client" value={f.client} onChange={(e) => set('client', e.target.value)} autoComplete="off" /></Field>
          <Field label="Date" id="if-date"><input id="if-date" type="date" value={f.date} max={todayISO()} onChange={(e) => set('date', e.target.value)} /></Field>
        </div>
        {f.type === 'defectueuse' && (
          <div className="grid2">
            <Field label="Frais de réémission" id="if-frais"><input id="if-frais" inputMode="numeric" value={f.frais} onChange={(e) => set('frais', e.target.value)} /></Field>
            <Field label="À la charge de" id="if-charge"><div className="chips"><button type="button" className="chip" aria-pressed={f.aCharge === 'client'} onClick={() => set('aCharge', 'client')}>Client</button><button type="button" className="chip" aria-pressed={f.aCharge === 'partenaire'} onClick={() => set('aCharge', 'partenaire')}>Partenaire</button></div></Field>
          </div>
        )}
        <Field label="Notes (facultatif)" id="if-notes"><input id="if-notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} autoComplete="off" /></Field>
      </div>
    </Modal>
  );
}
