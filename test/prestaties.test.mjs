// Prestaties onder Profiel (15 november).
//
// Negen dingen die je in een seizoen kunt halen, los van de stand: ook wie
// onderaan staat kan de pole goed hebben. Alles wordt uitgerekend uit wat er
// al is; er wordt niets opgeslagen. Wat hier vastligt:
//   1. Onder Profiel staat de regel "prestaties" met hoeveel je er hebt, en
//      daaronder acht tegels: behaald brandt, de rest is gedimd met wat je
//      ervoor moet doen.
//   2. Zonder iets ingeleverd heb je er geen.
//   3. Een weekend met alles goed geeft Van start, Pole, Winnaar, Podium,
//      Scherp en (met medespelers) Weekendwinst.
//   4. De drie die je moet opbouwen (vijf weekenden op rij, drie duels, drie
//      vragen van de week) laten zien hoe ver je bent.
//   5. De pole goed maar de race fout geeft Pole en niet Winnaar of Podium.
//   6. In je eentje is er geen Weekendwinst.
//   7. Voor wie niet kan zien staat erbij of een prestatie behaald is.

import { maakControle, startPagina, meedoen, openRegel } from './hulp.mjs';

const { check, afronden } = maakControle('prestaties onder Profiel');
const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
const LIJST = ['1', '12', '63', '16', '44', '4', '81', '10', '14', '18'];
const DAG = 24 * 3600e3;

// races: per race-id { mijn: {quali, race} of null, ander: idem, uitslag: true/false }.
// weekvraag: hoeveel van de eerste races ik de vraag van de week goed had.
async function zet({ races = {}, spelers = ['Sanne'], weekvraag = 0 } = {}) {
  await page.evaluate(({ races, spelers, weekvraag, LIJST, DAG }) => {
    const db = globalThis.__db;
    db.pool_members = db.pool_members.filter((m) => m.member_id === 'lid-1');
    for (const [i, naam] of spelers.entries()) {
      db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: null });
    }
    db.answers = []; db.weekvraag_antwoorden = [];
    // De nabootsing heeft drie races; voor een reeks van vijf zijn er zes nodig.
    for (let n = db.races.length + 1; n <= 6; n++) {
      db.races.push({ ...db.races[0], id: n, round: n, name: `Race ${n}` });
    }
    for (const r of db.races) {
      const wat = races[r.id];
      r.quali_result = null; r.race_result = null; r.vrije_trainingen = null;
      if (!wat) continue;
      r.drivers ??= db.races[0].drivers;   // Suzuka heeft in de nabootsing geen lijst
      // Gereden, elk een week na de vorige.
      const start = Date.now() - (60 - Number(r.round) * 7) * DAG;
      r.deadline_quali = new Date(start - DAG).toISOString();
      r.deadline_race = new Date(start).toISOString();
      r.quali_result = LIJST; r.race_result = LIJST;
      for (const [lid, l] of [['lid-1', wat.mijn], ['lid-2', wat.ander]]) {
        if (!l || !db.pool_members.some((m) => m.member_id === lid)) continue;
        for (const [q, lijst] of [['quali_top10', l.quali], ['race_top10', l.race]]) {
          if (lijst) db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: lid, question_id: q, waarde: lijst });
        }
      }
      if (Number(r.round) <= weekvraag) {
        // De vraag van de week: het team van deze ronde, en ik koos de snelste.
        const teams = new Map();
        for (const d of r.drivers ?? []) { if (!teams.has(d.team)) teams.set(d.team, []); teams.get(d.team).push(d); }
        const paren = [...teams.entries()].filter(([, ds]) => ds.length >= 2).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        const paar = paren[(Number(r.round) - 1) % paren.length][1].sort((a, b) => Number(a.nr) - Number(b.nr));
        r.vrije_trainingen = [{ naam: 'Practice 1', sessie: 1, start: new Date(start - 2 * DAG).toISOString(),
          eind: new Date(start - 2 * DAG + 3600e3).toISOString(), top: null, volgorde: [paar[1].nr, paar[0].nr] }];
        db.weekvraag_antwoorden.push({ race_id: r.id, member_id: 'lid-1', keuze: paar[1].nr });
      }
    }
    sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
  }, { races, spelers, weekvraag, LIJST, DAG });
  await page.reload();
  await page.waitForSelector('.shell');
  await page.click('[data-weergave="profiel"]');
  await openRegel(page, 'p-prestaties');
  await page.waitForSelector('[data-prestaties]');
}
const tegels = () => page.$$eval('[data-prestatie]', (t) => Object.fromEntries(t.map((e) => [e.dataset.prestatie, {
  aan: e.classList.contains('behaald'), voortgang: e.querySelector('.voortgang')?.textContent ?? '',
  lezer: e.querySelector('.alleenlezer')?.textContent ?? '', naam: e.querySelector('b').textContent }])));
const behaald = (t) => Object.entries(t).filter(([, x]) => x.aan).map(([k]) => k).sort().join();
const stand = async () => ((await page.textContent('details[data-pit="p-prestaties"] .pitstand')) ?? '').trim();
const GOED = { quali: LIJST, race: LIJST };
const OM = { quali: [...LIJST].reverse(), race: [...LIJST].reverse() };

await meedoen(page);
const ids = [1, 2, 3, 4, 5, 6];

// --- 2. niets ingeleverd -------------------------------------------------------
await zet({});
let t = await tegels();
// Acht: de negende (Kenner) hoort bij de vraag van de week, en die staat uit.
check('onder Profiel staan acht prestaties, in een vaste volgorde',
  Object.keys(t).join() === 'start,pole,winnaar,podium,scherp,weekend,trouw,duellist', Object.keys(t).join());
