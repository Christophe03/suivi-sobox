import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Card, Kpi, Badge, Empty, Icon, Progress, useToast } from './ui.jsx';
import { fmtF, fmtN, fmtDate, fmtDay, plural, todayISO } from '../lib/format.js';
import { currentPeriod, periodName, periodDates, shiftPeriod } from '../lib/periods.js';
import { statsPeriode, statsGlobales } from '../lib/stats.js';
import { exporterPeriode, exporterTout } from '../lib/excel.js';

export default function Reports() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const s = state.settings; const cur = currentPeriod(s.closeDay);
  const [key, setKey] = useState(cur);
  const p = statsPeriode(state, key); const g = statsGlobales(state);
  const jours = new Map(); for (const v of p.ventes) jours.set(v.date, (jours.get(v.date) || 0) + v.qty);
  const parJour = [...jours.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const run = async (fn) => { try { await fn(); toast('Fichier Excel créé'); } catch (e) { toast('Impossible de créer le fichier', 'bad'); } };

  return (
    <div className="stack">
      <div className="period">
        <button className="icon-btn" onClick={() => setKey(shiftPeriod(key, -1))} aria-label="Période précédente"><Icon name="left" /></button>
        <div><b>{periodName(key)}</b><small>{periodDates(key, s.closeDay) || 'mois civil'}{key === cur ? ' · en cours' : ''}</small></div>
        <button className="icon-btn" onClick={() => setKey(shiftPeriod(key, 1))} disabled={key >= cur} aria-label="Période suivante"><Icon name="right" /></button>
      </div>

      <div className="kpis">
        <Kpi label="Boîtiers vendus" value={fmtN(p.qty)} sub={`objectif ${fmtN(s.objectif)}`} />
        <Kpi label="Montant des ventes" value={fmtF(p.montant)} sub={`à ${fmtF(s.prix)} le boîtier`} />
        <Kpi label="Frais de livraison" value={fmtF(p.livraison)} sub="payés par les clients" />
        <Kpi label="Épargne de la période" value={fmtF(p.epargne)} tone="good" sub={`${fmtF(s.epargne)} par boîtier`} />
      </div>

      <div className="cols">
        <Card title="Commission et prime">
          <div className="line"><span>Prime mensuelle (dès {fmtN(s.primeSeuil)} boîtiers)</span>{p.primeOK ? <Badge tone="good">Acquise</Badge> : <Badge tone="warn">encore {fmtN(p.resteePrime)}</Badge>}</div>
          <Progress value={p.qty} max={s.primeSeuil} tone={p.primeOK ? 'good' : 'accent'} />
          <table className="t" style={{ marginTop: 14 }}><tbody>
            <tr><td>Commission ({fmtN(p.qty)} × {fmtF(s.commission)})</td><td>{fmtF(p.commission)}</td></tr>
            <tr><td>Prime</td><td>{fmtF(p.prime)}</td></tr>
            <tr className="tot"><td>Total à recevoir</td><td>{fmtF(p.total)}</td></tr>
          </tbody></table>
          {p.total > 0 && (p.recue ? (
            <div className="line" style={{ marginTop: 12 }}><Badge tone="good">Reçue le {fmtDate(p.recue.date)}</Badge><button className="btn ghost sm" onClick={() => dispatch({ type: 'commission/set', key, date: null })}>Annuler</button></div>
          ) : (
            <button className="btn soft block" onClick={() => { dispatch({ type: 'commission/set', key, date: todayISO() }); toast('Commission marquée comme reçue'); }}><Icon name="check" size={18} /><span>Marquer comme reçue</span></button>
          ))}
        </Card>

        <Card title="Depuis le début">
          <table className="t"><tbody>
            <tr><td>Périodes de vente</td><td>{fmtN(g.periodes.length)}</td></tr>
            <tr><td>Boîtiers vendus</td><td>{fmtN(state.ventes.reduce((n, v) => n + v.qty, 0))}</td></tr>
            <tr><td>Commissions pas encore reçues</td><td>{fmtF(g.commissionEnAttente)}</td></tr>
            <tr className="tot"><td>Épargne cumulée</td><td>{fmtF(g.epargne)}</td></tr>
          </tbody></table>
          <p className="hint">L’épargne est une mise de côté conseillée de {fmtF(s.epargne)} sur chaque boîtier vendu. Le montant se règle dans Réglages.</p>
        </Card>
      </div>

      <div className="cols">
        <Card title="Par quartier">
          {p.quartiers.length === 0 ? <Empty title="Aucune vente sur cette période" /> : <table className="t"><tbody>{p.quartiers.map((q) => <tr key={q.nom}><td>{q.nom}</td><td>{plural(q.n, 'boîtier', 'boîtiers')}</td></tr>)}</tbody></table>}
        </Card>
        <Card title="Par jour">
          {parJour.length === 0 ? <Empty title="Aucune vente sur cette période" /> : <table className="t"><tbody>{parJour.map(([d, n]) => <tr key={d}><td>{fmtDay(d)}</td><td>{plural(n, 'boîtier', 'boîtiers')}</td></tr>)}</tbody></table>}
        </Card>
      </div>

      <Card title="Exporter">
        <p className="muted small">Le fichier Excel contient les ventes avec le numéro de chaque puce, le récapitulatif, l’état du stock et les incidents.</p>
        <div className="btn-row">
          <button className="btn primary" onClick={() => run(() => exporterPeriode(state, key))}><Icon name="download" size={18} /><span>Ventes de {periodName(key).toLowerCase()}</span></button>
          <button className="btn ghost" onClick={() => run(() => exporterTout(state))}><Icon name="download" size={18} /><span>Toutes les ventes</span></button>
        </div>
      </Card>
    </div>
  );
}
