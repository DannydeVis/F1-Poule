// Van de landingspagina naar de app, en wanneer juist niet.
//
// Sinds de landingspagina op / staat, staat de app in app/. Maar alles wat er
// al rondging wijst naar /: uitnodigingen in groepsapps (?code=RTM026), je
// eigen link (&speler=), gedeelde profielen (?profiel=), inloglinks uit de
// mail en van Google (#access_token= of ?code=<sleutel>), en elke app die op
// een beginscherm staat. Die horen allemaal nog steeds in de app uit te
// komen, met alles wat er in de adresbalk stond. Een folder te zien krijgen
// terwijl je op een uitnodiging tikte is een kapotte uitnodiging.
//
// En andersom: wie gewoon de site opent, een campagnelink volgt of op een
// ankerlink tikt, hoort de landingspagina te zien.
//
// Dit draait tegen de site zoals GitHub Pages hem serveert (startSite in
// hulp.mjs), met de nabootsing in plaats van Supabase.

import { maakControle, startSite } from './hulp.mjs';

const { check, afronden } = maakControle('doorsturen van / naar de app');

// Waar kom je uit als je deze url opent? De app zelf praat met de nabootsing,
// dus ook "de uitnodiging komt echt aan" is hier na te lopen.
//
// Gemeten aan de url waarmee de pagina werd geopend, niet aan wat er daarna in
// de adresbalk staat: de app haalt ?code= en de inlogsleutel er zelf weer uit
// zodra hij ze gebruikt heeft (zie test/uitnodiging.test.mjs).
async function landt(pad, { voorafAan } = {}) {
  const { page, url, stoppen, jsFouten } = await startSite({ voorafAan });
  const geopend = [];
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) geopend.push(f.url()); });
  await page.goto(url + pad);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(150);
  // De eerste keer dat we in app/ uitkomen; wat daarna komt is de app die de
  // adresbalk opruimt (ook dat telt als navigatie, via history.replaceState).
  const waar = new URL(geopend.find((u) => new URL(u).pathname === '/app/')
    ?? geopend[geopend.length - 1] ?? page.url());
  return { pad: waar.pathname, zoek: waar.search, hash: waar.hash, page, stoppen, jsFouten, url, geopend };
}

// ---- 1. wat naar de app hoort --------------------------------------------------
{
  const r = await landt('?code=RTM026');
  check('een uitnodiging (?code=) komt in de app uit', r.pad === '/app/' && r.zoek === '?code=RTM026',
    `${r.pad}${r.zoek}`);
  // Helemaal door: de app pakt de code op en vraagt wie je bent.
  await r.page.waitForSelector('[data-lid]', { timeout: 10000 }).catch(() => {});
  check('en de app herkent de poule meteen', (await r.page.$('[data-lid]')) !== null);
  check('zonder javascriptfouten', r.jsFouten.length === 0, r.jsFouten.join(' | '));
  await r.stoppen();
}
{
  const r = await landt('?code=RTM026&speler=lid-1');
  check('je eigen link (&speler=) gaat met alles erbij mee',
    r.pad === '/app/' && r.zoek === '?code=RTM026&speler=lid-1', `${r.pad}${r.zoek}`);
  await r.stoppen();
}
{
  const r = await landt('?profiel=ABCDEFGH');
  check('een gedeeld profiel (?profiel=) ook', r.pad === '/app/' && r.zoek === '?profiel=ABCDEFGH',
    `${r.pad}${r.zoek}`);
  await r.stoppen();
}
{
  const r = await landt('#access_token=abc.def&refresh_token=x&type=magiclink');
  check('een inloglink met de sleutel in de hash komt met hash en al in de app',
    r.pad === '/app/' && r.hash.startsWith('#access_token=abc.def'), `${r.pad}${r.hash}`);
  await r.stoppen();
}
{
  const r = await landt('?error=access_denied&error_description=Weg');
  check('een mislukte inlog (?error=) gaat ook naar de app, die hem uitlegt',
    r.pad === '/app/' && r.zoek.startsWith('?error=access_denied'), `${r.pad}${r.zoek}`);
  await r.stoppen();
}
{
  const r = await landt('', { voorafAan: (page) => page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { get: () => true });
  }) });
  check('een app die op het beginscherm van een iPhone staat opent de app, niet de folder', r.pad === '/app/', r.pad);
  await r.stoppen();
}
{
  const r = await landt('', { voorafAan: (page) => page.addInitScript(() => {
    if (!sessionStorage.getItem('al')) {
      localStorage.setItem('poule:laatste', 'pool-1');
      sessionStorage.setItem('al', '1');
    }
  }) });
  check('een terugkerende speler die de site intikt komt in zijn poule uit', r.pad === '/app/', r.pad);
  await r.stoppen();
}

