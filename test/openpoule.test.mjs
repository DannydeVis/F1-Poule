// "Geen groep? Speel mee in de open poule" onder de knop.
//
// De code van de open poule staat in OPEN_POULE in site/teksten.mjs; zolang
// die null is, staat de regel nergens. Deze test kijkt naar allebei: de site
// zoals hij nu is, en een kopie van de repo met een proefcode, zodat de regel
// ook getest is voordat de echte code erin staat.
//
// Wat hier vastligt:
//   1. Elke taal van de voorpagina heeft de twee stukjes tekst.
//   2. Een code moet een poulecode zijn zoals de app hem leest
//      (ZIET_ERUIT_ALS_POULECODE); null mag, en betekent: geen regel.
//   3. De regel zelf: de tekst in de taal van de pagina, en een link naar de
//      app met ?code=, net als een uitnodigingslink.
//   4. Zoals de site nu is: met OPEN_POULE null nergens een regel, met een
//      code op elke plek waar hij hoort.
//   5. Met een proefcode, in een kopie: op de voorpagina in alle zeven talen
//      onder de knop in de hero en onderaan, op elke gids, de about-pagina en
//      elke racepagina onder de knop in het slotblok; de link komt uit bij de
//      app; en een code die geen poulecode is, laat het maken zakken.
//   6. In de browser, met de proefcode: leesbaar (contrast, licht en donker) en
//      geen horizontale scroll op 360 pixels.

