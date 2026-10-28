// Een nieuw scherm begint bovenaan (Danny, 28 oktober).
//
// "Als ik schroll naar beneden en ik druk ergens op dan staat de pagina niet
// bovenaan. Maar op de plek wat ik heen scrolde." Op een telefoon scrolt de
// hele pagina, en die bleef staan waar hij stond als de app de inhoud
// verving. Wat hier vastligt, op het formaat van een iPhone:
//   1. Een race openen onderaan de kalender: het racescherm begint bovenaan.
//   2. Terug met de pijl: weer op de plek in de kalender waar je was.
//   3. Een tabblad onderin (Stand) vanuit een gescrolde lijst: bovenaan.
//   4. Op hetzelfde scherm iets doen, zoals onderaan de top 10 een coureur
//      kiezen of onderaan iemand aantikken, laat de pagina staan waar hij
//      stond. Een ander tabblad (kwalificatie, race) begint wel bovenaan. Opslaan brengt je terug naar de lijst, en die begint bovenaan,
//      waar de melding staat dat het gelukt is.
//   5. Iemands inzending bekijken (na de deadline) begint bovenaan, en terug
//      kom je weer bij de lijst van de poule.

import { maakControle, startPagina, meedoen, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('een nieuw scherm begint bovenaan');

const { page, jsFouten, stoppen } = await startPagina();
await page.setViewportSize({ width: 390, height: 844 });
await meedoen(page);

// Een lange kalender en een grote poule, anders past alles op één scherm en
// valt er niets te scrollen. Kees en Pipo vulden de kwalificatie van
// Shanghai in, die al dicht is: hun inzending kun je bekijken.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const basis = db.races[0];
  for (let i = 0; i < 9; i++) {
    db.races.push({ ...basis, id: 100 + i, round: 4 + i, name: `Testrace ${4 + i}`,
      deadline_quali: u(24 * (20 + 7 * i)), deadline_race: u(24 * (21 + 7 * i)),
      quali_result: null, race_result: null });
  }
  Object.assign(db.races[1], { deadline_quali: u(-2), deadline_race: u(24) });
  db.pools[0].premium_tot = u(24 * 365);
  for (let i = 0; i < 30; i++) {
    db.pool_members.push({ member_id: `lid-x${i}`, pool_id: 'pool-1', display_name: `Speler ${i + 1}`, user_id: null });
  }
  const tien = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'];
  for (const m of ['lid-x0', 'lid-x1']) {
    db.answers.push({ pool_id: 'pool-1', race_id: db.races[1].id, member_id: m, question_id: 'quali_top10', waarde: tien });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]', { state: 'attached' });

const y = () => page.evaluate(() => Math.round(window.scrollY));
// Scrollen en wachten tot de app het gezien heeft (de scroll-gebeurtenis komt
// pas in het volgende beeld).
const scrolNaar = async (doel) => {
  await page.evaluate((d) => window.scrollTo(0, d === 'onder' ? document.documentElement.scrollHeight : d), doel);
  await page.evaluate(() => new Promise((klaar) => requestAnimationFrame(() => requestAnimationFrame(klaar))));
};
const naTekenen = () => page.evaluate(() => new Promise((klaar) => requestAnimationFrame(() => requestAnimationFrame(klaar))));

// ---- 1. een race openen onderaan de kalender --------------------------------------------
await scrolNaar('onder');
const inKalender = await y();
check('de kalender is lang genoeg om te scrollen', inKalender > 300, String(inKalender));
await page.click('[data-race="108"]');
await page.waitForSelector('#paneel');
await naTekenen();
const hoog = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
check('het racescherm is langer dan het scherm, anders bewijst het niets', hoog > inKalender, `${hoog} / ${inKalender}`);
check('een race openen: het racescherm begint bovenaan', (await y()) === 0, String(await y()));

// ---- 2. terug met de pijl ------------------------------------------------------------------
await page.click('#terug');
await page.waitForSelector('[data-race="108"]');
await naTekenen();
// Een paar pixels speling: helemaal onderaan kan de lijst bij terugkomst net
// iets korter zijn (de klok bovenin), en dan kan de pagina niet verder.
check('terug met de pijl: weer op de plek in de kalender', Math.abs((await y()) - inKalender) <= 10,
  `${await y()} / ${inKalender}`);

// ---- 3. een tabblad onderin ------------------------------------------------------------------
await page.click('[data-weergave="stand"]');
await naTekenen();
const standHoog = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
check('de stand is lang genoeg', standHoog > inKalender, `${standHoog} / ${inKalender}`);
check('een tabblad onderin, vanuit een gescrolde lijst: bovenaan', (await y()) === 0, String(await y()));
await scrolNaar('onder');
await page.click('[data-weergave="races"]');
await naTekenen();
check('en terug naar Races ook: bovenaan', (await y()) === 0, String(await y()));

// ---- 4. op hetzelfde scherm iets doen --------------------------------------------------------
// Na een keuze zet de app de focus terug op de plek die je invulde, en dan
// schuift de browser die in beeld als hij dat nog niet was. Hier staat P10
// midden in beeld: dan hoort er niets te bewegen.
await page.click('[data-race="1"]');
await page.waitForSelector('.slot.leegplek');
await page.locator('.slot.leegplek').last().evaluate((e) => e.scrollIntoView({ block: 'center' }));
await scrolNaar(await y());
const bijP10 = await y();
check('met P10 midden in beeld staat de pagina een eind naar beneden', bijP10 > 100, String(bijP10));
await page.locator('.slot.leegplek').last().click();
await page.waitForSelector('#kiesblad .kiesknop:not([disabled])');
await page.click('#kiesblad .kiesknop:not([disabled])');
await page.waitForSelector('#kiesblad', { state: 'detached' });
await naTekenen();
// Een paar pixels mag: de browser centreert de ingevulde plek opnieuw.
// Waar het om gaat: niet terug naar boven.
check('een coureur kiezen laat de pagina staan waar hij stond', Math.abs((await y()) - bijP10) <= 40,
  `${await y()} / ${bijP10}`);

// Een ander tabblad (kwalificatie, race) is nieuwe inhoud: bovenaan.
await page.locator('[data-tab="race"]').evaluate((e) => e.scrollIntoView({ block: 'start' }));
await scrolNaar(await y());
check('de tabbladen staan een eind onder de kop', (await y()) > 100, String(await y()));
await page.click('[data-tab="race"]');
await page.waitForSelector('[data-tab="race"][aria-selected="true"]');
await naTekenen();
check('een ander tabblad: bovenaan', (await y()) === 0, String(await y()));
await page.click('[data-tab="quali"]');
await page.waitForSelector('[data-tab="quali"][aria-selected="true"]');

// Iemand aantikken (premium) tekent het hele scherm opnieuw, en daar sta je
// onderaan in de lijst van de poule. Dan hoort de pagina te blijven staan.
const tikKnop = page.locator('.poulekaart [data-tik]').last();
const tikId = await tikKnop.getAttribute('data-tik');
await tikKnop.evaluate((e) => e.scrollIntoView({ block: 'center' }));
await scrolNaar(await y());
const bijTik = await y();
check('onderaan in de lijst van de poule staat de pagina ver naar beneden', bijTik > 300, String(bijTik));
await tikKnop.click();
await page.waitForSelector(`[data-getikt="${tikId}"], [data-tik-deel="${tikId}"]`);
await naTekenen();
check('iemand aantikken laat de pagina staan waar hij stond', Math.abs((await y()) - bijTik) <= 40,
  `${await y()} / ${bijTik}`);

// Opslaan brengt je terug naar de lijst, met bovenaan dat het gelukt is: die
// begint dus bovenaan, ook al stond je onderaan bij de knop.
await kiesTien(page);
await scrolNaar('onder');
check('onderaan bij Opslaan staat de pagina ver naar beneden', (await y()) > 300, String(await y()));
await page.click('#opslaan');
await page.waitForSelector('.meldingbalk');
await naTekenen();
check('na opslaan: de lijst bovenaan, met de melding in beeld', (await y()) === 0
  && (await page.textContent('.meldingbalk')).includes('opgeslagen'), String(await y()));

// ---- 5. iemands inzending bekijken -------------------------------------------------------------
await page.click('[data-race="2"]');
await page.waitForSelector('#paneel');
if (await page.$('[data-tab="quali"]')) await page.click('[data-tab="quali"]');
await page.waitForSelector('[data-bekijk="lid-x29"]');
await page.locator('[data-bekijk="lid-x29"]').evaluate((e) => e.scrollIntoView({ block: 'center' }));
await scrolNaar(await y());
const bijPoule = await y();
check('de onderste speler in de lijst van de poule staat ver naar beneden', bijPoule > 300, String(bijPoule));
await page.click('[data-bekijk="lid-x29"]');
await page.waitForSelector('#inkijkterug');
await naTekenen();
check('iemands inzending bekijken: bovenaan', (await y()) === 0, String(await y()));
await page.click('#inkijkterug');
await page.waitForSelector('[data-bekijk="lid-x29"]');
await naTekenen();
check('en terug: weer bij de lijst van de poule', Math.abs((await y()) - bijPoule) <= 10, `${await y()} / ${bijPoule}`);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
