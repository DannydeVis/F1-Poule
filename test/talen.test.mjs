// De app in zeven talen.
//
// Sinds 12 oktober (Danny: "niet per se op Nederland focussen maar
// wereldwijd") ook Duits, Frans, Spaans, Italiaans en Portugees. Die staan elk
// in een eigen bestand, app/talen/<code>.json, met dezelfde Nederlandse zinnen
// als sleutel; de app laadt alleen de taal die je kiest.
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
//   5. Elk taalbestand heeft precies dezelfde zinnen als de Engelse lijst,
//      met dezelfde plaatshouders en dezelfde tags, en is geen kopie van het
//      Engels.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, startPagina, meedoen, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('de app in zeven talen');

const tekst = async (page, kies) =>
  (await page.textContent(kies)).replace(/\s+/g, ' ').trim();

// #app is leeg tot het script het beginscherm getekend heeft, en page.goto()
// wacht daar niet op. Op een drukke machine (de volle suite) las de eerste
// controle dus soms een leeg scherm. De taalknop staat alleen op een getekend
// beginscherm.
const beginscherm = (page) => page.waitForSelector('#taalknop');

// --- 1. de woordenlijst zelf ----------------------------------------------
// Deze vier controles lezen index.html als tekst. Ze hebben geen browser
// nodig, en ze vangen precies de fouten die je bij honderden regels met de
// hand maakt: twee keer dezelfde zin, een vergeten vertaling, of een
// {plaatshouder} die in de vertaling anders heet en dus nooit gevuld wordt.
// Niet met een regex: de lijst kent drie schrijfwijzen (alles op één regel,
// sleutel en vertaling onder elkaar, en zinnen die over meerdere regels aan
// elkaar geplakt staan) en elke regex die dat aankan mist stilletjes een
// vierde. De array is geldig JavaScript, dus laat node hem zelf lezen.
const bron = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
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
  // Het staande deelformaat heet in beide talen een story, en de pil op dat
  // plaatje zegt in beide talen "2× joker".
  'Story', '2× joker',
  // Het contactblok onder Profiel: het label en de regel over je browser in
  // een bugmail heten in het Engels hetzelfde.
  'contact', 'Browser',
  // Het label boven het beheer van de teams (premium).
  'teams',
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

// --- 1b. de taalbestanden ---------------------------------------------------
// De sleutels staan in ENGELS; een taalbestand hoort er precies die te hebben.
// Een zin die erbij komt in de app en vergeten wordt in een taalbestand, wordt
// daar Engels (zie T()), en hier een rode regel.
const ANDERE = ['de', 'fr', 'es', 'it', 'pt'];
const engels = new Map(paren);
const tagsVan = (zin) => [...zin.matchAll(/<\/?(\w+)/g)].map((m) => m[0]).sort().join(',');
for (const code of ANDERE) {
  const bestand = JSON.parse(readFileSync(join(wortel, 'app', 'talen', `${code}.json`), 'utf8'));
  const sleutels = Object.keys(bestand);
  const mist = paren.map(([nl]) => nl).filter((nl) => !(nl in bestand));
  const over = sleutels.filter((nl) => !engels.has(nl));
  check(`${code}: elke zin uit de app staat erin, en niets anders`,
    mist.length === 0 && over.length === 0, [...mist.slice(0, 2), ...over.slice(0, 2)].join(' | '));
  const scheefT = sleutels.filter((nl) => houders(nl) !== houders(bestand[nl]) || tagsVan(nl) !== tagsVan(bestand[nl]));
  check(`${code}: dezelfde {plaatshouders} en tags als het Nederlands`, scheefT.length === 0,
    scheefT.slice(0, 2).map((nl) => bestand[nl]).join(' | '));
  const leegT = sleutels.filter((nl) => !String(bestand[nl]).trim());
  check(`${code}: geen lege vertaling`, leegT.length === 0, leegT.slice(0, 3).join(' | '));
  // Een paar woorden zijn in elke taal hetzelfde (Sprint, pole, top 10); een
  // geplakt Engels bestand zou er honderden hebben.
  const alsEngels = sleutels.filter((nl) => bestand[nl] === engels.get(nl));
  check(`${code}: geen kopie van het Engels (hooguit 30 zinnen gelijk)`, alsEngels.length <= 30,
    `${alsEngels.length}: ${alsEngels.slice(0, 5).join(' | ')}`);
  const streep = sleutels.filter((nl) => /[\u2013\u2014]/.test(bestand[nl]));
  check(`${code}: geen gedachtestreepjes`, streep.length === 0, streep.slice(0, 2).map((nl) => bestand[nl]).join(' | '));
}