import { readFileSync, cpSync, mkdtempSync, writeFileSync, existsSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { maakControle, wortel, CONTRAST } from './hulp.mjs';
import { teksten, TALEN, OPEN_POULE } from '../site/teksten.mjs';
import { PAGINAS } from '../site/paginas.mjs';
import { RACEPAGINAS } from '../scripts/racepaginas.mjs';
import { POULECODE, controleerCode, openPouleRegel } from '../scripts/openpoule.mjs';

const { check, afronden } = maakControle('de open poule');

const bestandVan = (pad) => (pad ? `${pad}/index.html` : 'index.html');
const ARTIKELEN = [...PAGINAS, ...RACEPAGINAS].flatMap((pg) => Object.values(pg.talen).map((t) => t.pad));
const VOORPAGINAS = TALEN.map((c) => teksten[c].pad);

// ---- 1. de teksten ------------------------------------------------------------------
{
  const mis = TALEN.filter((c) => {
    const t = teksten[c].hero.openPoule;
    return !t || !/\?$/.test(t.vraag.trim()) || !t.link.trim() || /[–—]/.test(t.vraag + t.link);
  });
  check('elke taal heeft "Geen groep?" en de linktekst, zonder streepjes', mis.length === 0, mis.join(', '));
}

// ---- 2. de code -----------------------------------------------------------------------
{
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const inApp = app.match(/const ZIET_ERUIT_ALS_POULECODE = \(code\) => (\/.+?\/)\.test\(/)?.[1];
  check('de regel voor een poulecode komt uit de app', inApp === String(POULECODE), `${inApp} · ${POULECODE}`);
  const gooit = (x) => { try { controleerCode(x); return false; } catch { return true; } };
  check('null mag (nog geen code); een echte code ook; "abc-12", een lege code en een te lange niet',
    controleerCode(null) === null && controleerCode('RTM026') === 'RTM026'
      && gooit('abc-12') && gooit('') && gooit('ABCDEFGHIJKLM'), '');
  check('OPEN_POULE in site/teksten.mjs is null of een poulecode', OPEN_POULE === null || POULECODE.test(OPEN_POULE), String(OPEN_POULE));
}

// ---- 3. de regel ------------------------------------------------------------------------
{
  const fout = TALEN.filter((c) => {
    const t = teksten[c].hero.openPoule;
    const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return openPouleRegel('RTM026', c, '../app/') !== `<p class="openpoule">${esc(t.vraag)} <a href="../app/?code=RTM026">${esc(t.link)}</a></p>`;
  });
  check('de regel: de tekst in de taal van de pagina, en een link naar de app met ?code=', fout.length === 0, fout.join(', '));
  check('zonder code geen regel', TALEN.every((c) => openPouleRegel(null, c, 'app/') === ''));
}

// Hoe vaak de regel op een pagina staat, en of hij direct onder de knop staat.
function keuren(map, code) {
  const fout = [];
  const lees = (pad) => readFileSync(join(map, bestandVan(pad)), 'utf8');
  const naarApp = (pad, href) => new URL(href, `https://x/${pad ? `${pad}/` : ''}`).href === `https://x/app/?code=${code}`;
  for (const pad of VOORPAGINAS) {
    const html = lees(pad);
    const regels = [...html.matchAll(/<p class="openpoule">[\s\S]*?<a href="([^"]+)">/g)];
    const hero = /<\/form>\s*<\/div>\s*<p class="openpoule">/.test(html);
    const slot = /<section class="slot">[\s\S]*?<a class="knop"[^>]*>[\s\S]*?<\/a>\s*<p class="openpoule">/.test(html);
    if (!code) { if (regels.length) fout.push(`${pad || '/'}: regel zonder code`); continue; }
    if (regels.length !== 2 || !hero || !slot) fout.push(`${pad || '/'}: ${regels.length} regels, hero ${hero}, onderaan ${slot}`);
    if (!regels.every(([, href]) => naarApp(pad, href))) fout.push(`${pad || '/'}: link niet naar de app`);
  }
  for (const pad of ARTIKELEN) {
    const html = lees(pad);
    const regels = [...html.matchAll(/<p class="openpoule">[\s\S]*?<a href="([^"]+)">/g)];
    const onder = /<div class="slotblok">[\s\S]*?<a class="knop"[^>]*>[\s\S]*?<\/a>\s*<p class="openpoule">/.test(html);
    if (!code) { if (regels.length) fout.push(`${pad}: regel zonder code`); continue; }
    if (regels.length !== 1 || !onder) fout.push(`${pad}: ${regels.length} regels, onder de knop ${onder}`);
    if (!regels.every(([, href]) => naarApp(pad, href))) fout.push(`${pad}: link niet naar de app`);
  }
  return fout;
}

// ---- 4. de site zoals hij nu is ------------------------------------------------------------
{
  const fout = keuren(wortel, OPEN_POULE);
  check(OPEN_POULE ? `met de code ${OPEN_POULE}: de regel staat op elke plek waar hij hoort` : 'nog geen code: de regel staat nergens',
    fout.length === 0, fout.slice(0, 3).join(' | '));
}

// ---- 5. met een proefcode, in een kopie ---------------------------------------------------------
const kopie = mkdtempSync(join(tmpdir(), 'openpoule-'));
const proef = 'TEST12';
{
  cpSync(wortel, kopie, { recursive: true, filter: (bron) => !/[\\/](\.git|node_modules)([\\/]|$)/.test(bron.slice(wortel.length)) });
  const zet = (waarde) => {
    const pad = join(kopie, 'site', 'teksten.mjs');
    writeFileSync(pad, readFileSync(join(wortel, 'site', 'teksten.mjs'), 'utf8')
      .replace(/^export const OPEN_POULE = .*;$/m, `export const OPEN_POULE = ${waarde};`));
  };
  zet(`'${proef}'`);
  const maak = spawnSync(process.execPath, [join(kopie, 'scripts', 'maak-site.mjs')], { encoding: 'utf8', env: { ...process.env, VANDAAG: '2026-09-28' } });
  const fout = maak.status === 0 ? keuren(kopie, proef) : [`maak-site: ${maak.stderr.split('\n').find(Boolean)}`];
  check('met een proefcode: onder de knop op de voorpagina (hero en onderaan, zeven talen), op elke gids, de about-pagina en elke racepagina, naar de app',
    fout.length === 0, fout.slice(0, 3).join(' | ') || `${VOORPAGINAS.length} voorpagina's, ${ARTIKELEN.length} artikelpagina's`);
  zet(`'abc-12'`);
  const fout2 = spawnSync(process.execPath, [join(kopie, 'scripts', 'maak-site.mjs'), '--controle'], { encoding: 'utf8' });
  check('een code die geen poulecode is, laat het maken zakken, met uitleg', fout2.status !== 0 && /geen poulecode/.test(fout2.stderr),
    fout2.stderr.split('\n').find((r) => /poulecode/.test(r)) ?? `status ${fout2.status}`);
  zet(`'${proef}'`);
}

// ---- 6. in de browser, met de proefcode ---------------------------------------------------------
{
  const server = createServer((req, res) => {
    let pad = join(kopie, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (existsSync(pad) && statSync(pad).isDirectory()) pad = join(pad, 'index.html');
    if (!existsSync(pad)) { res.writeHead(404); res.end(); return; }
    const type = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', woff2: 'font/woff2', png: 'image/png',
      jpg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml', ico: 'image/x-icon' }[pad.split('.').pop()] ?? 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(readFileSync(pad));
  });
  await new Promise((klaar) => server.listen(0, '127.0.0.1', klaar));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fout = [];
  for (const pad of ['', 'en', 'de', PAGINAS[0].talen.nl.pad, RACEPAGINAS[0].talen.en.pad]) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`http://127.0.0.1:${server.address().port}/${pad ? `${pad}/` : ''}`);
    await page.waitForLoadState('networkidle');
    for (const schema of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: schema });
      // De rest van de pagina haalt de drempel al (site.test.mjs), dus alles wat
      // hier zakt, komt van de nieuwe regel.
      const slecht = await page.evaluate(CONTRAST);
      if (slecht.length) fout.push(`${pad || '/'} ${schema}: ${slecht.join(', ')}`);
    }
    await page.setViewportSize({ width: 360, height: 780 });
    const breed = await page.evaluate(() => document.documentElement.scrollWidth);
    const zichtbaar = await page.evaluate(() => [...document.querySelectorAll('.openpoule')].every((p) => p.getBoundingClientRect().width > 0));
    if (breed > 360 || !zichtbaar) fout.push(`${pad || '/'}: ${breed} breed, zichtbaar ${zichtbaar}`);
  }
  await browser.close();
  server.close();
  check('met de proefcode: de regel is leesbaar in licht en donker, en past op 360 pixels', fout.length === 0, fout.join(' | '));
}
rmSync(kopie, { recursive: true, force: true });

process.exit(afronden() ? 0 : 1);
