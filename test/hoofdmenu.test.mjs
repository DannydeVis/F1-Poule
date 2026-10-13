// Het hoofdmenu bovenaan: losse pagina's, geen sprongen binnen de voorpagina.
//
// Google kiest de links onder een zoekresultaat (sitelinks) zelf, en haalt ze
// graag uit het hoofdmenu. Daarom staan daar de losse pagina's
// (PAGINA_UI.menu in site/paginas.mjs), op de voorpagina en op elke
// artikelpagina. Draait zonder browser.
//
// Wat hier vastligt:
//   1. Het menu heeft puntentelling, organiseren, races en over. Op elke
//      artikelpagina staan daarvan de pagina's die er in die taal zijn (in het
//      Nederlands en het Engels alle vier), in die volgorde, met een link die
//      uitkomt bij die pagina. Op de voorpagina ook, als het er minstens twee
//      zijn.
//   2. Op een pagina uit het menu is die pagina gemarkeerd (aria-current),
//      elders geen enkele.
//   3. Een taal zonder eigen pagina's, of met alleen de racepagina's, houdt op
//      de voorpagina de sprongen naar #hoe, #punten en #faq. Sinds 13 oktober
//      hebben alle zeven talen gidsen; dit geldt dan weer voor een nieuwe taal.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { TALEN, teksten } from '../site/teksten.mjs';
import { PAGINAS, PAGINA_UI } from '../site/paginas.mjs';
import { RACEPAGINAS } from '../scripts/racepaginas.mjs';

const { check, afronden } = maakControle('het hoofdmenu');

const ALLE = [...PAGINAS, ...RACEPAGINAS];
const lees = (pad) => readFileSync(join(wortel, pad, 'index.html'), 'utf8');
const menuVan = (html) => {
  const nav = html.match(/<nav class="kopnav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
  return [...nav.matchAll(/<a href="([^"]+)"( aria-current="page")?>([^<]+)<\/a>/g)]
    .map(([, href, huidig, tekst]) => ({ href, huidig: Boolean(huidig), tekst }));
};
// Waar een relatieve link vanaf een pagina uitkomt, als map ten opzichte van de wortel.
const doel = (vanaf, href) => normalize(join(vanaf, href)).replace(/\/$/, '');

for (const code of TALEN) {
  const menu = PAGINA_UI[code]?.menu;
  const voorpagina = teksten[code].pad;
  if (!menu) {
    const items = menuVan(lees(voorpagina));
    check(`${code}: zonder eigen pagina's houdt de voorpagina de sprongen naar zijn blokken`,
      JSON.stringify(items.map((x) => x.href)) === JSON.stringify(['#hoe', '#punten', '#faq']),
      items.map((x) => x.href).join(' '));
    continue;
  }
  // De vier pagina's die we onder een zoekresultaat willen zien.
  check(`${code}: het menu heeft puntentelling, organiseren, races en over`,
    JSON.stringify(menu.items.map(([id]) => id)) === JSON.stringify(['puntentelling', 'organiseren', 'races', 'over']),
    menu.items.map(([id]) => id).join(', '));
  const alle = menu.items.map(([id, tekst]) => ({ id, tekst, pad: ALLE.find((x) => x.id === id)?.talen[code]?.pad }));
  const verwacht = alle.filter((x) => x.pad);
  if (['nl', 'en'].includes(code)) {
    check(`${code}: elk item uit het menu is een pagina in deze taal`, verwacht.length === alle.length,
      alle.filter((x) => !x.pad).map((x) => x.id).join(', '));
  }
  // Met minder dan twee pagina's houdt de voorpagina zijn sprongen.
  const metMenu = verwacht.length >= 2;
  if (!metMenu) {
    const items = menuVan(lees(voorpagina));
    check(`${code}: met ${verwacht.length === 1 ? 'alleen de racepagina\'s' : 'geen eigen pagina\'s'} houdt de voorpagina de sprongen naar zijn blokken`,
      JSON.stringify(items.map((x) => x.href)) === JSON.stringify(['#hoe', '#punten', '#faq']),
      items.map((x) => x.href).join(' '));
  }

  const paginas = [...(metMenu ? [{ id: null, pad: voorpagina }] : []),
    ...ALLE.filter((pg) => pg.talen[code]).map((pg) => ({ id: pg.id, pad: pg.talen[code].pad }))];
  const fout = [];
  for (const { id, pad } of paginas) {
    const items = menuVan(lees(pad));
    const naam = pad || '(wortel)';
    if (items.length !== verwacht.length) { fout.push(`${naam}: ${items.length} items`); continue; }
    items.forEach((x, i) => {
      if (x.tekst !== verwacht[i].tekst) fout.push(`${naam}: "${x.tekst}" in plaats van "${verwacht[i].tekst}"`);
      if (doel(pad, x.href) !== verwacht[i].pad) fout.push(`${naam}: ${x.href} komt uit bij ${doel(pad, x.href)}`);
      if (!existsSync(join(wortel, verwacht[i].pad, 'index.html'))) fout.push(`${verwacht[i].pad} bestaat niet`);
      if (x.huidig !== (verwacht[i].id === id)) fout.push(`${naam}: ${x.tekst} ${x.huidig ? 'wel' : 'niet'} gemarkeerd`);
    });
  }
  check(`${code}: ${metMenu ? `op de voorpagina en alle ${paginas.length - 1}` : `op alle ${paginas.length}`} artikelpagina's het menu met de losse pagina's (${verwacht.map((x) => x.id).join(', ')}), de huidige gemarkeerd`,
    paginas.length > 0 && fout.length === 0, fout.slice(0, 4).join(' | '));
}

process.exit(afronden() ? 0 : 1);
