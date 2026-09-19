// "Zet op beginscherm" — en de uitleg dat het kan.
//
// "Kan je maken dat deze app geïnstalleerd kan worden via de 'zet op
// beginscherm' op je telefoon of iPad. En daarbij een onboarding bij"
//
// De app was technisch al installeerbaar: het manifest stond er met een eigen
// venster en maskable pictogrammen. Wat ontbrak was dat iemand het ooit te
// zien kreeg. Twee wegen, want de browsers zijn het oneens:
//
//   Android/Chrome  geeft ons een beforeinstallprompt en dan is er een echte
//                   knop te maken die de installatie start.
//   iPhone/iPad     kent die API niet. De enige weg is Deel → Zet op
//                   beginscherm, dus daar moeten we naar wijzen.
//
// En op allebei: wie het niet wil, wil het één keer niet.

import { maakControle, startPagina } from './hulp.mjs';

const { check, afronden } = maakControle('zet op beginscherm');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) '
  + 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// De prompt van de browser naspelen. Playwright kan geen echte
// beforeinstallprompt afvuren — dat doet Chrome alleen bij een echte
// installatie — dus we sturen er zelf een met hetzelfde oppervlak.
const stuurPrompt = (page) => page.evaluate(() => {
  const ev = new Event('beforeinstallprompt');
  ev.prompt = () => { window.__geprompt = (window.__geprompt ?? 0) + 1; return Promise.resolve(); };
  dispatchEvent(ev);
});

// ---- de gewone desktopbrowser: niets beloven ---------------------
{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.waitForSelector('#code');

  check('zonder prompt en zonder iOS staat er geen uitnodiging',
    (await page.$('#installeer')) === null && (await page.$('#installweg')) === null);

  // ---- en zodra de browser wél zegt dat het kan --------------------
  await stuurPrompt(page);
  await page.waitForSelector('#installeer');

  check('komt de prompt binnen, dan verschijnt de knop meteen op het beginscherm',
    await page.isVisible('#installeer'));
  check('met een zin die uitlegt wat je eraan hebt',
    /beginscherm/i.test(await page.textContent('.veldblok:has(#installeer)')));

  await page.click('#installeer');
  await page.waitForSelector('#installeer', { state: 'detached' });

  check('de knop roept de prompt van de browser aan',
    (await page.evaluate(() => window.__geprompt)) === 1);
  check('en verdwijnt daarna, want zo\'n prompt is eenmalig',
    (await page.$('#installeer')) === null);

  // Nog een keer aanbieden mag: de browser stuurt zelf een nieuwe prompt als
  // de installatie niet doorging.
  await stuurPrompt(page);
  await page.waitForSelector('#installeer');
  check('biedt de browser hem opnieuw aan, dan staat de knop er weer',
    await page.isVisible('#installeer'));

  await page.click('#installweg');
  await page.waitForSelector('#installweg', { state: 'detached' });
  check('"nu niet" haalt het blok weg', (await page.$('#installeer')) === null);

  await page.reload();
  await page.waitForSelector('#code');
  await stuurPrompt(page);
  await page.waitForTimeout(120);
  check('en onthoudt dat ook na herladen, ook als de browser blijft aanbieden',
    (await page.$('#installeer')) === null
    && (await page.evaluate(() => localStorage.getItem('poule:installweg'))) === '1');

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- de iPhone: geen API, dus uitleggen ---------------------------
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  await page.waitForSelector('#installweg');

  const blok = await page.textContent('.veldblok:has(#installweg)');
  check('op een iPhone staat de uitleg er uit zichzelf, zonder prompt',
    await page.isVisible('#installweg'));
  check('en die wijst naar Deel → Zet op beginscherm',
    /Deel/.test(blok) && /beginscherm/i.test(blok), blok.replace(/\s+/g, ' ').trim());
  check('met het deel-teken erbij, want een instructie naar een knop die je '
    + 'niet ziet is een halve instructie',
    await page.isVisible('.veldblok:has(#installweg) .deelicoon'));
  check('en zonder installatieknop, want die API bestaat daar niet',
    (await page.$('#installeer')) === null);

  // Het icoon staat middenin een zin en moet met de letters meelopen.
  const maat = await page.$eval('.deelicoon', (n) => {
    const s = getComputedStyle(n);
    return { hoog: n.getBoundingClientRect().height, regel: parseFloat(s.fontSize) };
  });
  check('het deel-teken loopt mee met de tekst en blaast de regel niet op',
    maat.hoog > 8 && maat.hoog < maat.regel * 2, `${maat.hoog.toFixed(1)}px`);

  await page.click('#installweg');
  await page.waitForSelector('#installweg', { state: 'detached' });
  await page.reload();
  await page.waitForSelector('#code');
  check('ook hier is "nu niet" definitief', (await page.$('#installweg')) === null);

  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- wie hem al geïnstalleerd heeft, hoeft niets te lezen ---------
//
// Allebei de manieren waarop een browser dat meldt: iOS zet navigator
// .standalone, de rest beantwoordt de mediaquery display-mode.
{
  const { page, jsFouten, stoppen } = await startPagina({ userAgent: IPHONE });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true });
  });
  await page.reload();
  await page.waitForSelector('#code');
  check('draait de app al als app op een iPhone, dan valt het blok weg',
    (await page.$('#installweg')) === null && (await page.$('#installeer')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

{
  const { page, jsFouten, stoppen } = await startPagina();
  await page.addInitScript(() => {
    const echt = matchMedia.bind(window);
    window.matchMedia = (q) => q === '(display-mode: standalone)'
      ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} }
      : echt(q);
  });
  await page.reload();
  await page.waitForSelector('#code');
  await stuurPrompt(page);
  await page.waitForTimeout(120);
  check('en staat hij al in een eigen venster, dan ook niet — zelfs niet als '
    + 'de browser hem alsnog aanbiedt',
    (await page.$('#installeer')) === null);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- en het manifest zelf klopt nog ------------------------------
{
  const { page, url, jsFouten, stoppen } = await startPagina();
  const manifest = await page.evaluate(async (u) =>
    (await fetch(u + 'manifest.webmanifest')).json(), url);

  check('het manifest opent in een eigen venster', manifest.display === 'standalone');
  check('en heeft een maskable pictogram voor Android',
    manifest.icons.some((i) => (i.purpose ?? '').includes('maskable')), JSON.stringify(manifest.icons));

  const appel = await page.getAttribute('link[rel="apple-touch-icon"]', 'href');
  const ok = await page.evaluate(async (u) => (await fetch(u)).ok, url + appel);
  check('en iOS heeft een eigen, vullend pictogram dat ook echt bestaat', ok, appel);
  check('geen javascriptfouten in de console', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
