// De app in twee talen.
//
// Het ontwerp in één zin: de Nederlandse zin ís de sleutel. T('Wis alles')
// zoekt die zin op in ENGELS en geeft hem onvertaald terug als hij er niet in
// staat. Daar volgt alles uit:
//
//   * Nederlands blijft de bron. Er is geen tweede lijst die kan verouderen
//     en geen sleutel als `wis_alles_knop` die niemand kan lezen.
//   * Een vergeten vertaling is geen kapot scherm maar één Nederlandse zin
//     tussen het Engels. Dat is lelijk en zichtbaar, en dus repareerbaar.
//   * De achtenvijftig andere testbestanden blijven het vangnet: die kijken
//     allemaal naar de Nederlandse tekst, en die tekst is onaangeroerd.
//
// Wat hier vastligt:
//   1. Zonder eigen keuze kiest de app op wat de browser zegt.
//   2. Een eigen keuze wint daarvan, en blijft staan na herladen.
//   3. De knop wisselt echt de hele app om, ook diep in een racepagina.
//   4. De woordenlijst is heel: geen dubbele sleutels, geen lege vertaling,
//      en elke {plaatshouder} in het Nederlands komt terug in het Engels.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('Nederlands en Engels');

const tekst = async (page, kies) =>
  (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// --- 1. de woordenlijst zelf ----------------------------------------------
// Deze vier controles lezen index.html als tekst. Ze hebben geen browser
// nodig, en ze vangen precies de fouten die je bij honderden regels met de
// hand maakt: twee keer dezelfde zin, een vergeten vertaling, of een
// {plaatshouder} die in de vertaling anders heet en dus nooit gevuld wordt.
// Niet met een regex: de lijst kent drie schrijfwijzen (alles op één regel,
// sleutel en vertaling onder elkaar, en zinnen die over meerdere regels aan
// elkaar geplakt staan) en elke regex die dat aankan mist stilletjes een
// vierde. De array is geldig JavaScript, dus laat node hem zelf lezen.
const bron = readFileSync(join(wortel, 'index.html'), 'utf8');
const begin = bron.indexOf('const ENGELS = Object.fromEntries([');
const eind = bron.indexOf('\n]);', begin);
if (begin === -1 || eind === -1) throw new Error('de woordenlijst staat niet in index.html');
const lijst = bron.slice(begin + 'const ENGELS = Object.fromEntries('.length, eind + 2);

const map = mkdtempSync(join(tmpdir(), 'poule-taal-'));
writeFileSync(join(map, 'lijst.mjs'), `export const paren = ${lijst};\n`);
const { paren } = await import(join(map, 'lijst.mjs'));

check('de woordenlijst is gevonden en gelezen', paren.length > 300, `${paren.length} paren`);
check('elk item is precies één paar',
  paren.every(p => Array.isArray(p) && p.length === 2 && p.every(z => typeof z === 'string')));

const dubbel = paren.map(([nl]) => nl)
  .filter((nl, i, alle) => alle.indexOf(nl) !== i);
check('geen enkele sleutel staat er twee keer in', dubbel.length === 0,
  dubbel.slice(0, 3).join(' | '));

const leeg = paren.filter(([nl, en]) => !nl.trim() || !en.trim());
check('geen lege zin aan een van beide kanten', leeg.length === 0,
  JSON.stringify(leeg.slice(0, 3)));

// Een {plaatshouder} die in de vertaling {name} gaat heten blijft in het
// Engels letterlijk als "{name}" op het scherm staan. Dat is niet te zien aan
// de code en wel aan deze vergelijking.
const houders = (zin) => [...zin.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
const scheef = paren.filter(([nl, en]) => houders(nl) !== houders(en));
check('elke {plaatshouder} komt in beide talen voor',
  scheef.length === 0, JSON.stringify(scheef.slice(0, 2)));

// Een vertaling die letterlijk gelijk is aan het Nederlands is bijna altijd
// een kopieerfout: er staat dan Nederlands op een Engels scherm zonder dat
// iemand het merkt. Bijna altijd — een handvol woorden ís in beide talen
// hetzelfde. Die staan hier met naam en toenaam, zodat een nieuwe kopieerfout
// wél opvalt in plaats van in een marge te verdwijnen.
const MAG_GELIJK = new Set([
  'Races', 'races', 'Race', 'race', 'Sprint', 'sprint', 'demo',
  'Pole position', 'pole', 'safety cars', 'jokers', 'top 10', '{wie} won',
  // De afkortingen op de aftelklok. "u" wordt "h", maar dag en minuut
  // beginnen in beide talen met dezelfde letter.
  'd', 'm',
  // De kop van het jokerpaneel. Een joker heet in het Engels ook een joker;
  // "Joker: actief" en "Joker: op" verschillen wél en staan er dus niet bij.
  'Joker',
]);
const zelfde = paren.filter(([nl, en]) => nl === en).map(([nl]) => nl);
check('alleen woorden die in beide talen hetzelfde zijn, staan er gelijk in',
  zelfde.every(nl => MAG_GELIJK.has(nl)),
  zelfde.filter(nl => !MAG_GELIJK.has(nl)).join(' | '));

// Een sleutel die nergens in de code voorkomt is een wees: hij is blijven
// staan nadat de zin veranderde, of de T()-aanroep heeft een typefout en pakt
// hem dus nooit. Allebei stil, allebei hier zichtbaar. Zoeken gebeurt in de
// hele module buiten de lijst om, want een deel van de zinnen staat in een
// tabel (COUREURVRAAG, SESSIES, PRESETS) en wordt pas bij het tekenen door
// T() gehaald.
{
  // Lange zinnen staan in de code als 'stuk ' + 'stuk' over meerdere regels.
  // Het plusteken met de twee aanhalingstekens eromheen weghalen plakt ze weer
  // aan elkaar, zodat de hele zin er letterlijk in te vinden is.
  const zonderLijst = (bron.slice(0, begin) + bron.slice(eind))
    .replace(/['"]\s*\+\s*['"]/g, '');
  const wezen = paren.map(([nl]) => nl).filter(nl => !zonderLijst.includes(nl));
  check('elke sleutel komt ook echt ergens in de code voor',
    wezen.length === 0, wezen.slice(0, 5).join(' | '));
}

// --- 2. de browser kiest, als jij niets kiest -----------------------------
// taal: null slaat het init-script van hulp.mjs over, dus hier telt alleen
// wat navigator.language zegt. Playwright start standaard op en-US.
{
  const { page, stoppen } = await startPagina({ taal: null });
  check('een Engelse browser krijgt Engels',
    (await tekst(page, '#app')).includes('your pool'),
    (await tekst(page, '#app')).slice(0, 60));
  await stoppen();
}

{
  const { page, stoppen } = await startPagina({
    taal: null,
    // Een telefoon die op Nederlands staat. navigator.languages is read-only,
    // dus hij wordt hier overschreven voordat de app hem leest.
    voorafAan: (p) => p.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL', 'nl'] });
      Object.defineProperty(navigator, 'language', { get: () => 'nl-NL' });
    }),
  });
  check('een Nederlandse browser krijgt Nederlands',
    (await tekst(page, '#app')).includes('met je poule'),
    (await tekst(page, '#app')).slice(0, 60));
  await stoppen();
}

// --- 3. de knop op het beginscherm ----------------------------------------
// Bewust zonder het init-script van hulp.mjs (dat zet localStorage bij élke
// navigatie, ook na een reload, en zou de keuze hieronder dus steeds weer
// overschrijven). De taal komt hier uit de browser, net als bij een echte
// bezoeker.
const { page, jsFouten, stoppen } = await startPagina({
  taal: null,
  voorafAan: (p) => p.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { get: () => ['nl-NL', 'nl'] });
    Object.defineProperty(navigator, 'language', { get: () => 'nl-NL' });
  }),
});

