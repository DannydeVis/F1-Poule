// De seizoenslaag: vier vragen die je vóór de eerste race invult en die pas
// aan het eind van het jaar gescoord worden.
//
// Het laatste punt uit groep 4 op de contrair-multiplier na. Net als bij de
// sprint is de vraag niet "werkt het" maar "wat doet het met een poule die al
// loopt", en het antwoord is hetzelfde: niets. Het zijn vragen, dus een poule
// die ze niet gekozen heeft ziet ze nooit — en een poule waar de eerste race
// al gereden is kan ze niet meer invullen.
//
// Wat hier vastligt:
//   1. Het blok staat er alleen als de poule deze vragen stelt.
//   2. Invullen kan zolang de eerste race nog niet begonnen is.
//   3. Wat je ingevuld hebt ligt daarna vast, en de database weigert een
//      wijziging ook echt.
//   4. Maar wat je nog níét had ingevuld mag je alsnog invullen, ook als het
//      seizoen al loopt. Dat is er voor wie halverwege instapt: die heeft de
//      gemiste races al als achterstand, en honderdvijftig punten die hij
//      onmogelijk kon halen is een tweede straf voor hetzelfde.
//   5. Zolang het seizoen loopt worden ze niet gescoord. Een halve WK-stand
//      is geen kampioen.
//   6. Aan het eind worden ze gescoord uit de races zelf, sprintpunten
//      inbegrepen, en tellen ze mee in de stand.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('de seizoenslaag');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const naarStand = async () => {
  await page.click('[data-weergave="stand"]');
  await page.waitForSelector('.seizoenslaag, .strij');
};

await meedoen(page);

