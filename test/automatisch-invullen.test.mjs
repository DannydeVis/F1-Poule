// Automatisch invullen bij vergeten.
//
// Van de drie dingen die volgens ROUTEKAART.md een vriendenpoule slopen was
// "mensen vergeten in te vullen" de laatste die nog niet aangepakt was. Wie
// een weekend mist staat op nul, en twee gemiste weekenden is meestal het
// einde van je seizoen.
//
// Eerst kreeg wie vergat de WK-stand als top 10. Danny: "als mensen hun
// voorspelling niet hebben ingevuld worden er best wel wat goede coureurs
// bovenaan gezet. Het is beter om het totaal random neer te zetten." Nu is het
// een willekeurige top 10: vast per speler, race en sessie, en voor races van
// vóór die wijziging blijft het de WK-stand, zodat er niets achteraf verschuift.
//
// Wat hier vastligt is vooral wat de regel NIET doet, want dat is het lastige
// deel. Hij geldt niet met terugwerkende kracht, hij levert geen weekendwinst
// op, en hij doet nergens alsof de lijst van de speler zelf komt.
//
// De testbrowser staat op een vaste datum (15 oktober 2026), ruim na de
// overstap naar willekeurig op 25 september: zo hangt wat de test ziet niet af
// van de dag waarop hij draait.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('automatisch invullen bij vergeten');
const NU = new Date('2026-10-15T12:00:00Z');
const { page, jsFouten, stoppen } = await startPagina({
  voorafAan: (p) => p.clock.setFixedTime(NU),
});

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const rij = (naam) => tekst(`[data-race]:has(.nm:text-is("${naam}")) .st`);
const punten = async (naam) => Number((await rij(naam)).match(/^(\d+) ptn/)?.[1] ?? -1);
const naarRaces = async () => {
  await page.click('[data-weergave="races"]');
  if (await page.$('#terug')) await page.click('#terug');
  await page.waitForSelector('[data-race]');
};
// De top 10 zoals hij op het racescherm staat, als rugnummers: van jezelf, of
// van een ander via de poule ernaast.
const lijstOpScherm = async (race, tab, wie = null) => {
  await naarRaces();
  await page.click(`[data-race]:has(.nm:text-is("${race}"))`);
  await page.waitForSelector('#paneel');
  if (await page.$(`[data-tab="${tab}"]`)) await page.click(`[data-tab="${tab}"]`);
  await page.waitForSelector('.voorspelkaart, .leeg', { timeout: 3000 }).catch(() => {});
  if (wie) {
    await page.click(`[data-bekijk="${wie}"]`);
    await page.waitForSelector('#inkijkterug');
  }
  const codes = await page.$$eval('#paneel .strip .sr .code', (n) => n.map((e) => e.textContent.trim()));
  const nummers = await page.evaluate((cs) => {
    const drivers = globalThis.__db.races[0].drivers;
    return cs.map((c) => String(drivers.find((d) => d.code === c)?.nr ?? '?'));
  }, codes);
  return nummers;
};

await meedoen(page);

// Drie gereden races, elk met een eigen rol in dit verhaal:
//
//   Melbourne  ronde 1 — gereden vóór de streep
//   Shanghai   ronde 2 — gereden vóór de streep
//   Suzuka     ronde 3 — gereden ná de streep, dit is de enige die meedoet
//
// Danny en Pipo leveren nergens iets in. Casper had Suzuka precies goed.
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
  Object.assign(db.races[2], { drivers, deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: anders, race_result: anders });

  db.pool_members.push({ member_id: 'lid-2', pool_id: 'pool-1', display_name: 'Michael', user_id: null });
  db.pool_members.push({ member_id: 'lid-3', pool_id: 'pool-1', display_name: 'Casper', user_id: null });
  db.pool_members.push({ member_id: 'lid-4', pool_id: 'pool-1', display_name: 'Pipo', user_id: null });
  // Casper had het weekend wél door en levert de uitslag precies in. Hij is
  // de maatstaf: een automatische lijst hoort het van hem te verliezen.
  for (const vraag of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-3',
      question_id: vraag, waarde: anders.slice(0, 10) });
  }
  // Michael vult iets in dat niets oplevert; verderop krijgt hij precies de
  // automatische lijst van Danny.
  for (const vraag of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-2',
      question_id: vraag, waarde: ['43', '6', '18', '10', '14', '12', '81', '44', '16', '63'] });
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
check('en zegt dat het een willekeurige top 10 wordt',
  (await tekst('.scheiding + .label + p, #app')).includes('willekeurige top 10'));

