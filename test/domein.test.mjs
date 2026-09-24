// Eén domein, op één plek afgesproken.
//
// Het adres van de site staat in site/teksten.mjs (BASIS). Daar komen de
// canonical, hreflang, sitemap en deelplaatjes van de landingspagina uit. Maar
// het staat ook op plekken die niet door de generator gaan:
//
//   - scripts/sync.mjs zet het adres van de app in elk agenda-item en in elke
//     melding (APP_URL), en de workflow zou dat kunnen overschrijven;
//   - CNAME vertelt GitHub Pages op welk domein de site staat. Dat bestand
//     zet GitHub er zelf in zodra je het domein koppelt (Settings → Pages,
//     zie BEDIENING.md §15).
//
// Lopen die uit elkaar, dan wijst de agenda naar een adres waar de site niet
// staat, of zegt de sitemap tegen Google dat de pagina's ergens anders wonen
// dan waar GitHub ze serveert. Niets daarvan geeft een foutmelding.
//
// En wat de browser binnenkrijgt noemt het oude adres nergens meer. De app
// noemt zelfs helemaal geen adres: linkBasis() leest het uit de adresbalk.
// Dat blijft zo, anders werkt hij niet meer in de tests, niet op een
// voorvertoning en niet na een volgende verhuizing.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { BASIS } from '../site/teksten.mjs';

const { check, afronden } = maakControle('het domein');
const lees = (...pad) => readFileSync(join(wortel, ...pad), 'utf8');

// ---- 1. het adres zelf ------------------------------------------------------------
const basis = new URL(BASIS);
check('BASIS is een kaal https-adres, zonder map en zonder slash erachter',
  basis.protocol === 'https:' && basis.origin === BASIS, BASIS);

// ---- 2. waar de agenda en de meldingen heen wijzen ----------------------------------
const verwacht = `${BASIS}/app/`;
{
  const m = lees('scripts', 'sync.mjs').match(/const APP_URL = process\.env\.APP_URL \?\? '([^']*)'/);
  check('sync.mjs wijst agenda en meldingen naar de app op het domein', m?.[1] === verwacht,
    m ? `${m[1]} (verwacht ${verwacht})` : 'APP_URL niet gevonden');
}
{
  // Een APP_URL in de workflow wint van wat er in sync.mjs staat. Dat mag,
  // maar dan naar hetzelfde adres.
  const m = lees('.github', 'workflows', 'sync.yml').match(/^\s*APP_URL:\s*(.+)$/m);
  const waarde = m?.[1].trim().replace(/^['"]|['"]$/g, '');
  check('de workflow zet APP_URL niet ergens anders heen', !m || waarde === verwacht, waarde ?? '');
}

// ---- 3. CNAME ----------------------------------------------------------------------
// Staat er pas zodra het domein in GitHub gekoppeld is. Daarvoor is er niets
// na te lopen, en dat is geen fout: dan draait de site gewoon nog op
// dannydevis.github.io.
if (existsSync(join(wortel, 'CNAME'))) {
  const inhoud = lees('CNAME');
  check('CNAME noemt precies het domein uit BASIS, zonder https:// of map',
    inhoud.trim() === basis.host && inhoud.trim().split('\n').length === 1, JSON.stringify(inhoud));
} else {
  console.log('  --   nog geen CNAME: het domein is nog niet gekoppeld in GitHub');
}

// ---- 4. wat GitHub Pages serveert ------------------------------------------------------
// Alles wat in de repo staat en een browser of zoekmachine te zien krijgt.
// kalender.ics niet: die schrijft de sync zelf opnieuw, met APP_URL erin.
const geserveerd = execFileSync('git', ['ls-files'], { cwd: wortel, encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(html|js|webmanifest|txt|xml|json)$/.test(f))
  .filter((f) => !/^(test|scripts|site|\.github)\//.test(f));
check('er zijn bestanden om na te lopen', geserveerd.includes('app/index.html')
  && geserveerd.includes('index.html') && geserveerd.includes('sw.js'), geserveerd.join(', '));
{
  const oud = geserveerd.filter((f) => /dannydevis\.github\.io/i.test(lees(f)));
  check('geen enkel geserveerd bestand noemt nog dannydevis.github.io', oud.length === 0, oud.join(', '));
}
{
  const vast = ['app/index.html', 'sw.js', 'manifest.webmanifest']
    .filter((f) => lees(f).includes(basis.host));
  check('de app, de service worker en het manifest noemen geen vast domein', vast.length === 0,
    vast.join(', '));
}

process.exit(afronden() ? 0 : 1);