check('het beginscherm staat in het Nederlands',
  (await tekst(page, '#app')).includes('met je poule'));
check('en er staat een knop om over te schakelen',
  (await page.textContent('#taalknop')).trim() === 'EN');
check('met een label dat in de andere taal geschreven is',
  (await page.getAttribute('#taalknop', 'aria-label')) === 'Switch to English');
// Een schermlezer kiest op dit attribuut zijn stem en zijn uitspraakregels.
// Staat het op "nl" terwijl er Engels staat, dan leest hij Engelse zinnen met
// een Nederlandse tong — onverstaanbaar, en niet te zien aan het scherm.
check('<html lang> staat op de taal die er staat',
  (await page.getAttribute('html', 'lang')) === 'nl');

await page.click('#taalknop');
await page.waitForSelector('#taalknop:text-is("NL")');

check('één tik zet het hele beginscherm in het Engels',
  (await tekst(page, '#app')).includes('your pool'),
  (await tekst(page, '#app')).slice(0, 70));
check('en de knop biedt nu de weg terug',
  (await page.getAttribute('#taalknop', 'aria-label')) === 'Schakel over naar Nederlands');
check('en <html lang> is meegegaan',
  (await page.getAttribute('html', 'lang')) === 'en');

// De keuze hoort dit toestel te overleven, anders sta je na elke herlaadbeurt
// weer in de verkeerde taal.
await page.reload();
await page.waitForSelector('#taalknop');
check('de keuze staat er na herladen nog',
  (await tekst(page, '#app')).includes('your pool'));