check('zonder iets ingeleverd is er geen een behaald, en dat staat in de regel',
  behaald(t) === '' && (await stand()) === '0 van 8 behaald'
    && !(await page.$eval('details[data-pit="p-prestaties"]', (d) => d.classList.contains('aan'))), `${behaald(t)} · ${await stand()}`);
check('bij de drie die je opbouwt staat hoe ver je bent',
  t.scherp.voortgang === '0/5' && t.trouw.voortgang === '0/5' && t.duellist.voortgang === '0/3',
  JSON.stringify(t));
check('voor wie niet kan zien staat erbij dat hij nog niet behaald is',
  Object.values(t).every((x) => x.lezer === 'nog niet behaald'));
check('elke tegel zegt wat je ervoor moet doen', await page.$$eval('[data-prestatie]', (l) =>
  l.every((e) => e.querySelector('span').textContent.trim().length > 10)));

// --- 3. een weekend met alles goed ------------------------------------------------
await zet({ races: { [ids[0]]: { mijn: GOED, ander: OM } } });
t = await tegels();
check('een weekend met alles goed geeft Van start, Pole, Winnaar, Podium, Scherp en Weekendwinst',
  behaald(t) === 'podium,pole,scherp,start,weekend,winnaar', behaald(t));
check('de regel telt ze en het lampje brandt',
  (await stand()) === '6 van 8 behaald'
    && await page.$eval('details[data-pit="p-prestaties"]', (d) => d.classList.contains('aan')), await stand());
check('het duel van dat weekend telt voor Duellist, het weekend voor Trouw',
  t.duellist.voortgang === '1/3' && t.trouw.voortgang === '1/5' && t.scherp.voortgang === '', JSON.stringify(t));
check('en bij een behaalde prestatie staat dat voor de voorlezer', t.pole.lezer === 'behaald' && t.trouw.lezer === 'nog niet behaald');

// --- 5. pole goed, race fout -----------------------------------------------------------
await zet({ races: { [ids[0]]: { mijn: { quali: ['1', '63', '12', '44', '16', '81', '4', '14', '10', '18'], race: [...LIJST].reverse() }, ander: GOED } } });
t = await tegels();
check('de pole goed maar de race fout: Pole en Van start, geen Winnaar, Podium, Scherp of Weekendwinst',
  behaald(t) === 'pole,start', behaald(t));
check('Scherp telt het beste aantal precies goed in één lijst', t.scherp.voortgang === '2/5', t.scherp.voortgang);

// De winnaar en de tweede goed, de derde niet: Winnaar, geen Podium.
await zet({ races: { [ids[0]]: { mijn: { quali: null, race: ['1', '12', '16', '63', '44', '4', '81', '10', '14', '18'] }, ander: null } } });
t = await tegels();
check('de winnaar goed maar de derde niet: Winnaar, geen Podium en geen Pole',
  t.winnaar.aan && !t.podium.aan && !t.pole.aan, behaald(t));

// --- 6. in je eentje ----------------------------------------------------------------------
await zet({ spelers: [], races: { [ids[0]]: { mijn: GOED } } });
t = await tegels();
check('in je eentje is er geen Weekendwinst en geen duel', !t.weekend.aan && t.duellist.voortgang === '0/3' && t.pole.aan, behaald(t));

// --- 4. de drie die je opbouwt ---------------------------------------------------------------
await zet({ weekvraag: 3, races: Object.fromEntries(ids.slice(0, 5).map((id) => [id, { mijn: GOED, ander: OM }])) });
t = await tegels();
check('vijf weekenden op rij en drie gewonnen duels: alle acht, ook met goede vragen van de week in de database',
  behaald(t) === 'duellist,podium,pole,scherp,start,trouw,weekend,winnaar' && (await stand()) === '8 van 8 behaald',
  `${behaald(t)} · ${await stand()}`);
// Een weekend overgeslagen in het midden: de reeks is dan hoogstens drie.
await zet({ races: Object.fromEntries(ids.slice(0, 6).map((id, i) => [id, { mijn: i === 2 ? null : GOED, ander: OM }])) });
t = await tegels();
check('een overgeslagen weekend breekt de reeks: Trouw telt de langste reeks', !t.trouw.aan && t.trouw.voortgang === '3/5', t.trouw.voortgang);

// --- op het scherm ---------------------------------------------------------------------------
check('twee tegels naast elkaar, en op 390 pixels geen horizontale scroll', await page.evaluate(() => {
  const k = [...document.querySelectorAll('[data-prestatie]')].map((e) => e.getBoundingClientRect());
  return k[0].top === k[1].top && k[1].right <= 390 && document.documentElement.scrollWidth <= 390;
}));
check('een behaalde tegel heeft een groen lampje, een andere niet', await page.evaluate(() => {
  const kleur = (id) => getComputedStyle(document.querySelector(`[data-prestatie="${id}"] .pitlamp`)).backgroundColor;
  return kleur('pole') !== kleur('trouw');
}));
check('de namen en de uitleg zijn vertaald: in het Engels staat er geen Nederlands', await (async () => {
  // Na het script van startPagina, dat de taal bij elke lading op nl zet.
  await page.addInitScript(() => { try { localStorage.setItem('poule:taal', 'en'); } catch { /* niets */ } });
  await page.reload();
  await page.waitForSelector('.shell');
  await page.click('[data-weergave="profiel"]');
  await openRegel(page, 'p-prestaties');
  const tekst = await page.textContent('details[data-pit="p-prestaties"]');
  return tekst.includes('achievements') && tekst.includes('Lights out') && tekst.includes('Win three weekend duels.')
    && !/behaald|Lever|Zet de/.test(tekst);
})());

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
