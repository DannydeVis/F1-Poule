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
check('en in je eentje ook geen seizoensrecords: er valt niemand te verslaan',
  (await page.$('[data-record]')) === null);

// ---- en dan wel ---------------------------------------------------
await zet([false, false, true, true, true], 3);
await naarStand();
await page.waitForSelector('.grafiek');
check('vanaf drie races met medespelers verschijnt hij', await page.isVisible('.grafiek'));

const punten = await page.$$eval('.grafiek svg circle', (n) => n.length);
check('met één punt per gereden race', punten === 5, `${punten} punten`);

const pad = await page.$eval('.grafiek svg path.jij', (e) => e.getAttribute('d'));
check('en een lijn die die punten verbindt',
  (pad.match(/L/g) ?? []).length === 4, pad);

// Feedbackrapport 10 oktober: "per race laten zien wie er is gestegen of
// gedaald". Elke medespeler een eigen grijze lijn achter de jouwe.
const anderen = await page.$$eval('.grafiek svg path.ander', (n) => n.map((e) => ({
  lid: e.dataset.lid, stappen: (e.getAttribute('d').match(/L/g) ?? []).length,
  naam: e.querySelector('title')?.textContent })));
check('elke medespeler heeft een eigen lijn, over dezelfde races',
  anderen.length === 3 && anderen.every((a) => a.stappen === 4 && /^Mede\d$/.test(a.naam)),
  JSON.stringify(anderen));
check('en jouw lijn ligt erboven, als laatste getekend',
  await page.$eval('.grafiek svg', (svg) => {
    const paden = [...svg.querySelectorAll('path')];
    return paden[paden.length - 1].classList.contains('jij');
  }));
check('de grafiek heet nu "het seizoen", met een regel die de kleuren uitlegt',
  (await page.textContent('.grafiek')).includes('Jouw lijn in kleur'));

// ---- seizoensrecords ---------------------------------------------
// Danny had drie van de vijf races goed (twee lijsten per race), de anderen
// de andere twee. Een omgekeerde lijst heeft geen enkele plek exact.
const records = await page.$$eval('[data-record]', (n) => Object.fromEntries(n.map((e) =>
  [e.dataset.record, { tekst: e.querySelector('.nm').textContent.replace(/\s+/g, ' ').trim(),
                       waarde: e.querySelector('.t').textContent.trim(),
                       mij: e.classList.contains('winnaar') }])));
check('vaakst P1 goed: Danny, 6 keer (drie races, kwalificatie en race)',
  records.p1?.tekst.includes('Danny') && records.p1.waarde === '6×' && records.p1.mij,
  JSON.stringify(records.p1));
check('meeste exacte plekken: Danny, 60',
  records.exact?.tekst.includes('Danny') && records.exact.waarde === '60×', JSON.stringify(records.exact));
check('beste weekend: iedereen had er een foutloos, dus alle vier, zonder één race te noemen',
  ['Danny', 'Mede0', 'Mede1', 'Mede2'].every((n) => records.weekend?.tekst.includes(n))
    && !/Circuit/.test(records.weekend?.waarde ?? '') && /punten$/.test(records.weekend?.waarde ?? ''),
  JSON.stringify(records.weekend));

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

// P1 en exacte plekken zijn verschillende records. Danny heeft alleen P1
// goed (de rest één plek opgeschoven), Mede0 alles behalve P1 en P2 (die
// omgedraaid).
await page.evaluate((UIT) => {
  const db = globalThis.__db;
  const alleenP1 = [UIT[0], ...UIT.slice(2), UIT[1]];
  const zonderP1 = [UIT[1], UIT[0], ...UIT.slice(2)];
  db.answers = db.answers.filter((a) => a.member_id === 'lid-1' || a.member_id === 'lid-m0');
  db.pool_members = db.pool_members.filter((m) => ['lid-1', 'lid-m0'].includes(m.member_id));
  for (const a of db.answers) a.waarde = a.member_id === 'lid-1' ? alleenP1 : zonderP1;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
await naarStand();
const apart = await page.$$eval('[data-record]', (n) => Object.fromEntries(n.map((e) =>
  [e.dataset.record, e.querySelector('.nm').textContent.replace(/\s+/g, ' ').trim() + ' = ' + e.querySelector('.t').textContent.trim()])));
check('vaakst P1 goed telt alleen de eerste plek: Danny 8× (vier races, twee lijsten)',
  /Danny/.test(apart.p1 ?? '') && !/Mede0/.test(apart.p1 ?? '') && /8×$/.test(apart.p1 ?? ''), JSON.stringify(apart));
check('meeste exacte plekken: Mede0, 8 per lijst, 64×',
  /Mede0/.test(apart.exact ?? '') && !/Danny/.test(apart.exact ?? '') && /64×$/.test(apart.exact ?? ''), JSON.stringify(apart));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
