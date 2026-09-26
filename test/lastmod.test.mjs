// Wanneer een pagina voor het laatst veranderde: de datum per pagina in de
// sitemap en in de gestructureerde gegevens.
//
// Eerst had elke url dezelfde datum, één constante, dus stond in de sitemap
// alles tegelijk op "gewijzigd". Nu krijgt een pagina pas een nieuwe datum
// als haar inhoud verandert (zie "Wanneer een pagina voor het laatst
// veranderde" in scripts/maak-site.mjs).
//
// Wat hier vastligt:
//   1. In de repo: elke url in de sitemap heeft de datum uit site/lastmod.json,
//      en de voorpagina's zeggen hetzelfde in dateModified.
//   2. Een andere tekst op één pagina geeft alleen die pagina een nieuwe
//      datum, in de sitemap en in de pagina zelf.
//   3. Een andere vorm (css) geeft niemand een nieuwe datum.
//   4. Vergeten te genereren laat --controle zakken, en --controle schrijft
//      zelf niets.
//
// Draait zonder browser, op een kopie van de repo in een tijdelijke map.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de datum per pagina');

const lees = (map, pad) => readFileSync(join(map, pad), 'utf8');
const lastmodVan = (map) => JSON.parse(lees(map, 'site/lastmod.json'));
const sitemapVan = (map) => Object.fromEntries([...lees(map, 'sitemap.xml')
  .matchAll(/<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g)].map((m) => [m[1], m[2]]));
const gewijzigdVan = (map, pad) => lees(map, pad).match(/"dateModified": "([^"]+)"/)?.[1];

// ---- 1. in de repo ------------------------------------------------------------
{
  const lastmod = lastmodVan(wortel);
  const sitemap = sitemapVan(wortel);
  const urls = Object.keys(sitemap);
  check('elke url in de sitemap staat in lastmod.json, en omgekeerd',
    urls.length >= 9 && urls.length === Object.keys(lastmod).length && urls.every((u) => lastmod[u]),
    `${urls.length} in de sitemap, ${Object.keys(lastmod).length} in lastmod.json`);
  check('met dezelfde datum',
    urls.every((u) => sitemap[u] === lastmod[u]?.datum && /^\d{4}-\d{2}-\d{2}$/.test(sitemap[u])),
    urls.filter((u) => sitemap[u] !== lastmod[u]?.datum).join(' '));
  const voorpaginas = { 'index.html': 'https://predicttherace.com/', 'en/index.html': 'https://predicttherace.com/en/',
    'de/index.html': 'https://predicttherace.com/de/' };
  check('en de voorpagina zegt dat ook in dateModified',
    Object.entries(voorpaginas).every(([pad, url]) => gewijzigdVan(wortel, pad) === lastmod[url]?.datum),
    Object.keys(voorpaginas).map((p) => `${p}=${gewijzigdVan(wortel, p)}`).join(' '));
}

// ---- 2 tot 4. op een kopie -----------------------------------------------------
const map = mkdtempSync(join(tmpdir(), 'poule-lastmod-'));
cpSync(wortel, map, { recursive: true, filter: (bron) => !/[/\\](node_modules|\.git)([/\\]|$)/.test(bron) });
const genereer = (vandaag, ...extra) => execFileSync(process.execPath, [join(map, 'scripts', 'maak-site.mjs'), ...extra],
  { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, VANDAAG: vandaag } });
const pas = (pad, van, naar) => {
  const oud = lees(map, pad);
  if (!oud.includes(van)) throw new Error(`"${van.slice(0, 40)}" staat niet in ${pad}`);
  writeFileSync(join(map, pad), oud.replace(van, naar));
};
const voor = lastmodVan(map);

try {
  // Een andere inleiding op de Nederlandse voorpagina.
  const nlSub = lees(map, 'site/teksten.mjs').match(/sub: '([^']+)'/)[1];
  pas('site/teksten.mjs', `sub: '${nlSub}'`, `sub: '${nlSub} Nu nog sneller.'`);

  let zakt = false;
  try { genereer('2099-01-01', '--controle'); } catch { zakt = true; }
  check('vergeten te genereren laat --controle zakken', zakt);
  check('en --controle heeft niets geschreven',
    JSON.stringify(lastmodVan(map)) === JSON.stringify(voor) && !lees(map, 'index.html').includes('Nu nog sneller.'));

  genereer('2099-01-01');
  const na = lastmodVan(map);
  const veranderd = Object.keys(na).filter((u) => na[u].datum !== voor[u]?.datum);
  check('een andere tekst op één pagina geeft alleen die pagina een nieuwe datum',
    veranderd.join(' ') === 'https://predicttherace.com/' && na['https://predicttherace.com/'].datum === '2099-01-01',
    veranderd.join(' ') || 'niets veranderd');
  check('in de sitemap en in de pagina zelf',
    sitemapVan(map)['https://predicttherace.com/'] === '2099-01-01' && gewijzigdVan(map, 'index.html') === '2099-01-01'
      && gewijzigdVan(map, 'en/index.html') === voor['https://predicttherace.com/en/'].datum,
    `sitemap ${sitemapVan(map)['https://predicttherace.com/']}, pagina ${gewijzigdVan(map, 'index.html')}`);

  // Een dag later nog een keer draaien, zonder iets te veranderen.
  genereer('2099-01-02');
  check('nog een keer draaien op een andere dag verandert geen datum',
    JSON.stringify(lastmodVan(map)) === JSON.stringify(na));

  // Alleen de vorm: een andere randkleur in de css van alle pagina's.
  const css = lees(map, 'scripts/maak-site.mjs').match(/--lijn:(#[0-9a-f]{6})/i)[1];
  pas('scripts/maak-site.mjs', `--lijn:${css}`, '--lijn:#123456');
  const uit = genereer('2099-01-03');
  check('een andere vorm geeft niemand een nieuwe datum, ook al veranderen de bestanden',
    JSON.stringify(lastmodVan(map)) === JSON.stringify(na) && uit.includes('index.html'), uit.trim());

  // De Engelse privacyverklaring.
  pas('site/privacy.mjs', "titel: 'Privacy and your data | Predict the Race',",
    "titel: 'Privacy and your personal data | Predict the Race',");
  genereer('2099-01-04');
  const privacy = lastmodVan(map);
  const alleenPrivacy = Object.keys(privacy).filter((u) => privacy[u].datum !== na[u].datum);
  check('en de privacyverklaring heeft haar eigen datum',
    alleenPrivacy.join(' ') === 'https://predicttherace.com/en/privacy/'
      && sitemapVan(map)['https://predicttherace.com/en/privacy/'] === '2099-01-04',
    alleenPrivacy.join(' '));
} catch (e) {
  check('de kopie laat zich aanpassen en genereren', false, String(e.message).split('\n')[0]);
} finally {
  rmSync(map, { recursive: true, force: true });
}

process.exit(afronden() ? 0 : 1);