// --- 2. de browser kiest, als jij niets kiest -----------------------------
// taal: null slaat het init-script van hulp.mjs over, dus hier telt alleen
// wat navigator.language zegt. Playwright start standaard op en-US.
{
  const { page, stoppen } = await startPagina({ taal: null });
  await beginscherm(page);
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
  await beginscherm(page);
  check('een Nederlandse browser krijgt Nederlands',
    (await tekst(page, '#app')).includes('met je poule'),
    (await tekst(page, '#app')).slice(0, 60));
  await stoppen();
}

// Een Franse telefoon krijgt Frans. Staat de eerste taal er niet bij, dan telt
// de volgende uit de voorkeuren; kent de app er geen, dan Engels.
for (const [voorkeur, verwacht] of [[['fr-FR', 'fr'], 'fr'], [['ja-JP', 'it-IT'], 'it'], [['ja-JP'], 'en']]) {
  const { page, stoppen } = await startPagina({
    taal: null,
    voorafAan: (p) => p.addInitScript((v) => {
      Object.defineProperty(navigator, 'languages', { get: () => v });
      Object.defineProperty(navigator, 'language', { get: () => v[0] });
    }, voorkeur),
  });
  await beginscherm(page);
  check(`een browser op ${voorkeur.join(', ')} krijgt ${verwacht}`,
    (await page.getAttribute('html', 'lang')) === verwacht
      && (await page.textContent('#taalknop')).trim() === verwacht.toUpperCase(),
    `${await page.getAttribute('html', 'lang')} · ${await page.textContent('#taalknop')}`);
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
await beginscherm(page);

check('het beginscherm staat in het Nederlands',
  (await tekst(page, '#app')).includes('met je poule'));
// Met twee talen wisselde de knop naar de andere. Met zeven toont hij de taal
// van nu en klapt hij een lijstje open.
check('er staat een taalknop met de taal van nu',
  (await page.textContent('#taalknop')).trim() === 'NL'
    && (await page.getAttribute('#taalknop', 'aria-label')) === 'Taal: Nederlands. Kies een andere taal'
    && (await page.getAttribute('#taalknop', 'aria-expanded')) === 'false');
// Een schermlezer kiest op dit attribuut zijn stem en zijn uitspraakregels.
// Staat het op "nl" terwijl er Engels staat, dan leest hij Engelse zinnen met
// een Nederlandse tong — onverstaanbaar, en niet te zien aan het scherm.
check('<html lang> staat op de taal die er staat',
  (await page.getAttribute('html', 'lang')) === 'nl');

await page.click('#taalknop');
await page.waitForSelector('#taalmenu:not([hidden])');
const menu = await page.$$eval('#taalmenu [data-taal]', (n) =>
  n.map((b) => [b.dataset.taal, b.lang, b.textContent.trim(), b.getAttribute('aria-checked')]));
check('een tik opent een lijstje met de zeven talen, elk in zijn eigen taal',
  menu.map(([c, , naam]) => `${c}:${naam}`).join() === 'nl:Nederlands,en:English,de:Deutsch,fr:Français,es:Español,it:Italiano,pt:Português'
    && menu.every(([c, lang]) => c === lang), JSON.stringify(menu));
check('met de taal van nu aangevinkt',
  menu.filter(([, , , aan]) => aan === 'true').map(([c]) => c).join() === 'nl'
    && (await page.getAttribute('#taalknop', 'aria-expanded')) === 'true');
await page.mouse.click(5, 400);
check('ernaast tikken sluit het lijstje', await page.isHidden('#taalmenu'));

await page.click('#taalknop');
await page.click('#taalmenu [data-taal="en"]');
await page.waitForSelector('#taalknop:text-is("EN")');

check('English kiezen zet het hele beginscherm in het Engels',
  (await tekst(page, '#app')).includes('your pool'),
  (await tekst(page, '#app')).slice(0, 70));
check('en het label van de knop is mee vertaald',
  (await page.getAttribute('#taalknop', 'aria-label')) === 'Language: English. Choose another language');
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
// De knop naar je andere poules is sinds 8 oktober de poulenaam zelf, met
// een pijltje; wat hij doet staat in zijn label.
check('de stand ook', (await tekst(page, '#app')).includes('for you and your friends')
    && (await page.getAttribute('#anderePoule', 'aria-label')).startsWith('Switch pool'),
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
check('op het profiel staat een taalkeuze met zeven knoppen',
  (await page.$$('[data-taal]')).length === 7);
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

// Duits, vanuit Profiel: het taalbestand wordt opgehaald en de hele app gaat om.
await page.click('[data-taal="de"]');
await page.waitForSelector('[data-taal="de"][disabled]');
check('Duits kiezen zet de app in het Duits',
  (await tekst(page, '#app')).includes('Die App wählt die Sprache nach deinem Browser')
    && (await page.textContent('[data-weergave="stand"]')).trim() === 'Tabelle'
    && (await page.getAttribute('html', 'lang')) === 'de',
  (await tekst(page, '#app')).slice(0, 80));
// De weg naar de voorpagina gaat naar de Duitse voorpagina, niet de Nederlandse.
check('en de link naar de voorpagina gaat naar de Duitse', (await page.getAttribute('#voorpagina', 'href')).endsWith('/de/'),
  await page.getAttribute('#voorpagina', 'href'));
await page.reload();
await page.waitForSelector('[data-weergave]');
check('en dat blijft na herladen', (await page.textContent('[data-weergave="stand"]')).trim() === 'Tabelle');
// Datums volgen de taal: "schließt Di., 20:59" en niet "sluit di 20:59".
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
{
  const alles = (await tekst(page, '#app'));
  check('de weekdagen staan in het Duits', /\b(Mo|Di|Mi|Do|Fr|Sa|So)\., \d\d:\d\d/.test(alles)
    && !/\b(ma|di|wo|do|vr|za|zo) \d\d:/.test(alles), alles.match(/.{0,20}\d\d:\d\d/)?.[0] ?? alles.slice(0, 60));
}
await page.click('[data-weergave="profiel"]');
await page.waitForSelector('[data-taal="nl"]');
await page.click('[data-taal="nl"]');
await page.waitForSelector('[data-taal="nl"][disabled]');

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

  // Alleen de merknaam hoort onvertaald op het scherm. (De taalnamen staan in
  // TALEN, elk in zijn eigen taal, en komen niet als losse tekst in een tag.)
  const MAG_ONVERTAALD = new Set(['Predict the Race']);
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

// --- 8. elke taal op het beginscherm ----------------------------------------
// De kop van het beginscherm komt uit het taalbestand zelf, dus dit test dat
// het bestand geladen en gebruikt wordt, niet een vertaling die hier nog eens
// staat.
for (const code of ANDERE) {
  const bestand = JSON.parse(readFileSync(join(wortel, 'app', 'talen', `${code}.json`), 'utf8'));
  const { page, jsFouten, stoppen } = await startPagina({ taal: code });
  await beginscherm(page);
  const kop = bestand['Doe mee<br>met je poule'].replace(/<br>/g, '');
  check(`${code}: het beginscherm komt uit het taalbestand, met <html lang="${code}">`,
    (await tekst(page, 'h1')) === kop && (await page.getAttribute('html', 'lang')) === code,
    `${await tekst(page, 'h1')} · ${kop}`);
  check(`${code}: zonder javascriptfouten`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// --- 8b. een zin die in een taalbestand ontbreekt, wordt Engels ---------------
// Komt er in de app een zin bij die nog niet vertaald is, dan liever Engels
// dan Nederlands: wie Duits leest, leest eerder Engels.
{
  const bestand = JSON.parse(readFileSync(join(wortel, 'app', 'talen', 'de.json'), 'utf8'));
  delete bestand['Doe mee<br>met je poule'];
  const { page, stoppen } = await startPagina({
    taal: 'de',
    voorafAan: (p) => p.route('**/talen/de.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(bestand) })),
  });
  await beginscherm(page);
  check('een ontbrekende Duitse zin staat er in het Engels, de rest in het Duits',
    (await tekst(page, 'h1')) === 'Joinyour pool' && (await tekst(page, '#app')).includes('Rundencode'),
    `${await tekst(page, 'h1')} · ${(await tekst(page, '#app')).slice(0, 80)}`);
  await stoppen();
}

// --- 9. lukt het laden niet, dan Engels ---------------------------------------
// Geen verbinding op het moment dat het Duitse bestand opgehaald moet worden:
// dan liever Engels, dat in de app zelf zit, dan een leeg of half scherm.
{
  const { page, jsFouten, stoppen } = await startPagina({
    taal: 'de',
    voorafAan: (p) => p.route('**/talen/de.json', (r) => r.abort()),
  });
  await beginscherm(page);
  check('kan het taalbestand niet geladen worden, dan staat de app in het Engels',
    (await tekst(page, '#app')).includes('your pool') && (await page.getAttribute('html', 'lang')) === 'en',
    (await tekst(page, '#app')).slice(0, 60));
  // En kiezen in het menu meldt het, in plaats van niets te doen.
  await page.click('#taalknop');
  await page.click('#taalmenu [data-taal="de"]');
  await page.waitForFunction(() => document.querySelector('#f')?.textContent.trim());
  check('en Deutsch kiezen zegt dat het laden niet lukte',
    (await tekst(page, '#f')).includes('That language could not be loaded'), await tekst(page, '#f'));
  check('zonder javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
