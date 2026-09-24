// Gedeeld gereedschap voor de browsertests: index.html serveren met de
// netwerk-import naar Supabase vervangen door de lokale nabootsing.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const hier = dirname(fileURLToPath(import.meta.url));
export const wortel = join(hier, '..');

export function maakControle(titel) {
  const resultaten = [];
  console.log(`\n=== ${titel} ===`);
  return {
    resultaten,
    check(naam, ok, extra = '') {
      resultaten.push({ naam, ok });
      console.log(`${ok ? '  ok  ' : ' FAIL '} ${naam}${extra ? ' — ' + extra : ''}`);
    },
    afronden() {
      const gezakt = resultaten.filter((r) => !r.ok);
      console.log(`${resultaten.length - gezakt.length}/${resultaten.length} geslaagd`);
      return gezakt.length === 0;
    },
  };
}

// aanpassen() krijgt de broncode van de nabootsing en mag hem wijzigen,
// zodat een test een kapotte database kan naspelen.
//
// userAgent doet zich voor als een ander apparaat. Nodig voor de iOS-kant van
// "zet op beginscherm": daar bestaat de installatieprompt van Chrome niet en
// hangt het scherm dus aan wat navigator.userAgent zegt.
// voorafAan() krijgt de Playwright-pagina in handen vlak vóór de eerste
// navigatie. Daar hoort alles wat de app al bij het opstarten leest:
// test/talen.test.mjs zet er bijvoorbeeld navigator.languages mee om, en dat
// moet gebeurd zijn voordat de app zijn taal kiest.
export async function startPagina({ aanpassen = (s) => s, indexPad, userAgent,
                                   taal = 'nl', voorafAan } = {}) {
  const map = mkdtempSync(join(tmpdir(), 'poule-test-'));

  const bron = readFileSync(indexPad ?? join(wortel, 'app', 'index.html'), 'utf8');
  const html = bron.replace(
    /await import\(\s*'https:\/\/esm\.sh\/@supabase\/supabase-js@2'\s*\)/,
    "await import('./nabootsing-supabase.mjs')");
  if (html === bron) throw new Error('de import-regel van supabase-js is niet gevonden in index.html');

  writeFileSync(join(map, 'index.html'), html);
  writeFileSync(join(map, 'nabootsing-supabase.mjs'),
    aanpassen(readFileSync(join(hier, 'nabootsing-supabase.mjs'), 'utf8')));

  const types = { '.html': 'text/html', '.mjs': 'text/javascript',
                  // sw.js hoort als javascript geserveerd te worden, anders
                  // weigert de browser hem als service worker.
                  '.js': 'text/javascript', '.woff2': 'font/woff2',
                  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
                  '.ics': 'text/calendar' };
  const server = createServer((req, res) => {
    // Eerst de querystring eraf: de app leest ?code= uit de link, dus '/'
    // komt hier ook binnen als '/?code=RTM026'.
    const pad = req.url.split('?')[0];
    const naam = pad === '/' ? '/index.html' : pad;
    try {
      // Eerst de tijdelijke map (daar staan index.html en de nabootsing), dan
      // de repo zelf. Dat tweede is er voor de lettertypen: die staan sinds
      // kort in lettertypen/ en horen ook in een test gewoon te laden, anders
      // rendert elke test met andere letters dan de echte app.
      let body;
      try { body = readFileSync(join(map, naam)); }
      catch { body = readFileSync(join(wortel, naam.replace(/^\//, ''))); }
      res.writeHead(200, { 'Content-Type': types[naam.slice(naam.lastIndexOf('.'))] ?? 'text/plain' });
      res.end(body);
    } catch { res.writeHead(404); res.end('niet gevonden'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const browser = await chromium.launch();
  const page = await browser.newPage(userAgent ? { userAgent } : {});
  // De app kiest zijn taal uit de browser als niemand zelf iets gekozen heeft,
  // en een testbrowser staat op Engels. Alle testen hieronder letten op de
  // Nederlandse tekst, dus die keuze wordt hier gemaakt in plaats van per
  // test. test/talen.test.mjs doet het juist zonder, en test daarmee de
  // automatische keuze zelf.
  if (taal) await page.addInitScript((t) => {
    try { localStorage.setItem('poule:taal', t); } catch { /* niets */ }
  }, taal);
  if (voorafAan) await voorafAan(page);
  const jsFouten = [];
  page.on('pageerror', (e) => jsFouten.push(String(e)));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);

  return {
    page, jsFouten, url,
    async stoppen() { await browser.close(); server.close(); },
  };
}

// Ná een [data-lid]- of #maak-klik die zou moeten uitkomen in de poule.
//
// Een verse claim laat de app sinds koppelVraagScherm() eenmalig vragen of je
// wilt koppelen; een claim die al bestond niet (bijvoorbeeld dezelfde naam
// twee keer, of nog een speler op hetzelfde toestel die aan niemand komt te
// hangen). Vandaar op allebei wachten en alleen wegklikken als hij er ook
// echt is — één plek voor deze naad, in plaats van in elk testbestand apart.
export async function naDeClaim(page) {
  await Promise.race([
    page.waitForSelector('#koppelnunniet'),
    page.waitForSelector('[data-race]'),
  ]);
  if (await page.$('#koppelnunniet')) await page.click('#koppelnunniet');
  await page.waitForSelector('[data-race]');
}

// De vaste eerste stappen: poulecode invoeren en jezelf aanwijzen.
export async function meedoen(page) {
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await naDeClaim(page);
}

export async function openRace(page, naam) {
  await page.waitForSelector('[data-race]');
  await page.click(`[data-race]:has(.nm:text-is("${naam}"))`);
  await page.waitForSelector('#paneel');
}

// Vult de top 10 af: tik een lege plek aan, kies de eerste coureur die nog
// mag, herhaal. Sinds het keuzeblad staat er geen coureurlijst meer los op
// het scherm — je wijst eerst de plek aan die je bedoelt.
export async function kiesTien(page) {
  for (let i = 0; i < 10; i++) {
    const leeg = await page.$('.slot.leegplek');
    if (!leeg) break;
    await leeg.click();
    await page.waitForSelector('#kiesblad .kiesknop:not([disabled])');
    await page.click('#kiesblad .kiesknop:not([disabled])');
    await page.waitForSelector('#kiesblad', { state: 'detached' });
  }
}

// Eén plek of één vraag invullen via het keuzeblad. Zonder `nr` pakt hij de
// eerste coureur die nog te kiezen is.
export async function kiesVoor(page, kies, nr) {
  await page.click(kies);
  await page.waitForSelector('#kiesblad');
  await page.click(nr
    ? `#kiesblad [data-kiesdrv="${nr}"]`
    : '#kiesblad .kiesknop:not([disabled])');
  await page.waitForSelector('#kiesblad', { state: 'detached' });
}

// Welke coureur staat er nu op een plek of bij een vraag?
export const opPlek = (page, kies) =>
  page.$eval(kies, (n) => n.querySelector('.code')?.textContent.trim() ?? '');

// De site zoals GitHub Pages hem serveert: de landingspagina in de hoofdmap,
// de talen in hun eigen map en de app in app/. startPagina() hierboven zet de
// app op / en is er voor alles wat óver de app gaat; dit is er voor wat over
// de weg ernaartoe gaat -- het doorsturen vanaf /, de paden tussen de mappen,
// en wat een bezoeker zonder poule te zien krijgt.
//
// De app krijgt ook hier de nabootsing in plaats van Supabase. Alles wat naar
// een andere host wil, wordt geweigerd en onthouden in `extern`: de pagina's
// horen niets van buiten te laden.
export async function startSite({ voorafAan, taal = null } = {}) {
  const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
                  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg',
                  '.xml': 'application/xml', '.txt': 'text/plain', '.ics': 'text/calendar',
                  '.webmanifest': 'application/manifest+json' };
  const appBron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8').replace(
    /await import\(\s*'https:\/\/esm\.sh\/@supabase\/supabase-js@2'\s*\)/,
    "await import('./nabootsing-supabase.mjs')");
  const server = createServer((req, res) => {
    const pad = decodeURIComponent(req.url.split('?')[0]);
    const stuur = (body, soort) => { res.writeHead(200, { 'Content-Type': soort }); res.end(body); };
    if (pad === '/app/' || pad === '/app/index.html') return stuur(appBron, 'text/html');
    if (pad === '/app/nabootsing-supabase.mjs') {
      return stuur(readFileSync(join(hier, 'nabootsing-supabase.mjs')), 'text/javascript');
    }
    let vol = join(wortel, pad.replace(/^\//, ''));
    try {
      if (statSync(vol).isDirectory()) vol = join(vol, 'index.html');
      stuur(readFileSync(vol), types[vol.slice(vol.lastIndexOf('.'))] ?? 'application/octet-stream');
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(readFileSync(join(wortel, '404.html')));
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const extern = [];
  await context.route((u) => !u.href.startsWith(url), (route) => {
    extern.push(route.request().url());
    return route.abort();
  });
  if (taal) await context.addInitScript((t) => {
    try { localStorage.setItem('poule:taal', t); } catch { /* niets */ }
  }, taal);
  const page = await context.newPage();
  if (voorafAan) await voorafAan(page, context);
  const jsFouten = [];
  page.on('pageerror', (e) => jsFouten.push(String(e)));
  return {
    page, context, url, extern, jsFouten,
    async stoppen() { await browser.close(); server.close(); },
  };
}
