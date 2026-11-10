import React, { useState } from 'react';
import { useStore } from './lib/store.jsx';
import { Icon } from './components/ui.jsx';
import Dashboard from './components/Dashboard.jsx';
import Sales from './components/Sales.jsx';
import SaleForm from './components/SaleForm.jsx';
import Stock from './components/Stock.jsx';
import Incidents from './components/Incidents.jsx';
import Reports from './components/Reports.jsx';
import Settings from './components/Settings.jsx';

const PAGES = [
  { id: 'accueil', label: 'Accueil', title: 'Tableau de bord', icon: 'home' },
  { id: 'ventes', label: 'Ventes', title: 'Ventes', icon: 'cart' },
  { id: 'stock', label: 'Stock', title: 'Stock', icon: 'box' },
  { id: 'incidents', label: 'Incidents', title: 'Incidents puces', icon: 'alert' },
  { id: 'rapports', label: 'Rapports', title: 'Rapports', icon: 'chart' },
  { id: 'reglages', label: 'Réglages', title: 'Réglages', icon: 'gear' },
];

export default function App() {
  const { state, persisted } = useStore();
  const [page, setPage] = useState('accueil');
  const [sale, setSale] = useState(null); // null | 'new' | vente à modifier
  const current = PAGES.find((p) => p.id === page);
  const openIncidents = state.incidents.filter((i) => i.statut !== 'resolu').length;
  const go = (id) => { setPage(id); window.scrollTo(0, 0); };
  const s = state.settings;

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="brand-mark">S+</span><div><b>Suivi SOBOX+</b><small>{s.partenaire || 'Ventes et stock'}</small></div></div>
        <nav className="nav" aria-label="Navigation">
          {PAGES.map((p) => (
            <button key={p.id} className={`nav-btn ${p.id === 'reglages' ? 'only-wide' : ''}`} aria-current={page === p.id ? 'page' : undefined} onClick={() => go(p.id)}>
              <Icon name={p.icon} /><span>{p.label}</span>
              {p.id === 'incidents' && openIncidents > 0 && <i className="dot">{openIncidents}</i>}
            </button>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="top">
          <div className="top-title"><h1>{current.title}</h1>{(s.partenaire || s.zone) && <small>{[s.partenaire, s.zone].filter(Boolean).join(' · ')}</small>}</div>
          <button className="btn primary" onClick={() => setSale('new')}><Icon name="plus" size={18} /><span className="long">Nouvelle vente</span><span className="short">Vente</span></button>
          <button className="icon-btn only-narrow" aria-label="Réglages" aria-current={page === 'reglages' ? 'page' : undefined} onClick={() => go('reglages')}><Icon name="gear" /></button>
        </header>
        <main className="content">
          {!persisted && <div className="banner warn">Ce navigateur n’enregistre pas les données : elles seront perdues à la fermeture de la page. Ouvrez le fichier dans Chrome, ou faites une sauvegarde dans Réglages.</div>}
          {state.demo && <div className="banner info">Données d’exemple : les clients et les numéros affichés sont fictifs. Effacez-les dans Réglages avant de commencer.</div>}
          {page === 'accueil' && <Dashboard go={go} onEdit={setSale} />}
          {page === 'ventes' && <Sales onNew={() => setSale('new')} onEdit={setSale} />}
          {page === 'stock' && <Stock />}
          {page === 'incidents' && <Incidents />}
          {page === 'rapports' && <Reports />}
          {page === 'reglages' && <Settings />}
        </main>
      </div>
      {sale && <SaleForm vente={sale === 'new' ? null : sale} onClose={() => setSale(null)} />}
    </div>
  );
}
