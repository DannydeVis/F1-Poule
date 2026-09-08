// "Zo dichtbij": waar bleven de punten?
//
// De uitslaglijst zegt per coureur al "werd P4", maar niemand telt zelf op
// waar het misging. Dit is de vraag die na afloop in de groepsapp gesteld
// wordt, en de app had het antwoord al staan zonder het te tonen.
//
// bijnaGoed() wordt uit index.html geknipt, net als scoreLijst(), zodat de
// test de echte code controleert en niet een kopie die uit de pas kan lopen.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';

const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const score = bron.match(/export function scoreLijst[\s\S]*?\n\}/);
const bijna = bron.match(/export function bijnaGoed[\s\S]*?\n\}/);
if (!score || !bijna) {
  console.error('FOUT: scoreLijst() of bijnaGoed() niet gevonden in index.html');
  process.exit(2);
}

const map = mkdtempSync(join(tmpdir(), 'poule-bijna-'));
writeFileSync(join(map, 'bijna.mjs'), score[0] + '\n' + bijna[0]);
const { scoreLijst, bijnaGoed } = await import(join(map, 'bijna.mjs'));

const { check, afronden } = maakControle('zo dichtbij: waar bleven de punten');

// Voorspeld: 1 2 3 4 5. Werkelijk: 1 3 2 5 4.
// P1 exact (5), P2 werd P3 (1 ernaast, 3), P3 werd P2 (3), P4 werd P5 (3),
// P5 werd P4 (3).
const een = bijnaGoed(scoreLijst(['1','2','3','4','5'], ['1','3','2','5','4']).regels);

check('de exact voorspelde coureur staat er niet bij',
  !een.dichtst.some(x => x.voorspeld === 1), JSON.stringify(een.dichtst.map(x => x.voorspeld)));
check('en de vier die er één naast zaten wel', een.dichtst.length === 4,
  String(een.dichtst.length));
check('elk daarvan scheelde twee punten',
  een.dichtst.every(x => x.scheelde === 2), JSON.stringify(een.dichtst));
check('de vier bijna-treffers scheelden samen acht punten',
  een.scheelde === 8, String(een.scheelde));

// De volgorde: het dichtstbij eerst, en bij gelijke afstand de hoogste plek in
// jouw eigen lijst — daar zit de meeste spijt.
check('de hoogste plek staat vooraan bij gelijke afstand',
  een.dichtst[0].voorspeld === 2, String(een.dichtst[0].voorspeld));

// Een coureur die je drie of meer plekken misgokte scoorde niets. Dat "zo
// dichtbij" noemen zou spot zijn.
const ver = bijnaGoed(scoreLijst(['1','2'], ['9','8','7','1','2']).regels);
check('drie of meer plekken ernaast heet niet "zo dichtbij"',
  ver.dichtst.length === 0, JSON.stringify(ver.dichtst));
// Bewust níét meegeteld: dit getal gaat over de plekken waar je er net naast
// zat, niet over wat een perfecte kaart waard was geweest. Dat laatste staat
// feitelijk al in het scoreblok, en is vooral deprimerend.
check('en telt ook niet mee in wat de bijna-treffers scheelden',
  ver.scheelde === 0, String(ver.scheelde));

// Twee plekken ernaast levert nog één punt op, dus dat hoort er wél bij — en
// het scheelde méér dan een misser van één plek.
const twee = bijnaGoed(scoreLijst(['1'], ['9','9','1']).regels);
check('twee plekken ernaast telt mee, en scheelde vier punten',
  twee.dichtst.length === 1 && twee.dichtst[0].afstand === 2 && twee.dichtst[0].scheelde === 4,
  JSON.stringify(twee.dichtst));

// Een coureur die helemaal niet in de uitslag staat is uitgevallen. Daar viel
// niets aan te doen, dus die telt nergens in mee — ook niet in het totaal.
const dnf = bijnaGoed(scoreLijst(['1','2'], ['2']).regels);
check('een uitgevallen coureur staat niet bij "zo dichtbij"',
  !dnf.dichtst.some(x => x.werkelijk === null), JSON.stringify(dnf.dichtst));
check('en het totaal gaat alleen over wat er wél te halen viel',
  dnf.scheelde === 2, String(dnf.scheelde));

// Een perfecte top 10 heeft niets te vertellen.
const perfect = bijnaGoed(scoreLijst(['1','2','3'], ['1','2','3']).regels);
check('een foutloze voorspelling levert geen "zo dichtbij" op',
  perfect.dichtst.length === 0 && perfect.scheelde === 0);

check('een lege lijst valt nergens over', bijnaGoed().dichtst.length === 0);

// --- en of het ook op het scherm belandt ----------------------------------
// De rekenkern hierboven kan kloppen terwijl niemand hem ooit ziet. Deze helft
// draait de echte app en kijkt of het blok er staat, in zinnen die je in een
// groepsapp kunt plakken.
import { startPagina, meedoen, openRace } from './hulp.mjs';

const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  r.deadline_quali = new Date(Date.now() - 3600e3).toISOString();
  // Voorspeld: VER RUS ANT HAM LEC ... Werkelijk: VER ANT RUS LEC HAM ...
  // Drie paren staan omgedraaid, dus drie keer één plek ernaast.
  r.quali_result = ['1','12','63','16','44','4','81','10','14','18'];
  globalThis.__db.answers.push({ pool_id:'pool-1', race_id:1, member_id:'lid-1',
    question_id:'quali_top10', waarde:['1','63','12','44','16','4','81','10','14','18'] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
await openRace(page, 'Melbourne');
await page.click('[data-tab="quali"]');
await page.waitForSelector('.strip');

check('het blok staat onder de uitslag', (await page.$('.bijna')) !== null);
const blok = (await page.textContent('.bijna')).replace(/\s+/g, ' ').trim();
check('en noemt de coureur, jouw plek en waar hij werd',
  blok.includes('RUS stond bij jou op P2 en werd P3'), blok);
check('met wat het scheelde, in gewone woorden',
  blok.includes('één plek, en dat scheelde 2 punten'), blok);
check('en de optelsom eronder', blok.includes('8 punten'), blok);
check('de exact voorspelde coureur wordt niet genoemd',
  !blok.includes('VER'), blok);

// Wie alles goed had heeft niets "zo dichtbij" gehad, en dan hoort er ook
// niets te staan — anders leest het als spot.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => String(x.id) === '1');
  globalThis.__db.answers = globalThis.__db.answers.filter((a) => a.question_id !== 'quali_top10');
  globalThis.__db.answers.push({ pool_id:'pool-1', race_id:1, member_id:'lid-1',
    question_id:'quali_top10', waarde:[...r.quali_result] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('.strip, [data-race]');
if (!(await page.$('.strip'))) { await openRace(page, 'Melbourne'); await page.click('[data-tab="quali"]'); }
await page.waitForSelector('.strip');
check('bij een foutloze voorspelling staat er niets',
  (await page.$('.bijna')) === null);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
