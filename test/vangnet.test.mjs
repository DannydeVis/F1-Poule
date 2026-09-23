// Het vangnet onder het tekenen.
//
// Tot nu toe was een fout tijdens het opbouwen van een scherm een wit vlak, of
// erger: een scherm dat er normaal uitzag en waarin geen enkele knop iets
// deed. Allebei niet te onderscheiden van "de app is stuk", en allebei zonder
// weg terug, want herladen tekent hetzelfde scherm met dezelfde fout.
//
// Wat hier vastligt:
//   1. Een klap tijdens render() levert een leesbaar scherm op, geen wit vlak.
//   2. De technische reden staat erbij, zodat je hem kunt doorgeven.
//   3. De fout wordt níét opgeslokt: hij staat gewoon in de console. Een
//      vangnet dat bugs onzichtbaar maakt is erger dan geen vangnet.
//   4. "Opnieuw proberen" gooit het onthouden scherm weg, want anders is het
//      een knop die gegarandeerd hetzelfde doet.
//   5. De laatste uitweg vraagt eerst, en wist daarna dit toestel -- op de
//      taalkeuze na, want die hoort niet bij het probleem.
//   6. Een losse fout buiten het tekenen om vaagt een werkend scherm niet weg.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('vangnet: als het tekenen klapt');

// De klap moet van buitenaf komen, want de app heeft geen knop die hem
// veroorzaakt. querySelectorAll('[data-weergave]') is het eerste dat toonApp()
// doet ná het zetten van innerHTML -- precies het nare geval dus: het scherm
// staat er, de knoppen doen niets.
//
// De taal wordt hier zelf gezet in plaats van door startPagina, en eenmalig.
// Dat is nodig voor het laatste stuk: startPagina zet poule:taal bij élke
// navigatie terug, en dan staat die sleutel er na het wissen hoe dan ook weer
// -- de check of de taalkeuze gespaard blijft zou dan altijd slagen, ook als
// hij niet gespaard wordt. De vlag hieronder heet met opzet niet poule:iets,
// want alles wat zo heet gaat juist weg.
const { page, jsFouten, stoppen } = await startPagina({
  taal: null,
  voorafAan: (p) => p.addInitScript(() => {
    try {
      if (!localStorage.getItem('test:taalgezet')) {
        localStorage.setItem('poule:taal', 'nl');
        localStorage.setItem('test:taalgezet', '1');
      }
    } catch { /* niets */ }
    const echt = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function (kies) {
      if (window.__klap && kies === '[data-weergave]') throw new Error('proefklap');
      return echt.call(this, kies);
    };
  }),
});

// location.reload() valt in Chromium niet te overschrijven, dus de
// herlaadbeurt wordt geteld in plaats van tegengehouden.
let navigaties = 0;
page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigaties++; });

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const sleutels = () => page.evaluate(() =>
  Object.keys(localStorage).filter(k => k.startsWith('poule:')).sort());

// jsFouten wordt door Playwright asynchroon gevuld. Wie er meteen in kijkt
// leest hem misschien te vroeg, en dat zakt dan zonder dat er iets mis is.
const wachtOpFout = async (stuk) => {
  for (let i = 0; i < 100; i++) {
    if (jsFouten.some(f => f.includes(stuk))) return;
    await new Promise(r => setTimeout(r, 50));
  }
};

// Alle checks hieronder lezen Nederlandse tekst, en dit bestand zet zijn taal
// zelf (zie hierboven). Gaat dát mis, dan zakken ze allemaal op iets wat niets
// met het vangnet te maken heeft. Vandaar eerst deze: dan staat er meteen wát
// er aan de hand is in plaats van tien raadselachtige tekstmismatches.
check('de app draait in het Nederlands, anders zegt de rest niets',
  (await page.evaluate(() => localStorage.getItem('poule:taal'))) === 'nl'
    && (await page.getAttribute('html', 'lang')) === 'nl',
  `sleutel=${await page.evaluate(() => localStorage.getItem('poule:taal'))} `
    + `lang=${await page.getAttribute('html', 'lang')}`);

await meedoen(page);

// Een scherm onthouden om straks te kunnen zien dat het weggaat.
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave]');

check('er ligt een onthouden scherm voordat er iets misgaat',
  (await sleutels()).some(k => k.endsWith(':scherm')), (await sleutels()).join(' '));

// ---- 1 en 2: de klap -----------------------------------------------------

await page.evaluate(() => { window.__klap = true; });
await page.click('[data-weergave="races"]');
await page.waitForSelector('#kapotwis');

check('na de klap staat er een scherm en geen wit vlak',
  (await tekst('#app')).includes('Dit scherm liep vast'), await tekst('h1'));

