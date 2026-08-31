// Een race die niet doorgegaan is.
//
// Sakhir en Jeddah 2026 zijn afgelast. Ze staan wel in de kalender van
// OpenF1, maar er bestaat geen enkele rij van, dus er komt nooit een uitslag.
// Zonder dit bleven ze eeuwig op "wacht op uitslag" staan — en dat is voor
// iemand in de poule niet te onderscheiden van een app die stuk is.
//
// Wat hier vastligt:
//   1. Hij zegt dat hij niet doorgegaan is, en niet dat de uitslag nog komt.
//   2. Er valt niets meer in te vullen, ook niet als de deadline nog loopt.
//   3. Hij telt niet mee als race waar je nog iets moet doen.
//   4. Wat er al ingevuld was blijft staan.
//   5. Een uitslag wint van de vlag: staat er tóch een uitslag, dan telt hij.

import { maakControle, startPagina, meedoen, openRace } from './hulp.mjs';

const { check, afronden } = maakControle('een afgelaste race');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const rij = (naam) => `[data-race]:has(.nm:text-is("${naam}"))`;

await meedoen(page);

// Een al ingevulde voorspelling voor Melbourne, zodat we kunnen zien dat die
// blijft staan als de race wordt afgelast.
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => x.name === 'Melbourne');
  globalThis.__db.answers.push({
    pool_id: 'pool-1', race_id: r.id, member_id: 'lid-1',
    question_id: 'quali_top10', waarde: r.drivers.slice(0, 10).map((d) => d.nr) });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');

check('een gewone race wacht gewoon op zijn uitslag of staat open',
  !(await tekst(rij('Melbourne'))).includes('niet doorgegaan'),
  await tekst(rij('Melbourne')));

// --- en nu is hij afgelast ------------------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => x.name === 'Melbourne');
  r.afgelast = true;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');

check('de kalender zegt dat hij niet doorgegaan is',
  (await tekst(rij('Melbourne'))).includes('niet doorgegaan'),
  await tekst(rij('Melbourne')));
check('en hij is als afgelast gemarkeerd',
  (await page.$(`${rij('Melbourne')}.afgelast`)) !== null);

// De hero bovenaan wijst je naar de eerstvolgende race waar iets te doen is.
// Een afgelaste race hoort daar niet meer tussen te staan.
const hero = await page.$('.hero');
if (hero) {
  check('de eerstvolgende race is niet de afgelaste',
    !(await tekst('.hero')).toLowerCase().includes('melbourne'), await tekst('.hero'));
} else {
  check('de eerstvolgende race is niet de afgelaste', true, 'geen hero op dit scherm');
}

// --- het racescherm zelf --------------------------------------------------
await openRace(page, 'Melbourne');
check('het racescherm zegt waarom er niets gebeurt',
  (await tekst('#paneel')).includes('niet doorgegaan'), await tekst('#paneel'));
check('en niet dat de uitslag nog komt',
  !(await tekst('#paneel')).includes('uitslag volgt'), await tekst('#paneel'));
check('er valt niets meer in te vullen',
  (await page.$('[data-plek]')) === null);
check('wat je had ingevuld is niet weggegooid',
  (await page.evaluate(() => globalThis.__db.answers.some(
    (a) => a.question_id === 'quali_top10' && a.waarde?.length === 10))),
  JSON.stringify(await page.evaluate(() => globalThis.__db.answers.map((a) => a.question_id))));

// Zelf invullen mag nog: als hij tóch verreden blijkt, moet er een weg terug
// zijn. Dat is dezelfde knop als bij een gewone gesloten race.
check('je kunt hem alsnog zelf invullen als hij toch verreden is',
  (await page.$('#zelfinvullen')) !== null);

// --- een uitslag wint van de vlag ----------------------------------------
await page.evaluate(() => {
  const r = globalThis.__db.races.find((x) => x.name === 'Melbourne');
  r.race_result = r.drivers.map((d) => d.nr);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.reload();
await page.waitForSelector('[data-race]');
check('staat er tóch een uitslag, dan telt hij weer gewoon mee',
  !(await tekst(rij('Melbourne'))).includes('niet doorgegaan')
  && (await tekst(rij('Melbourne'))).includes('ptn'), await tekst(rij('Melbourne')));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
