// De omroep: wat de app zegt, ook voor wie het niet ziet staan.
//
// De app vervangt bij elke tik app.innerHTML in zijn geheel. Voor een
// schermlezer betekent dat: de hele DOM wordt onder hem vandaan vervangen, en
// daar wordt niets van voorgelezen. Elke melding ("Jokers staan aan, vanaf
// nu") en elke foutregel kwam dus wél op het scherm en niet bij iedereen aan.
//
// Wat hier vastligt:
//   1. Het omroepvak staat buiten #app en blijft over een hertekening heen
//      hetzelfde element. Dat is de hele truc: een live region die tegelijk
//      met zijn inhoud ontstaat wordt níét voorgelezen.
//   2. Het is onzichtbaar, maar niet weggehaald -- display:none en
//      visibility:hidden halen het uit de voorleesvolgorde, en dan valt er
//      niets meer te roepen.
//   3. Een melding belandt erin.
//   4. Een foutregel ook.
//   5. Twee keer dezelfde tekst wordt opnieuw geroepen, want twee keer
//      dezelfde fout is twee keer iets om te weten.

import { maakControle, startPagina, meedoen, openRace, kiesTien } from './hulp.mjs';

const { check, afronden } = maakControle('omroep voor schermlezers');
const { page, jsFouten, url, stoppen } = await startPagina();

const tekst = async (kies) => (await page.textContent(kies)).replace(/\s+/g, ' ').trim();
const geroepen = () => page.evaluate(() =>
  (document.getElementById('omroep')?.textContent ?? '').trim());
// De omroep maakt eerst leeg en zet daarna pas, zodat dezelfde tekst opnieuw
// een verandering is. Dat is één tik later dan het scherm.
const wachtOpOmroep = () => page.waitForFunction(() =>
  (document.getElementById('omroep')?.textContent ?? '').trim().length > 0,
  null, { timeout: 5000 });

await meedoen(page);

// --- 1. buiten #app, en hetzelfde element na een hertekening --------------

check('het omroepvak staat buiten #app',
  await page.evaluate(() => {
    const el = document.getElementById('omroep');
    return !!el && !document.getElementById('app').contains(el);
  }));

check('en het staat op polite, niet assertive',
  (await page.getAttribute('#omroep', 'aria-live')) === 'polite');

// Een merkteken op het element zelf. Overleeft dat een hertekening, dan is het
// nog hetzelfde element -- en alleen dán wordt een verandering voorgelezen.
await page.evaluate(() => { document.getElementById('omroep').dataset.merk = 'x'; });
await page.click('[data-weergave="stand"]');
await page.waitForSelector('[data-weergave]');
await page.click('[data-weergave="races"]');
await page.waitForSelector('[data-race]');

check('en het blijft over hertekeningen heen hetzelfde element',
  (await page.getAttribute('#omroep', 'data-merk')) === 'x');

// --- 2. onzichtbaar, maar niet uit de voorleesvolgorde --------------------

const stijl = await page.evaluate(() => {
  const s = getComputedStyle(document.getElementById('omroep'));
  return { display: s.display, zicht: s.visibility, breed: s.width };
});
check('het is onzichtbaar maar niet display:none of visibility:hidden',
  stijl.display !== 'none' && stijl.zicht !== 'hidden', JSON.stringify(stijl));

// --- 3. een melding wordt geroepen ----------------------------------------

await page.click('[data-weergave="poule"]');
await page.waitForSelector('#jokersKnop');
await page.click('#jokersKnop');
await page.waitForSelector('.melding');
await wachtOpOmroep();

check('een melding op het scherm wordt ook geroepen',
  (await geroepen()) === (await tekst('.melding')),
  `${await geroepen()} | ${await tekst('.melding')}`);

// --- 4. en een foutregel ook ----------------------------------------------
// Een echt foutpad, geen nagebootst: een vreemdeling klikt een speler aan die
// bij een ander toestel hoort en probeert op te slaan. Dat levert een .err op
// en geen melding, dus dit is het andere pad door omroepScherm().

// Een speler die aan een account elders hangt, net als in
// eigen-inzending.test.mjs -- dat is wat een echte vreemdeling tegenkomt.
await page.evaluate(() => {
  globalThis.__db.auth_users.push(
    { id: 'account-9', is_anonymous: true, email: null, new_email: null });
  globalThis.__db.pool_members.push(
    { member_id: 'lid-9', pool_id: 'pool-1', display_name: 'Joey', user_id: 'account-9' });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(globalThis.__db));
});
await page.evaluate(() => localStorage.clear());
await page.goto(url);
await page.fill('#code', 'RTM026');
await page.click('#mee');
await page.waitForSelector('[data-lid]');
await page.click('[data-lid]:has(.nm:text-is("Joey"))');
await page.waitForSelector('.meldingbalk, [data-race]');

await page.click('[data-weergave="races"]');
await openRace(page, 'Shanghai');
await page.click('[data-tab="race"]');
await page.waitForSelector('#paneel');
await kiesTien(page);
await page.click('#opslaan');
await page.waitForSelector('.err:not(:empty)');
await wachtOpOmroep();

const fout = await tekst('.err');
check('de foutregel is niet leeg, anders bewijst de check hieronder niets',
  fout.length > 20, fout);
check('en een foutregel wordt geroepen',
  (await geroepen()) === fout, `${await geroepen()} | ${fout}`);

// --- 5. dezelfde fout twee keer is twee keer iets om te weten -------------
// Dit is de subtiele: voor een live region is dezelfde tekst geen verandering
// en dus stilte, terwijl je de tweede keer net zo goed wilt horen dat het
// weer misging. De omroep maakt daarom eerst leeg en zet daarna pas.
//
// Het vak hier zelf leegmaken zou die check vacuüm maken -- dan slaagt hij
// ook als de app het niet doet. Dus wordt de volgorde opgenomen zoals een
// schermlezer hem zou meekrijgen: er moet een lege tussenstap in zitten,
// anders verandert er niets en wordt er niets gezegd.

await page.evaluate(() => {
  window.__reeks = [];
  const vak = document.getElementById('omroep');
  new MutationObserver(() => window.__reeks.push(vak.textContent))
    .observe(vak, { childList: true, characterData: true, subtree: true });
});

await page.click('#opslaan');
await page.waitForFunction(() => (window.__reeks ?? []).some(t => t.trim()),
  null, { timeout: 5000 });

const reeks = await page.evaluate(() => window.__reeks);
check('dezelfde fout een tweede keer wordt opnieuw geroepen',
  reeks.some(t => t.trim() === fout), JSON.stringify(reeks).slice(0, 120));
check('en er zit een lege tussenstap in, anders hoort een schermlezer niets',
  reeks.indexOf('') !== -1 && reeks.indexOf('') < reeks.findIndex(t => t.trim() === fout),
  JSON.stringify(reeks.map(t => t.slice(0, 12))));

check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));

await stoppen();
process.exit(afronden() ? 0 : 1);
