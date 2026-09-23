// Jokers: vijf per seizoen, en het weekend waar je er een op legt telt dubbel.
//
// De vierde en laatste van de punten uit groep 4 die de puntentelling raken,
// en net als bij de sprint is de vraag niet "werkt het" maar "wat doet het
// met een poule die al loopt". Antwoord: niets, tenzij de poulebaas hem
// aanzet, en dan nog alleen voor weekenden die op dat moment nog moesten
// beginnen.
//
// Wat hier vastligt:
//   1. Uit is uit: zonder de knop is er nergens een joker te zien.
//   2. De poulebaas zet hem aan, en dat geldt vanaf dat moment.
//   3. Een joker verdubbelt de weekendscore, in de kalender én in de stand.
//   4. Neerleggen en terugnemen kan, zolang het weekend nog niet begonnen is.
//   5. Zodra de eerste sessie loopt ligt hij vast — ook het weghalen.
//   6. Vijf is vijf.
//   7. Een weekend dat al liep toen de jokers aangingen krijgt er geen.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('jokers');
const { page, jsFouten, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const rij = (naam) => `[data-race]:has(.nm:text-is("${naam}"))`;
const punten = async (naam) =>
  Number((await tekst(`${rij(naam)} .st`)).match(/(\d+) ptn/)?.[1] ?? -1);
const openRace = async (naam) => {
  await page.waitForSelector('[data-race]');
  await page.click(rij(naam));
  await page.waitForSelector('#paneel');
};
const terug = async () => {
  await page.click('[data-weergave="races"]');
  await page.waitForSelector('[data-race]');
};

await meedoen(page);

// Drie weekenden: Melbourne is gereden en levert punten op, Shanghai en
// Suzuka moeten nog komen. Danny is poulebaas, want hij maakte de poule niet
// aan — die stond er al — dus dat moet er eerst bij.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  const drivers = db.races[0].drivers;
  Object.assign(db.races[0], { deadline_quali: u(-50), deadline_race: u(-49),
    quali_result: uitslag, race_result: uitslag });
  Object.assign(db.races[1], { deadline_quali: u(24), deadline_race: u(48) });
  Object.assign(db.races[2], { drivers, deadline_quali: u(96), deadline_race: u(120) });
  // Een perfecte inzending voor Melbourne: 50 + 50 = 100 punten.
  for (const q of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: 'lid-1',
                      question_id: q, waarde: uitslag.slice(0, 10) });
  }
  db.pools[0].owner_member_id = 'lid-1';
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

// --- 1. uit is uit --------------------------------------------------------
check('een gereden weekend levert gewoon zijn punten op', (await punten('Melbourne')) === 100,
  await tekst(`${rij('Melbourne')} .st`));
await openRace('Shanghai');
check('zonder de knop staat er geen jokerregel op het racescherm',
  (await page.$('.jokerregel')) === null);
await terug();
check('en geen jokermerkteken in de kalender', (await page.$('.jokervlag')) === null);

// --- 2. de poulebaas zet hem aan ------------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#jokersKnop');
check('de knop biedt aan om jokers aan te zetten',
  (await tekst('#jokersKnop')) === 'Zet aan');
await page.click('#jokersKnop');
await page.waitForSelector('.melding');
check('en de melding zegt erbij dat het vanaf nu geldt',
  (await tekst('.melding')).includes('vanaf nu'), await tekst('.melding'));
const vanaf = await page.evaluate(() => globalThis.__db.pools[0].jokers_vanaf);
check('aanzetten bewaart een moment en geen vinkje',
  typeof vanaf === 'string' && Math.abs(Date.parse(vanaf) - Date.now()) < 6e4, String(vanaf));

// --- 7. en het geldt niet met terugwerkende kracht ------------------------
await terug();
check('een weekend dat al gereden is verandert niet',
  (await punten('Melbourne')) === 100, await tekst(`${rij('Melbourne')} .st`));
await openRace('Melbourne');
check('en er valt daar geen joker meer op te leggen',
  (await page.$('.jokerregel')) === null);
await terug();