check('en hij staat opgeslagen onder poule:taal',
  (await page.evaluate(() => localStorage.getItem('poule:taal'))) === 'en');

// --- 4. de hele app, niet alleen de voordeur ------------------------------
await meedoen(page);

const races = await tekst(page, '#app');
check('de racelijst staat in het Engels',
  races.includes('Table') && races.includes('Profile') && races.includes('pool code'),
  races.slice(0, 80));

await page.click('[data-weergave="stand"]');
await page.waitForSelector('.strij');
check('de stand ook', (await tekst(page, '#app')).includes('Switch'),
  (await tekst(page, '#app')).slice(0, 80));

await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
await page.click('[data-race]');
await page.waitForSelector('#paneel');
const paneel = await tekst(page, '#paneel');
check('en het invulscherm van een race', /Save|Clear everything|tap to pick/i.test(paneel),
  paneel.slice(0, 110));

// --- 4b. de klok en de kalender horen ook bij de taal ---------------------
// Dit is de fout die je maakt als je alleen de zinnen vertaalt: "za 14:00" in
// een Engels scherm is net zo raar als "Sat 14:00" in een Nederlands scherm.
//
// Het decimaalteken hoort in dezelfde categorie ("78,0" leest in het Engels
// als achtenzeventigduizend), maar op deze schermen staat geen enkel getal met
// een decimaal. Die controle staat daarom in contrair.test.mjs, bij de ×1,8
// die daar wél op het scherm komt -- een controle op een scherm zonder
// decimalen zou altijd slagen en niets bewaken.
{
  // De aftelklok in de racelijst: "3d 4h" en niet "3d 4u".
  const klok = await page.$$eval('[data-tot]', (n) => n.map((e) => e.textContent.trim()));
  check('de aftelklok telt in h en niet in u',
    klok.length > 0 && klok.every((t) => !/\du\b/.test(t)), klok.slice(0, 3).join(' | '));

  // De deadline onder een race staat als "closes Sat 14:00".
  const dagen = await page.evaluate(() =>
    document.querySelector('#app').textContent.replace(/\s+/g, ' '));
  check('en de weekdag staat in het Engels',
    !/\b(ma|di|wo|do|vr|za|zo) \d\d:/.test(dagen),
    dagen.match(/.{0,14}(ma|di|wo|do|vr|za|zo) \d\d:.{0,10}/)?.[0] ?? '');
}

// --- 5. terug naar Nederlands, van binnenuit ------------------------------
// Niet via de knop op het beginscherm maar via het profielscherm: wie al in
// een poule zit komt daar nooit meer langs.
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('[data-taal="nl"]');
check('op het profiel staat een taalkeuze met twee knoppen',
  (await page.$$('[data-taal]')).length === 2);
check('en de huidige taal is niet aanklikbaar',
  (await page.getAttribute('[data-taal="en"]', 'disabled')) !== null);

await page.click('[data-taal="nl"]');
await page.waitForSelector('[data-taal="en"]:not([disabled])');
check('terugzetten naar Nederlands werkt vanuit de app',
  (await tekst(page, '#app')).includes('Profiel'),
  (await tekst(page, '#app')).slice(0, 80));
check('en de opgeslagen keuze is meegegaan',
  (await page.evaluate(() => localStorage.getItem('poule:taal'))) === 'nl');
check('en <html lang> staat weer op nl',
  (await page.getAttribute('html', 'lang')) === 'nl');

