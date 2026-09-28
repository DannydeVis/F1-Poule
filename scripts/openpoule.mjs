// De tweede regel onder de knop: "Geen groep? Speel mee in de open poule".
//
// Staat op de voorpagina (onder de knop in de hero en onderaan) en onder de
// knop in het slotblok van de artikelpagina's: de gidsen, de about-pagina en
// de racepagina's. De link is de uitnodigingslink van de open poule
// (app/?code=...), met de code uit OPEN_POULE in site/teksten.mjs.
//
// Zonder code geen regel: liever niets dan een link naar een poule die niet
// bestaat. Een code die de app niet als poulecode herkent, is een fout: de app
// zou hem bij het openen negeren (codeUitLink() in app/index.html), en dan
// komt de bezoeker op het gewone startscherm uit in plaats van in de poule.
//
// Los van maak-site.mjs, zodat test/openpoule.test.mjs de regel ook kan maken
// met een code die (nog) niet in site/teksten.mjs staat.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { teksten } from '../site/teksten.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');

// Dezelfde regel als ZIET_ERUIT_ALS_POULECODE in de app, daaruit gelezen.
const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
const regel = bron.match(/const ZIET_ERUIT_ALS_POULECODE = \(code\) => \/(.+?)\/\.test\(/);
if (!regel) throw new Error('ZIET_ERUIT_ALS_POULECODE niet gevonden in app/index.html');
export const POULECODE = new RegExp(regel[1]);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Gooit een fout als de code geen poulecode is; null (nog geen code) mag. */
export function controleerCode(code) {
  if (code === null || code === undefined) return null;
  if (!POULECODE.test(code)) throw new Error(`OPEN_POULE in site/teksten.mjs ("${code}") is geen poulecode zoals de app hem leest (${POULECODE})`);
  return code;
}

/**
 * De regel als HTML, of '' zonder code. `app` is het relatieve pad naar de app
 * vanaf die pagina ("app/", "../app/", ...), net als de knop erboven.
 */
export function openPouleRegel(code, taal, app) {
  if (!controleerCode(code)) return '';
  const t = teksten[taal]?.hero?.openPoule;
  if (!t) throw new Error(`geen openPoule-tekst voor ${taal} in site/teksten.mjs`);
  return `<p class="openpoule">${esc(t.vraag)} <a href="${app}?code=${encodeURIComponent(code)}">${esc(t.link)}</a></p>`;
}
