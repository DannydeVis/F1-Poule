// Een poule aanmaken in vier stappen: naam, jouw naam, wat jullie gaan
// voorspellen, en de code om te delen.
//
// De derde stap is de reden dat dit een apart scherm is geworden. De
// vragenset ligt vast zodra de eerste race gescoord is, dus dit is het enige
// moment waarop iedereen hem nog rustig kan bekijken. Wat hier misgaat merk
// je pas een half seizoen later.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('poule aanmaken');

// Een verzonnen tiende vraag, die de app dus niet kan stellen. Zo blijft de
// "binnenkort"-markering getest, ook nu alle negen echte vragen gebouwd zijn.
const { page, jsFouten, stoppen } = await startPagina({
  aanpassen: (bron) => bron.replace(
    /(\{ id:'rode_vlag',[^\n]*\n)/,
    `$1    { id:'regen', naam:'Regen tijdens de race', punten:8, sessie:'race', soort:'janee', gok:true, volgorde:100 },\n`),
});

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// --- stap 1: hoe heet de poule --------------------------------------------
await page.waitForSelector('#nieuw');
await page.click('#nieuw');
await page.waitForSelector('#pnaam');
check('stap 1 vraagt naar de naam van de poule',
  (await tekst('h1')) === 'Hoe heet de poule?', await tekst('h1'));

await page.click('#verder');
check('zonder naam kom je niet verder',
  (await tekst('#f')).includes('naam voor de poule'), await tekst('#f'));

await page.fill('#pnaam', 'Donderdagavondpoule');
await page.click('#verder');

// --- stap 2: hoe heet jij --------------------------------------------------
await page.waitForSelector('#snaam');
check('stap 2 vraagt naar je eigen naam',
  (await tekst('h1')) === 'Hoe heet jij?', await tekst('h1'));

// Terug hoort te bewaren wat je al had ingevuld.
await page.click('#terugstap');
await page.waitForSelector('#pnaam');
check('terug houdt de naam van de poule vast',
  (await page.inputValue('#pnaam')) === 'Donderdagavondpoule',
  await page.inputValue('#pnaam'));
await page.click('#verder');

await page.waitForSelector('#snaam');
await page.fill('#snaam', 'Danny');
await page.click('#verder');

// --- stap 3: wat gaan jullie voorspellen ----------------------------------
await page.waitForSelector('[data-preset]');
check('stap 3 vraagt wat jullie gaan voorspellen',
  (await tekst('h1')) === 'Wat gaan jullie voorspellen?', await tekst('h1'));

const presets = await page.$$eval('[data-preset]', (n) =>
  n.map((b) => ({ sleutel: b.dataset.preset, ptn: b.querySelector('.ptn').textContent })));
check('de drie voorstellen staan er met hun punten',
  presets.length === 3
    && presets.find((p) => p.sleutel === 'simpel').ptn === '100'
    && presets.find((p) => p.sleutel === 'klassiek').ptn === '145'
    && presets.find((p) => p.sleutel === 'gevorderd').ptn === '202',
  presets.map((p) => `${p.sleutel}=${p.ptn}`).join(' '));

const voorgekozen = await page.getAttribute('.preset.aan', 'data-preset');
check('Klassiek staat standaard aan', voorgekozen === 'klassiek', String(voorgekozen));

// De losse vragen zitten achter een knop: één vraag per scherm, geen muur.
check('de losse vragen staan dichtgeklapt',
  await page.$eval('.vragenlijst', (n) => n.classList.contains('hide')));
await page.click('#eigen');
check('en klappen open als je erom vraagt',
  await page.$eval('.vragenlijst', (n) => !n.classList.contains('hide')));

const regels = await page.$$eval('.vraagregel', (n) => n.map((b) => b.dataset.vraagAan));
check('elke vraag uit de database staat in de lijst',
  regels.length === 10 && regels.includes('regen'), `${regels.length}: ${regels.join(', ')}`);

const aanVoor = await page.textContent('.somregel .getal');
await page.click('[data-vraag-aan="safety_cars"]');
const aanNa = await page.textContent('.somregel .getal');
check('een vraag aanzetten telt live bij',
  Number(aanNa) - Number(aanVoor) === 12, `${aanVoor} → ${aanNa}`);

// Vragen die de app nog niet stelt worden als zodanig gemarkeerd, en de
// voet zegt wat er nu al gevraagd wordt. Anders beloof je punten die er
// dit seizoen nog niet zijn.
// Alleen wat de app nog niet kan stellen krijgt die markering; de negen
// echte vragen zijn allemaal gebouwd, dus alleen de verzonnen tiende.
const binnenkort = await page.$$eval('.vraagregel', (n) =>
  n.filter((b) => b.querySelector('.binnenkort')).map((b) => b.dataset.vraagAan));
check('een vraag die de app nog niet kan stellen heet binnenkort',
  binnenkort.length === 1 && binnenkort[0] === 'regen',
  binnenkort.join(', ') || 'niets gemarkeerd');
// Klassiek plus safety cars is 157, en dat wordt allemaal al gevraagd; pas
// als je de verzonnen vraag aanzet klopt het totaal niet meer met wat er
// echt gevraagd wordt.
await page.click('[data-vraag-aan="regen"]');
const voet = await tekst('.veldblok');
check('en de voet zegt hoeveel er nu al gevraagd wordt',
  /Daarvan wordt nu 157 punten al gevraagd/.test(voet),
  voet.match(/Daarvan wordt nu[^.]*\./)?.[0] ?? 'die regel staat er niet');
await page.click('[data-vraag-aan="regen"]');

// --- de gokwaarschuwing uit BEDIENING.md §8 -------------------------------
check('bij een gewone set staat er geen waarschuwing',
  (await page.$('.waarschuwing')) === null);

// Alles uit behalve de twee gokvragen: dan hangt 100% van geluk af.
for (const id of ['quali_top10', 'race_top10', 'winnaar', 'pole', 'snelste_ronde']) {
  await page.click(`[data-vraag-aan="${id}"]`);
}
const gokMelding = await tekst('.waarschuwing');
check('een set die vooral uit gokvragen bestaat krijgt een gele vlag',
  gokMelding.includes('een derde van de punten'), gokMelding);
// Blokkeren doen we niet: het is hun poule.
check('maar aanmaken mag gewoon',
  await page.$eval('#verder', (b) => !b.disabled));

// Niets aan is wél tegenhouden: een poule zonder vragen kan niets vragen.
// Op dit punt staat alleen safety_cars nog aan.
await page.click('[data-vraag-aan="safety_cars"]');
check('zonder één vraag kun je niet aanmaken',
  await page.$eval('#verder', (b) => b.disabled));

await page.click('[data-preset="simpel"]');
const naPreset = await page.$$eval('.vraagregel.aan', (n) => n.map((b) => b.dataset.vraagAan));
check('een voorstel aantikken zet de lijst in één keer goed',
  naPreset.length === 2 && naPreset.includes('quali_top10') && naPreset.includes('race_top10'),
  naPreset.join(', '));

await page.click('#verder');

// --- stap 4: de code om te delen ------------------------------------------
await page.waitForSelector('#klaar');
check('stap 4 laat de poulecode zien',
  (await tekst('.veld.code')).length >= 5, await tekst('.veld.code'));

// De uitnodigingslink op dit scherm gaat over de net aangemaakte poule, niet
// over S.poule — die bestaat nog niet, want je bent nog niet "naar de poule"
// geweest. Zonder dat de knop expliciet die poule krijgt doorgegeven klapt
// hij stil op een null: de knop verandert dan niets en er komt geen tekst.
const code = await tekst('.veld.code');
await page.click('#uitnodiging');
await page.waitForFunction(
  () => document.querySelector('#uitnodiging')?.textContent !== 'Kopieer uitnodigingslink');
const geklikt = await tekst('#uitnodiging');
check('de uitnodigingsknop op stap 4 doet iets als je erop klikt',
  geklikt !== 'Kopieer uitnodigingslink', geklikt);
const veldTekst = await page.inputValue('#uitnodigingveld').catch(() => '');
check('en de tekst gaat over de zojuist aangemaakte poule, met de juiste code',
  geklikt === 'Gekopieerd' || veldTekst.includes(code),
  `knop: "${geklikt}", veld: "${veldTekst}"`);

const poules = await page.evaluate(() => globalThis.__db.pools);
const nieuw = poules.find((p) => p.name === 'Donderdagavondpoule');
check('de poule staat in de database', !!nieuw, poules.map((p) => p.name).join(', '));

const leden = await page.evaluate(() => globalThis.__db.pool_members);
const ik = leden.find((l) => l.pool_id === nieuw.id);
check('de aanmaker is meteen het eerste lid', ik?.display_name === 'Danny',
  JSON.stringify(ik));
check('en staat als poulebaas genoteerd', nieuw.owner_member_id === ik.member_id,
  `${nieuw.owner_member_id} tegen ${ik.member_id}`);

const vinkjes = await page.evaluate(() => globalThis.__db.pool_questions);
const mijne = vinkjes.filter((v) => v.pool_id === nieuw.id).map((v) => v.question_id);
check('alleen de gekozen vragen zijn vastgelegd',
  mijne.length === 2 && mijne.includes('quali_top10') && mijne.includes('race_top10'),
  mijne.join(', '));

// --- en dan de poule in ----------------------------------------------------
await page.click('#klaar');
await page.waitForSelector('[data-race]');
check('na klaar sta je in je eigen poule', (await page.$('#code')) === null);

// De vragen die deze poule niet koos horen ook niet gevraagd te worden.
await page.click('[data-race]');
await page.waitForSelector('#paneel');
check('een uitgevinkte vraag wordt niet gesteld',
  (await page.$('[data-vraag="pole"]')) === null,
  'de polekiezer staat er terwijl Simpel gekozen is');

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
