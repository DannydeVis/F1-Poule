// Een race op een groot scherm.
//
// Aanleiding: "Op een groot scherm is het geen gezicht." Een race stond op elk
// scherm in één kolom van hooguit 880 pixels. Op een monitor van 2560 bleef
// daarmee twee derde leeg, en stond de uitslag als een smal strookje in het
// midden.
//
// Wat hier vastligt:
//   1. Vanaf 1280 pixels staat een uitslag in twee kolommen, onder je punten
//      over de volle breedte: links je voorspelling als tabel (met de losse
//      vragen onderin dezelfde kaart), rechts de poule, "zo dichtbij" en de
//      weekendwinnaar met de knoppen. De race wordt daarvoor breder, tot 1240
//      pixels.
//   2. Het invulscherm ook: de top 10 links, de vragen, de poule en Opslaan
//      rechts. Is er naast de top 10 niets (geen vragen, geen poule), dan
//      blijft het één kolom; een lege rechterkolom is geen verbetering.
//   3. Daaronder, en op een telefoon, één kolom: je punten, je voorspelling,
//      de poule, de knoppen.

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
    pole: maat(pole), score: vak('.score'), strip: vak('.strip'), kaart: vak('.voorspelkaart'),
    poule: vak('.poulekaart'), rest: vak('[data-bekijk]'), deel: vak('[data-deel]'),
    grid: vak('.grid10'), opslaan: vak('#opslaan'), kolom2: !!document.querySelector('.kolom2'),
  };
});
const naast = (links, rechts) => !!links && !!rechts && links.r <= rechts.l;
const onder = (boven, beneden) => !!boven && !!beneden && boven.b <= beneden.t;
const binnen = (klein, groot) => !!klein && !!groot && klein.l >= groot.l && klein.r <= groot.r
  && klein.t >= groot.t && klein.b <= groot.b;

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
  check(`${breed}: je punten staan bovenaan, over de volle breedte van de twee kolommen`,
    onder(v.score, v.kaart) && onder(v.score, v.poule)
      && Math.abs(v.score.l - v.kaart.l) < 2 && Math.abs(v.score.r - v.poule.r) < 2,
    JSON.stringify({ score: v.score, kaart: v.kaart, poule: v.poule }));
  check(`${breed}: je voorspelling links, met de pole onderin dezelfde kaart`,
    binnen(v.strip, v.kaart) && binnen(v.pole, v.kaart) && onder(v.strip, v.pole),
    JSON.stringify({ kaart: v.kaart, strip: v.strip, pole: v.pole }));
  check(`${breed}: de poule en de knoppen staan ernaast, rechts`,
    naast(v.kaart, v.poule) && naast(v.kaart, v.rest) && naast(v.kaart, v.deel),
    JSON.stringify({ kaart: v.kaart, poule: v.poule, deel: v.deel }));
  check(`${breed}: en de poule bovenaan die rechterkolom, op de hoogte van je voorspelling`,
    Math.abs(v.poule.t - v.kaart.t) < 2, JSON.stringify({ poule: v.poule, kaart: v.kaart }));
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
  check('en de poule ook rechts, boven Opslaan',
    naast(v.grid, v.poule) && onder(v.poule, v.opslaan), JSON.stringify({ grid: v.grid, poule: v.poule, opslaan: v.opslaan }));
}
{
  // Zonder losse vragen staat er naast de top 10 niets om in te vullen, maar
  // wel wie van de poule al klaar is.
  await page.evaluate(() => {
    const db = globalThis.__db;
    db.pool_questions = db.pool_questions.filter((q) => q.pool_id !== 'pool-1' || /top10/.test(q.question_id));
    if (!db.pool_questions.some((q) => q.pool_id === 'pool-1'))
      db.pool_questions.push({ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' });
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  });
  const v = await invullen(2560);
  check('zonder losse vragen staan de poule en Opslaan naast de top 10',
    v.kolom2 && naast(v.grid, v.poule) && naast(v.grid, v.opslaan),
    JSON.stringify({ kolom2: v.kolom2, grid: v.grid, poule: v.poule, opslaan: v.opslaan }));
  // En in je eentje ook geen poule: dan staat er rechts niets meer.
  const leden = await page.evaluate(() => {
    const db = globalThis.__db;
    const weg = db.pool_members.filter((l) => l.pool_id === 'pool-1' && l.member_id !== 'lid-1');
    db.pool_members = db.pool_members.filter((l) => !weg.includes(l));
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
    return weg;
  });
  const w = await invullen(2560);
  check('zonder vragen en zonder poule blijft het één kolom, met Opslaan onder de top 10',
    !w.kolom2 && !w.poule && onder(w.grid, w.opslaan), JSON.stringify({ kolom2: w.kolom2, grid: w.grid, opslaan: w.opslaan }));
  check('en dan ook niet breder dan 880', w.kolom.r - w.kolom.l <= 880, `${w.kolom.r - w.kolom.l}px`);
  await page.evaluate((leden) => {
    const db = globalThis.__db;
    db.pool_questions.push({ pool_id: 'pool-1', question_id: 'pole' });
    db.pool_members.push(...leden);
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, leden);
}

// ---- 3. kleiner dan 1280, en op een telefoon: zoals altijd ------------------------------
{
  const v = await uitslag(1100);
  check('op 1100 staat alles onder elkaar, in één kolom',
    onder(v.kaart, v.poule) && onder(v.poule, v.deel)
      && Math.abs(v.kaart.l - v.poule.l) < 2 && Math.abs(v.kaart.r - v.poule.r) < 2,
    JSON.stringify({ kaart: v.kaart, poule: v.poule, deel: v.deel }));
}
{
  const v = await uitslag(390, 844);
  check('op een telefoon onder elkaar: je punten, je top 10 met de pole eronder, de poule, de knoppen',
    onder(v.score, v.strip) && onder(v.strip, v.pole) && onder(v.pole, v.rest) && onder(v.rest, v.deel),
    JSON.stringify({ score: v.score?.t, strip: v.strip?.t, pole: v.pole?.t, rest: v.rest?.t, deel: v.deel?.t }));
}

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