// --- 4. neerleggen --------------------------------------------------------
await openRace('Shanghai');
check('op een weekend dat nog moet komen staat de jokerregel wel',
  (await page.$('.jokerregel')) !== null);
check('en die zegt hoeveel je er nog hebt',
  (await tekst('.jokerregel .jokertekst')) === 'Joker Nog 5 van je 5 te vergeven dit seizoen.',
  await tekst('.jokerregel .jokertekst'));

await page.click('#jokerknop');
await page.waitForSelector('.melding');
check('neerleggen zegt waar hij ligt',
  (await tekst('.melding')).includes('Shanghai'), await tekst('.melding'));
const gezet = await page.evaluate(() => globalThis.__db.jokers);
check('en de joker staat in de database',
  gezet.length === 1 && String(gezet[0].race_id) === '2' && gezet[0].member_id === 'lid-1',
  JSON.stringify(gezet));
check('de regel zegt nu dat het weekend dubbel telt',
  (await tekst('.jokerregel .jokertekst')).includes('verdubbeld'),
  await tekst('.jokerregel .jokertekst'));

// En hij is ook te lézen. De knop ernaast staat op flex:none en .knop staat
// op width:100%; samen betekende dat "geef mij alles en krimp niet", en dan
// bleef er voor de tekst één woord per regel over -- acht regels hoog, zestig
// pixels breed. Op een telefoon viel dat niet op omdat de tekst daar tóch
// afbreekt; op een breder scherm was het meteen zichtbaar.
//
// Vandaar een meting en geen momentopname: een schermafdruk vergelijken zou
// op elke lettertypewijziging afgaan, en dit gaat om de verhouding.
const jokermaat = () => page.$eval('.jokerregel', (el) => {
  const tekstvak = el.querySelector('.jokertekst');
  const uitleg = el.querySelector('.jokeruitleg');
  const knop = el.querySelector('.knop');
  const ster = el.querySelector('.jokerster');
  const s = getComputedStyle(el);
  const gat = parseFloat(s.columnGap) || 0;
  // Het paneel heeft drie kinderen met twee gaten ertussen: de schijf, de
  // tekst en de knop.
  const binnen = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
    - ster.getBoundingClientRect().width - knop.getBoundingClientRect().width - 2 * gat;
  const regelhoogte = parseFloat(getComputedStyle(uitleg).lineHeight) || 16;
  return {
    label: tekstvak.getBoundingClientRect().width,
    knop: knop.getBoundingClientRect().width,
    // Wat er naast de schijf en de knop overblijft. Dít hoort de tekst te
    // krijgen, en het is de enige maat die niet meebeweegt met de breedte van
    // het scherm -- op 1100px staat de app in twee kolommen en is de
    // rechterkolom van zichzelf smal, dus een vast aantal regels zegt daar
    // niets.
    ruimte: binnen,
    regels: Math.round(uitleg.getBoundingClientRect().height / regelhoogte),
  };
});

for (const breedte of [420, 760, 1100, 1500]) {
  await page.setViewportSize({ width: breedte, height: 900 });
  await page.waitForTimeout(120);
  const maat = await jokermaat();
  // De eerste helft van deze voorwaarde is geen franje: zonder de fix eist de
  // knop de hele rij op, komt `ruimte` negatief uit en zou "label >= ruimte"
  // ook op nul kloppen. Er moet dus eerst rúímte zijn.
  check(`op ${breedte}px vult de tekst de ruimte naast de knop`,
    maat.ruimte > 40 && maat.label >= maat.ruimte - 2,
    `label ${Math.round(maat.label)}px van ${Math.round(maat.ruimte)}px beschikbaar`);
}

// En in één kolom, waar de hele breedte van het paneel beschikbaar is, past
// hij ook echt op één regel. Dat is het verschil met wat er stond: zestig
// pixels breed en acht regels hoog.
await page.setViewportSize({ width: 760, height: 900 });
await page.waitForTimeout(120);
const breed = await jokermaat();
check('en in één kolom past de regel op één regel',
  breed.regels === 1, `${breed.regels} regels, label ${Math.round(breed.label)}px`);
// Terug naar de maat waarop de rest van dit bestand geschreven is. Zonder dit
// staat de navigatie in een andere gedaante en vindt terug() zijn knop niet.
await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(120);

