// Je seizoen als lijn.
//
// De stand zegt waar je nu staat, de pijltjes waar je vandaan komt sinds de
// vorige race. Wat er nog miste is de vórm van je seizoen: klom je gestaag, of
// stortte je in juni in en ben je sindsdien aan het terugkomen?
//
// Met de hand getekende SVG, geen bibliotheek — het is één lijn over hooguit
// 24 punten. Wat hier vooral vastligt zijn de drempels, want een grafiek is
// het soort ding dat met gezag onzin vertelt zodra er te weinig data is.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('de seizoensgrafiek');
const { page, jsFouten, stoppen } = await startPagina();

const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

await meedoen(page);

// `goed` zegt per race of Danny het goed had; de anderen hebben dan juist
// ongelijk. Zo is de volgorde in de stand precies te sturen.
const zet = (goed, spelers = 1) => page.evaluate(({ goed, spelers, UIT }) => {
  const db = globalThis.__db;
  const mis = [...UIT].reverse();
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  for (let i = 0; i < spelers; i++) {
    db.pool_members.push({ member_id: `lid-m${i}`, pool_id: 'pool-1',
                           display_name: `Mede${i}`, user_id: `u${i}` });
  }
  const sjabloon = db.races[0];
  db.races = goed.map((_, i) => ({
    id: 200 + i, season: 2026, round: i + 1, name: `Circuit ${i + 1}`,
    drivers: sjabloon.drivers,
    deadline_quali: new Date(Date.now() - (40 - i) * 36e5).toISOString(),
    deadline_race: new Date(Date.now() - (39 - i) * 36e5).toISOString(),
    quali_result: UIT, race_result: UIT,
    fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null,
  }));
  db.answers = [];
  db.races.forEach((r, i) => {
    for (const v of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
                        question_id: v, waarde: goed[i] ? UIT : mis });
      for (let k = 0; k < spelers; k++) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: `lid-m${k}`,
                          question_id: v, waarde: goed[i] ? mis : UIT });
      }
    }
  });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { goed, spelers, UIT });

const naarStand = async () => {
  await page.reload();
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.strij');
};

// ---- de drempels --------------------------------------------------
await zet([false, false], 1);
await naarStand();
check('bij twee races staat er geen grafiek — twee punten zijn een streepje, '
  + 'geen verloop', (await page.$('.grafiek')) === null);

await zet([false, false, true], 0);
await naarStand();
check('en in je eentje ook niet, want dan is er geen positie om te volgen',
  (await page.$('.grafiek')) === null);

// ---- en dan wel ---------------------------------------------------
await zet([false, false, true, true, true], 3);
await naarStand();
await page.waitForSelector('.grafiek');
check('vanaf drie races met medespelers verschijnt hij', await page.isVisible('.grafiek'));

const punten = await page.$$eval('.grafiek svg circle', (n) => n.length);
check('met één punt per gereden race', punten === 5, `${punten} punten`);

const pad = await page.$eval('.grafiek svg path', (e) => e.getAttribute('d'));
check('en een lijn die die punten verbindt',
  (pad.match(/L/g) ?? []).length === 4, pad);

// ---- de getallen eronder zijn het echte antwoord -------------------
// De lijn is een plaatje; de getallen maken er informatie van, en ze zijn ook
// het enige wat overblijft voor wie de grafiek niet kan zien.
const voet = await page.$$eval('.grafiekvoet span', (n) => n.map((e) => ({
  waarde: e.querySelector('b').textContent.trim(),
  woord: e.querySelector('i').textContent.trim(),
})));
check('de voet noemt waar je begon, je beste, je slechtste en waar je nu staat',
  voet.length === 4, JSON.stringify(voet));
check('Danny begon als laatste van vier', voet[0].waarde === '4e', JSON.stringify(voet));
check('zijn beste plek is de eerste', voet.find((v) => v.woord === 'beste')?.waarde === '1e',
  JSON.stringify(voet));
check('en hij staat nu bovenaan', voet[voet.length - 1].waarde === '1e', JSON.stringify(voet));

// Wie nooit van plek wisselde heeft geen "beste én slechtste" — dan zou er
// twee keer hetzelfde getal staan.
await zet([true, true, true, true], 3);
await naarStand();
await page.waitForSelector('.grafiek');
const vlak = await page.$$eval('.grafiekvoet span i', (n) => n.map((e) => e.textContent.trim()));
check('wie altijd op dezelfde plek stond krijgt niet twee keer hetzelfde getal',
  !vlak.includes('slechtste'), vlak.join(', '));

// ---- leesbaar zonder de lijn --------------------------------------
const alt = await page.$eval('.grafiek svg', (e) => e.getAttribute('aria-label'));
check('de grafiek heeft een beschrijving voor wie hem niet ziet',
  /positie per race/i.test(alt ?? ''), String(alt));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
