// Het racescherm in tegels, en de zijbalk erbij.
//
// Aanleiding: een voorbeeld van hoe de uitslag eruit zou kunnen zien ("ik
// heb een voorbeeldje gemaakt welke richting we opkunnen"), met de vraag dat
// ook op het voorspelscherm toe te passen.
//
// Wat hier vastligt:
//   1. De kop van een race heeft de vlag van het land en zegt wat je er ziet
//      ("jouw uitslag", "voorspellen"). Zonder bekend land geen vlag.
//   2. De uitslag: je punten groot bovenaan, met hoeveel je er exact had.
//      Daaronder je voorspelling als tabel met achternamen, waar hij werd en
//      wat het opleverde; exact goed krijgt een pilletje. De losse vragen
//      staan onderin dezelfde kaart.
//   3. De poule ernaast: op punten, jij gemarkeerd en geen knop, de rest wel,
//      en een knop naar de poulestand. In je eentje geen poule.
//   4. Het voorspelscherm in dezelfde tegels: je top 10 met een teller en een
//      balkje dat volloopt, de losse vragen met hoeveel je er hebt, en wie van
//      de poule al iets heeft ingeleverd voor dit tabblad. Wát ze kozen blijft
//      geheim tot de deadline, dus daar zijn de namen geen knop.
//   5. De zijbalk: een pictogram per onderdeel (alleen op een breed scherm),
//      de poulecode met een kopieerknop, en je eigen naam als knop naar je
//      profiel.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor } from './hulp.mjs';

const { check, afronden } = maakControle('het racescherm in tegels');
const { page, jsFouten, stoppen } = await startPagina();
await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
await page.setViewportSize({ width: 1366, height: 900 });
await meedoen(page);

