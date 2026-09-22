// Contrair voorspellen: een goed antwoord dat bijna niemand gaf telt zwaarder.
//
// Het probleem waar dit voor bestaat: als iedereen bij "wie wint" dezelfde
// naam invult, maakt die vraag nul verschil in de stand. Iedereen krijgt
// hetzelfde, of iedereen krijgt niets — de vraag kost ruimte op het scherm en
// levert geen spanning op.
//
// Het laatste punt uit groep 4, en het enige dat de puntentelling van een
// bestaande poule echt verandert. Dus krijgt het dezelfde streep als de
// jokers: een moment in plaats van een vinkje.
//
// Wat hier vastligt:
//   1. Uit is uit: de punten zijn precies wat ze waren.
//   2. Aan, en iedereen zei hetzelfde: nog steeds precies wat ze waren.
//   3. Aan, en jij was de enige die het goed had: bijna dubbel.
//   4. De formule uit ROUTEKAART.md, nagerekend op een concrete poule.
//   5. De top 10 blijft erbuiten.
//   6. Geen terugwerkende kracht.
//   7. Het scherm zegt waarom een getal anders is dan het puntenaantal.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('contrair voorspellen');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const rij = (naam) => `[data-race]:has(.nm:text-is("${naam}"))`;
const punten = async (naam) =>
  Number((await tekst(`${rij(naam)} .st`)).match(/(\d+) ptn/)?.[1] ?? -1);
const naarRaces = async () => {
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
};
// "Wie wint" is een racevraag, en een gereden weekend opent op de
// kwalificatie. Dus altijd even doorklikken naar de race-tab.
const openRaceTab = async (naam) => {
  await page.click(rij(naam));
  await page.waitForSelector('#paneel');
  await page.click('.tabs button[data-tab="race"]');
  await page.waitForSelector('#paneel');
};

await meedoen(page);

// Vier spelers, één gereden race. Niemand vult een top 10 in — dit gaat over
// de losse vragen. Danny en Michael zeggen Verstappen bij "wie wint", Casper
// en Davy zeggen Norris. Verstappen wint.
//
// Zonder contrair: Danny en Michael krijgen allebei 25.
// Met contrair:    2 van de 4 zeiden Verstappen, dus aandeel 0,5 en
//                  vermenigvuldiger 1 + (1 - 0,5) = 1,5 → 38 punten.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  // Ver terug, zodat hij straks aan de verkeerde kant van de streep ligt.
  Object.assign(db.races[0], { deadline_quali: u(-200), deadline_race: u(-199),
    quali_result: uitslag, race_result: uitslag });
  for (const [id, naam] of [['lid-2', 'Michael'], ['lid-3', 'Casper'], ['lid-4', 'Davy']]) {
    db.pool_members.push({ member_id: id, pool_id: 'pool-1', display_name: naam, user_id: null });
  }
  for (const [lid, keuze] of [['lid-1', '1'], ['lid-2', '1'], ['lid-3', '4'], ['lid-4', '4']]) {
    db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid,
                      question_id: 'winnaar', waarde: keuze });
  }
  db.pools[0].owner_member_id = 'lid-1';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarRaces();

// --- 1. uit is uit --------------------------------------------------------
check('zonder de knop levert de winnaar gewoon 25 punten op',
  (await punten('Melbourne')) === 25, await tekst(`${rij('Melbourne')} .st`));
await openRaceTab('Melbourne');
check('en er staat geen vermenigvuldiger bij',
  !(await tekst('#paneel')).includes('×'), await tekst('#paneel'));
await naarRaces();

// --- aanzetten ------------------------------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#contrairKnop');
check('de knop biedt aan om het aan te zetten',
  (await tekst('#contrairKnop')) === 'Zet aan');
await page.click('#contrairKnop');
await page.waitForSelector('.melding');
check('en de melding zegt erbij dat het vanaf nu geldt',
  (await tekst('.melding')).includes('vanaf nu'), await tekst('.melding'));

// --- 6. geen terugwerkende kracht ----------------------------------------
await naarRaces();
check('een race die al gereden was verandert niet',
  (await punten('Melbourne')) === 25, await tekst(`${rij('Melbourne')} .st`));

