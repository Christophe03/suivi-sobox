# Suivi SOBOX+

Outil de suivi des ventes et du stock de boîtiers SOBOX+ pour un partenaire distributeur.
Application **React (JavaScript)**, sans serveur : les données restent dans le navigateur de l'appareil.

## Ce que fait l'outil

| Écran | Contenu |
|---|---|
| Tableau de bord | Ventes du jour et de la période, stock, incidents ouverts, objectif, prime, ventes des 14 derniers jours, quartiers |
| Ventes | Enregistrer une vente (client, quartier, puce remise, livraison), chercher, modifier, exporter en Excel |
| Stock | Importer le fichier Excel du stock (IMSI / MSISDN), coller des numéros, retrouver une puce, corriger le stock |
| Incidents | Puce défectueuse, rejet d'identification ou de notification, avec statut en cours / résolu |
| Rapports | Par période : boîtiers, montant, commission, prime, épargne, par quartier, par jour ; export Excel |
| Réglages | Prix, commission, prime, épargne par boîtier, jour de clôture, sauvegarde et restauration |

Chaque puce importée est suivie une par une : en stock, vendue (à quel client, quel jour) ou signalée.

## Démarrer

Il faut Node.js 18 ou plus.

```bash
npm install
npm run dev          # ouvre l'appli en développement (Vite)
npm run build        # crée le dossier dist/ à déposer sur un hébergement
```

`dist/` ne contient que des fichiers statiques : on peut le déposer dans n'importe quel dossier
d'un site (Hostinger, etc.). Aucune base de données n'est nécessaire.

### Fichier unique, sans internet

```bash
npm run build:fichier-unique
```

Crée `dist-fichier-unique/suivi-sobox.html` : un seul fichier, à ouvrir dans Chrome ou Edge
par un double-clic. Pratique pour une démonstration ou un poste sans connexion.
Un exemplaire déjà construit est fourni dans ce dossier.

## Organisation du code

```
index.html                 point d'entrée (Vite)
src/main.jsx               démarrage de React
src/App.jsx                structure : menu, en-tête, pages
src/styles.css             toute la mise en forme (clair et sombre, téléphone et ordinateur)
src/components/            un fichier par écran + ui.jsx (briques communes)
src/lib/store.jsx          état de l'appli et enregistrement dans le navigateur
src/lib/stats.js           calculs : stock, commission, prime, épargne
src/lib/periods.js         périodes de vente (mois civil ou clôture le 23)
src/lib/excel.js           import du stock, exports Excel, sauvegarde
src/lib/xlsx.js            lecture / écriture des fichiers .xlsx (avec JSZip)
src/lib/demo.js            données d'exemple fictives
scripts/build-single.mjs   fabrication du fichier unique (esbuild)
```

## Données

Tout est dans un seul objet, enregistré sous la clé `suivi-sobox:v1` du navigateur :
`settings`, `receptions`, `puces`, `ventes`, `incidents`, `ajustements`, `commissions`.
Rien n'est stocké en cumul : stock, commission et épargne sont recalculés à partir des ventes.

- Le prix, la commission et l'épargne sont copiés dans chaque vente au moment de la vente :
  changer un tarif ne modifie pas l'historique.
- Les données ne quittent pas l'appareil. Pour changer d'appareil : Réglages > Sauvegarder,
  puis Restaurer sur le nouvel appareil.
- Pour passer à plusieurs utilisateurs avec un serveur, il suffit de remplacer les fonctions
  `load()` et `save()` de `src/lib/store.jsx` par des appels à une API.

## Fichier de stock

Formats acceptés : `.xlsx` et `.csv`. Les colonnes sont reconnues à leur titre (`IMSI`, `MSISDN`,
`Numéro`, `Téléphone`) ou, sans titre, à la longueur des numéros. Les numéros déjà présents dans
le stock et les doublons du fichier sont ignorés, et un aperçu est montré avant d'ajouter.
L'ancien format `.xls` n'est pas lu : l'enregistrer en `.xlsx` ou copier-coller les colonnes.

## Vérifications faites

Le fichier unique a été testé de bout en bout dans Chromium : import d'un fichier Excel réel,
vente avec puce, blocage en cas de stock insuffisant, incident, rapport, export Excel relu,
sauvegarde et restauration, affichage téléphone et ordinateur.
