// "Herinner mij voor het volgende seizoen" op de voorpagina (15 november).
//
// Danny: ja, bewaar daarvoor mailadressen van mensen die nog geen speler zijn,
// en zet het in de privacyverklaring. Wat hier vastligt:
//   1. Het blok staat op de voorpagina in alle zeven talen, met het jaar erin,
//      en alleen als javascript het aanzet (zonder werkt het formulier niet).
//   2. Een adres dat geen mailadres is gaat de deur niet uit.
//   3. Een goed adres gaat naar herinnering_aanmelden(), met de taal van de
//      pagina en verder niets, en daarna staat er dat het genoteerd is.
//   4. Lukt het niet, dan staat dat er en kun je het opnieuw proberen.
//   5. Het adres komt nergens anders: niet in de adresbalk, niet in de opslag
//      van de browser, niet bij een andere website.
//   6. De privacyverklaring noemt het, in het Nederlands en in het Engels.
//   7. Na de einddatum is het blok weg.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, wortel } from './hulp.mjs';
import { teksten, TALEN, HERINNER } from '../site/teksten.mjs';

const { check, afronden } = maakControle('herinner mij voor het volgende seizoen');
const PAD = { nl: '', en: 'en/', de: 'de/', fr: 'fr/', es: 'es/', it: 'it/', pt: 'pt/' };
const jaar = (t) => t.replaceAll('{jaar}', HERINNER.jaar);

// ---- zonder browser: elke taal heeft de teksten, en de pagina het blok ---------------
for (const taal of TALEN) {
  const h = teksten[taal].herinner;
  const html = readFileSync(join(wortel, PAD[taal], 'index.html'), 'utf8');
  check(`${taal}: alle teksten staan er, en het jaar staat in de kop`,
    !!h && ['kop', 'tekst', 'label', 'plek', 'knop', 'ok', 'ongeldig', 'fout', 'privacy'].every((k) => h[k]?.length > 2)
      && h.kop.includes('{jaar}') && h.ok.includes('{jaar}'), JSON.stringify(Object.keys(h ?? {})));
  check(`${taal}: de voorpagina heeft het blok, verborgen tot javascript het aanzet`,
    /<section class="blok" id="herinner" data-herinner-tot="[^"]+" hidden>/.test(html)
      && html.includes(`data-taal="${taal}"`) && html.includes('herinner.js'));
  check(`${taal}: geen streepjes of emoji in de teksten`,
    !Object.values(h).some((t) => /[–—]|\p{Extended_Pictographic}/u.test(t)));
}
check('het veld is een mailveld met een label', (() => {
  const html = readFileSync(join(wortel, 'index.html'), 'utf8');
  return /<label for="herinnermail">/.test(html) && /<input id="herinnermail" type="email"[^>]*autocomplete="email"/.test(html);
})());
for (const [pad, zin] of [['privacy/index.html', 'herinnering voor het volgende seizoen'], ['en/privacy/index.html', 'reminder for next season']]) {
  const html = readFileSync(join(wortel, pad), 'utf8');
  check(`de privacyverklaring noemt het (${pad.split('/')[0]})`, html.includes(zin) && /gooien we het adres weg|we delete the address/.test(html));
}