// --- 1. uit is uit --------------------------------------------------------
// De poule kiest geen vragen, dus alles staat aan. Even een poule die alleen
// de twee top-tienen doet, om te zien dat het blok dan wegblijft.
await page.evaluate(() => {
  const db = globalThis.__db;
  for (const q of ['quali_top10', 'race_top10']) {
    db.pool_questions.push({ pool_id: 'pool-1', question_id: q });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
check('een poule zonder seizoensvragen ziet er niets van',
  (await page.$('.seizoenslaag')) === null);

// --- 2. en nu wel ---------------------------------------------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_questions = db.pool_questions.filter((r) => r.pool_id !== 'pool-1');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
check('met de vragen aan staat het blok er wel',
  (await page.$('.seizoenslaag')) !== null);
const velden = await page.$$eval('[data-seizoenvraag]', (n) =>
  n.map((e) => e.dataset.seizoenvraag));
check('alle vier de vragen staan er',
  velden.length === 4 && velden.includes('kampioen') && velden.includes('constructeur')
  && velden.includes('winnaars') && velden.includes('vierde_team'),
  velden.join(', '));
check('en de kop zegt dat ze nog open staan',
  (await tekst('.seizoenslaag .label')).includes('nog in te vullen'),
  await tekst('.seizoenslaag .label'));

// Verstappen kampioen, McLaren de titel, acht verschillende winnaars, Aston
// vierde. De eerste twee kloppen straks, de andere twee niet.
await page.selectOption('[data-seizoenvraag="kampioen"]', '1');
await page.selectOption('[data-seizoenvraag="constructeur"]', 'McLaren');
await page.fill('[data-seizoenvraag="winnaars"]', '8');
await page.selectOption('[data-seizoenvraag="vierde_team"]', 'Aston');
await page.click('#seizoenOpslaan');
await page.waitForSelector('.melding');
check('opslaan zegt dat het gelukt is',
  (await tekst('.melding')).includes('seizoensvragen'), await tekst('.melding'));

const bewaard = await page.evaluate(() => globalThis.__db.answers
  .filter((a) => ['kampioen', 'constructeur', 'winnaars', 'vierde_team']
    .includes(a.question_id))
  .map((a) => `${a.question_id}=${a.waarde}@${a.race_id}`).sort());
check('en alle vier de antwoorden staan in de database, op ronde 1',
  bewaard.length === 4 && bewaard.every((x) => x.endsWith('@1')), bewaard.join(' '));

// --- 4. tijdens het seizoen wordt er niets gescoord -----------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  // Melbourne gereden, de rest nog niet.
  Object.assign(db.races[0], { deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: uitslag, race_result: uitslag });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
check('zodra de eerste race begonnen is staat het formulier dicht',
  (await page.$('[data-seizoenvraag]')) === null);
check('en zegt het blok dat er nog niets te scoren valt',
  (await tekst('.seizoenslaag .label')).includes('wordt gescoord'),
  await tekst('.seizoenslaag .label'));
const halverwege = await page.$$eval('.seizoenvraag .ptn', (n) =>
  n.map((e) => e.textContent.trim()));
check('en er staat bij elke vraag een streepje in plaats van een getal',
  halverwege.every((x) => x === '—'), halverwege.join(' '));

// (Dat de database zo'n wijziging óók weigert, en niet alleen dit scherm,
// staat in test/seizoenslaag.test.sql: de trigger poule_antwoord_deadline()
// heeft een eigen tak voor sessie 'seizoen'. Hier gaat het erom dat je er op
// het scherm niet meer bij kunt. De nabootsing dwingt geen deadlines af, dus
// wat hieronder getest wordt is de regel van de app zelf.)

// --- 4b. wie nog niets had mag alsnog ------------------------------------
// De streep geldt per antwoord en niet per seizoen. Iemand die halverwege
// instapt heeft niets ingevuld, en die hoort gewoon te kunnen kiezen.
//
// Nagebootst door één antwoord uit de database te halen: precies de toestand
// van een speler die deze vraag nooit beantwoord heeft.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.answers = db.answers.filter((a) => a.question_id !== 'constructeur');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();

const open = await page.$$eval('[data-seizoenvraag]', (n) =>
  n.map((e) => e.dataset.seizoenvraag));
check('de vraag die je nog niet had is weer in te vullen',
  open.length === 1 && open[0] === 'constructeur', open.join(', '));
check('en de drie die je wél had blijven dicht',
  (await page.$$('.seizoenvraag.klaar')).length === 3);
check('het blok zegt hoeveel er nog openstaat',
  (await tekst('.seizoenslaag .label')).includes('nog 1 in te vullen'),
  await tekst('.seizoenslaag .label'));
check('met de waarschuwing dat het nu meteen vastligt',
  (await tekst('.seizoenslaag')).includes('ligt meteen vast'),
  (await tekst('.seizoenslaag')).slice(0, 220));

await page.selectOption('[data-seizoenvraag="constructeur"]', 'McLaren');
await page.click('#seizoenOpslaan');
await page.waitForSelector('.melding');

const naLater = await page.evaluate(() => globalThis.__db.answers
  .filter((a) => a.question_id === 'constructeur')
  .map((a) => `${a.waarde}@${a.race_id}`));
check('invullen tijdens het seizoen komt gewoon in de database',
  naLater.length === 1 && naLater[0] === 'McLaren@1', naLater.join(' '));

await naarStand();
check('en daarna staat het formulier weer helemaal dicht',
  (await page.$('[data-seizoenvraag]')) === null);
check('met de kop die zegt dat alles ingevuld is',
  (await tekst('.seizoenslaag .label')).includes('wordt gescoord'),
  await tekst('.seizoenslaag .label'));

// --- 4c. een race die het seizoen tegenhoudt -----------------------------
// De seizoensvragen worden pas gescoord als élke race een uitslag heeft of
// afgelast is. Blijft er één hangen, dan komt die 150 punten er nooit en
// blijft "Begin aan het volgende seizoen" grijs -- zonder dat er iets misgaat
// waar je het aan ziet. Dat is precies het soort stilte waar dit blok tegen
// hoort te beschermen.
//
// Twee dagen na de deadline hoort hij nog te zwijgen: dan is de uitslag
// gewoon nog onderweg en zou elke zondagavond een waarschuwing opleveren.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (d) => new Date(Date.now() + d * 864e5).toISOString();
  db.races[1].deadline_quali = u(-3);
  db.races[1].deadline_race = u(-2);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
check('twee dagen na de deadline zegt hij nog niets',
  !(await tekst('.seizoenslaag')).includes('niet afgelast'),
  (await tekst('.seizoenslaag')).slice(0, 160));

// Tien dagen later wel.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (d) => new Date(Date.now() + d * 864e5).toISOString();
  db.races[1].deadline_quali = u(-11);
  db.races[1].deadline_race = u(-10);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
const klem = await tekst('.seizoenslaag');
check('een week na de deadline meldt hij de race bij naam',
  klem.includes('niet afgelast'), klem.slice(0, 220));
check('en noemt hem bij naam, zodat je weet waar je moet zijn',
  klem.includes(await page.evaluate(() => globalThis.__db.races[1].name)),
  klem.slice(0, 220));

// Afgelast is geen probleem: daar komt nooit meer een uitslag van, en dat
// houdt het seizoen dus ook niet tegen.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[1].afgelast = true;
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();
check('een afgelaste race houdt het seizoen niet tegen',
  !(await tekst('.seizoenslaag')).includes('niet afgelast'),
  (await tekst('.seizoenslaag')).slice(0, 160));

await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (d) => new Date(Date.now() + d * 864e5).toISOString();
  db.races[1].afgelast = false;
  db.races[1].deadline_quali = u(20);
  db.races[1].deadline_race = u(21);
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();

// --- 5. en aan het eind wordt er gescoord ---------------------------------
// Alle drie de races gereden. Verstappen (1) wint er twee en Norris (4) één,
// dus Verstappen is kampioen. Red Bull heeft Verstappen en Hadjar (6).
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const drivers = db.races[0].drivers;
  const a = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  const b = ['4', '1', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[1], { drivers, deadline_quali: u(-40), deadline_race: u(-39),
    quali_result: a, race_result: a });
  Object.assign(db.races[2], { drivers, deadline_quali: u(-30), deadline_race: u(-29),
    quali_result: b, race_result: b });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarStand();

check('met het seizoen erop zegt het blok hoeveel het opleverde',
  /\d+ punten/.test(await tekst('.seizoenslaag .label')), await tekst('.seizoenslaag .label'));
const blok = await tekst('.seizoenslaag');
check('de kampioen is goed voorspeld en telt voor 50',
  blok.includes('Max Verstappen'), blok.slice(0, 200));
check('en het scherm zet erbij wat het werkelijk werd',
  blok.includes('het werd'), blok.slice(0, 200));

const perVraag = await page.$$eval('.seizoenvraag', (n) => n.map((e) => [
  e.querySelector('.nm').textContent.replace(/\s+/g, ' ').trim(),
  e.querySelector('.ptn').textContent.trim()]));
const punt = (naam) => perVraag.find(([nm]) => nm.startsWith(naam))?.[1];
check('wereldkampioen: goed, dus 50', punt('wereldkampioen') === '50',
  JSON.stringify(perVraag));
// McLaren wint de titel en niet Red Bull: Norris wordt tweede, tweede en
// eerste, en Piastri pakt er in elke race nog tien bij. Twee races winnen met
// één coureur is niet genoeg als de andere er niets bij doet.
check('constructeurstitel: McLaren, dus 40',
  punt('constructeurstitel') === '40', JSON.stringify(perVraag));
check('verschillende winnaars: er waren er 2 en je zei 8, dus 0',
  punt('verschillende winnaars') === '0', JSON.stringify(perVraag));
check('vierde team: niet Aston, dus 0', punt('vierde team') === '0',
  JSON.stringify(perVraag));

const stand = Number(await tekst('.strij .t'));
check('en die 90 punten zitten in de seizoensstand',
  stand >= 90, `${stand} punten`);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