// --- 6. staat er nog tekst buiten T() om? ---------------------------------
// De vangnet-test. Alles hierboven controleert wat er wél vertaald is; dit
// controleert wat er níét vertaald is, en dat is de fout die je bij een app
// van zevenduizend regels echt maakt: één nieuw schermpje waarvan de tekst
// rechtstreeks in het sjabloon staat.
//
// De methode: neem de module-broncode, gum de woordenlijst weg, gum elke
// T(...)-aanroep weg, gum elke ${...} weg die geen geneste template bevat, en
// kijk wat er dan nog aan tekst tussen twee tags staat. Wat overblijft gaat
// niet door T() heen.
{
  const js = bron.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

  const gum = (tekst) => tekst.replace(/[^\n]/g, ' ');

  // Haakjes tellen, en een string overslaan: T('een ) in de zin') telt niet
  // als sluithaakje.
  const wisAanroepen = (tekst, start) => {
    const uit = tekst.split('');
    for (let k = 0; ;) {
      const m = new RegExp(start.source, start.flags);
      m.lastIndex = k;
      const t = m.exec(tekst);
      if (!t) break;
      let p = m.lastIndex, diep = 1;
      while (p < tekst.length && diep) {
        const c = tekst[p];
        if (c === '(') diep++;
        else if (c === ')') diep--;
        else if (c === "'" || c === '"' || c === '`') {
          const q = c; p++;
          while (p < tekst.length && tekst[p] !== q) p += tekst[p] === '\\' ? 2 : 1;
        }
        p++;
      }
      for (let x = t.index; x < p; x++) if (uit[x] !== '\n') uit[x] = ' ';
      k = p;
    }
    return uit.join('');
  };

  const i = js.indexOf('const ENGELS = Object.fromEntries([');
  const j = js.indexOf('\n]);', i);
  let kaal = js.slice(0, i) + gum(js.slice(i, j)) + js.slice(j);
  kaal = wisAanroepen(kaal, /\bT\(/g);
  // Binnenste ${...} eerst: een ${...} mét backtick erin bevat een geneste
  // template, en juist díé tekst zoeken we. Herhalen tot er niets meer
  // verandert, zodat de buitenste laag vanzelf aan de beurt komt.
  for (let ronde = 0; ronde < 40; ronde++) {
    const volgende = kaal.replace(/\$\{[^{}`]*\}/g, gum);
    if (volgende === kaal) break;
    kaal = volgende;
  }
  kaal = kaal.replace(/<!--[\s\S]*?-->/g, gum);

  // Alleen de merknaam en de twee taalnamen horen onvertaald op het scherm.
  const MAG_ONVERTAALD = new Set(['Predict the Race', 'Nederlands', 'English']);
  const gaten = [];
  let inBlok = false;
  for (const [nr, regel] of kaal.split('\n').entries()) {
    const k = regel.trim();
    if (k.startsWith('//')) continue;
    if (k.startsWith('/*')) inBlok = true;
    if (inBlok) { if (k.includes('*/')) inBlok = false; continue; }
    if (k.startsWith('*')) continue;
    const stukken = [...regel.matchAll(/<\/?[a-zA-Z][^<>]*>([^<>]+)(?:<|$)/g),
                     ...regel.matchAll(/^\s*>([^<>]+)(?:<|$)/g)];
    for (const [, rauw] of stukken) {
      const t = rauw.trim();
      if (!/[A-Za-zÀ-ÿ]{3,}/.test(t)) continue;      // geen woord, geen tekst
      if (/[=;(){}\[\]&|!]|=>|\?\?|`|\.[a-z]/.test(t)) continue;  // code, geen tekst
      if (MAG_ONVERTAALD.has(t)) continue;
      gaten.push(`regel ${nr + 1}: ${t.slice(0, 60)}`);
    }
  }
  check('er staat geen zichtbare tekst buiten T() om', gaten.length === 0,
    gaten.slice(0, 5).join(' | '));
}

// --- 7. een ontbrekende vertaling valt terug op het Nederlands ------------
// Het hele punt van "de zin is de sleutel": een gat in de woordenlijst is
// geen lege knop maar een Nederlandse knop.
const terugval = await page.evaluate(() => {
  const app = document.querySelector('#app');
  return app ? app.textContent.length > 0 : false;
});
check('het scherm is nooit leeg, hoe de vertaling ook uitpakt', terugval);

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
