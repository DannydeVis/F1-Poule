// Het weekendpodium bovenaan een afgelopen weekend.
//
// Danny (12 oktober): "de weekend winnaar ... vind ik nog wat laag in
// zichtbaarheid. Als ik op een weekend druk die helemaal klaar is zie ik
// weinig bragging rights." De winnaar stond onderaan het racescherm, onder je
// hele voorspelling. Nu staat bij een afgelopen weekend bovenaan, boven de
// tabbladen, een podium: de winnaar groot, de eerste drie als treden (twee,
// een, drie), jouw plek als je er niet op staat, en de grootste stijger.

import { maakControle, startPagina, meedoen, openRace, naarLijst } from './hulp.mjs';

const { check, afronden } = maakControle('het weekendpodium');
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

// Danny en vier medespelers, Melbourne en Shanghai gereden. Elke speler krijgt
// per race een van vijf lijsten; `schuif` draait die rond, zodat telkens een
// ander wint. `zonder` levert in Shanghai niets in.
const zet = (schuif, { zonder = null, quali = false } = {}, pg = page) => pg.evaluate(({ UIT, schuif, zonder, quali }) => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  ['Michael', 'Fatima', 'Bram', 'Lotte'].forEach((n, i) => db.pool_members.push(
    { member_id: `lid-m${i}`, pool_id: 'pool-1', display_name: n, user_id: `u${i}` }));
  const lijsten = [UIT, [UIT[1], UIT[0], ...UIT.slice(2)], [...UIT].reverse(),
    [...UIT.slice(3), ...UIT.slice(0, 3)], [UIT[2], UIT[0], UIT[1], ...UIT.slice(3)]];
  db.answers = [];
  db.races.slice(0, 2).forEach((r, k) => {
    r.quali_result = UIT;
    // `quali`: van Shanghai is alleen de kwalificatie gereden.
    r.race_result = quali && k === 1 ? null : UIT;
    r.deadline_quali = new Date(Date.now() - (8 - k) * 36e5).toISOString();
    r.deadline_race = new Date(Date.now() - (7 - k) * 36e5).toISOString();
    db.pool_members.forEach((m, j) => {
      if (k === 1 && m.member_id === zonder) return;
      for (const v of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m.member_id,
                          question_id: v, waarde: lijsten[(j + k * 2 + schuif) % 5] });
      }
    });
  });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { UIT, schuif, zonder, quali });

const lees = (pg = page) => pg.evaluate(() => {
  const p = document.querySelector('[data-podium]');
  if (!p) return null;
  const tekst = (s) => p.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  return {
    kop: tekst('.podiumwinnaar'),
    sub: tekst('.tegelsub'),
    treden: [...p.querySelectorAll('[data-trede]')].map((t) => ({
      plek: t.dataset.trede, naam: t.querySelector('.tnaam').textContent.replace(/\s+/g, ' ').trim(),
      punten: t.querySelector('.tpunten').textContent.trim(), mij: t.classList.contains('mij'),
      hoog: Math.round(t.querySelector('.tblok').getBoundingClientRect().height) })),
    ik: tekst('[data-mijn-plek]'),
    stijger: tekst('[data-stijger]'),
    boven: p.getBoundingClientRect().top < document.querySelector('.tabs').getBoundingClientRect().top,
    zichtbaar: p.getBoundingClientRect().bottom <= innerHeight,
    voetWinnaar: document.querySelector('.weekendkaart .rest.winnaar') !== null,
    voetDeel: document.querySelector('#paneel [data-deel]') !== null,
  };
});
const open = async (pg = page) => { await pg.reload(); await openRace(pg, 'Shanghai'); await pg.waitForSelector('.tabs'); };

// ---- iemand anders wint, jij staat er niet op --------------------------------------
// Lotte levert in Shanghai niets in, dus het podium gaat over vier spelers.
await zet(0, { zonder: 'lid-m3' });
await open();
let p = await lees();
check('een afgelopen weekend heeft bovenaan een podium', p !== null);
check('boven de tabbladen, en op een telefoon meteen in beeld', p?.boven && p?.zichtbaar, JSON.stringify(p));
check('de winnaar staat groot in de kop', p?.kop === 'Bram', p?.kop);
check('met zijn punten van het weekend', p?.sub === '100 punten dit weekend', p?.sub);
check('de treden staan als op het echte podium: twee, een, drie',
  p?.treden.map((t) => t.plek).join() === '2,1,3', JSON.stringify(p?.treden));
check('met op elke trede de naam en de punten',
  p?.treden.map((t) => `${t.plek}:${t.naam}:${t.punten}`).join(' | ')
    === '2:Fatima:84 punten | 1:Bram:100 punten | 3:Danny jij:12 punten', JSON.stringify(p?.treden));
check('de eerste trede is de hoogste, dan twee, dan drie',
  p?.treden[1].hoog > p?.treden[0].hoog && p?.treden[0].hoog > p?.treden[2].hoog, JSON.stringify(p?.treden.map((t) => t.hoog)));
check('wie niets inleverde staat er niet op',
  !p?.treden.some((t) => t.naam.includes('Lotte')));

