// Gestegen, gezakt, en hoe lang je al meedoet.
//
// De stand zegt wie er wint, niet wát er gebeurd is. Twee plekken stijgen in
// Monza is het soort ding waar mensen elkaar in de groepsapp op aanspreken, en
// het kost niets: dezelfde telling, één weekend eerder afgekapt.
//
// De twee dingen die hier mis kunnen gaan en daarom vastliggen: een pijltje
// tonen als er niets veranderd is, en een reeks meetellen die de app zelf
// heeft ingevuld.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('klimmen, zakken en reeksen');
const { page, jsFouten, stoppen } = await startPagina();

const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
const OMGEKEERD = [...UIT].reverse();

await meedoen(page);

// Twee medespelers, en twee gereden races die de volgorde omgooien.
//
//   Melbourne  Danny had het mis, Michael goed   -> Michael staat voor
//   Shanghai   Danny goed, Michael deed niet mee -> Danny klimt eroverheen
const stand = async () => page.$$eval('.strij', (n) => n.map((e) => ({
  plek: Number(e.querySelector('.p').textContent.trim()),
  naam: e.querySelector('.nm').textContent.trim().split(/\s+/)[0],
  punten: Number(e.querySelector('.t').textContent.trim()),
  wissel: e.querySelector('.wissel')?.textContent.trim() ?? null,
  reeks: e.querySelector('.reeks')?.textContent.trim() ?? null,
})));

const zetKlaar = (races) => page.evaluate(({ races, UIT, OMGEKEERD }) => {
  const db = globalThis.__db;
  // Eén keer, niet bij elke aanroep: een tweede Michael maakt er stilletjes
  // een poule van drie en dan klopt elk pijltje niet meer.
  if (!db.pool_members.some((m) => m.member_id === 'lid-2')) {
    db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1',
                           display_name: 'Michael', user_id: 'iemand' });
  }
  db.answers.length = 0;
  for (const [i, wie] of races.entries()) {
    const r = db.races[i];
    r.quali_result = UIT; r.race_result = UIT;
    r.deadline_quali = new Date(Date.now() - (9 - i) * 36e5).toISOString();
    r.deadline_race = new Date(Date.now() - (8 - i) * 36e5).toISOString();
    if (!r.drivers) r.drivers = db.races[0].drivers;
    for (const [lid, goed] of Object.entries(wie)) {
      for (const v of ['quali_top10', 'race_top10']) {
        db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: lid,
                          question_id: v, waarde: goed ? UIT : OMGEKEERD });
      }
    }
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { races, UIT, OMGEKEERD });

// --- één gereden race: nog niets om mee te vergelijken ---------------
await zetKlaar([{ 'lid-1': false, 'lid-2': true }]);
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
let rijen = await stand();
check('na één race staat er nog geen pijltje, want er is niets om mee te vergelijken',
  rijen.every((r) => r.wissel === null), JSON.stringify(rijen));
check('en Michael staat voor', rijen[0].naam === 'Michael', JSON.stringify(rijen));

// --- tweede race draait het om ---------------------------------------
await zetKlaar([{ 'lid-1': false, 'lid-2': true }, { 'lid-1': true }]);
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
rijen = await stand();

check('wie erover klimt krijgt een pijl omhoog',
  rijen.find((r) => r.naam === 'Danny')?.wissel === '↑1', JSON.stringify(rijen));
check('en wie ingehaald wordt een pijl omlaag',
  rijen.find((r) => r.naam === 'Michael')?.wissel === '↓1', JSON.stringify(rijen));
check('het pijltje staat bij de goede speler, niet zomaar bovenaan',
  rijen[0].naam === 'Danny' && rijen[0].wissel === '↑1', JSON.stringify(rijen));

// --- gelijk: allebei eerste --------------------------------------------
// Shanghai andersom: dan hebben ze evenveel punten. Michael heet hier even
// Bram, zodat hij op alfabet bóven Danny staat: dat hij daar staat is dan
// geen plek, ze delen de eerste. Danny is dus geklommen, Bram niet gezakt.
await zetKlaar([{ 'lid-1': false, 'lid-2': true }, { 'lid-1': true, 'lid-2': false }]);
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members.find((m) => m.member_id === 'lid-2').display_name = 'Bram';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
rijen = await stand();
// (De eerste twee rijen: verderop op het scherm staan de onderlinge duels in
// dezelfde opmaak.)
check('gelijke punten, gelijke plek: allebei eerste',
  rijen[0].punten === rijen[1].punten && rijen[0].plek === 1 && rijen[1].plek === 1,
  JSON.stringify(rijen.slice(0, 2)));
check('wie erbij komt klimt', rijen.find((r) => r.naam === 'Danny')?.wissel === '↑1', JSON.stringify(rijen));
check('en wie zijn plek deelt, zakt niet', rijen.find((r) => r.naam === 'Bram')?.wissel === null,
  JSON.stringify(rijen));
{
  const kaart = await page.evaluate(async () => {
    document.querySelector('[data-weergave="races"]').click();
    await new Promise((r) => setTimeout(r, 300));
    return document.querySelector('.kaartvoet span')?.textContent.replace(/\s+/g, ' ').trim();
  });
  check('ook op de weekendkaart: 1e van 2, al staat Bram erboven', kaart?.replace(/\s/g, '') === '1evan2', kaart);
}
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members.find((m) => m.member_id === 'lid-2').display_name = 'Michael';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});

// --- geen beweging, geen pijltje --------------------------------------
// Drie races waarin niemand van plek wisselt. Een streepje of een "0" erbij
// zou van "er is niets gebeurd" een mededeling maken.
await zetKlaar([{ 'lid-1': true, 'lid-2': false },
                { 'lid-1': true, 'lid-2': false },
                { 'lid-1': true, 'lid-2': false }]);
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
rijen = await stand();
check('wie op zijn plek blijft krijgt helemaal geen pijltje',
  rijen.every((r) => r.wissel === null), JSON.stringify(rijen));

// --- de reeks ---------------------------------------------------------
check('drie weekenden op rij levert een reeks op',
  rijen.find((r) => r.naam === 'Danny')?.reeks === '3×', JSON.stringify(rijen));

// Eén weekend overslaan breekt hem. Danny slaat de middelste over.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.answers = db.answers.filter((a) => !(a.race_id === 2 && a.member_id === 'lid-1'));
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
rijen = await stand();
check('één gemist weekend breekt de reeks',
  rijen.find((r) => r.naam === 'Danny')?.reeks === null, JSON.stringify(rijen));

// En een reeks die de app zelf invulde telt niet. Dezelfde grens als bij de
// weekendwinst: het is iets wat je doet, niet iets wat je overkomt.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pools[0].autofill_vanaf = new Date(Date.now() - 100 * 3600e3).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
rijen = await stand();
check('en een automatisch aangevulde race telt niet mee voor je reeks',
  rijen.find((r) => r.naam === 'Danny')?.reeks === null, JSON.stringify(rijen));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
