// De losse vragen in beeld: de pole mis je niet meer.
//
// Aanleiding: Danny vulde op 31 oktober zijn top 10 van de kwalificatie in
// Mexico in, sloeg op, en kreeg een automatische pole ("Ik miste nu de vraag
// pole omdat ik vind dat dit niet duidelijk te zien is", 1 november). De pole
// was één grijze regel onder de top 10, onder de plakkende opslaanbalk, en de
// weekendkaart zette daarna een vinkje bij de kwalificatie met "Je inzending
// bekijken".
//
// Wat hier vastligt:
//   1. Een coureurvraag is een eigen blok zoals de safety cars: de vraag en
//      de punten erboven, een plek in de vorm van de top 10 met een
//      gestippelde amber rand zolang hij leeg is, en daaronder in amber wat
//      er te halen valt.
//   2. Zodra je iets kiest staat in de balk met Opslaan wat er nog open is,
//      met de punten, en die regel staat in beeld terwijl je bovenaan je top
//      10 zit (de pole zelf niet). Is het één coureurvraag, dan opent aantikken
//      meteen het keuzeblad; anders brengt het je naar de eerste open vraag.
//      Alles ingevuld: geen regel. Opslaan houdt hij niet tegen.
//   3. De bevestiging na opslaan noemt wat er nog open is: tot drie bij naam,
//      meer als aantal.
//   4. De weekendkaart: staat er een top 10 open, dan wijst de knop daarheen;
//      is die af maar staat er een losse vraag open, dan "Nog invullen: pole"
//      of "Losse vragen race invullen", en de race opent op dat tabblad.
//      Alles af: "Je inzending bekijken". Een antwoord dat de database alleen
//      als "ingeleverd" meegeeft, staat niet open.
//   5. In het Engels in het Engels; contrast in licht en donker; op 360
//      pixels geen horizontale scroll; geen javascriptfouten.

import { maakControle, startPagina, meedoen, openRace, kiesTien, kiesVoor, opPlek, naarLijst, CONTRAST }
  from './hulp.mjs';

const { check, afronden } = maakControle('de losse vragen in beeld');

const POLE = '[data-vraagplek="pole"]';
const BLOK = '[data-vraagblok="pole"]';