// Met drie spelers zou Lotte met nul punten derde zijn. Ze leverde niets in,
// dus is er dan geen derde trede.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => !['lid-m1', 'lid-m2'].includes(m.member_id));
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await open();
p = await lees();
check('ook niet als er anders een trede voor haar vrij was',
  p?.treden.length === 2 && !p.treden.some((t) => t.naam.includes('Lotte')), JSON.stringify(p?.treden));

await zet(1, { zonder: 'lid-m3' });
await open();
p = await lees();
check('sta je er niet op, dan staat eronder je plek, onder wie wel inleverden',
  p?.ik === 'Jij werd 4e van 4, met 0 punten.', `${p?.ik} / ${JSON.stringify(p?.treden)}`);
check('en de grootste stijger in de stand', p?.stijger?.startsWith('Grootste stijger: ') && p.stijger.includes('→'), p?.stijger);
check('de winnaar staat niet nog een keer onderaan; de knoppen daar wel',
  !p?.voetWinnaar && p?.voetDeel, JSON.stringify(p));

// ---- jij op het podium -------------------------------------------------------------
await zet(4);
await open();
p = await lees();
const mijn = p?.treden.find((t) => t.mij);
check('sta je erop, dan is jouw trede gemarkeerd met "jij"', mijn?.naam.endsWith('jij'), JSON.stringify(p?.treden));
check('en staat er geen losse regel met je plek', p?.ik === null, p?.ik);

// ---- jij wint ----------------------------------------------------------------------
await zet(3);
await open();
p = await lees();
check('win je zelf, dan zegt de kop dat', p?.kop === 'Jij wint dit weekend', p?.kop);
check('en sta je op de middelste trede', p?.treden[1].plek === '1' && p.treden[1].mij, JSON.stringify(p?.treden));

// Michael had in Shanghai precies dezelfde lijsten als Danny: gedeeld eerste.
await page.evaluate(() => {
  const db = globalThis.__db;
  const sh = db.races[1].id;
  for (const a of db.answers) if (a.race_id === sh && a.member_id === 'lid-m0') {
    a.waarde = db.answers.find((b) => b.race_id === sh && b.member_id === 'lid-1' && b.question_id === a.question_id).waarde;
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await open();
p = await lees();
check('gedeeld eerste: "Jij deelt de winst"', p?.kop === 'Jij deelt de winst', p?.kop);
check('allebei op de eerste trede, en dan is er geen tweede',
  p?.treden.find((t) => t.plek === '1')?.naam === 'Danny en Michael jij'
    || p?.treden.find((t) => t.plek === '1')?.naam === 'Michael en Danny jij', JSON.stringify(p?.treden));
check('de volgende staat op de derde trede', p?.treden.map((t) => t.plek).join() === '1,3', JSON.stringify(p?.treden));

// ---- nog niet voorbij --------------------------------------------------------------
await zet(0, { quali: true });
await open();
check('na alleen de kwalificatie is er nog geen podium', (await lees()) === null);

// ---- in je eentje ------------------------------------------------------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
  db.races[1].race_result = db.races[1].quali_result;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await open();
check('in je eentje is er geen podium: er valt niemand te verslaan', (await lees()) === null);
await naarLijst(page);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();

// ---- in het Engels -----------------------------------------------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ taal: 'en' });
  await meedoen(page);
  await page.evaluate(({ UIT }) => {
    const db = globalThis.__db;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    db.pool_members.push({ member_id: 'lid-m0', pool_id: 'pool-1', display_name: 'Michael', user_id: 'u0' });
    db.answers = [];
    for (const r of db.races.slice(0, 2)) {
      r.quali_result = UIT; r.race_result = UIT;
      r.deadline_quali = new Date(Date.now() - 8 * 36e5).toISOString();
      r.deadline_race = new Date(Date.now() - 7 * 36e5).toISOString();
      for (const [m, l] of [['lid-1', UIT], ['lid-m0', [...UIT].reverse()]]) {
        for (const v of ['quali_top10', 'race_top10']) {
          db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: m, question_id: v, waarde: l });
        }
      }
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { UIT });
  await page.reload();
  await openRace(page, 'Shanghai');
  await page.waitForSelector('[data-podium]');
  const t = (await page.textContent('[data-podium]')).replace(/\s+/g, ' ');
  check('in het Engels: "You win this weekend" en "weekend winner"',
    t.includes('You win this weekend') && t.toLowerCase().includes('weekend winner'), t);
  check('geen javascriptfouten in het Engels', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- en in het Duits ---------------------------------------------------------------
// De plek schrijft elke taal anders: 4e, 4th, 4. (zie rang() in de app).
{
  const { page: de, jsFouten, stoppen } = await startPagina({ taal: 'de' });
  await de.setViewportSize({ width: 390, height: 844 });
  await meedoen(de);
  await zet(1, { zonder: 'lid-m3' }, de);
  await open(de);
  const p = await lees(de);
  check('in het Duits: "Du wurdest 4. von 4" en "Wochenendsieger"',
    p?.ik === 'Du wurdest 4. von 4, mit 0 Punkten.'
      && (await de.textContent('[data-podium] .label')).trim().toLowerCase() === 'wochenendsieger', p?.ik);
  check('geen javascriptfouten in het Duits', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
