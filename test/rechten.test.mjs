// De code is van Danny, niet van iedereen.
//
// Op 28 september: "Ik weet eigenlijk niet waar het vandaan komt dat ik dit
// allemaal gratis wil weggeven." Dat kwam uit de README ("een gratis,
// openbaar fanproject; neem gerust ideeën over") en uit de site, die in elke
// voet, op de about-pagina, in de privacyverklaring en in llms.txt naar de
// broncode op GitHub wees. Spelen blijft gratis; de code, de teksten en het
// ontwerp niet.
//
// Wat hier vastligt:
//   1. De README zegt "Alle rechten voorbehouden" en nodigt niet uit om over
//      te nemen; LICENSE staat er en zegt hetzelfde, in NL en EN.
//   2. Geen gegenereerde pagina en geen llms.txt linkt naar de repository.
//   3. Geen tekst op de site zegt dat de broncode openbaar is.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de code is van Danny');
const lees = (pad) => readFileSync(join(wortel, pad), 'utf8');

// ---- 1. README en LICENSE --------------------------------------------------------------
{
  const readme = lees('README.md');
  check('de README zegt "Alle rechten voorbehouden" en nodigt niet uit om over te nemen',
    /Alle rechten voorbehouden/.test(readme) && !/neem gerust|openbaar fanproject|vrij te gebruiken/i.test(readme));
  const licentie = existsSync(join(wortel, 'LICENSE')) ? lees('LICENSE') : '';
  check('LICENSE staat er, met alle rechten voorbehouden in NL en EN, op naam van Danny de Visser',
    /Alle rechten voorbehouden/.test(licentie) && /All rights reserved/.test(licentie) && /Danny de Visser/.test(licentie)
      && !/\b(MIT|Apache|GPL|Creative Commons)\b/.test(licentie));
}

// ---- 2. geen link naar de repository -----------------------------------------------------
{
  const repo = /github\.com\/DannydeVis\/F1-Poule/i;
  const bestanden = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: wortel, encoding: 'utf8' })
    .split('\n').filter((f) => /(^|\/)index\.html$|^llms\.txt$|^404\.html$/.test(f) && !f.startsWith('app/') && !f.startsWith('beheer/'));
  const met = bestanden.filter((f) => repo.test(lees(f)));
  check('geen pagina van de site en geen llms.txt linkt naar de repository', bestanden.length > 20 && met.length === 0,
    met.slice(0, 3).join(' ') || `${bestanden.length} bestanden nagekeken`);
}

// ---- 3. geen "de broncode is openbaar" ----------------------------------------------------
{
  const teksten = ['site/teksten.mjs', 'site/paginas.mjs', 'site/privacy.mjs', 'site/races.mjs', 'scripts/maak-site.mjs']
    .map((f) => [f, lees(f)]);
  const openbaar = /broncode[^.'"]*openbaar|source code[^.'"]*public|codice sorgente|c[oó]digo[- ]f(uente|onte)|code source|quellcode/i;
  const fout = teksten.filter(([, t]) => openbaar.test(t)).map(([f]) => f);
  check('geen tekst op de site zegt dat de broncode openbaar is of linkt ernaar', fout.length === 0, fout.join(' '));
}

process.exit(afronden() ? 0 : 1);
