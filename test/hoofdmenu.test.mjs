// Het hoofdmenu bovenaan: losse pagina's, geen sprongen binnen de voorpagina.
//
// Google kiest de links onder een zoekresultaat (sitelinks) zelf, en haalt ze
// graag uit het hoofdmenu. Daarom staan daar in het Nederlands en het Engels
// de losse pagina's (PAGINA_UI.menu in site/paginas.mjs), op de voorpagina en
// op elke artikelpagina. De andere talen hebben geen eigen pagina's en houden
// de sprongen naar de blokken van hun voorpagina. Draait zonder browser.
//
// Wat hier vastligt:
//   1. Het menu heeft puntentelling, organiseren, races en over. Op de
//      voorpagina en elke artikelpagina in een taal met een menu staan precies
//      die pagina's, in die volgorde, met een link die uitkomt bij die pagina.
//   2. Op een pagina uit het menu is die pagina gemarkeerd (aria-current),
//      elders geen enkele.
//   3. Een taal zonder eigen pagina's houdt op de voorpagina de sprongen naar
//      #hoe, #punten en #faq.

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
  const verwacht = menu.items.map(([id, tekst]) => ({ id, tekst, pad: ALLE.find((x) => x.id === id)?.talen[code]?.pad }));
  check(`${code}: elk item uit het menu is een pagina in deze taal`, verwacht.every((x) => x.pad),
    verwacht.filter((x) => !x.pad).map((x) => x.id).join(', '));

  const paginas = [{ id: null, pad: voorpagina },
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
  check(`${code}: op de voorpagina en alle ${paginas.length - 1} artikelpagina's het menu met de losse pagina's, de huidige gemarkeerd`,
    fout.length === 0, fout.slice(0, 4).join(' | '));
}

process.exit(afronden() ? 0 : 1);
