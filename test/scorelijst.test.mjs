// Puntentelling: max(0, 5 - 2 * afstand), niet 10/1.
//
// De reden voor die formule staat in OVERDRACHT.md: bij 10/1 straft een
// cascade (een coureur valt uit, de rest schuift een plek op) een bijna
// perfecte voorspelling zwaar af. De cascade-test hieronder bewaakt dat.
//
// scoreLijst() wordt uit index.html geknipt, zodat de test de echte code
// controleert en niet een kopie die uit de pas kan lopen.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const stuk = bron.match(/export function scoreLijst[\s\S]*?\n\}/);
if (!stuk) { console.error('FOUT: scoreLijst() niet gevonden in index.html'); process.exit(2); }

const map = mkdtempSync(join(tmpdir(), 'poule-score-'));
writeFileSync(join(map, 'score.mjs'), stuk[0]);
const { scoreLijst } = await import(join(map, 'score.mjs'));

const { check, afronden } = maakControle('puntentelling');
const echt = ['1','2','3','4','5','6','7','8','9','10'];
const punten = (voorspeld, werkelijk = echt) => scoreLijst(voorspeld, werkelijk).totaal;

check('perfecte top 10 levert 50 punten', punten(echt) === 50, String(punten(echt)));

check('exact goed is 5 punten', punten(['1']) === 5, String(punten(['1'])));
check('een plek ernaast is 3 punten', punten(['2']) === 3, String(punten(['2'])));
check('twee plekken ernaast is 1 punt', punten(['3']) === 1, String(punten(['3'])));
check('drie plekken ernaast is 0, nooit negatief', punten(['4']) === 0, String(punten(['4'])));

check('een coureur die niet finisht levert 0 op', punten(['99']) === 0, String(punten(['99'])));
check('lege voorspelling levert 0 op', punten([]) === 0, String(punten([])));

// De hele uitslag schuift een plek op doordat de winnaar uitvalt.
const cascade = punten(echt, ['2','3','4','5','6','7','8','9','10','1']);
check('cascade blijft ruim scoren in plaats van bijna nul', cascade === 27, `${cascade} punten`);

// quali_result en race_result bevatten de volledige uitslag, niet alleen de
// top 10. Anders staat de coureur die je op P10 zette en 11e werd niet in de
// lijst en levert hij 0 op in plaats van 3.
const elfde = scoreLijst(echt, ['1','2','3','4','5','6','7','8','9','11','10']);
check('coureur op P10 die 11e wordt levert 3 punten, niet 0',
  elfde.regels[9].punten === 3, `${elfde.regels[9].punten} punten`);
check('de rest van die uitslag blijft vol scoren', elfde.totaal === 48, `${elfde.totaal} punten`);

const regels = scoreLijst(['1','99'], [...echt, '11']).regels;
check('regels melden de werkelijke plek', regels[0].werkelijk === 1, JSON.stringify(regels[0]));
check('regels melden null bij niet gefinisht', regels[1].werkelijk === null, JSON.stringify(regels[1]));

process.exit(afronden() ? 0 : 1);
