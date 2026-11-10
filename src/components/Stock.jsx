import React, { useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Card, Kpi, Badge, Empty, Modal, Field, Icon, ConfirmButton, useToast } from './ui.jsx';
import { fmtN, fmtDate, fmtPhone, todayISO, uid, digits, nameOf, plural } from '../lib/format.js';
import { stockDisponible, qtyRecue, qtyVendue, ventesParPuce, incidentsOuvertsParPuce, statutPuce } from '../lib/stats.js';
import { readFileRows, parsePasted, extractPuces, sansDejaConnues, telechargerModele } from '../lib/excel.js';

const STATUT = { stock: ['good', 'En stock'], vendue: ['neutral', 'Vendue'], signalee: ['warn', 'Signalée'] };

export default function Stock() {
  const { state, dispatch } = useStore();
  const toast = useToast();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);   // { nouvelles, dejaLa, doublons, fichier }
  const [modal, setModal] = useState(null);       // 'coller' | 'manuel' | 'ajuster'
  const [drag, setDrag] = useState(false);
  const [q, setQ] = useState('');

  const sold = useMemo(() => ventesParPuce(state), [state]);
  const flagged = useMemo(() => incidentsOuvertsParPuce(state), [state]);
  const stock = stockDisponible(state);
  const numerotees = state.puces.filter((p) => statutPuce(p, sold, flagged) === 'stock').length;
  const d = digits(q);
  const found = d.length >= 3 ? state.puces.filter((p) => p.msisdn.includes(d) || p.imsi.includes(d)).slice(0, 20) : [];

  const analyser = (rows, fichier) => {
    const { puces, doublons } = extractPuces(rows);
    if (!puces.length) return toast('Aucun numéro IMSI ou MSISDN trouvé dans ce fichier', 'bad');
    const { nouvelles, dejaLa } = sansDejaConnues(puces, state.puces);
    setModal(null); setPreview({ nouvelles, dejaLa, doublons, fichier });
    return undefined;
  };
  const onFile = async (file) => {
    if (!file) return;
    try { analyser(await readFileRows(file), file.name); }
    catch (e) { toast(e.message || 'Fichier illisible', 'bad'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const supprimable = (r) => !state.puces.some((p) => p.receptionId === r.id && sold.has(p.id)) && stock - r.qty >= 0;

  return (
    <div className="stack">
      <div className="kpis">
        <Kpi label="Stock disponible" value={fmtN(stock)} tone={stock <= 0 ? 'bad' : stock <= state.settings.stockBas ? 'warn' : 'good'} sub="boîtiers" />
        <Kpi label="Puces numérotées en stock" value={fmtN(numerotees)} sub="avec IMSI / numéro" />
        <Kpi label="Reçus au total" value={fmtN(qtyRecue(state))} sub={plural(state.receptions.length, 'réception', 'réceptions')} />
        <Kpi label="Vendus au total" value={fmtN(qtyVendue(state))} sub="boîtiers" />
      </div>

      <Card title="Recevoir du stock">
        <div className={`drop ${drag ? 'over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}>
          <Icon name="upload" size={28} />
          <b>Importer le fichier Excel du stock</b>
          <span className="muted small">Colonnes IMSI et MSISDN. Formats .xlsx ou .csv.</span>
          <label className="btn primary"><input ref={fileRef} type="file" accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files[0])} />Choisir un fichier</label>
        </div>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => setModal('coller')}><Icon name="clip" size={18} /><span>Coller des numéros</span></button>
          <button className="btn ghost" onClick={() => setModal('manuel')}><Icon name="plus" size={18} /><span>Réception sans fichier</span></button>
          <button className="btn ghost" onClick={() => telechargerModele().catch(() => toast('Impossible de créer le fichier', 'bad'))}><Icon name="download" size={18} /><span>Modèle Excel</span></button>
          <button className="btn ghost" onClick={() => setModal('ajuster')}><Icon name="edit" size={18} /><span>Corriger le stock</span></button>
        </div>
      </Card>

      <Card title="Retrouver une puce">
        <div className="search"><Icon name="search" size={18} /><input type="search" inputMode="numeric" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Numéro ou IMSI (3 chiffres minimum)" aria-label="Chercher une puce" /></div>
        {d.length >= 3 && (found.length === 0 ? <p className="muted small" style={{ marginTop: 10 }}>Aucune puce ne correspond.</p> : (
          <ul className="list">
            {found.map((p) => { const st = statutPuce(p, sold, flagged); const v = sold.get(p.id); return (
              <li key={p.id}><div className="row static">
                <span className="row-main"><b className="mono">{fmtPhone(p.msisdn) || '—'}</b><small className="mono">IMSI {p.imsi || '—'}</small>{v && <small>{nameOf(v)} · {fmtDate(v.date)}</small>}</span>
                <span className="row-end"><Badge tone={STATUT[st][0]}>{STATUT[st][1]}</Badge></span>
              </div></li>
            ); })}
          </ul>
        ))}
      </Card>

      <Card title="Réceptions">
        {state.receptions.length === 0 ? <Empty title="Aucune réception">Importez le fichier reçu avec les boîtiers pour commencer.</Empty> : (
          <ul className="list">
            {[...state.receptions].sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
              <li key={r.id}><div className="row static">
                <span className="row-main"><b>{plural(r.qty, 'boîtier', 'boîtiers')}</b><small>{fmtDate(r.date)}{r.fichier ? ` · ${r.fichier}` : ' · sans fichier'}{r.note ? ` · ${r.note}` : ''}</small></span>
                <span className="row-end">{supprimable(r) ? <ConfirmButton label="Supprimer" confirm="Sûr ?" className="btn danger sm" onConfirm={() => { dispatch({ type: 'reception/delete', id: r.id }); toast('Réception supprimée'); }} /> : <Badge>Déjà entamée</Badge>}</span>
              </div></li>
            ))}
          </ul>
        )}
        {state.ajustements.length > 0 && (
          <>
            <h3>Corrections de stock</h3>
            <ul className="list">{[...state.ajustements].reverse().map((a) => <li key={a.id}><div className="row static"><span className="row-main"><b>{a.delta > 0 ? '+' : ''}{a.delta} boîtier{Math.abs(a.delta) > 1 ? 's' : ''}</b><small>{fmtDate(a.date)} · {a.motif}</small></span></div></li>)}</ul>
          </>
        )}
      </Card>

      {preview && <ImportPreview data={preview} onClose={() => setPreview(null)} />}
      {modal === 'coller' && <PasteModal onClose={() => setModal(null)} onRows={(rows) => analyser(rows, '')} />}
      {modal === 'manuel' && <ManualModal onClose={() => setModal(null)} />}
      {modal === 'ajuster' && <AdjustModal stock={stock} onClose={() => setModal(null)} />}
    </div>
  );
}

function ImportPreview({ data, onClose }) {
  const { dispatch } = useStore(); const toast = useToast();
  const [date, setDate] = useState(todayISO()); const [note, setNote] = useState('');
  const n = data.nouvelles.length;
  const confirm = () => {
    const id = uid();
    dispatch({ type: 'reception/add', reception: { id, date, qty: n, fichier: data.fichier || 'numéros collés', note: note.trim() }, puces: data.nouvelles.map((p) => ({ id: uid(), imsi: p.imsi, msisdn: p.msisdn, receptionId: id })) });
    toast(`${n} boîtier${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} au stock`); onClose();
  };
  return (
    <Modal title="Vérifier avant d’ajouter" onClose={onClose} footer={<button className="btn primary block" disabled={!n} onClick={confirm}>{n ? `Ajouter ${n} boîtier${n > 1 ? 's' : ''} au stock` : 'Rien à ajouter'}</button>}>
      <div className="form">
        <div className="kpis two"><Kpi label="Puces lues" value={fmtN(n)} tone="good" sub="nouvelles" /><Kpi label="Ignorées" value={fmtN(data.dejaLa + data.doublons)} sub={`${data.dejaLa} déjà en stock, ${data.doublons} en double`} /></div>
        {n > 0 && (
          <div className="scroll-x"><table className="t left"><thead><tr><th>IMSI</th><th>Numéro</th></tr></thead><tbody>{data.nouvelles.slice(0, 5).map((p, i) => <tr key={i}><td className="mono">{p.imsi || '—'}</td><td className="mono">{fmtPhone(p.msisdn) || '—'}</td></tr>)}</tbody></table></div>
        )}
        {n > 5 && <p className="muted small">… et {n - 5} autres.</p>}
        <div className="grid2">
          <Field label="Date de réception" id="ip-date"><input id="ip-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Note (facultatif)" id="ip-note"><input id="ip-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : lot de novembre" /></Field>
        </div>
      </div>
    </Modal>
  );
}
function PasteModal({ onClose, onRows }) {
  const [text, setText] = useState('');
  return (
    <Modal title="Coller des numéros" onClose={onClose} footer={<button className="btn primary block" disabled={!text.trim()} onClick={() => onRows(parsePasted(text))}>Lire les numéros</button>}>
      <div className="form">
        <Field label="Copiez les colonnes IMSI et MSISDN depuis Excel, puis collez-les ici" id="pm-text" hint="Une puce par ligne. Les titres de colonnes sont reconnus s’ils sont présents.">
          <textarea id="pm-text" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={'IMSI\tMSISDN\n610020000000001\t70000001'} />
        </Field>
      </div>
    </Modal>
  );
}
function ManualModal({ onClose }) {
  const { dispatch } = useStore(); const toast = useToast();
  const [qty, setQty] = useState(''); const [date, setDate] = useState(todayISO()); const [note, setNote] = useState('');
  const n = Number(digits(qty)) || 0;
  return (
    <Modal title="Réception sans fichier" onClose={onClose} footer={<button className="btn primary block" disabled={!n} onClick={() => { dispatch({ type: 'reception/add', reception: { id: uid(), date, qty: n, fichier: '', note: note.trim() }, puces: [] }); toast(`${n} boîtier${n > 1 ? 's' : ''} ajouté${n > 1 ? 's' : ''} au stock`); onClose(); }}>Ajouter au stock</button>}>
      <div className="form">
        <p className="muted small">À utiliser quand vous n’avez pas le fichier des numéros. Les puces ne pourront pas être suivies une par une.</p>
        <div className="grid2">
          <Field label="Nombre de boîtiers reçus" id="mm-qty"><input id="mm-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Date de réception" id="mm-date"><input id="mm-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>
        <Field label="Note (facultatif)" id="mm-note"><input id="mm-note" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
function AdjustModal({ stock, onClose }) {
  const { dispatch } = useStore(); const toast = useToast();
  const [reel, setReel] = useState(String(Math.max(0, stock))); const [motif, setMotif] = useState('');
  const delta = (Number(digits(reel)) || 0) - stock;
  return (
    <Modal title="Corriger le stock" onClose={onClose} footer={<button className="btn primary block" disabled={!delta || !motif.trim()} onClick={() => { dispatch({ type: 'stock/adjust', ajustement: { id: uid(), date: todayISO(), delta, motif: motif.trim() } }); toast('Stock corrigé'); onClose(); }}>Enregistrer la correction</button>}>
      <div className="form">
        <p className="muted small">L’outil compte {stock} boîtier{Math.abs(stock) > 1 ? 's' : ''}. Indiquez le nombre réellement en stock : la différence est gardée dans l’historique.</p>
        <Field label="Boîtiers réellement en stock" id="am-reel" hint={delta ? `Différence : ${delta > 0 ? '+' : ''}${delta}` : 'Pas de différence'}><input id="am-reel" inputMode="numeric" value={reel} onChange={(e) => setReel(e.target.value)} /></Field>
        <Field label="Motif (obligatoire)" id="am-motif"><input id="am-motif" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex : boîtier retourné à l’agence" /></Field>
      </div>
    </Modal>
  );
}
