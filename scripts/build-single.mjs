// Fabrique un fichier unique (dist-fichier-unique/suivi-sobox.html) qui s'ouvre
// dans un navigateur sans serveur et sans internet. Utilise esbuild.
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(root, '.tmp-single');
await build({
  entryPoints: [join(root, 'src/main.jsx')], bundle: true, minify: true, format: 'iife', target: ['es2019'],
  jsx: 'automatic', loader: { '.js': 'jsx' }, define: { 'process.env.NODE_ENV': '"production"' },
  outfile: join(tmp, 'app.js'), legalComments: 'none', logLevel: 'info',
});
const js = readFileSync(join(tmp, 'app.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(tmp, 'app.css'), 'utf8');
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0F6E84">
<title>Suivi SOBOX+</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
mkdirSync(join(root, 'dist-fichier-unique'), { recursive: true });
writeFileSync(join(root, 'dist-fichier-unique/suivi-sobox.html'), html);
rmSync(tmp, { recursive: true, force: true });
console.log('dist-fichier-unique/suivi-sobox.html', Math.round(html.length / 1024) + ' Ko');
