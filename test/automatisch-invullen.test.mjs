// Automatisch invullen bij vergeten.
//
// Van de drie dingen die volgens ROUTEKAART.md een vriendenpoule slopen was
// "mensen vergeten in te vullen" de laatste die nog niet aangepakt was. Wie
// een weekend mist staat op nul, en twee gemiste weekenden is meestal het
// einde van je seizoen.
//
// Wat hier vastligt is vooral wat de regel NIET doet, want dat is het lastige
// deel. Hij geldt niet met terugwerkende kracht, hij levert geen weekendwinst
// op, en hij doet nergens alsof de lijst van de speler zelf komt.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('automatisch invullen bij vergeten');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const rij = (naam) => tekst(`[data-race]:has(.nm:text-is("${naam}")) .st`);
const punten = async (naam) => Number((await rij(naam)).match(/^(\d+) ptn/)?.[1] ?? -1);

await meedoen(page);

// Drie gereden races, elk met een eigen rol in dit verhaal:
//
//   Melbourne  ronde 1 — er is geen eerdere uitslag, dus geen WK-stand
//   Shanghai   ronde 2 — gereden vóór de streep
//   Suzuka     ronde 3 — gereden ná de streep, dit is de enige die meedoet
//
// Danny levert nergens iets in. Michael doet in Suzuka wél mee, want een
// weekend moet iemand kunnen winnen.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  const anders  = ['4', '1', '63', '16', '44', '81', '14', '12', '18', '10', '43', '6'];
  const drivers = db.races[0].drivers;

  Object.assign(db.races[0], { deadline_quali: u(-200), deadline_race: u(-199),
    quali_result: uitslag, race_result: uitslag });
  Object.assign(db.races[1], { deadline_quali: u(-150), deadline_race: u(-149),
    quali_result: uitslag, race_result: uitslag });
  // Suzuka loopt anders af dan het seizoen tot dan toe. Zonder dat verschil
  // zou de WK-stand de uitslag toevallig precies raken en zegt deze test
  // niets over wat een automatische lijst waard is.
  Object.assign(db.races[2], { drivers, deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: anders, race_result: anders });

  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1',
    display_name: 'Michael', user_id: null });
  db.pool_members.push({ member_id: 'lid-3', pool_id: 'pool-1',
    display_name: 'Casper', user_id: null });
  // Casper had het weekend wél door en levert de uitslag precies in. Hij is
  // de maatstaf: een automatische lijst hoort het van hem te verliezen.
  for (const vraag of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-3',
      question_id: vraag, waarde: anders.slice(0, 10) });
  }
  // Michael levert precies dezelfde lijst in als de automatische. Ze komen
  // dus op de punt gelijk uit, en of hij het weekend wint hangt nergens
  // anders van af dan van de regel zelf.
  for (const vraag of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-2',
      question_id: vraag, waarde: uitslag.slice(0, 10) });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// ---- uit staat uit ------------------------------------------------
check('zonder de knop levert een vergeten race gewoon nul op',
  (await punten('Suzuka')) === 0, await rij('Suzuka'));
check('en er staat nergens dat er iets automatisch ging',
  !(await tekst('#app')).includes('automatisch ingevuld'));

// ---- de poulebaas zet hem aan -------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#autofillKnop');
check('de knop biedt aan om het aan te zetten',
  (await tekst('#autofillKnop')) === 'Zet aan');

await page.click('#autofillKnop');
await page.waitForSelector('.melding');
const vanaf = await page.evaluate(() => globalThis.__db.pools[0].autofill_vanaf);
check('aanzetten bewaart een moment en geen vinkje',
  typeof vanaf === 'string' && Math.abs(Date.parse(vanaf) - Date.now()) < 6e4, String(vanaf));
check('en de melding zegt erbij dat het vanaf nu geldt',
  (await tekst('.melding')).includes('vanaf nu'), await tekst('.melding'));

// Dít is de kern: aanzetten verandert niets aan wat er al gereden is. De
// streep ligt op "nu", en alle drie de races liggen daarvoor.
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
check('aanzetten raakt geen enkele race die al gereden is',
  (await punten('Melbourne')) === 0 && (await punten('Shanghai')) === 0
  && (await punten('Suzuka')) === 0,
  `${await rij('Melbourne')} | ${await rij('Shanghai')} | ${await rij('Suzuka')}`);

