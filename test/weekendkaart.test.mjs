// De weekendkaart: drie vragen, in die volgorde.
//
// Wie de app opent wil binnen één seconde weten welke race eraan komt, of hij
// nog iets moet doen, en hoe hij ervoor staat. Die drie stonden door elkaar in
// de kalenderlijst — je moest zelf bij elkaar zoeken dat Suzuka de volgende
// was, dat je de race nog niet had ingevuld, en wat dat voor je stand
// betekende.
//
// Wat hier vastligt is vooral de tweede vraag, want daar zitten de valkuilen:
// de knop moet wijzen naar wat er nog líggen blijft, en een automatisch
// aangevulde lijst mag nooit als "klaar" tellen.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('de weekendkaart');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];

await meedoen(page);

// Melbourne is gereden, Shanghai staat open met alleen de kwalificatie af.
await page.evaluate((uit) => {
  const db = globalThis.__db;
  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1',
                         display_name: 'Michael', user_id: 'iemand' });
  const r = db.races[0];
  r.quali_result = uit; r.race_result = uit;
  r.deadline_quali = new Date(Date.now() - 6e6).toISOString();
  r.deadline_race = new Date(Date.now() - 5e6).toISOString();
  for (const v of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
      question_id: v, waarde: ['1', '16', '4', '63', '44', '81', '12', '14', '10', '18'] });
    db.answers.push({ pool_id: 'pool-1', race_id: r.id, member_id: 'lid-2',
      question_id: v, waarde: uit });
  }
  db.races[1].deadline_quali = new Date(Date.now() + 36e5).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
await page.reload();
await page.waitForSelector('.hero');

// ---- 1. welke race komt eraan -------------------------------------
check('het circuit staat groot op de kaart',
  (await tekst('.heronaam')) === 'Shanghai', await tekst('.heronaam'));
check('met het rondenummer erbij',
  (await tekst('.hero-kop')).includes('ronde 02'), await tekst('.hero-kop'));
check('en een afteller tot de deadline',
  await page.isVisible('.klok[data-tot]'));

// ---- 2. moet ik nog iets doen -------------------------------------
const sessies = await page.$$eval('.sessie', (n) => n.map((e) =>
  ({ naam: e.textContent.trim().replace(/^[^a-z]*/, ''), staat: e.className.replace('sessie ', '') })));
check('beide sessies staan er, niet alleen de open',
  sessies.length === 2, JSON.stringify(sessies));
check('een lege sessie staat op open',
  sessies.find((x) => x.naam === 'kwalificatie')?.staat === 'open', JSON.stringify(sessies));
check('de knop wijst naar wat er nog ligt',
  (await tekst('.hero .knop.primair')).toLowerCase().includes('invullen'),
  await tekst('.hero .knop.primair'));

// Nu de kwalificatie invullen: die moet omslaan, de race niet.
await page.evaluate((uit) => {
  const db = globalThis.__db;
  db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1',
                    question_id: 'quali_top10', waarde: uit });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, UIT);
await page.reload();
await page.waitForSelector('.hero');

const na = await page.$$eval('.sessie', (n) => n.map((e) =>
  ({ naam: e.textContent.trim().replace(/^[^a-z]*/, ''), staat: e.className.replace('sessie ', '') })));
check('een ingevulde sessie slaat om naar klaar',
  na.find((x) => x.naam === 'kwalificatie')?.staat === 'klaar', JSON.stringify(na));
check('en de andere blijft open', na.find((x) => x.naam === 'race')?.staat === 'open');

// Dit is de valkuil: de eerstvolgende deadline is de kwalificatie, en die is
// af. De knop moet dan naar de race wijzen en niet "bekijken" zeggen.
check('de knop wijst naar de race, niet naar de sessie die al af is',
  (await tekst('.hero .knop.primair')) === 'Top 10 race invullen',
  await tekst('.hero .knop.primair'));

// ---- 3. hoe sta ik ervoor -----------------------------------------
const voet = await page.$$eval('.kaartvoet span', (n) => n.map((e) => e.textContent.trim()));
check('de kaart sluit af met je positie, je punten en je vorige weekend',
  voet.length === 3, JSON.stringify(voet));
check('de positie staat erbij als plek van totaal',
  /^2e/.test(voet[0]) && voet[0].includes('van 2'), voet[0]);
check('en het laatste weekend als een plus',
  /^\+\d+/.test(voet[2]), voet[2]);

// In je eentje spelen heeft geen stand: "1e van 1" is geen informatie.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((m) => m.member_id !== 'lid-2');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.hero');
check('in je eentje staat er geen stand, want "1e van 1" zegt niets',
  (await page.$('.kaartvoet')) === null);

// ---- de automaat telt niet als ingevuld ---------------------------
// Automatisch invullen zet een lijst neer die je niet zelf koos. Hier zeggen
// dat je klaar bent is precies de verkeerde geruststelling.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.answers = db.answers.filter((a) => !(a.race_id === 2 && a.question_id === 'quali_top10'));
  db.pools[0].autofill_vanaf = new Date(Date.now() - 100 * 3600e3).toISOString();
  db.races[1].deadline_quali = new Date(Date.now() - 1e6).toISOString();
  db.races[1].deadline_race = new Date(Date.now() + 36e5).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.hero');
const metAuto = await page.$$eval('.sessie', (n) => n.map((e) =>
  ({ naam: e.textContent.trim().replace(/^[^a-z]*/, ''), staat: e.className.replace('sessie ', '') })));
const kwali = metAuto.find((x) => x.naam.startsWith('kwalificatie'));
check('een automatisch aangevulde lijst telt niet als door jou ingevuld',
  kwali?.staat === 'auto', JSON.stringify(metAuto));
// En hij heet ook niet "deels": dat zou suggereren dat je zelf begonnen was.
check('hij krijgt zijn eigen woord op de kaart',
  kwali?.naam.includes('automatisch'), kwali?.naam);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