await terug();
check('en de kalender zet er een merkteken bij',
  (await page.$(`${rij('Shanghai')} .jokervlag`)) !== null);
check('alleen bij dat ene weekend',
  (await page.$$('.jokervlag')).length === 1);

// Het 2×-merkteken staat pal naast de Q/R/S-vinkjes, en die worden groen
// zodra je die sessie hebt ingevuld. Sinds de joker groen is, is "gevuld
// tegen omlijnd" het enige wat ze uit elkaar houdt: een dekkende pil naast
// doorzichtige vakjes. Wordt de vlag ooit ook omlijnd, dan verdwijnt hij in
// zijn buren -- en dat is precies het soort wijziging dat niemand opmerkt.
await page.evaluate(() => {
  const db = globalThis.__db;
  db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1',
    question_id: 'quali_top10',
    waarde: ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18'] });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');
{
  const naast = await page.$eval(`${rij('Shanghai')}`, (el) => {
    const vlag = el.querySelector('.jokervlag');
    const vinkje = el.querySelector('.mk i.aan');
    const vul = (n) => n && getComputedStyle(n).backgroundColor;
    return { vlag: vul(vlag), vinkje: vul(vinkje),
             heeftVinkje: !!vinkje };
  });
  check('naast de joker staat een ingevuld sessievinkje', naast.heeftVinkje,
    JSON.stringify(naast));
  // Een dekkende kleur heeft geen alfa in rgb(); een doorzichtige wel.
  check('het 2×-merkteken is gevuld, niet doorzichtig',
    /^rgb\(/.test(naast.vlag) && !/rgba/.test(naast.vlag), naast.vlag);
  check('en het sessievinkje juist wél, dus ze zien er anders uit',
    /rgba/.test(naast.vinkje) && naast.vlag !== naast.vinkje,
    `${naast.vlag} tegen ${naast.vinkje}`);
}

// Terugnemen kan: een misklik in ronde 2 hoort je niet de rest van het
// seizoen te kosten.
await openRace('Shanghai');
await page.click('#jokerknop');
await page.waitForFunction(() => globalThis.__db.jokers.length === 0);
check('terugnemen haalt hem weg',
  (await page.evaluate(() => globalThis.__db.jokers.length)) === 0);
await page.click('#jokerknop');
await page.waitForFunction(() => globalThis.__db.jokers.length === 1);
await terug();

// --- 3. en dan telt dat weekend dubbel ------------------------------------
// Shanghai wordt gereden, met dezelfde perfecte inzending. Zonder joker 100,
// met joker 200.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[1], { deadline_quali: u(-4), deadline_race: u(-3),
    quali_result: uitslag, race_result: uitslag });
  for (const q of ['quali_top10', 'race_top10']) {
    db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1',
                      question_id: q, waarde: uitslag.slice(0, 10) });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

check('hetzelfde weekend met een joker levert het dubbele op',
  (await punten('Shanghai')) === 200, await tekst(`${rij('Shanghai')} .st`));
check('en het weekend zonder joker blijft gewoon staan',
  (await punten('Melbourne')) === 100, await tekst(`${rij('Melbourne')} .st`));

await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
const stand = Number(await tekst('.strij .t'));
check('de stand telt de verdubbeling mee: 100 + 200', stand === 300, String(stand));
await terug();

// --- 5. en nu ligt hij vast -----------------------------------------------
await openRace('Shanghai');
check('op een gereden weekend staat er geen knop meer',
  (await page.$('#jokerknop')) === null);
check('maar wel dat de joker er ligt',
  (await tekst('.jokerregel .jokertekst')).includes('verdubbeld'),
  await tekst('.jokerregel .jokertekst'));
await terug();

