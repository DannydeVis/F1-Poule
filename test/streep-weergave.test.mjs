// Het blok "zonder je slechtste weekend" op de standpagina.
//
// De rekenkant staat in test/streep.test.mjs. Dit gaat over wat er op het
// scherm gebeurt, en dat is waar de fout zou zitten die je niet uit de
// functie kunt halen:
//
// - het blok moet zwijgen zolang er nog niets wegvalt, want een kopje dat
//   nul verschil maakt is ruis;
// - de officiële stand hierboven moet onaangeraakt blijven — dit blok is een
//   antwoord op "hoe ver sta ik echt achter", geen herrekening;
// - de zin over jouw weggestreepte weekend moet de plek noemen die je dan
//   zou hebben, en niet liegen als die plek hetzelfde blijft.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('zonder je slechtste weekend, op het scherm');
const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);

const naarStand = async () => {
  await page.reload();
  await page.waitForSelector('[data-weergave="stand"]');
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('[data-weergave="stand"][aria-current="true"]');
  return (await page.textContent('#app')).replace(/\s+/g, ' ');
};

// Elf gescoorde races: nog net niet genoeg, er valt niets weg.
//
// Ik lever elke race dezelfde lijst in, op één na. Joey levert de uitslag
// zelf in en staat dus altijd bovenaan. Dat is precies het geval waar dit
// blok voor bedoeld is: één weekend kapot, de rest gelijkwaardig.
const zetRaces = (aantal) => page.evaluate((n) => {
  const echt = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
  const mijn = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
  const drivers = globalThis.__db.races[0].drivers;
  const db = globalThis.__db;

  db.races = Array.from({ length: n }, (_, i) => ({
    id: i + 1, season: 2026, round: i + 1, name: `Race ${i + 1}`, drivers,
    deadline_quali: new Date(Date.now() - 7200e3).toISOString(),
    deadline_race: new Date(Date.now() - 3600e3).toISOString(),
    quali_result: echt, race_result: echt,
    fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null,
  }));

  if (!db.pool_members.some((l) => l.display_name === 'Joey')) {
    db.pool_members.push(
      { member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Joey', user_id: null });
  }

  db.answers = [];
  for (const r of db.races) {
    for (const vraag of ['quali_top10', 'race_top10']) {
      // Race 3 is mijn rampweekend: die lever ik helemaal niet in.
      if (r.id !== 3) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
          question_id: vraag, waarde: mijn });
      }
      db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-2',
        question_id: vraag, waarde: echt });
    }
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, aantal);

await zetRaces(11);
const elf = await naarStand();
check('bij elf gescoorde races zegt het blok nog niets',
  !elf.includes('zonder je slechtste'),
  elf.match(/zonder je slechtste[^.]*/)?.[0] ?? '');

// Twaalf: nu valt er één weekend weg.
await zetRaces(12);
const twaalf = await naarStand();
check('vanaf twaalf staat het kopje er, in enkelvoud',
  twaalf.includes('zonder je slechtste weekend'),
  twaalf.includes('zonder je slechtste') ? twaalf.match(/zonder je slechtste[^Z]{0,30}/)?.[0] : 'geen kopje');
check('en niet in meervoud', !twaalf.includes('zonder je slechtste 2 weekenden'));

check('hij noemt welk weekend er wegvalt', twaalf.includes('Weggestreept: Race 3'),
  twaalf.match(/Weggestreept:[^.]*\./)?.[0] ?? 'geen weggestreept-zin');
check('en legt de regel uit in gewone taal',
  twaalf.includes('Per twaalf gereden races valt je slechtste weekend hier weg'));
check('met de belofte dat de stand erboven alles meetelt',
  twaalf.includes('De stand hierboven telt gewoon alles mee'));

// De officiële stand mag hier niet door veranderen. Elf races × twee sessies
// × 50 punten = 1100 voor mij, 1200 voor Joey die er twaalf inleverde.
const officieel = await page.evaluate(() => {
  const rijen = [...document.querySelectorAll('.strij')];
  return rijen.map((r) => `${r.querySelector('.nm')?.textContent.trim().split(' ')[0]}`
    + `=${r.querySelector('.t')?.textContent.trim()}`).join(' ');
});
check('de stand bovenaan telt nog steeds alles mee', officieel.includes('=1100'),
  officieel);

// En in het blok eronder staan we gelijk: mijn nul valt weg, Joey levert zijn
// slechtste van vijftig in. Dat is het hele punt — je gemiste race kost je
// daarna niets meer, maar wie alles meedeed levert ook in.
const gestreept = await page.evaluate(() => {
  const kop = [...document.querySelectorAll('.label')]
    .find((x) => x.textContent.includes('zonder je slechtste'));
  const uit = [];
  for (let n = kop?.nextElementSibling; n && n.classList.contains('rest'); n = n.nextElementSibling) {
    uit.push(`${n.querySelector('.nm')?.textContent.trim().split(' ')[0]}`
      + `=${n.querySelector('.t')?.textContent.trim()}`);
  }
  return uit.join(' ');
});
check('en in het blok staan allebei op 1100', gestreept === 'Danny=1100 Joey=1100',
  gestreept);

// Vierentwintig races: twee weg, en het kopje moet meebewegen.
await zetRaces(24);
const vol = await naarStand();
check('bij een heel seizoen staan er twee in het kopje',
  vol.includes('zonder je slechtste 2 weekenden'),
  vol.match(/zonder je slechtste[^P]{0,30}/)?.[0] ?? 'geen kopje');

// Mijn tweede weggestreepte weekend is een gewone race van 100. Die zin mag
// niet doen alsof ik twee rampweekenden had.
check('hij noemt allebei de weggestreepte weekenden',
  /Weggestreept:.*Race 3.*en.*Race/.test(vol),
  vol.match(/Weggestreept:[^.]*\./)?.[0] ?? 'geen weggestreept-zin');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
