// De twee vragen die naast de top 10 gescoord worden: de pole en de
// teamgenoot-duels.
//
// Bij de duels zit het scherpe punt in wat je *niet* invult. De punten gaan
// naar rato van het aantal duels waar je een keuze in maakte, dus vier van de
// vier goed is evenveel waard als tien van de tien. Zonder dat zou het
// verstandigste gedrag zijn om alles maar te gokken.
//
// De functies worden uit index.html geknipt, zodat de test de echte code
// controleert en niet een kopie die uit de pas kan lopen.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const stukken = ['scoreEerste', 'scoreDuels', 'teamParen'].map((naam) => {
  const stuk = bron.match(new RegExp(`export function ${naam}[\\s\\S]*?\\n\\}`));
  if (!stuk) { console.error(`FOUT: ${naam}() niet gevonden in index.html`); process.exit(2); }
  return stuk[0];
});

const map = mkdtempSync(join(tmpdir(), 'poule-vraagsoorten-'));
writeFileSync(join(map, 'vragen.mjs'), stukken.join('\n\n'));
const { scoreEerste, scoreDuels, teamParen } = await import(join(map, 'vragen.mjs'));

// De pole is 10 punten waard, de snelste ronde en de snelste pitstop ook.
// Die getallen staan in schema.sql; vragen.test.sql houdt ze daar vast.
const scorePole = (gekozen, quali) => scoreEerste(gekozen, quali, 10);

const { check, afronden } = maakControle('pole en teamgenoot-duels');

// --- de pole ---------------------------------------------------------------
const quali = ['16', '4', '1', '81'];

check('de pole goed levert 10 punten', scorePole('16', quali) === 10, String(scorePole('16', quali)));
check('tweede op de grid levert niets op', scorePole('4', quali) === 0);
check('geen keuze levert niets op, en klapt niet',
  scorePole(null, quali) === 0 && scorePole('', quali) === 0 && scorePole('16', []) === 0);
check('een nummer en dezelfde tekst tellen als dezelfde coureur',
  scorePole(16, quali) === 10 && scorePole('16', [16, '4']) === 10);
// Hij mag niet zwaarder wegen dan de racewinnaar: de pole is beter te raden.
check('de pole weegt lichter dan de winnaar', scorePole('16', quali) < 25);

// --- de teams uit een deelnemerslijst --------------------------------------
const drivers = [
  { nr:'1',  code:'VER', team:'Red Bull' },
  { nr:'6',  code:'HAD', team:'Red Bull' },
  { nr:'63', code:'RUS', team:'Mercedes' },
  { nr:'12', code:'ANT', team:'Mercedes' },
  { nr:'16', code:'LEC', team:'Ferrari' },
  { nr:'44', code:'HAM', team:'Ferrari' },
  { nr:'4',  code:'NOR', team:'McLaren' },
];
const paren = teamParen(drivers);
check('alleen teams met precies twee coureurs worden een duel',
  paren.length === 3 && !paren.some(p => p.team === 'McLaren'),
  paren.map(p => p.team).join(', '));
check('een lege of ontbrekende lijst geeft geen duels',
  teamParen([]).length === 0 && teamParen().length === 0 && teamParen(null).length === 0);

// --- de duels scoren -------------------------------------------------------
// VER voor HAD, ANT voor RUS, LEC voor HAM.
const race = ['1', '12', '16', '6', '63', '44'];
const alles = 15;

check('alle drie de duels goed levert de volle punten op',
  scoreDuels(['1', '12', '16'], race, paren) === alles,
  String(scoreDuels(['1', '12', '16'], race, paren)));
check('alle drie fout levert niets op',
  scoreDuels(['6', '63', '44'], race, paren) === 0);
check('twee van de drie goed levert 10 van de 15 op',
  scoreDuels(['1', '12', '44'], race, paren) === 10,
  String(scoreDuels(['1', '12', '44'], race, paren)));

// Dit is de kern: alleen invullen wat je weet mag niet minder opleveren dan
// alles gokken. Eén duel goed uit één ingevuld duel is de volle 15.
check('één duel invullen en goed hebben is net zoveel waard als alle drie',
  scoreDuels(['1'], race, paren) === alles, String(scoreDuels(['1'], race, paren)));
check('en één duel invullen en fout hebben levert niets op',
  scoreDuels(['6'], race, paren) === 0);

check('niets invullen levert niets op, en klapt niet',
  scoreDuels([], race, paren) === 0 && scoreDuels(null, race, paren) === 0);
check('zonder uitslag valt er nog niets te scoren',
  scoreDuels(['1'], [], paren) === 0 && scoreDuels(['1'], null, paren) === 0);
check('zonder deelnemerslijst zijn er geen duels om te scoren',
  scoreDuels(['1'], race, []) === 0);

// Een duel waarin geen van beiden gefinisht is telt niet mee — anders zou een
// dubbele uitvalbeurt je keuze afstraffen alsof je fout zat.
const halveUitslag = ['1', '6', '16', '44'];     // Mercedes staat er niet in
check('een duel waarin niemand finishte telt niet mee',
  scoreDuels(['1', '12'], halveUitslag, paren) === alles,
  String(scoreDuels(['1', '12'], halveUitslag, paren)));

// Wie wel finisht wint van een teamgenoot die dat niet deed.
const eenUit = ['1', '16', '44', '6'];            // 63 en 12 vielen uit
check('gefinisht verslaat niet-gefinisht',
  scoreDuels(['16'], eenUit, paren) === alles && scoreDuels(['44'], eenUit, paren) === 0);

check('een nummer en dezelfde tekst tellen ook hier als dezelfde coureur',
  scoreDuels([1], race, paren) === alles);

// De punten komen uit de vragenlijst in de database, niet uit deze code.
check('het aantal punten is instelbaar',
  scoreDuels(['1', '12', '44'], race, paren, 30) === 20,
  String(scoreDuels(['1', '12', '44'], race, paren, 30)));

process.exit(afronden() ? 0 : 1);