// --- 6. vijf is vijf ------------------------------------------------------
// Nog vier weekenden erbij die allemaal nog moeten komen. Danny legt er vier
// jokers op; de vijfde is dan op.
await page.evaluate(() => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  for (let i = 0; i < 4; i++) {
    db.races.push({ id: 20 + i, season: 2026, round: 10 + i, name: `Extra ${i + 1}`,
      drivers: db.races[0].drivers,
      deadline_quali: u(200 + i * 24), deadline_race: u(210 + i * 24),
      deadline_sprint: null, quali_result: null, race_result: null, sprint_result: null,
      fastest_lap: null, fastest_pitstop: null, safety_cars: null, rode_vlag: null });
    db.jokers.push({ pool_id: 'pool-1', race_id: 20 + i, member_id: 'lid-1' });
  }
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
});
await page.reload();
await page.waitForSelector('[data-race]');

await openRace('Suzuka');
check('met vijf jokers gezet is er niets meer te vergeven',
  (await tekst('.jokerregel .jokertekst')) === 'Joker: op Je hebt ze dit seizoen alle 5 gebruikt.',
  await tekst('.jokerregel .jokertekst'));
check('en de knop staat er niet', (await page.$('#jokerknop')) === null);

// Eentje terugnemen maakt weer plek.
await openRace('Extra 1');
await page.click('#jokerknop');
await page.waitForFunction(() => globalThis.__db.jokers.length === 4);
await openRace('Suzuka');
check('eentje terugnemen maakt weer plek',
  (await tekst('.jokerregel .jokertekst')) === 'Joker Nog 1 van je 5 te vergeven dit seizoen.',
  await tekst('.jokerregel .jokertekst'));
check('en de knop is terug', (await page.$('#jokerknop')) !== null);

// --- uitzetten ------------------------------------------------------------
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#jokersKnop');
check('de knop biedt nu aan om ze weer uit te zetten',
  (await tekst('#jokersKnop')) === 'Zet weer uit');
await page.click('#jokersKnop');
await page.waitForSelector('.melding');
await terug();
check('uitgezet telt de verdubbeling niet meer mee',
  (await punten('Shanghai')) === 100, await tekst(`${rij('Shanghai')} .st`));
check('en de merktekens zijn weg', (await page.$('.jokervlag')) === null);
// De rijen blijven wel staan: per ongeluk uitzetten en weer aanzetten hoort
// geen verlies te zijn.
check('maar de gezette jokers staan er nog in de database',
  (await page.evaluate(() => globalThis.__db.jokers.length)) === 4);

// --- hoeveel jokers geeft deze poule? ------------------------------------
// Stond als vaste 5 in de app. Nu kiest de poule het bij het aanzetten, en
// dan moet alles wat "5" zei dat getal volgen: de uitleg, de teller op het
// racescherm en de grens waarop de database nee zegt.
await page.click('[data-weergave="poule"]');
await page.waitForSelector('#jokersKnop');
await page.click('#jokersKnop');                 // weer aan
await page.waitForSelector('.melding');

check('bij de jokers staat een keuzelijst voor het aantal',
  (await page.$('#jokeraantal')) !== null);
check('die op vijf staat zolang er niets gekozen is',
  (await page.$eval('#jokeraantal', (el) => el.value)) === '5');
check('met één tot en met vijf erin, en geen nul',
  (await page.$$eval('#jokeraantal option', (n) => n.map((e) => e.value).join(',')))
    === '1,2,3,4,5');

await page.selectOption('#jokeraantal', '2');
await page.waitForFunction(() => globalThis.__db.pools[0].jokers_aantal === 2);
check('kiezen schrijft het aantal weg', true,
  String(await page.evaluate(() => globalThis.__db.pools[0].jokers_aantal)));
check('en de uitleg eronder noemt datzelfde getal',
  (await tekst('#app')).includes('2 jokers'),
  (await tekst('#app')).match(/[^.]*\d jokers[^.]*\./)?.[0] ?? '');

// Het racescherm telt nu tot twee, niet tot vijf.
await terug();
await openRace('Extra 1');
// Er liggen op dit punt al jokers, dus hij zegt "alle 2 gebruikt" en niet
// "nog x van je 2" -- allebei goed, zolang er maar 2 staat en geen 5. Dat
// laatste is wat er vóór deze wijziging stond.
{
  const jk = await tekst('.jokerregel .jokertekst');
  check('de teller op het racescherm volgt het nieuwe aantal',
    jk.includes('2') && !jk.includes('5'), jk);
}

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
