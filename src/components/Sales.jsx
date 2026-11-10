import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Card, Kpi, Empty, Icon, useToast } from './ui.jsx';
import { fmtF, fmtN, fmtDay, fmtPhone, nameOf, digits } from '../lib/format.js';
import { currentPeriod, inPeriod, periodName } from '../lib/periods.js';
import { montantVente } from '../lib/stats.js';
import { exporterPeriode, exporterTout } from '../lib/excel.js';

export default function Sales({ onNew, onEdit }) {
  const { state } = useStore();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('periode');
  const cd = state.settings.closeDay; const key = currentPeriod(cd);
  const puces = useMemo(() => new Map(state.puces.map((p) => [p.id, p])), [state.puces]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase(); const d = digits(q);
    return state.ventes
      .filter((v) => scope === 'tout' || inPeriod(v.date, key, cd))
      .filter((v) => {
        if (!t) return true;
        if (`${nameOf(v)} ${v.quartier || ''}`.toLowerCase().includes(t)) return true;
        if (d.length >= 3) { if (digits(v.telephone).includes(d)) return true; return (v.puceIds || []).some((id) => { const p = puces.get(id); return p && (p.msisdn.includes(d) || p.imsi.includes(d)); }); }
        return false;
      })
      .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  }, [state.ventes, q, scope, key, cd, puces]);

  const qty = list.reduce((s, v) => s + v.qty, 0); const total = list.reduce((s, v) => s + montantVente(v), 0);
  const exporter = async () => {
    try { if (scope === 'tout') await exporterTout(state); else await exporterPeriode(state, key); toast('Fichier Excel créé'); }
    catch (e) { toast('Impossible de créer le fichier', 'bad'); }
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Période affichée">
          <button aria-pressed={scope === 'periode'} onClick={() => setScope('periode')}>{periodName(key)}</button>
          <button aria-pressed={scope === 'tout'} onClick={() => setScope('tout')}>Toutes</button>
        </div>
        <button className="btn ghost" onClick={exporter}><Icon name="download" size={18} /><span>Exporter en Excel</span></button>
      </div>
      <div className="kpis two">
        <Kpi label="Boîtiers vendus" value={fmtN(qty)} sub={`${fmtN(list.length)} vente${list.length > 1 ? 's' : ''}`} />
        <Kpi label="Montant encaissé" value={fmtF(total)} sub="livraison comprise" />
      </div>
      <div className="search"><Icon name="search" size={18} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un client, un quartier, un numéro" aria-label="Chercher une vente" /></div>
      <Card>
        {list.length === 0 ? (
          <Empty title={state.ventes.length ? 'Aucune vente ne correspond' : 'Aucune vente pour le moment'}>{state.ventes.length ? 'Changez la recherche ou affichez toutes les périodes.' : <button className="btn primary" onClick={onNew}>Enregistrer une vente</button>}</Empty>
        ) : (
          <ul className="list">
            {list.map((v) => {
              const nums = (v.puceIds || []).map((id) => puces.get(id)).filter(Boolean).map((p) => fmtPhone(p.msisdn) || p.imsi);
              return (
                <li key={v.id}><button className="row" onClick={() => onEdit(v)}>
                  <span className="row-main">
                    <b>{nameOf(v)}{v.qty > 1 ? ` × ${v.qty}` : ''}</b>
                    <small>{fmtDay(v.date)}{v.quartier ? ` · ${v.quartier}` : ''}{v.telephone ? ` · ${fmtPhone(v.telephone)}` : ''}</small>
                    <small className="mono">{nums.length ? `Puce ${nums.join(', ')}` : 'Puce non renseignée'}</small>
                  </span>
                  <span className="row-end"><b>{fmtF(montantVente(v))}</b>{v.livraison && <small>dont livraison {fmtF(v.fraisLivraison)}</small>}</span>
                </button></li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