// ---- 2. wat op de landingspagina hoort ---------------------------------------------
{
  // Een berichtenapp die een voorbeeld van de link maakt, doet dat in een
  // onzichtbaar browservenster dat zich als "standalone" meldt, zonder dat er
  // een poule op staat. Die hoort de voorpagina te lezen, met het deelplaatje,
  // en niet de app: dat gaf in iMessage en WhatsApp een klein pictogram.
  const r = await landt('', { voorafAan: (page) => page.addInitScript(() => {
    const echt = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q.includes('display-mode: standalone')
      ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : echt(q));
  }) });
  check('een linkvoorbeeld (standalone, niets op het toestel) blijft op de voorpagina', r.pad === '/', r.pad);
  await r.stoppen();
}
{
  const r = await landt('');
  check('een nieuwe bezoeker ziet de landingspagina', r.pad === '/', r.pad);
  check('met de kop erop', (await r.page.textContent('h1')).includes('Voorspel de grid'),
    await r.page.textContent('h1'));
  await r.stoppen();
}
{
  const r = await landt('?utm_source=whatsapp&utm_campaign=seizoen');
  check('een campagnelink (utm_) blijft op de landingspagina', r.pad === '/', `${r.pad}${r.zoek}`);
  await r.stoppen();
}
{
  const r = await landt('#faq');
  check('een ankerlink (#faq) ook', r.pad === '/' && r.hash === '#faq', `${r.pad}${r.hash}`);
  await r.stoppen();
}
{
  const r = await landt('', { voorafAan: (page) => page.addInitScript(() => {
    localStorage.setItem('poule:taal', 'en');
  }) });
  check('alleen een taalkeuze op dit toestel is nog geen poule', r.pad === '/', r.pad);
  await r.stoppen();
}
{
  // Een speler met een poule die vanaf de Engelse pagina bewust naar de
  // Nederlandse klikt: die wil de folder lezen, niet terug de app in.
  const { page, url, stoppen } = await startSite({ voorafAan: (p) => p.addInitScript(() => {
    localStorage.setItem('poule:laatste', 'pool-1');
  }) });
  await page.goto(url + 'en/');
  await page.click('footer a[hreflang="nl"]');
  await page.waitForLoadState('domcontentloaded');
  check('wie vanaf een eigen pagina naar / klikt blijft daar, ook met een poule',
    new URL(page.url()).pathname === '/', page.url());
  await stoppen();
}

// ---- 3. het codeveld op de landingspagina -------------------------------------------
{
  const { page, url, stoppen } = await startSite();
  await page.goto(url);
  await page.fill('#code', 'rtm026');
  await page.click('.codeveld button');
  await page.waitForURL(/\/app\//);
  const waar = new URL(page.url());
  check('het codeveld stuurt je met de code naar de app', waar.pathname === '/app/'
    && waar.searchParams.get('code') === 'rtm026', page.url());
  await page.waitForSelector('[data-lid]', { timeout: 10000 }).catch(() => {});
  check('en de app neemt hem in kleine letters ook aan', (await page.$('[data-lid]')) !== null);
  await stoppen();
}

// ---- 4. wat de app zelf aan links uitdeelt -----------------------------------------
// Een nieuwe uitnodiging hoort meteen naar app/ te wijzen; dan is het doorsturen
// alleen nog nodig voor wat er al rondging.
{
  const { page, url, stoppen } = await startSite({ taal: 'nl' });
  await page.goto(url + 'app/?code=RTM026');
  await page.waitForSelector('[data-lid]');
  await page.click('[data-lid]');
  await Promise.race([page.waitForSelector('#koppelnunniet'), page.waitForSelector('[data-race]')]);
  if (await page.$('#koppelnunniet')) await page.click('#koppelnunniet');
  await page.waitForSelector('[data-race]');
  await page.click('[data-weergave="poule"]');
  await page.waitForSelector('#agendalink');
  const agenda = await page.getAttribute('a.knop[href^="webcal"]', 'href');
  check('de agendalink wijst naar de hoofdmap, niet naar app/kalender.ics',
    agenda === url.replace(/^http/, 'webcal') + 'kalender.ics', String(agenda));
  const bestand = await page.evaluate(async (a) => (await fetch(a.replace(/^webcal/, 'http'))).status, agenda);
  check('en dat bestand bestaat', bestand === 200, String(bestand));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
