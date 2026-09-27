// IndexNow: welke url's er na een deploy naar Bing gaan, en hoe.
//
// Zoekplan SEO fase 3. Draait zonder browser en zonder internet: het script
// praat met een nagebootste IndexNow op localhost (INDEXNOW_URL).
//
// Wat hier vastligt:
//   1. De sleutel is 32 hex-tekens, en <sleutel>.txt staat in de hoofdmap met
//      precies de sleutel erin, en komt online.
//   2. Van bestand naar url: index.html wordt de map erboven, sitemap.xml blijft
//      sitemap.xml, en alleen wat in de sitemap staat telt. De app, het beheer,
//      404.html, kalender.ics, scripts en bronnen worden nooit gemeld.
//   3. Het script stuurt één POST met host, key, keyLocation en urlList.
//   4. Verandert er geen pagina (een sync die alleen kalender.ics commit), dan
//      gaat er niets de deur uit.
//   5. --droog laat zien wat er zou gaan, zonder te versturen; --alles meldt de
//      hele sitemap.
//   6. Weigert IndexNow de melding, dan zakt het script (en dus de workflow).
//   7. De workflow hangt achter de Pages-deploy en geeft de gewijzigde bestanden
//      door.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { BASIS, INDEXNOW_SLEUTEL } from '../site/teksten.mjs';
import { urlsVoor, sitemapUrls, melding } from '../scripts/indexnow.mjs';

const { check, afronden } = maakControle('IndexNow');

// ---- 1. de sleutel -------------------------------------------------------------
const bestand = `${INDEXNOW_SLEUTEL}.txt`;
check('de sleutel is 32 hex-tekens', /^[0-9a-f]{32}$/.test(INDEXNOW_SLEUTEL), INDEXNOW_SLEUTEL);
check('het sleutelbestand staat in de hoofdmap, met precies de sleutel erin, en komt online',
  existsSync(join(wortel, bestand)) && readFileSync(join(wortel, bestand), 'utf8') === INDEXNOW_SLEUTEL
    && gepubliceerd(bestand),
  existsSync(join(wortel, bestand)) ? JSON.stringify(readFileSync(join(wortel, bestand), 'utf8')) : 'ontbreekt');

// ---- 2. van bestand naar url -----------------------------------------------------
const kaart = sitemapUrls();
check('de sitemap heeft pagina\'s om te melden', kaart.length >= 10 && kaart.includes(`${BASIS}/`), String(kaart.length));
{
  const uit = urlsVoor(['index.html', 'en/index.html', 'f1-poule-excel/index.html',
    'en/f1-prediction-league-spreadsheet/index.html', 'privacy/index.html', 'sitemap.xml']);
  const verwacht = [`${BASIS}/`, `${BASIS}/en/`, `${BASIS}/en/f1-prediction-league-spreadsheet/`,
    `${BASIS}/f1-poule-excel/`, `${BASIS}/privacy/`, `${BASIS}/sitemap.xml`].sort();
  check('index.html wordt de map erboven, sitemap.xml blijft sitemap.xml', JSON.stringify(uit) === JSON.stringify(verwacht),
    uit.join(' '));
}
{
  const uit = urlsVoor(['app/index.html', 'beheer/index.html', '404.html', 'kalender.ics', 'scripts/sync.mjs',
    'site/teksten.mjs', 'robots.txt', 'llms.txt', `${INDEXNOW_SLEUTEL}.txt`, 'nieuw/index.html', 'README.md', '']);
  check('de app, het beheer, 404.html, een map die niet in de sitemap staat en al het andere worden nooit gemeld',
    uit.length === 0, uit.join(' '));
}
check('dubbele en rommelige paden worden één url', JSON.stringify(urlsVoor(['./index.html', 'index.html', ' index.html\r'])) === JSON.stringify([`${BASIS}/`]),
  urlsVoor(['./index.html', 'index.html', ' index.html\r']).join(' '));