// ---- in de browser ---------------------------------------------------------------------
const { page, context, url, extern, jsFouten, stoppen } = await startSite({ taal: null });
const verzoeken = [];
let antwoord = { status: 200, body: '"ok"' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
await context.route((u) => /\/rest\/v1\/rpc\/herinnering_aanmelden$/.test(u.pathname), (route) => {
  const v = route.request();
  if (v.method() !== 'POST') return route.fulfill({ status: 204, headers: cors, body: '' });
  verzoeken.push(JSON.parse(v.postData() ?? 'null'));
  return route.fulfill({ status: antwoord.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: antwoord.body });
});
const tekst = async (kies) => ((await page.textContent(kies)) ?? '').replace(/\s+/g, ' ').trim();

await page.goto(url);
await page.waitForSelector('#herinner:not([hidden])');
check('met javascript staat het blok er, met het jaar in de kop',
  (await tekst('#herinner h2')) === jaar(teksten.nl.herinner.kop), await tekst('#herinner h2'));

await page.fill('#herinnermail', 'geen-adres');
await page.click('#herinner button');
check('iets wat geen mailadres is gaat de deur niet uit, en dat staat erbij',
  verzoeken.length === 0 && (await tekst('.herinnerstatus')) === teksten.nl.herinner.ongeldig, await tekst('.herinnerstatus'));

await page.fill('#herinnermail', '  Iemand@Voorbeeld.nl ');
await page.click('#herinner button');
await page.waitForFunction(() => document.querySelector('.herinnerstatus')?.dataset.soort === 'ok');
check('een goed adres gaat naar herinnering_aanmelden, met de taal van de pagina en verder niets',
  verzoeken.length === 1 && JSON.stringify(verzoeken[0]) === JSON.stringify({ p_email: 'Iemand@Voorbeeld.nl', p_taal: 'nl' }),
  JSON.stringify(verzoeken));
check('daarna staat er dat het genoteerd is, met het jaar',
  (await tekst('.herinnerstatus')) === jaar(teksten.nl.herinner.ok), await tekst('.herinnerstatus'));
check('en is het veld leeg en dicht, zodat je niet twee keer stuurt',
  await page.$eval('#herinnermail', (i) => i.value === '' && i.disabled));
check('het adres staat niet in de adresbalk en niet in de opslag van de browser',
  !page.url().includes('oorbeeld') && await page.evaluate(() =>
    !JSON.stringify({ ...localStorage, ...sessionStorage }).includes('oorbeeld') && !document.cookie.includes('oorbeeld')));
check('en ging niet naar een andere website', !extern.some((u) => u.includes('oorbeeld')), extern.join(' '));

// In het Engels, en het gaat mis.
antwoord = { status: 500, body: '{}' };
await page.goto(`${url}en/`);
await page.waitForSelector('#herinner:not([hidden])');
await page.fill('#herinnermail', 'someone@example.com');
await page.click('#herinner button');
await page.waitForFunction(() => document.querySelector('.herinnerstatus')?.dataset.soort === 'fout');
check('lukt het niet, dan staat dat er, in de taal van de pagina',
  (await tekst('.herinnerstatus')) === teksten.en.herinner.fout && verzoeken.at(-1)?.p_taal === 'en', await tekst('.herinnerstatus'));
check('en kun je het opnieuw proberen', await page.$eval('#herinner button', (b) => !b.disabled));
antwoord = { status: 200, body: '"druk"' };
await page.click('#herinner button');
await page.waitForTimeout(400);
check('zegt de database dat het te druk is, dan is dat ook "probeer het later"',
  (await tekst('.herinnerstatus')) === teksten.en.herinner.fout);
antwoord = { status: 200, body: '"ongeldig"' };
await page.click('#herinner button');
await page.waitForFunction(() => document.querySelector('.herinnerstatus')?.dataset.soort === 'ongeldig');
check('en vindt de database het adres ongeldig, dan staat dat er', (await tekst('.herinnerstatus')) === teksten.en.herinner.ongeldig);

check('op 360 pixels past het blok', await (async () => {
  await page.setViewportSize({ width: 360, height: 760 });
  return page.evaluate(() => {
    const f = document.querySelector('.herinner div').getBoundingClientRect();
    return f.right <= 360 && document.querySelector('#herinner button').getBoundingClientRect().right <= 360;
  });
})());

// Na de einddatum: de pagina staat misschien nog in een cache, dus het script kijkt zelf.
await page.clock.install({ time: new Date(Date.parse(HERINNER.tot) + 864e5) });
await page.goto(url);
await page.waitForTimeout(500);
check('na de einddatum blijft het blok verborgen', await page.$eval('#herinner', (b) => b.hidden));

check('geen javascriptfouten', jsFouten.length === 0, jsFouten.join(' | '));
await stoppen();
process.exit(afronden() ? 0 : 1);