check('het zegt erbij dat je inzendingen veilig staan',
  (await tekst('#app')).includes('staat veilig in de database'));

check('de technische reden staat erbij om door te geven',
  (await tekst('#kapotreden')) === 'proefklap', await tekst('#kapotreden'));

// ---- 3: geen doofpot ------------------------------------------------------
// Erop wachten en er niet van uitgaan. Het vangnet gooit de fout opnieuw op in
// een setTimeout, en die moet daarna nog via de browser naar deze kant komen.
// Het vangnetscherm staat er al voordat dat rond is. Hier haalde hij het altijd
// -- de tekstchecks hierboven geven precies genoeg vertraging -- en in de CI
// één keer niet. Dat was geen fout in de app maar een race in deze test.

await wachtOpFout('proefklap');
check('de fout staat gewoon in de console, het vangnet slikt hem niet in',
  jsFouten.some(f => f.includes('proefklap')), jsFouten.join(' | '));

// ---- 5: de laatste uitweg vraagt eerst ------------------------------------
// Eerst deze, want hij herlaadt niet zolang je maar één keer tikt. "Opnieuw
// proberen" hieronder herlaadt wel, en daarna is dit scherm weg.

const voorTik = await sleutels();
await page.click('#kapotwis');
check('één tik op de laatste uitweg vraagt eerst om bevestiging',
  (await tekst('#kapotwis')).startsWith('Zeker weten?'), await tekst('#kapotwis'));
check('en er is nog niets weg',
  (await sleutels()).join(' ') === voorTik.join(' '));

// ---- 4: opnieuw proberen gooit het onthouden scherm weg -------------------
// Het onthouden scherm is na de herlaadbeurt meteen weer geschreven -- dat
// hoort ook -- dus de vraag is niet óf de sleutel er staat, maar wat erin
// staat. Vóór de klap stond de app op de stand; is het weggooien gelukt, dan
// begint hij weer op de races en niet opnieuw op wat hem net de das omdeed.

await page.evaluate(() => { window.__klap = false; });
await page.click('#opnieuw');
await page.waitForSelector('[data-race]');

const onthouden = () => page.evaluate(() => {
  const k = Object.keys(localStorage).find(x => x.endsWith(':scherm'));
  try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; }
});

check('na opnieuw proberen draait de app weer',
  (await page.$('[data-race]')) !== null);
check('en hij begint niet opnieuw op het scherm dat net klapte',
  (await onthouden())?.weergave === 'races', JSON.stringify(await onthouden()));
check('maar wie je bent weet hij nog wel',
  (await sleutels()).some(k => k.endsWith(':mijn_id')), (await sleutels()).join(' '));

// ---- 6: een losse fout vaagt geen werkend scherm weg ----------------------
// Met opzet vóór het wissen hieronder, want daarna is er geen werkend scherm
// meer om niet weggevaagd te worden.

await page.evaluate(() => { Promise.reject(new Error('losse belofte')); });
await page.waitForSelector('#stillefout');

check('een losse fout meldt zich in een balkje',
  (await tekst('#stillefout')).includes('op de achtergrond'), await tekst('#stillefout'));
check('en de app staat er gewoon nog',
  (await page.$('[data-race]')) !== null);

await page.click('#stillefoutweg');
check('het balkje is weg te klikken', (await page.$('#stillefout')) === null);

// ---- 5 vervolg: twee tikken wist het toestel ------------------------------
// Als laatste, want hierna is dit toestel niemand meer.

await page.evaluate(() => { window.__klap = true; });
await page.click('[data-weergave="stand"]');
await page.waitForSelector('#kapotwis');

const voorWissen = navigaties;
await page.click('#kapotwis');
await page.click('#kapotwis');
await page.waitForSelector('#code');

check('er wordt herladen, anders sta je naar een leeg scherm te kijken',
  navigaties > voorWissen, `${voorWissen} -> ${navigaties}`);
check('na twee tikken staat de app weer op het beginscherm',
  (await page.$('#code')) !== null);
check('en dit toestel is vergeten',
  (await sleutels()).every(k => k === 'poule:taal'), (await sleutels()).join(' '));
check('de taalkeuze niet, want die hoort niet bij het probleem',
  (await sleutels()).includes('poule:taal'), (await sleutels()).join(' '));

// De console hoort alleen de fouten te bevatten die deze test zelf maakt: de
// proefklap, twee keer opgegooid, en de losse belofte. Alles wat daar nog
// meer in staat is een echte fout in de app.
const vreemd = jsFouten.filter(f => !f.includes('proefklap') && !f.includes('losse belofte'));
check('geen andere javascriptfouten dan de twee die deze test zelf maakt',
  vreemd.length === 0, vreemd.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
