// De winnaar apart, 25 punten.
//
// Zwaar met opzet: een perfecte top 10 levert 50 op, dus deze ene keuze is
// het halve weekend waard. Dat is precies de bedoeling — het houdt een
// weekend spannend voor wie op punten al ver achterloopt.
//
// scoreEerste() wordt uit index.html geknipt, zodat de test de echte code
// controleert en niet een kopie die uit de pas kan lopen. Dat is de gedeelde
// regel voor "wijs de bovenste van een lijst aan"; hoeveel punten dat waard
// is komt uit de vragenlijst in de database, dus dat geeft de test mee.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const stuk = bron.match(/export function scoreEerste[\s\S]*?\n\}/);
if (!stuk) { console.error('FOUT: scoreEerste() niet gevonden in index.html'); process.exit(2); }

const map = mkdtempSync(join(tmpdir(), 'poule-winnaar-'));
writeFileSync(join(map, 'winnaar.mjs'), stuk[0]);
const { scoreEerste } = await import(join(map, 'winnaar.mjs'));

// De winnaar is 25 punten waard; dat staat in schema.sql en wordt daar door
// vragen.test.sql vastgehouden.
const scoreWinnaar = (gekozen, uitslag) => scoreEerste(gekozen, uitslag, 25);

const { check, afronden } = maakControle('winnaar apart');
const uitslag = ['4', '1', '81', '12', '63'];

check('de winnaar goed levert 25 punten',
  scoreWinnaar('4', uitslag) === 25, String(scoreWinnaar('4', uitslag)));
check('tweede geworden levert niets op',
  scoreWinnaar('1', uitslag) === 0, String(scoreWinnaar('1', uitslag)));
check('een coureur die niet finisht levert niets op',
  scoreWinnaar('99', uitslag) === 0, String(scoreWinnaar('99', uitslag)));
check('geen keuze levert niets op, en klapt niet',
  scoreWinnaar(null, uitslag) === 0 && scoreWinnaar('', uitslag) === 0);
check('zonder uitslag valt er nog niets te scoren',
  scoreWinnaar('4', []) === 0 && scoreWinnaar('4', null) === 0 && scoreWinnaar('4') === 0);

// Coureurnummers komen als getal of als tekst uit Postgres, afhankelijk van
// het kolomtype. Overal als tekst vergelijken scheelt een klasse fouten
// waarbij 4 en '4' niet dezelfde coureur blijken te zijn.
check('een nummer en dezelfde tekst tellen als dezelfde coureur',
  scoreWinnaar(4, uitslag) === 25 && scoreWinnaar('4', [4, '1']) === 25);

check('de winnaar weegt half zo zwaar als een perfecte top 10',
  scoreWinnaar('4', uitslag) === 25, 'ter herinnering: een perfecte top 10 is 50');

process.exit(afronden() ? 0 : 1);