// Melbourne gereden: VER NOR LEC RUS PIA HAM ANT ALO GAS STR.
// Mijn lijst: VER LEC NOR RUS PIA HAM ALO ANT GAS COL. Vijf exact (VER, RUS,
// PIA, HAM, GAS), vier één plek ernaast, COL reed niet mee.
// Joe had alles goed, Pipo deed niets. Shanghai staat nog open; Joe heeft
// daar zijn kwalificatie al ingeleverd, de race nog niet.
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
const MIJN = ['1', '16', '4', '63', '81', '44', '14', '12', '10', '43'];
await page.evaluate(({ uit, mijn }) => {
  const db = globalThis.__db;
  for (const [i, naam] of ['Joe', 'Pipo'].entries())
    db.pool_members.push({ member_id: `lid-${i + 2}`, pool_id: 'pool-1', display_name: naam, user_id: `iemand-${i}` });
  const [mel, sha] = db.races;
  mel.country = 'Australia'; sha.country = 'China';
  mel.quali_result = uit;
  mel.deadline_quali = new Date(Date.now() - 6e6).toISOString();
  db.answers.push({ pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-1', question_id: 'quali_top10', waarde: mijn });
  db.answers.push({ pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-1', question_id: 'pole', waarde: '1' });
  db.answers.push({ pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-2', question_id: 'quali_top10', waarde: uit });
  db.answers.push({ pool_id: 'pool-1', race_id: mel.id, member_id: 'lid-2', question_id: 'pole', waarde: '1' });
  sha.deadline_quali = new Date(Date.now() + 30 * 36e5).toISOString();
  sha.deadline_race = new Date(Date.now() + 50 * 36e5).toISOString();
  db.answers.push({ pool_id: 'pool-1', race_id: sha.id, member_id: 'lid-2', question_id: 'quali_top10', waarde: uit });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { uit: UIT, mijn: MIJN });
await page.reload();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const teksten = (kies) => page.$$eval(kies, (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));

// ---- 1. de kop ----------------------------------------------------------------------------
await openRace(page, 'Melbourne');
await page.click('[data-tab="quali"]');
await page.waitForSelector('.voorspelkaart');
const vlag = await page.$eval('.landvlag', async (img) => {
  if (!img.complete) await new Promise((r) => { img.onload = img.onerror = r; });
  return { src: img.getAttribute('src'), breed: img.naturalWidth };
}).catch(() => null);
check('de kop heeft de vlag van het land, en die laadt ook',
  vlag?.src?.endsWith('vlaggen/au.svg') && vlag.breed > 0, JSON.stringify(vlag));
check('en zegt wat je hier ziet: jouw uitslag', (await tekst('.dsub')) === 'jouw uitslag', await tekst('.dsub'));

// ---- 2. de uitslag ------------------------------------------------------------------------
const punten = await teksten('.voorspelkaart > .strip > .sr .pts');
const poleRij = await page.$('.voorspelkaart .tegelvoet .sr');
const polePunten = poleRij ? Number(await poleRij.$eval('.pts', (e) => e.textContent)) || 0 : null;
const som = punten.reduce((a, p) => a + (Number(p) || 0), 0) + (polePunten ?? 0);
check('je punten groot bovenaan: de top 10 en de pole bij elkaar opgeteld',
  (await tekst('.scorekaart .getal')) === String(som) && polePunten > 0,
  `${await tekst('.scorekaart .getal')} tegen ${som} (pole ${polePunten})`);
check('met hoeveel je er exact had', (await tekst('.scoretekst')).includes('5 van 10 exact voorspeld'),
  await tekst('.scoretekst'));

check('de tabel heeft een kop: voorspeld, coureur, uitslag, punten',
  (await teksten('.voorspelkaart .tabelkop span')).join(',') === 'voorspeld,coureur,uitslag,punten',
  (await teksten('.voorspelkaart .tabelkop span')).join(','));
const namen = await teksten('.voorspelkaart > .strip > .sr .drnaam');
check('de coureurs staan er met hun achternaam, niet met een code',
  namen.slice(0, 3).join(',') === 'Verstappen,Leclerc,Norris' && namen[9] === 'Colapinto', namen.join(','));
check('met waar hij werd: Leclerc stond op P2 en werd P3',
  (await page.$eval('.voorspelkaart > .strip > .sr:nth-child(2) .werd', (e) => e.textContent.replace(/\s+/g, ' ').trim()))
    .endsWith('P3'));
const raak = await page.$$eval('.voorspelkaart > .strip > .sr', (els) => els.map((e) => ({
  raak: e.classList.contains('raak'), pil: !!e.querySelector('.exactpil') })));
check('de vijf exact goede regels zijn gemarkeerd, met een pilletje "exact"',
  raak.filter((r) => r.raak).length === 5 && raak.every((r) => r.raak === r.pil), JSON.stringify(raak));
check('en de rest niet', raak.slice(1, 3).every((r) => !r.raak && !r.pil));
check('de pole staat onderin dezelfde kaart',
  !!poleRij && (await poleRij.$eval('.code', (e) => e.textContent.trim())) === 'VER');

// ---- 3. de poule --------------------------------------------------------------------------
check('de poule ernaast, met de kwalificatie en de race erbij',
  (await tekst('.poulekaart h2')) === 'De poule'
    && (await tekst('.poulekaart .tegelsub')) === 'Kwalificatie · Melbourne', await tekst('.poulekaart .tegelkop'));
const volgorde = await teksten('.poulekaart .pouleregel .nm');
check('op punten: Joe (alles goed), dan jij, dan Pipo (niets)',
  volgorde.join(',') === 'Joe,Danny (jij),Pipo', volgorde.join(','));
check('jouw regel is gemarkeerd en geen knop: jouw inzending staat er al',
  (await page.$('.poulekaart div.pouleregel.mij')) !== null && (await page.$('.poulekaart button.mij')) === null);
check('de anderen wel, om hun inzending te bekijken',
  (await page.$$eval('.poulekaart button[data-bekijk]', (b) => b.length)) === 2);
check('wie niets deed staat er zonder punten, en met waarom',
  (await tekst('.poulekaart [data-bekijk="lid-3"]')).includes('niets ingevuld')
    && (await tekst('.poulekaart [data-bekijk="lid-3"] .t')) === '—', await tekst('.poulekaart [data-bekijk="lid-3"]'));
// Een check die zakt en niet een test die vastloopt, als de knop niets doet.
const naarStand = async () => {
  await page.click('.poulekaart [data-naar-stand]');
  await page.waitForSelector('[data-weergave="stand"][aria-current="true"]', { timeout: 3000 }).catch(() => {});
  return (await page.$('[data-weergave="stand"][aria-current="true"]')) !== null && (await page.$('.shell.detail')) === null;
};
check('"Bekijk poulestand" gaat naar de stand, en de race gaat dicht', await naarStand());

// ---- 4. het voorspelscherm ----------------------------------------------------------------
await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.waitForSelector('.grid10');
const balk = () => page.$eval('.voortgang', (e) => ({ breed: e.querySelector('i').style.width, af: e.classList.contains('af') }));
check('de kop zegt wat je hier doet: voorspellen', (await tekst('.dsub')) === 'voorspellen');
check('en heeft de vlag van dit land',
  (await (await page.$('.landvlag'))?.getAttribute('src'))?.endsWith('vlaggen/cn.svg'));
check('je top 10 in een eigen tegel, met een teller op nul',
  (await tekst('.toptegel h2')) === 'Jouw top 10' && (await tekst('.topkop .mono')) === '0/10');
check('en een leeg balkje', (await balk()).breed === '0%', JSON.stringify(await balk()));
await kiesVoor(page, '[data-plek="0"]');
check('één plek erbij: 1/10 en het balkje een tiende vol',
  (await tekst('.topkop .mono')) === '1/10' && (await balk()).breed === '10%' && !(await balk()).af,
  JSON.stringify(await balk()));

const ingevuld = async () => (await tekst('.vragentegel .tegelsub')).match(/^(\d+) van (\d+) ingevuld$/);
const voor = await ingevuld();
check('de losse vragen in een eigen tegel, met hoeveel je er hebt',
  (await tekst('.vragentegel h2')) === 'Losse vragen' && voor?.[1] === '0' && Number(voor?.[2]) > 0,
  await tekst('.vragentegel .tegelkop'));
await kiesVoor(page, '[data-vraagplek="pole"]');
const na = await ingevuld();
check('en die telt mee zodra je er een invult', na?.[1] === '1' && na?.[2] === voor?.[2], na?.[0]);

check('de poule: wie heeft er al ingeleverd voor de kwalificatie',
  (await tekst('.poulekaart .tegelsub')) === '1 van 3 ingeleverd', await tekst('.poulekaart .tegelsub'));
const status = async () => page.$$eval('.poulekaart .pouleregel', (els) => els.map((e) => ({
  nm: e.querySelector('.nm').textContent.replace(/\s+/g, ' ').trim(),
  st: e.querySelector('.zacht').textContent.trim(), klaar: e.classList.contains('klaar') })));
const s1 = await status();
check('Joe bovenaan, met een vinkje; jij en Pipo nog niet',
  s1[0].nm === 'Joe' && s1[0].st === 'ingeleverd' && s1[0].klaar
    && s1.slice(1).every((x) => x.st === 'nog niet' && !x.klaar), JSON.stringify(s1));
check('en de namen zijn geen knop: wat ze kozen is geheim tot de deadline',
  (await page.$('#paneel [data-bekijk]')) === null && (await page.$('.poulekaart button.pouleregel')) === null);
await page.click('[data-tab="race"]');
await page.waitForSelector('.poulekaart');
check('per tabblad: voor de race heeft Joe nog niets ingeleverd',
  (await tekst('.poulekaart .tegelsub')) === '0 van 3 ingeleverd'
    && (await status()).every((x) => x.st === 'nog niet'), JSON.stringify(await status()));

await page.click('[data-tab="quali"]');
await page.waitForSelector('.grid10');
await kiesTien(page);
check('tien plekken: het balkje is vol en wordt groen',
  (await tekst('.topkop .mono')) === '10/10' && (await balk()).breed === '100%' && (await balk()).af,
  JSON.stringify(await balk()));
await page.click('#opslaan');
await page.waitForSelector('[data-race]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="quali"]');
await page.waitForSelector('.poulekaart');
check('na opslaan sta jij er ook als ingeleverd bij',
  (await tekst('.poulekaart .tegelsub')) === '2 van 3 ingeleverd'
    && (await status()).find((x) => x.nm.startsWith('Danny'))?.st === 'ingeleverd', JSON.stringify(await status()));
check('ook hier gaat "Bekijk poulestand" naar de stand', await naarStand());

// ---- 5. de zijbalk ------------------------------------------------------------------------
const nav = await page.$$eval('.zijbalk .navknop', (els) => els.map((e) => ({
  svg: !!e.querySelector('.navicoon svg'), tekst: e.textContent.trim(),
  zichtbaar: !!e.querySelector('.navicoon') && getComputedStyle(e.querySelector('.navicoon')).display !== 'none' })));
check('elk onderdeel in de zijbalk heeft een pictogram',
  nav.length === 4 && nav.every((n) => n.svg && n.zichtbaar), JSON.stringify(nav));
check('en de knoptekst is nog gewoon het woord', nav.map((n) => n.tekst).join(',') === 'Races,Stand,Poule,Profiel',
  nav.map((n) => n.tekst).join(','));

check('naast de poulecode staat een kopieerknop',
  (await page.getAttribute('#kopieerCode', 'aria-label')) === 'Kopieer de poulecode');
await page.click('#kopieerCode');
await page.waitForSelector('#kopieerCode.klaar');
check('die zet de code op het klembord', (await page.evaluate(() => navigator.clipboard.readText())) === 'RTM026');
check('en zegt dat het gelukt is', (await page.getAttribute('#kopieerCode', 'aria-label')) === 'Gekopieerd');
await page.waitForSelector('#kopieerCode:not(.klaar)', { timeout: 5000 }).catch(() => {});
check('even later staat hij weer klaar voor de volgende keer',
  (await page.getAttribute('#kopieerCode', 'aria-label')) === 'Kopieer de poulecode'
    && !(await page.$('#kopieerCode.klaar')));
// Geen klembord (een oudere browser, geen https): dan wordt de code
// geselecteerd, zodat je hem zelf kunt kopiëren.
await page.evaluate(() => {
  navigator.clipboard.writeText = () => Promise.reject(new Error('geen klembord'));
  document.execCommand = () => false;
  getSelection().removeAllRanges();
});
await page.click('#kopieerCode');
await page.waitForFunction(() => document.querySelector('#kopieerCode').getAttribute('aria-label') !== 'Kopieer de poulecode');
check('lukt kopiëren niet, dan staat de code geselecteerd om zelf te kopiëren',
  (await page.evaluate(() => getSelection().toString().trim())) === 'RTM026'
    && (await page.getAttribute('#kopieerCode', 'aria-label')) === 'Kopiëren lukt niet, selecteer hem zelf',
  await page.evaluate(() => getSelection().toString()));

check('je eigen naam onderin is een knop, met een pijltje',
  (await page.$('.zijbalk button.zijspeler .pijltje svg')) !== null
    && (await page.getAttribute('.zijspeler', 'aria-label')).startsWith('Danny, '));
await page.click('.zijspeler');
await page.waitForSelector('[data-weergave="profiel"][aria-current="true"]', { timeout: 3000 }).catch(() => {});
check('en brengt je naar je profiel', (await page.$('[data-weergave="profiel"][aria-current="true"]')) !== null);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForSelector('.nav .navknop');
check('op een telefoon geen pictogrammen in de balk onderin: daar is het te krap',
  await page.$$eval('.nav .navicoon', (els) => els.every((e) => getComputedStyle(e).display === 'none')));

// ---- 3b. in je eentje ---------------------------------------------------------------------
await page.setViewportSize({ width: 1366, height: 900 });
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pool_members = db.pool_members.filter((l) => l.member_id === 'lid-1');
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await openRace(page, 'Melbourne');
await page.click('[data-tab="quali"]');
await page.waitForSelector('.voorspelkaart');
check('in je eentje valt er niets te vergelijken: geen poule op de uitslag', (await page.$('.poulekaart')) === null);
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('.grid10');
check('en ook niet op het voorspelscherm', (await page.$('.poulekaart')) === null);

check('geen JavaScript-fouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