// ---- en nu met de streep midden in het seizoen ---------------------
// Hetzelfde als hierboven, maar dan alsof de knop honderd uur geleden was
// omgezet: Suzuka valt er dan wel binnen, de andere twee niet.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pools[0].autofill_vanaf = new Date(Date.now() - 100 * 3600e3).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

check('een race van ná de streep wordt wel aangevuld',
  (await punten('Suzuka')) > 0, await rij('Suzuka'));
check('een race van vóór de streep blijft op nul',
  (await punten('Shanghai')) === 0, await rij('Shanghai'));
check('en de allereerste race ook, want daar is nog geen WK-stand voor',
  (await punten('Melbourne')) === 0, await rij('Melbourne'));

// De WK-stand als top 10 is met opzet een middelmatige voorspelling: genoeg
// om aangehaakt te blijven, te weinig om vergeten lonend te maken. Het exacte
// getal hangt af van hoe anders het weekend liep, dus de test vergelijkt hem
// met iemand die het wél goed had in plaats van met een vast aantal.
const auto = await punten('Suzuka');

await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
const stand = Object.fromEntries(await page.$$eval('.strij', (n) => n.map((e) => [
  e.querySelector('.nm').textContent.trim().replace(/\s*jij$/, ''),
  Number(e.querySelector('.t').textContent.trim())])));

check('de automatische lijst levert punten op', auto > 0, `${auto} punten`);
check('maar verliest het van iemand die het weekend zelf goed had',
  stand.Danny < stand.Casper, JSON.stringify(stand));
check('en precies dezelfde lijst levert precies dezelfde punten op, of je hem '
  + 'nu zelf koos of niet', stand.Danny === stand.Michael, JSON.stringify(stand));

// ---- maar je wint er geen weekend mee -----------------------------
// Michael heeft exact dezelfde lijst als de automatische, dus op de punt
// evenveel. Het enige verschil is dat hij hem zelf koos — en dat is precies
// wat hier het verschil moet maken.
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
const suzuka = await rij('Suzuka');
check('de weekendwinst gaat naar wie zelf invulde, niet naar de automaat',
  suzuka.includes('Casper') && !suzuka.includes('Danny'), suzuka);
check('en de Q- en R-vinkjes blijven leeg, want jij vulde niets in',
  (await page.$$eval('[data-race]:has(.nm:text-is("Suzuka")) .mk i.aan',
    (n) => n.length)) === 0);

// ---- en het zegt overal dat het automatisch ging -------------------
await page.click('[data-race]:has(.nm:text-is("Suzuka"))');
await page.waitForSelector('#paneel');
const paneel = await tekst('#paneel');
check('je eigen scherm zegt dat deze lijst niet van jou is',
  paneel.includes('automatisch ingevuld'), paneel.slice(0, 160));
check('en dat je zelf niets inleverde',
  paneel.includes('zelf niets ingeleverd'));

// De inkijk bij een ander: Michael deed wel mee, dus bij hem hoort het
// etiket er juist níét te staan.
await page.click('[data-bekijk="lid-2"]');
await page.waitForSelector('#inkijkterug');
check('bij een speler die wél invulde staat het etiket er niet',
  !(await tekst('#paneel')).includes('automatisch ingevuld'));

// ---- uitzetten haalt het echt weg ---------------------------------
await page.click('#inkijkterug');
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#autofillKnop');
check('de knop biedt nu aan om het weer uit te zetten',
  (await tekst('#autofillKnop')) === 'Zet weer uit');
check('en vertelt sinds wanneer het aanstaat',
  (await tekst('.veldblok:has(#autofillKnop), #autofillKnop')).length > 0);

await page.click('#autofillKnop');
await page.waitForSelector('.melding');
check('uitzetten wist het moment', (await page.evaluate(
  () => globalThis.__db.pools[0].autofill_vanaf)) === null);

await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
check('en de punten zijn meteen weer weg, er stond immers niets in de database',
  (await punten('Suzuka')) === 0, await rij('Suzuka'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