const tekstVan = (page) => async (kies) =>
  (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
// Staat dit element helemaal binnen het scherm, zonder te scrollen?
const inBeeld = (page, kies) => page.$eval(kies, (el) => {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= innerHeight;
});
const heroKnop = (page) => page.$eval('.hero [data-naar-race]', (b) => b.textContent.replace(/\s+/g, ' ').trim());
const actieveTab = (page) => page.$eval('[data-tab][aria-selected="true"]', (b) => b.dataset.tab);
const opslaanEnTerug = async (page) => {
  await page.click('#opslaan');
  await page.waitForSelector('.melding');
};
// De punten van alle losse vragen die nu leeg zijn, opgeteld uit hun kop: zo
// controleert de test de som en niet de vragenlijst van de nabootsing.
const openPunten = (page) => page.$$eval('.vragentegel [data-vraagblok]', (blokken) => blokken
  .filter((b) => {
    const knop = b.querySelector('[data-vraagplek]');
    if (knop) return knop.classList.contains('open');
    if (b.querySelector('[data-duel]')) return !b.querySelector('.duelknop.gekozen');
    return !b.querySelector('[data-extra].gekozen');
  })
  .reduce((som, b) => som + Number(b.querySelector('.winnaarkop .mono').textContent.match(/\d+/)[0]), 0));

// ---- 1 tot en met 4: het invulscherm en de weekendkaart -------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  const tekst = tekstVan(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await meedoen(page);
  await openRace(page, 'Melbourne');           // de kwalificatie staat open

  // --- 1. het blok -----------------------------------------------------------
  check('de pole is een eigen blok met de vraag en de punten erboven',
    (await tekst(`${BLOK} .winnaarkop`)) === 'wie pakt de pole? 10 punten', await tekst(`${BLOK} .winnaarkop`));
  check('met een lege plek in de vorm van de top 10, om aan te tikken',
    (await opPlek(page, POLE)) === '' && (await tekst(POLE)) === 'P tik om te kiezen'
      && (await page.$eval(POLE, (b) => b.classList.contains('open'))), await tekst(POLE));
  check('en daaronder in amber wat er te halen valt',
    (await tekst(`${BLOK} p.amber`)) === 'nog niets gekozen · hier liggen 10 punten');
  const rand = await page.$eval(POLE, (b) => {
    const s = getComputedStyle(b);
    const amber = getComputedStyle(b.parentElement.querySelector('p.amber')).color;
    const lijn = getComputedStyle(document.querySelector('.slot.leegplek')).borderTopColor;
    return { stijl: s.borderTopStyle, kleur: s.borderTopColor, amber, lijn, breed: b.getBoundingClientRect().width,
      blok: b.parentElement.getBoundingClientRect().width };
  });
  check('de lege plek heeft een gestippelde amber rand, anders dan een lege plek in de top 10',
    rand.stijl === 'dashed' && rand.kleur === rand.amber && rand.kleur !== rand.lijn, JSON.stringify(rand));
  check('en loopt over de hele breedte van het blok (geen zigzag)', rand.breed > rand.blok * 0.85,
    `${rand.breed} van ${rand.blok}`);
  check('op een leeg scherm staat er nog niets bij Opslaan', (await page.$('#nogopen')) === null);

  // --- 2. de regel bij Opslaan -------------------------------------------------
  await kiesVoor(page, '[data-plek="0"]');
  check('na de eerste keuze staat bij Opslaan wat er nog open is',
    (await tekst('#nogopen')) === 'nog open: pole · 10 punten →', await tekst('#nogopen'));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  check('die regel staat in beeld terwijl je bovenaan je top 10 zit',
    await inBeeld(page, '#nogopen'), JSON.stringify(await page.$eval('#nogopen', (e) => e.getBoundingClientRect())));
  check('en de pole zelf staat dan nog onder de rand van het scherm',
    !(await inBeeld(page, POLE)));
  check('de knop eronder zegt nog steeds wat er met de top 10 moet',
    (await tekst('#opslaan')) === 'Maak de top 10 af · nog 9', await tekst('#opslaan'));

  await page.click('#nogopen');
  await page.waitForSelector('#kiesblad');
  check('één coureurvraag open: aantikken opent meteen het keuzeblad van de pole',
    (await tekst('.kiesblad-kop')).includes('wie pakt de pole?'), await tekst('.kiesblad-kop'));
  await page.click('#kiesblad [data-kiesdrv="16"]');
  await page.waitForSelector('#kiesblad', { state: 'detached' });
  check('met een pole gekozen is de regel weg', (await page.$('#nogopen')) === null);
  check('en staat de keuze in het blok, zonder amber regel',
    (await opPlek(page, POLE)) === 'LEC' && (await page.$(`${BLOK} p.amber`)) === null
      && (await page.$eval(POLE, (b) => b.classList.contains('vol'))), await tekst(BLOK));
  check('de teller van de losse vragen telt hem mee',
    (await tekst('.vragentegel .tegelsub')) === '1 van 1 ingevuld', await tekst('.vragentegel .tegelsub'));

  await page.click(POLE);
  await page.waitForSelector('#kiesblad');
  await page.click('#kiesleeg');
  await page.waitForSelector('#kiesblad', { state: 'detached' });
  check('weer leeg gemaakt komt de regel terug', (await page.$('#nogopen')) !== null);

  // --- 3. opslaan, en de bevestiging ---------------------------------------
  await kiesTien(page);
  check('opslaan houdt hij niet tegen', (await tekst('#opslaan')) === 'Opslaan', await tekst('#opslaan'));
  await opslaanEnTerug(page);
  check('de bevestiging zegt wat er nog open is',
    (await tekst('.melding')) === 'Voorspelling voor Melbourne opgeslagen. Nog open: pole.', await tekst('.melding'));

  // --- 4. de weekendkaart --------------------------------------------------
  check('staat er nog een top 10 open, dan wijst de knop daarheen',
    (await heroKnop(page)) === 'Top 10 race invullen', await heroKnop(page));

  await openRace(page, 'Melbourne');
  await page.click('[data-tab="race"]');
  await kiesTien(page);
  await opslaanEnTerug(page);
  check('meer dan drie open: de bevestiging noemt het aantal',
    (await tekst('.melding')) === 'Voorspelling voor Melbourne opgeslagen. Nog 6 losse vragen open.',
    await tekst('.melding'));
  check('beide top 10s af en de pole open: de knop zegt het',
    (await heroKnop(page)) === 'Nog invullen: pole', await heroKnop(page));
  await page.click('.hero [data-naar-race]');
  await page.waitForSelector('#paneel');
  check('en opent de race op de kwalificatie', (await actieveTab(page)) === 'quali', await actieveTab(page));
  check('waar de regel bij Opslaan er meteen staat',
    (await tekst('#nogopen')) === 'nog open: pole · 10 punten →', await tekst('#nogopen'));
  await page.click('#nogopen');
  await page.waitForSelector('#kiesblad');
  await page.click('#kiesblad [data-kiesdrv="16"]');
  await page.waitForSelector('#kiesblad', { state: 'detached' });
  await opslaanEnTerug(page);
  check('niets meer open: de bevestiging is alleen de bevestiging',
    (await tekst('.melding')) === 'Voorspelling voor Melbourne opgeslagen.', await tekst('.melding'));
  check('daarna wijst de knop naar de losse vragen van de race',
    (await heroKnop(page)) === 'Losse vragen race invullen', await heroKnop(page));
  await page.click('.hero [data-naar-race]');
  await page.waitForSelector('#paneel');
  check('en opent de race op het racetabblad', (await actieveTab(page)) === 'race', await actieveTab(page));

  // --- 2. meer open vragen ---------------------------------------------------
  const som = await openPunten(page);
  check('meer vragen open: de regel noemt het aantal en de som van de punten',
    (await tekst('#nogopen')) === `nog 6 losse vragen open · ${som} punten →` && som > 0,
    `${await tekst('#nogopen')} (som ${som})`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  check('ook die staat in beeld bovenaan het scherm, de vraag zelf nog niet',
    (await inBeeld(page, '#nogopen')) && !(await inBeeld(page, '[data-vraagblok="winnaar"]')));
  // Een tik zoals op een telefoon, waar de regel staat. page.click() schuift
  // een plakkend element eerst naar zijn plek onderaan de inhoud, en dan
  // staat de vraag al in beeld voordat de app iets deed.
  const tik = () => page.$eval('#nogopen', (b) => b.click());
  await tik();
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-vraagblok="winnaar"]').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  }, null, { timeout: 3000 }).catch(() => {});
  check('aantikken brengt je naar de eerste open vraag',
    await inBeeld(page, '[data-vraagblok="winnaar"]'));
  check('zonder keuzeblad, met de focus op die vraag',
    (await page.$('#kiesblad')) === null
      && (await page.evaluate(() => document.activeElement?.dataset?.vraagplek)) === 'winnaar',
    await page.evaluate(() => document.activeElement?.outerHTML?.slice(0, 80)));

  await page.click('[data-extra="rode_vlag"][data-waarde="true"]');
  await page.click('.duelknop');
  check('de duels tellen als één, net als in de teller',
    (await tekst('#nogopen')).startsWith('nog 4 losse vragen open')
      && (await tekst('.vragentegel .tegelsub')) === '2 van 6 ingevuld',
    `${await tekst('#nogopen')} / ${await tekst('.vragentegel .tegelsub')}`);
  await page.click('[data-extra="safety_cars"][data-waarde="2"]');
  await opslaanEnTerug(page);
  check('tot drie open: de bevestiging noemt ze bij naam',
    (await tekst('.melding')) === 'Voorspelling voor Melbourne opgeslagen. Nog open: winnaar, snelste ronde en snelste pitstop.',
    await tekst('.melding'));

  await page.click('.hero [data-naar-race]');
  await page.waitForSelector('#paneel');
  await kiesVoor(page, '[data-vraagplek="winnaar"]');
  await kiesVoor(page, '[data-vraagplek="snelste_ronde"]');
  await kiesVoor(page, '[data-vraagplek="snelste_pitstop"]');
  await page.click('[data-extra="safety_cars"][data-waarde="2"]');    // nog een keer: weer leeg
  check('alleen een getal open: de regel noemt die vraag',
    (await tekst('#nogopen')) === 'nog open: safety cars · 12 punten →', await tekst('#nogopen'));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  check('bovenaan staat de vraag over de safety cars nog niet in beeld',
    !(await inBeeld(page, '[data-vraagblok="safety_cars"]')));
  await tik();
  await page.waitForFunction(() => {
    const r = document.querySelector('[data-vraagblok="safety_cars"]').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  }, null, { timeout: 3000 }).catch(() => {});
  check('en aantikken brengt je ernaartoe, zonder keuzeblad',
    (await inBeeld(page, '[data-vraagblok="safety_cars"]')) && (await page.$('#kiesblad')) === null
      && (await page.evaluate(() => document.activeElement?.dataset?.extra)) === 'safety_cars');
  await page.click('[data-extra="safety_cars"][data-waarde="1"]');
  check('alles ingevuld: geen regel meer', (await page.$('#nogopen')) === null);
  await opslaanEnTerug(page);
  check('en de weekendkaart zegt weer "Je inzending bekijken"',
    (await heroKnop(page)) === 'Je inzending bekijken', await heroKnop(page));

  // --- 5. op 360 pixels, met de langste regel ---------------------------------
  await page.setViewportSize({ width: 360, height: 740 });
  await openRace(page, 'Shanghai');
  await page.click('[data-tab="race"]').catch(() => {});
  await page.waitForSelector('#paneel');
  if (await page.$('[data-plek="0"]')) await kiesVoor(page, '[data-plek="0"]');
  const smal = await page.evaluate(() => ({
    breed: document.documentElement.scrollWidth, regel: !!document.querySelector('#nogopen') }));
  check('op 360 pixels geen horizontale scroll, met de regel bij Opslaan',
    smal.regel && smal.breed <= 360, JSON.stringify(smal));

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. wat de database alleen als "ingeleverd" meegeeft --------------------
// Wie speelt als een speler die aan een ander account hangt, krijgt van zijn
// open sessies alleen dát hij iets inleverde (zie test/geheim.test.mjs). Een
// pole die zo meekomt staat niet open; de losse vragen van de race wel.
for (const metPole of [true, false]) {
  const lijst = JSON.stringify(['81', '4', '1', '16', '44', '63', '12', '10', '14', '18']);
  const { page, jsFouten, stoppen } = await startPagina({
    aanpassen: (s) => s
      .replace("pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:null }],",
        "pool_members: [{ member_id:'lid-1', pool_id:'pool-1', display_name:'Danny', user_id:'ander-account' }],")
      .replace('  answers: [],', `  answers: [
    { pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'quali_top10', waarde:${lijst} },
    { pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'race_top10', waarde:${lijst} },
    ${metPole ? "{ pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'pole', waarde:'81' }," : ''}
  ],`),
    voorafAan: (p) => p.addInitScript(() => {
      localStorage.setItem('poule:laatste', 'pool-1');
      localStorage.setItem('poule:pool-1:mijn_id', 'lid-1');
    }),
  });
  await page.waitForSelector('.hero [data-naar-race]');
  const knop = await heroKnop(page);
  check(metPole
    ? 'een pole die alleen als "ingeleverd" meekomt, staat niet open'
    : 'zonder pole wijst dezelfde kaart wel naar de pole',
  knop === (metPole ? 'Losse vragen race invullen' : 'Nog invullen: pole'), knop);
  check(`geen javascriptfouten (${metPole ? 'met' : 'zonder'} pole)`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4. een sessie die al dicht is ------------------------------------------
// De kwalificatie van Melbourne begon een uur geleden, de race is morgen. De
// pole staat nog leeg, maar die is niet meer in te vullen: de knop wijst naar
// de losse vragen van de race.
{
  const lijst = JSON.stringify(['81', '4', '1', '16', '44', '63', '12', '10', '14', '18']);
  const { page, jsFouten, stoppen } = await startPagina({
    aanpassen: (s) => s
      .replace('deadline_quali:uur(24), deadline_race:uur(48)', 'deadline_quali:uur(-1), deadline_race:uur(24)')
      .replace('  answers: [],', `  answers: [
    { pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'quali_top10', waarde:${lijst} },
    { pool_id:'pool-1', race_id:1, member_id:'lid-1', question_id:'race_top10', waarde:${lijst} },
  ],`),
  });
  await meedoen(page);
  await naarLijst(page);
  const knop = await heroKnop(page);
  check('een losse vraag van een sessie die al dicht is, telt niet mee',
    knop === 'Losse vragen race invullen', knop);
  check('geen javascriptfouten (sessie dicht)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 5. Engels, en contrast in licht en donker ------------------------------
for (const thema of ['light', 'dark']) {
  const { page, jsFouten, stoppen } = await startPagina({ taal: thema === 'light' ? 'en' : 'nl' });
  const tekst = tekstVan(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: thema });
  await page.fill('#code', 'RTM026');
  await page.click('#mee');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await page.waitForSelector('[data-race], #rondleidingweg');
  if (await page.$('#rondleidingweg')) await page.click('#rondleidingweg');
  await naarLijst(page);
  await page.click('[data-race]:has(.nm:text-is("Melbourne"))');
  await page.waitForSelector('#paneel');
  await kiesVoor(page, '[data-plek="0"]');
  if (thema === 'light') {
    check('in het Engels: het blok',
      (await tekst(`${BLOK} .winnaarkop`)) === 'who takes pole? 10 points'
        && (await tekst(POLE)) === 'P tap to pick'
        && (await tekst(`${BLOK} p.amber`)) === 'nothing picked yet · 10 points on the table',
      `${await tekst(`${BLOK} .winnaarkop`)} / ${await tekst(POLE)} / ${await tekst(`${BLOK} p.amber`)}`);
    check('in het Engels: de regel bij Opslaan',
      (await tekst('#nogopen')) === 'still open: pole · 10 points →', await tekst('#nogopen'));
  }
  // Een volle top 10, zodat Opslaan niet uitgeschakeld is (daar geldt geen
  // contrasteis voor, en de keuring hieronder kent dat verschil niet). Dan
  // onderaan, zodat het blok en de regel allebei in beeld staan, en met de
  // muis op de regel: aangewezen moet hij de drempel ook halen.
  await kiesTien(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(350);
  await page.hover('#nogopen');
  await page.waitForTimeout(200);
  const slecht = await page.evaluate(CONTRAST);
  check(`${thema === 'light' ? 'licht' : 'donker'}: het blok en de regel halen de contrastdrempel`,
    slecht.length === 0, slecht.slice(0, 4).join(' | '));
  check(`${thema === 'light' ? 'licht' : 'donker'}: geen javascriptfouten`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