await page.click('#autofillKnop');
await page.waitForSelector('.melding');
const vanaf = await page.evaluate(() => globalThis.__db.pools[0].autofill_vanaf);
check('aanzetten bewaart een moment en geen vinkje',
  typeof vanaf === 'string' && Math.abs(Date.parse(vanaf) - NU.getTime()) < 6e4, String(vanaf));
check('en de melding zegt erbij dat het vanaf nu geldt',
  (await tekst('.melding')).includes('vanaf nu'), await tekst('.melding'));

// Dít is de kern: aanzetten verandert niets aan wat er al gereden is. De
// streep ligt op "nu", en alle drie de races liggen daarvoor.
await naarRaces();
check('aanzetten raakt geen enkele race die al gereden is',
  (await punten('Melbourne')) === 0 && (await punten('Shanghai')) === 0
  && (await punten('Suzuka')) === 0 && !(await tekst('#app')).includes('automatisch'),
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
await page.waitForSelector('.shell');
await naarRaces();
check('een race van vóór de streep blijft op nul',
  (await punten('Shanghai')) === 0 && (await punten('Melbourne')) === 0,
  `${await rij('Melbourne')} | ${await rij('Shanghai')}`);

const dannyQ = await lijstOpScherm('Suzuka', 'quali');
const dannyR = await lijstOpScherm('Suzuka', 'race');
check('een race van ná de streep krijgt wel een lijst: tien verschillende coureurs van dat weekend',
  dannyQ.length === 10 && new Set(dannyQ).size === 10 && !dannyQ.includes('?'), dannyQ.join(','));
check('en het scherm zegt dat die lijst niet van jou is',
  (await tekst('#paneel')).includes('automatisch ingevuld'), (await tekst('#paneel')).slice(0, 160));

// ---- willekeurig, maar vast ------------------------------------------
// De WK-stand na Melbourne en Shanghai is precies hun uitslag. Dat was de oude
// lijst, met de beste coureurs bovenaan.
const WK = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
check('de lijst is willekeurig: niet de WK-stand met de beste coureurs bovenaan',
  dannyQ.join() !== WK.join() && dannyR.join() !== WK.join()
    && WK.slice(0, 3).filter((nr, i) => dannyQ[i] === nr).length < 3, `${dannyQ.join(',')} | ${dannyR.join(',')}`);
check('de kwalificatie en de race krijgen elk een eigen lijst', dannyQ.join() !== dannyR.join(),
  `${dannyQ.join(',')} | ${dannyR.join(',')}`);
const pipoQ = await lijstOpScherm('Suzuka', 'quali', 'lid-4');
check('en elke speler die vergat een eigen lijst', pipoQ.length === 10 && pipoQ.join() !== dannyQ.join(),
  `${dannyQ.join(',')} | ${pipoQ.join(',')}`);
await page.reload();
await page.waitForSelector('.shell');
check('herladen geeft precies dezelfde lijst, zodat de punten niet verschuiven',
  (await lijstOpScherm('Suzuka', 'quali')).join() === dannyQ.join());
// De volgorde waarin de coureurs in de database staan mag niet uitmaken: de
// sync schrijft de deelnemerslijst soms opnieuw weg.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.races[2].drivers = [...db.races[2].drivers].reverse();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.shell');
check('ook als de coureurs in een andere volgorde in de database staan',
  (await lijstOpScherm('Suzuka', 'quali')).join() === dannyQ.join());

// ---- wat het oplevert ----------------------------------------------
// Michael levert nu precies Danny's automatische lijsten in. Dan hoort hij op
// de punt evenveel te hebben: een automatische lijst telt als een gewone.
await page.evaluate(({ q, r }) => {
  const db = globalThis.__db;
  db.answers = db.answers.filter((a) => !(a.member_id === 'lid-2' && a.race_id === 3));
  db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-2', question_id: 'quali_top10', waarde: q });
  db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-2', question_id: 'race_top10', waarde: r });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
}, { q: dannyQ, r: dannyR });
await page.reload();
await page.waitForSelector('.shell');
await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
const stand = Object.fromEntries(await page.$$eval('.strij', (n) => n.map((e) => [
  e.querySelector('.nm').textContent.trim().replace(/\s*jij$/, ''),
  Number(e.querySelector('.t').textContent.trim())])));
check('een automatische lijst verliest het van iemand die het weekend zelf goed had',
  stand.Danny < stand.Casper, JSON.stringify(stand));
check('en precies dezelfde lijst levert precies dezelfde punten op, of je hem '
  + 'nu zelf koos of niet', stand.Danny === stand.Michael, JSON.stringify(stand));

// ---- maar je wint er geen weekend mee -----------------------------
await naarRaces();
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
await page.click('#inkijkterug');

// ---- de eerste race van het seizoen doet nu ook mee ---------------------
// De WK-stand bestond pas na één race, dus ronde 1 bleef leeg. Een
// willekeurige lijst heeft geen stand nodig.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.pools[0].autofill_vanaf = new Date(Date.now() - 300 * 3600e3).toISOString();
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.shell');
{
  const melbourne = await lijstOpScherm('Melbourne', 'quali');
  check('ook de eerste race van het seizoen krijgt een willekeurige lijst',
    melbourne.length === 10 && (await tekst('#paneel')).includes('automatisch ingevuld'), melbourne.join(','));
}

// ---- races van vóór de overstap houden de WK-stand ----------------------
// Shanghai op 10 september, ruim vóór 25 september: wie toen vergat kreeg de
// WK-stand, en dat blijft zo. Anders zouden punten die al in de stand stonden
// achteraf verschuiven.
await page.evaluate(() => {
  const db = globalThis.__db;
  Object.assign(db.races[0], { deadline_quali: '2026-08-29T12:00:00Z', deadline_race: '2026-08-30T12:00:00Z' });
  Object.assign(db.races[1], { deadline_quali: '2026-09-10T12:00:00Z', deadline_race: '2026-09-11T12:00:00Z' });
  db.pools[0].autofill_vanaf = '2026-09-01T00:00:00Z';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('.shell');
{
  const shanghai = await lijstOpScherm('Shanghai', 'quali');
  const suzukaNu = await lijstOpScherm('Suzuka', 'quali');
  check('een race van vóór de overstap houdt de WK-stand van toen',
    shanghai.join() === WK.join(), shanghai.join(','));
  check('en een race van erna blijft willekeurig, en hetzelfde als eerder',
    suzukaNu.join() === dannyQ.join(), `${suzukaNu.join(',')} | ${dannyQ.join(',')}`);
}

// ---- uitzetten haalt het echt weg ---------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#autofillKnop');
check('de knop biedt nu aan om het weer uit te zetten',
  (await tekst('#autofillKnop')) === 'Zet weer uit');

await page.click('#autofillKnop');
await page.waitForSelector('.melding');
check('uitzetten wist het moment', (await page.evaluate(
  () => globalThis.__db.pools[0].autofill_vanaf)) === null);

await naarRaces();
check('en de lijsten zijn meteen weer weg, er stond immers niets in de database',
  (await punten('Suzuka')) === 0 && !(await tekst('#app')).includes('automatisch'), await rij('Suzuka'));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
