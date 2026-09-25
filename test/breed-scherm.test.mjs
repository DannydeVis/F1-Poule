// Een race op een groot scherm.
//
// Aanleiding: "Op een groot scherm is het geen gezicht." Een race stond op elk
// scherm in één kolom van hooguit 880 pixels. Op een monitor van 2560 bleef
// daarmee twee derde leeg, en stond de uitslag als een smal strookje in het
// midden.
//
// Wat hier vastligt:
//   1. Vanaf 1280 pixels staat een uitslag in twee kolommen: links je punten
//      en de top 10, rechts de losse vragen, de rest en de weekendwinnaar met
//      de knoppen. De race wordt daarvoor breder, tot 1240 pixels.
//   2. Het invulscherm ook: de top 10 links, de vragen en Opslaan rechts.
//      Zonder losse vragen blijft het één kolom; een lege rechterkolom naast
//      de top 10 is geen verbetering.
//   3. Daaronder, en op een telefoon, verandert er niets: één kolom, in de
//      volgorde van altijd (de losse vragen boven je punten).

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('een race op een groot scherm');
const { page, jsFouten, stoppen } = await startPagina();
await meedoen(page);

// Melbourne gereden, met een pole-vraag, twee medespelers; Shanghai staat open.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
await page.evaluate((uit) => {
  const db = globalThis.__db;
  for (const [i, naam] of ['Joe', 'Pipo'].entries())
    db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: `iemand-${i}` });
  const r = db.races[0];
  r.quali_result = uit; r.race_result = uit;
  r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
  r.deadline_race = new Date(Date.now() - 5e6).toISOString();
  for (const v of ['quali_top10', 'race_top10'])
    db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: v, waarde: uit });
  db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1', question_id: 'pole', waarde: '1' });
  db.races[1].deadline_quali = new Date(Date.now() + 30 * 36e5).toISOString();
  db.races[1].deadline_race = new Date(Date.now() + 50 * 36e5).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);

// Waar staat wat: een vak per onderdeel, in pixels.
const vakken = () => page.evaluate(() => {
  const maat = (el) => { const r = el?.getBoundingClientRect();
    return r && r.width ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) } : null; };
  const vak = (s) => maat(document.querySelector(s));
  // De pole is een rij in dezelfde opmaak als de top 10, maar niet in de strip.
  const pole = [...document.querySelectorAll('#paneel .sr')].find((e) => !e.closest('.strip'));
  return {
    kolom: vak('.kol.rechts'), vlak: vak('.kolommen'),
    pole: maat(pole), score: vak('.score'), strip: vak('.strip'),
    rest: vak('[data-bekijk]'), deel: vak('[data-deel]'),
    grid: vak('.grid10'), opslaan: vak('#opslaan'), kolom2: !!document.querySelector('.kolom2'),
  };
});
const naast = (links, rechts) => !!links && !!rechts && links.r <= rechts.l;
const onder = (boven, beneden) => !!boven && !!beneden && boven.b <= beneden.t;

const uitslag = async (breed, hoog = 1000) => {
  await page.setViewportSize({ width: breed, height: hoog });
  await page.reload();
  await openRace(page, 'Melbourne');
  await page.click('[data-tab="quali"]');
  await page.waitForSelector('.strip');
  await page.waitForTimeout(300);
  return vakken();
};

// ---- 1. de uitslag op een groot scherm -----------------------------------------------
for (const breed of [2560, 1366]) {
  const v = await uitslag(breed);
  check(`${breed}: je punten en de top 10 staan links, onder elkaar`, onder(v.score, v.strip) && Math.abs(v.score.l - v.strip.l) < 2,
    JSON.stringify({ score: v.score, strip: v.strip }));
  check(`${breed}: de rest en de knoppen staan ernaast, rechts`, naast(v.strip, v.rest) && naast(v.strip, v.deel),
    JSON.stringify({ strip: v.strip, rest: v.rest, deel: v.deel }));
  check(`${breed}: en de pole bovenaan die rechterkolom, op de hoogte van je punten`,
    naast(v.strip, v.pole) && Math.abs(v.pole.t - v.score.t) < 40, JSON.stringify({ pole: v.pole, score: v.score }));
}
{
  const v = await uitslag(2560);
  const breedte = v.kolom.r - v.kolom.l;
  check('op 2560 wordt de race breder dan de 880 van één kolom, tot 1240',
    breedte > 1000 && breedte <= 1240, `${breedte}px`);
  check('en staat hij in het midden', Math.abs((v.kolom.l - v.vlak.l) - (v.vlak.r - v.kolom.r)) < 3,
    `${v.kolom.l - v.vlak.l} links, ${v.vlak.r - v.kolom.r} rechts`);
}

// ---- 2. het invulscherm -------------------------------------------------------------------
const invullen = async (breed) => {
  await page.setViewportSize({ width: breed, height: 1000 });
  await page.reload();
  await openRace(page, 'Shanghai');
  await page.click('[data-tab="quali"]');
  await page.waitForSelector('.grid10');
  await page.waitForTimeout(300);
  return vakken();
};
{
  const v = await invullen(2560);
  check('invullen op een groot scherm: de top 10 links, Opslaan rechts ernaast',
    naast(v.grid, v.opslaan) && v.opslaan.t < v.grid.b, JSON.stringify({ grid: v.grid, opslaan: v.opslaan }));
}
{
  // Zonder losse vragen staat er naast de top 10 niets om in te vullen.
  await page.evaluate(() => {
    const db = globalThis.__db;
    db.pool_questions = db.pool_questions.filter((q) => q.pool_id !== 'pool-1' || /top10/.test(q.question_id));
    if (!db.pool_questions.some((q) => q.pool_id === 'pool-1'))
      db.pool_questions.push({ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
  const v = await invullen(2560);
  check('zonder losse vragen blijft het één kolom, met Opslaan onder de top 10',
    !v.kolom2 && onder(v.grid, v.opslaan), JSON.stringify({ kolom2: v.kolom2, grid: v.grid, opslaan: v.opslaan }));
  check('en dan ook niet breder dan 880', v.kolom.r - v.kolom.l <= 880, `${v.kolom.r - v.kolom.l}px`);
  await page.evaluate(() => {
    const db = globalThis.__db;
    db.pool_questions.push({ pool_id: 'pool-1', question_id: 'pole' });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
}

// ---- 3. kleiner dan 1280, en op een telefoon: zoals altijd ------------------------------
{
  const v = await uitslag(1100);
  check('op 1100 staat alles onder elkaar, in één kolom',
    onder(v.strip, v.rest) && onder(v.rest, v.deel) && Math.abs(v.strip.l - v.deel.l) < 2,
    JSON.stringify({ strip: v.strip, rest: v.rest, deel: v.deel }));
}
{
  const v = await uitslag(390, 844);
  check('op een telefoon in de volgorde van altijd: pole, je punten, de top 10, de rest, de knoppen',
    onder(v.pole, v.score) && onder(v.score, v.strip) && onder(v.strip, v.rest) && onder(v.rest, v.deel),
    JSON.stringify({ pole: v.pole?.t, score: v.score?.t, strip: v.strip?.t, rest: v.rest?.t, deel: v.deel?.t }));
}

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