// --- 4. en nu een weekend van ná de streep -------------------------------
// De streep ligt nu op "zojuist", en alles wat gereden is ligt daarvoor. Dus
// zoals bij automatisch invullen: de streep honderd uur terugzetten, en
// Shanghai en Suzuka daarna laten vallen. Melbourne (-200 uur) blijft aan de
// verkeerde kant liggen en is de controle dat de streep echt werkt.
//
// Shanghai krijgt dezelfde verdeling als Melbourne: twee keer Verstappen,
// twee keer Norris.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  db.pools[0].contrair_vanaf = u(-100);
  Object.assign(db.races[1], { drivers: db.races[0].drivers,
    deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: uitslag, race_result: uitslag });
  for (const [lid, keuze] of [['lid-1', '1'], ['lid-2', '1'], ['lid-3', '4'], ['lid-4', '4']]) {
    db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: lid,
                      question_id: 'winnaar', waarde: keuze });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarRaces();
check('twee van de vier goed geeft ×1,5: 25 wordt 38',
  (await punten('Shanghai')) === 38, await tekst(`${rij('Shanghai')} .st`));
check('en Melbourne, van vóór de streep, blijft 25',
  (await punten('Melbourne')) === 25, await tekst(`${rij('Melbourne')} .st`));

// --- 7. en het scherm legt uit waarom ------------------------------------
await openRaceTab('Shanghai');
const paneel = await tekst('#paneel');
check('het scherm noemt de vermenigvuldiger',
  paneel.includes('×1,5'), paneel.match(/winnaar[^·]*·[^·]*·[^·]*/)?.[0] ?? paneel.slice(0, 200));
check('en zegt hoeveel mensen hetzelfde zeiden',
  paneel.includes('2 van de 4 zeiden dit'), paneel.slice(0, 250));
await naarRaces();

// --- 3. in je eentje goed ------------------------------------------------
// Suzuka: alleen Danny zegt Verstappen, de andere drie zeggen Norris.
// Aandeel 1/4 = 0,25 → 1 + 0,75 = 1,75, afgerond op één decimaal ×1,8 →
// 25 × 1,8 = 45. Die afronding zit in de vermenigvuldiger zelf en niet pas in
// de weergave: het scherm toont ×1,8, dus er hoort ook met 1,8 gerekend te
// zijn — anders klopt je eigen telling niet als je hem naretelt.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[2], { drivers: db.races[0].drivers,
    deadline_quali: u(-30), deadline_race: u(-29),
    quali_result: uitslag, race_result: uitslag });
  for (const [lid, keuze] of [['lid-1', '1'], ['lid-2', '4'], ['lid-3', '4'], ['lid-4', '4']]) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: lid,
                      question_id: 'winnaar', waarde: keuze });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarRaces();
check('als enige goed geeft ×1,8: 25 wordt 45',
  (await punten('Suzuka')) === 45, await tekst(`${rij('Suzuka')} .st`));
await openRaceTab('Suzuka');
check('en het scherm zegt dat je de enige was',
  (await tekst('#paneel')).includes('je was de enige'),
  (await tekst('#paneel')).slice(0, 250));
await naarRaces();

// --- 2. iedereen hetzelfde: geen verschil --------------------------------
await page.evaluate(() => {
  const db = globalThis.__db;
  db.answers = db.answers.filter((a) => String(a.race_id) !== '3');
  for (const lid of ['lid-1', 'lid-2', 'lid-3', 'lid-4']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: lid,
                      question_id: 'winnaar', waarde: '1' });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarRaces();
check('als iedereen hetzelfde zei blijft het gewoon 25',
  (await punten('Suzuka')) === 25, await tekst(`${rij('Suzuka')} .st`));
await openRaceTab('Suzuka');
check('en dan staat er ook geen vermenigvuldiger bij',
  !(await tekst('#paneel')).includes('×'), (await tekst('#paneel')).slice(0, 200));
await naarRaces();

// --- 5. de top 10 blijft erbuiten ----------------------------------------
// Danny vult als enige een perfecte top 10 in voor Suzuka — een weekend van ná
// de streep, met contrair aan. Dat is de meest zeldzame inzending die er is,
// en hij hoort precies 50 op te leveren en geen cent meer.
await page.evaluate(() => {
  const db = globalThis.__db;
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  db.answers.push({ pool_id: 'pool-1', race_id: 3, member_id: 'lid-1',
                    question_id: 'race_top10', waarde: uitslag.slice(0, 10) });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await naarRaces();
check('een perfecte top 10 blijft 50 punten, ook al was je de enige',
  (await punten('Suzuka')) === 75, await tekst(`${rij('Suzuka')} .st`));

// --- uitzetten ------------------------------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#contrairKnop');
check('de knop biedt nu aan om het weer uit te zetten',
  (await tekst('#contrairKnop')) === 'Zet weer uit');
await page.click('#contrairKnop');
await page.waitForSelector('.melding');
await naarRaces();
check('uitzetten brengt de punten terug naar wat ze waren',
  (await punten('Shanghai')) === 25, await tekst(`${rij('Shanghai')} .st`));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
