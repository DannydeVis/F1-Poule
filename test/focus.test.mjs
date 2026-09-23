// De focus overleeft een hertekening.
//
// Elke tik vervangt app.innerHTML in zijn geheel, dus het element dat de focus
// had bestaat daarna niet meer en de focus valt terug op de body. Gemeten
// vóór deze wijziging: tab naar de navigatie en druk Enter -> focus kwijt. Zet
// een tabblad om in het racescherm -> focus kwijt. Wie met een toetsenbord
// werkt moet dus na élke handeling opnieuw vanaf het begin van de pagina
// tabben, en dat maakt de app zonder muis in de praktijk onbruikbaar.
//
// Wat hier vastligt:
//   1. Na een schermwissel staat de focus nog op de knop die je indrukte.
//   2. Ook binnen een scherm, bij een tabwissel -- het geval dat je het vaakst
//      tegenkomt en dat het meest kostte.
//   3. De ring is zichtbaar, anders weet je wel wáár je bent maar zie je het
//      niet.
//   4. Er wordt niets gestolen: staat de focus al ergens, dan blijft hij daar.
//   5. Bestaat de knop niet meer, dan valt de focus op de nieuwe inhoud en
//      niet op de body. De volgende Tab begint dan waar je bent.

import { maakControle, startPagina, meedoen } from './hulp.mjs';

const { check, afronden } = maakControle('focus overleeft een hertekening');
const { page, jsFouten, stoppen } = await startPagina();

// Waar staat de focus, en is de ring te zien.
const focus = () => page.evaluate(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { waar: '(body)', ring: false };
  return {
    waar: el.id ? '#' + el.id
      : el.getAttribute('data-weergave') ? 'weergave=' + el.getAttribute('data-weergave')
      : el.getAttribute('data-tab') ? 'tab=' + el.getAttribute('data-tab')
      : el.className ? '.' + String(el.className).split(' ')[0]
      : el.tagName.toLowerCase(),
    ring: el.matches(':focus-visible'),
  };
});

await meedoen(page);

// ---- 1. een schermwissel via het toetsenbord -----------------------------

await page.focus('[data-weergave="stand"]');
await page.keyboard.press('Enter');
await page.waitForSelector('[data-weergave]');

{
  const f = await focus();
  check('na een schermwissel staat de focus nog op de knop die je indrukte',
    f.waar === 'weergave=stand', JSON.stringify(f));
  check('en de ring is te zien, anders weet je het wel maar zie je het niet',
    f.ring, JSON.stringify(f));
}

// ---- 2. een tabwissel binnen het racescherm ------------------------------
// Dit is het geval dat het meest kostte: het overkomt je bij elke handeling
// in het scherm waar je het langst zit.

await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
await page.click('[data-race]');
await page.waitForSelector('#paneel');

await page.focus('[data-tab="race"]');
await page.keyboard.press('Enter');
await page.waitForSelector('#paneel');

{
  const f = await focus();
  check('en bij een tabwissel binnen hetzelfde scherm net zo',
    f.waar === 'tab=race', JSON.stringify(f));
}

// ---- 4. er wordt niets gestolen ------------------------------------------
// Een hertekening terwijl de focus ergens staat mag hem daar laten staan.
// Zonder die waarborg zou "herstellen" ook mogen betekenen: altijd terug naar
// het laatste handvat springen, ook als je inmiddels ergens anders staat.
//
// Dat is alleen te meten met een element dat zélf geen handvat heeft -- geen
// id en geen data-attribuut -- want anders wijst het handvat naar precies het
// element waar de focus al staat en komt het met en zonder waarborg op
// hetzelfde neer. Mijn eerste opzet deed dat wel en bewees dus niets.
//
// De agendalink op het poulescherm is in de hele app de enige knop die aan
// die beschrijving voldoet. Gaat hij ooit weg, dan zakt deze test en niet de
// app -- zoek dan een andere.

await page.click('[data-weergave="poule"]');
await page.waitForSelector('[data-weergave]');
await page.focus('[data-weergave="poule"]');

const agenda = await page.$('#app a.knop');
check('er is een knop zonder eigen handvat om dit mee te meten',
  agenda !== null);
await agenda.focus();
const voor = await focus();
check('en de focus staat erop', voor.waar === '.knop', JSON.stringify(voor));

await page.evaluate(() => {
  // Een hertekening uitlokken zonder ergens op te klikken: een leeg element
  // erbij en er weer af is genoeg om de waarnemer te laten vuren.
  const p = document.createElement('span');
  document.getElementById('app').appendChild(p);
  p.remove();
});
await page.waitForTimeout(100);

check('een hertekening pakt de focus niet af van waar hij al stond',
  JSON.stringify(await focus()) === JSON.stringify(voor),
  `${JSON.stringify(voor)} -> ${JSON.stringify(await focus())}`);

// ---- 3. een knop die er daarna niet meer is ------------------------------
// Op een smal scherm, want de terugknop bestaat alleen daar: op desktop staat
// de lijst er altijd naast en is er niets om naar terug te gaan. Dat was ook
// precies de valkuil -- op 1280 breed liet page.focus('#terug') de focus
// gewoon op de body staan, en dan meet je niets.
//
// Deze knop verdwijnt écht: je drukt hem in, de detailweergave sluit, en hij
// is er niet meer. Er valt dan niets te herstellen, en de focus hoort naar de
// nieuwe inhoud te gaan en niet naar de body -- want vanaf de body begint de
// volgende Tab weer bovenaan de pagina.

await page.setViewportSize({ width: 390, height: 844 });
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');
await page.click('[data-race]');
await page.waitForSelector('#paneel');

await page.focus('#terug');
check('de terugknop is op een smal scherm wél met het toetsenbord te bereiken',
  (await focus()).waar === '#terug', JSON.stringify(await focus()));

await page.keyboard.press('Enter');
await page.waitForSelector('[data-race]');

check('en hij is daarna echt weg, anders bewijst het hieronder niets',
  (await page.$('#terug')) === null);
check('een knop die verdwijnt laat de focus niet op de body vallen',
  (await focus()).waar !== '(body)', JSON.stringify(await focus()));
check('maar op de nieuwe inhoud',
  (await focus()).waar === '.hoofd', JSON.stringify(await focus()));

// En de volgende Tab moet dan ook echt in de middenkolom uitkomen en niet
// weer bovenaan. Zonder die controle zegt het bovenstaande nog niets.
await page.keyboard.press('Tab');
check('zodat de volgende Tab binnen de middenkolom landt',
  await page.evaluate(() => {
    const el = document.activeElement;
    return !!el && !!el.closest('.hoofd');
  }), JSON.stringify(await focus()));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
