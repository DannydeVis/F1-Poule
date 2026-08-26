// Gedeeld gereedschap voor de browsertests: index.html serveren met de
// netwerk-import naar Supabase vervangen door de lokale nabootsing.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
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
export async function startPagina({ aanpassen = (s) => s, indexPad } = {}) {
  const map = mkdtempSync(join(tmpdir(), 'poule-test-'));

  const bron = readFileSync(indexPad ?? join(wortel, 'index.html'), 'utf8');
  const html = bron.replace(
    /await import\(\s*'https:\/\/esm\.sh\/@supabase\/supabase-js@2'\s*\)/,
    "await import('./nabootsing-supabase.mjs')");
  if (html === bron) throw new Error('de import-regel van supabase-js is niet gevonden in index.html');

  writeFileSync(join(map, 'index.html'), html);
  writeFileSync(join(map, 'nabootsing-supabase.mjs'),
    aanpassen(readFileSync(join(hier, 'nabootsing-supabase.mjs'), 'utf8')));

  const types = { '.html': 'text/html', '.mjs': 'text/javascript' };
  const server = createServer((req, res) => {
    // Eerst de querystring eraf: de app leest ?code= uit de link, dus '/'
    // komt hier ook binnen als '/?code=RTM026'.
    const pad = req.url.split('?')[0];
    const naam = pad === '/' ? '/index.html' : pad;
    try {
      const body = readFileSync(join(map, naam));
      res.writeHead(200, { 'Content-Type': types[naam.slice(naam.lastIndexOf('.'))] ?? 'text/plain' });
      res.end(body);
    } catch { res.writeHead(404); res.end('niet gevonden'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const jsFouten = [];
  page.on('pageerror', (e) => jsFouten.push(String(e)));
  const url = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(url);

  return {
    page, jsFouten, url,
    async stoppen() { await browser.close(); server.close(); },
  };
}

// De vaste eerste stappen: poulecode invoeren en jezelf aanwijzen.
export async function meedoen(page) {
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await page.waitForSelector('[data-race]');
}

export async function openRace(page, naam) {
  await page.waitForSelector('[data-race]');
  await page.click(`[data-race]:has(.nm:text-is("${naam}"))`);
  await page.waitForSelector('#paneel');
}

export async function kiesTien(page) {
  for (let i = 0; i < 10; i++) await page.click('.drv:not([disabled])');
}
