import React from 'react';
import { useStore } from '../lib/store.jsx';
import { Card, Kpi, Badge, Progress, Empty } from './ui.jsx';
import { fmtF, fmtN, fmtDay, fmtWeekday, nameOf, plural, todayISO } from '../lib/format.js';
import { currentPeriod, periodName, periodDates } from '../lib/periods.js';
import { statsPeriode, stockDisponible, qtyDuJour, ventesParJour, montantVente, statsGlobales } from '../lib/stats.js';

export default function Dashboard({ go, onEdit }) {
  const { state } = useStore();
  const s = state.settings;
  const key = currentPeriod(s.closeDay);
  const p = statsPeriode(state, key);
  const g = statsGlobales(state);
  const stock = stockDisponible(state);
  const open = state.incidents.filter((i) => i.statut !== 'resolu').length;
  const days = ventesParJour(state, 14);
  const max = Math.max(1, ...days.map((d) => d.qty));
  const last = [...state.ventes].sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt)).slice(0, 5);
  const today = todayISO();

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Vendus aujourd’hui" value={fmtN(qtyDuJour(state))} sub={qtyDuJour(state) > 1 ? 'boîtiers' : 'boîtier'} />
        <Kpi label="Période en cours" value={fmtN(p.qty)} sub={`objectif ${fmtN(s.objectif)}`} />
        <Kpi label="Stock disponible" value={fmtN(stock)} tone={stock <= 0 ? 'bad' : stock <= s.stockBas ? 'warn' : ''} sub={stock <= s.stockBas ? 'stock bas' : 'boîtiers'} />
        <Kpi label="Incidents ouverts" value={fmtN(open)} tone={open ? 'warn' : ''} sub={open ? 'à traiter' : 'rien à traiter'} />
      </div>

      <div className="cols">
        <Card title={`${periodName(key)}`} action={<span className="muted small">{periodDates(key, s.closeDay)}</span>}>
          <div className="line"><span>Objectif de ventes</span><b>{fmtN(p.qty)} / {fmtN(s.objectif)}</b></div>
          <Progress value={p.qty} max={s.objectif} />
          <div className="line" style={{ marginTop: 14 }}><span>Prime mensuelle</span>{p.primeOK ? <Badge tone="good">Acquise</Badge> : <b>encore {plural(p.resteePrime, 'boîtier', 'boîtiers')}</b>}</div>
          <Progress value={p.qty} max={s.primeSeuil} tone={p.primeOK ? 'good' : 'accent'} />
          <table className="t" style={{ marginTop: 14 }}>
            <tbody>
              <tr><td>Commission ({fmtN(p.qty)} × {fmtF(s.commission)})</td><td>{fmtF(p.commission)}</td></tr>
              <tr><td>Prime (dès {fmtN(s.primeSeuil)} boîtiers)</td><td>{fmtF(p.prime)}</td></tr>
              <tr className="tot"><td>À recevoir pour la période</td><td>{fmtF(p.total)}</td></tr>
              <tr><td>Épargne de la période ({fmtF(s.epargne)} par boîtier)</td><td>{fmtF(p.epargne)}</td></tr>
            </tbody>
          </table>
          {g.commissionEnAttente > p.total && <p className="hint">Commissions pas encore reçues, toutes périodes : {fmtF(g.commissionEnAttente)}.</p>}
          <button className="btn soft block" onClick={() => go('rapports')}>Voir le rapport de la période</button>
        </Card>

        <Card title="Ventes des 14 derniers jours">
          <div className="bars" role="img" aria-label="Boîtiers vendus par jour sur 14 jours">
            {days.map((d) => (
              <div className="bar" key={d.date} title={`${fmtDay(d.date)} : ${d.qty}`}>
                <span>{d.qty || ''}</span>
                <div className="trk"><i className={d.date === today ? 'now' : ''} style={{ height: `${Math.max(3, Math.round((d.qty / max) * 100))}%` }} /></div>
                <small>{fmtWeekday(d.date).slice(0, 1).toUpperCase()}</small>
              </div>
            ))}
          </div>
          {p.quartiers.length > 0 && (
            <>
              <h3>Quartiers de la période</h3>
              <table className="t"><tbody>{p.quartiers.slice(0, 5).map((q) => <tr key={q.nom}><td>{q.nom}</td><td>{plural(q.n, 'boîtier', 'boîtiers')}</td></tr>)}</tbody></table>
            </>
          )}
        </Card>
      </div>

      <Card title="Dernières ventes" action={<button className="btn ghost sm" onClick={() => go('ventes')}>Tout voir</button>}>
        {last.length === 0 ? <Empty title="Aucune vente pour le moment">Touchez « Nouvelle vente » pour enregistrer la première.</Empty> : (
          <ul className="list">
            {last.map((v) => (
              <li key={v.id}><button className="row" onClick={() => onEdit(v)}>
                <span className="row-main"><b>{nameOf(v)}{v.qty > 1 ? ` × ${v.qty}` : ''}</b><small>{fmtDay(v.date)}{v.quartier ? ` · ${v.quartier}` : ''}</small></span>
                <span className="row-end"><b>{fmtF(montantVente(v))}</b></span>
              </button></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