// ---- 3 tot 6: het script tegen een nagebootste IndexNow ------------------------------
let ontvangen = [];
let status = 200;
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (d) => { body += d; });
  req.on('end', () => {
    ontvangen.push({ methode: req.method, type: req.headers['content-type'], body });
    res.writeHead(status);
    res.end();
  });
});
await new Promise((klaar) => server.listen(0, '127.0.0.1', klaar));
const INDEXNOW_URL = `http://127.0.0.1:${server.address().port}/indexnow`;

const draai = (args, invoer = '') => new Promise((klaar) => {
  const p = spawn(process.execPath, [join(wortel, 'scripts', 'indexnow.mjs'), ...args],
    { env: { ...process.env, INDEXNOW_URL } });
  let uit = '';
  p.stdout.on('data', (d) => { uit += d; });
  p.stderr.on('data', (d) => { uit += d; });
  p.on('close', (code) => klaar({ code, uit }));
  p.stdin.end(invoer);
});

{
  ontvangen = [];
  const r = await draai(['--stdin'], 'f1-poule-excel/index.html\nkalender.ics\nsite/lastmod.json\nsitemap.xml\n');
  const m = ontvangen[0];
  let body = {};
  try { body = JSON.parse(m?.body ?? '{}'); } catch { /* telt als leeg */ }
  check('één POST met host, key, keyLocation en de gewijzigde url\'s',
    r.code === 0 && ontvangen.length === 1 && m.methode === 'POST' && /application\/json/.test(m.type)
      && JSON.stringify(body) === JSON.stringify(melding([`${BASIS}/f1-poule-excel/`, `${BASIS}/sitemap.xml`]))
      && body.host === new URL(BASIS).host && body.keyLocation === `${BASIS}/${INDEXNOW_SLEUTEL}.txt`,
    `${r.code} · ${ontvangen.length} · ${m?.body}`);
}
{
  ontvangen = [];
  const r = await draai(['--stdin'], 'kalender.ics\n');
  check('alleen kalender.ics veranderd: niets verstuurd, en geen fout', r.code === 0 && ontvangen.length === 0,
    `${r.code} · ${ontvangen.length} · ${r.uit.trim()}`);
}
{
  ontvangen = [];
  const r = await draai(['--droog', 'index.html', 'en/index.html']);
  check('--droog laat de url\'s zien en verstuurt niets',
    r.code === 0 && ontvangen.length === 0 && r.uit.includes(`${BASIS}/en/`), r.uit.trim());
}
{
  ontvangen = [];
  const r = await draai(['--alles']);
  let body = {};
  try { body = JSON.parse(ontvangen[0]?.body ?? '{}'); } catch { /* telt als leeg */ }
  check('--alles meldt de hele sitemap en sitemap.xml zelf',
    r.code === 0 && body.urlList?.length === kaart.length + 1 && kaart.every((u) => body.urlList.includes(u))
      && body.urlList.includes(`${BASIS}/sitemap.xml`),
    `${r.code} · ${body.urlList?.length} van ${kaart.length + 1}`);
}
{
  ontvangen = [];
  status = 202;
  const ok = await draai(['index.html']);
  status = 403;
  const fout = await draai(['index.html']);
  status = 200;
  check('202 (sleutel wordt nog nagekeken) is goed, 403 laat het script zakken',
    ok.code === 0 && fout.code !== 0 && /403/.test(fout.uit), `${ok.code} · ${fout.code} · ${fout.uit.trim()}`);
}
server.close();

// ---- 7. de workflow ------------------------------------------------------------------
{
  const wf = readFileSync(join(wortel, '.github', 'workflows', 'indexnow.yml'), 'utf8');
  check('de workflow draait na de Pages-deploy, alleen als die lukte, en geeft de gewijzigde bestanden door',
    /workflow_run:\s*\n\s*workflows: \['pages-build-deployment'\]/.test(wf)
      && /conclusion == 'success'/.test(wf)
      && /git diff --name-only HEAD\^1 HEAD \| node scripts\/indexnow\.mjs --stdin/.test(wf)
      && /fetch-depth: 2/.test(wf) && /head_sha/.test(wf),
    'zie .github/workflows/indexnow.yml');
}

process.exit(afronden() ? 0 : 1);
