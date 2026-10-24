// Het blok "De app" op de voorpagina (24 oktober).
//
// Aanleiding: "Op dit moment heb ik nog geen IOS of Android app. Ik denk
// namelijk dat mensen daar wel echt naar zoeken en misschien skippen als ze
// zien dat er geen app is." Predict the Race staat niet in de App Store of
// Google Play. Dit blok en de vraag in de FAQ zeggen hoe hij toch als app op je
// telefoon komt.
//
// Wat hier vastligt:
//   1. In alle zeven talen: het blok als 06 en de FAQ als 07; een link ernaar
//      in de hero; drie kaarten (iPhone, Android, computer) met hun stappen; de
//      QR-code op de computerkaart, met een alt; de knop "Installeer de app"
//      verborgen; het manifest gelinkt, anders stellen Chrome en Edge de vraag
//      om te installeren niet; "Is er een app voor iPhone en Android?" als
//      tweede vraag in de FAQ.
//   2. De QR-code bestaat, en het domein is nog dat waar hij naartoe wijst
//      (anders opnieuw maken met scripts/maak-qr.py).
//   3. Op een computer: de computerkaart vooraan met "jouw toestel". De knop
//      komt pas als de browser aanbiedt om te installeren; zijn eigen balk
//      blijft dan weg, een tik stelt de vraag en daarna is de knop weg. Ook als
//      dat aanbod komt voordat de knop er is.
//   4. Op een iPhone en op Android hun eigen kaart vooraan; op een iPhone geen
//      knop (Safari kent dat aanbod niet).
//   5. Op een telefoon past het blok in de breedte, en geen javascriptfouten.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, startSite, wortel } from './hulp.mjs';
import { teksten, TALEN, BASIS } from '../site/teksten.mjs';

const { check, afronden } = maakControle('het blok "De app" op de voorpagina');
const ontsnap = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

// ---- 1. in alle zeven talen ---------------------------------------------------------
for (const c of TALEN) {
  const t = teksten[c].app;
  const p = c === 'nl' ? '' : '../';
  const html = readFileSync(join(wortel, c === 'nl' ? 'index.html' : `${c}/index.html`), 'utf8');
  const blok = /<section class="blok" id="app">[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
  const faq = /<section class="blok" id="faq">[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
  check(`${c}: het blok staat er als 06, met zijn kop, en de FAQ is 07`,
    blok.includes('<b>06</b>') && ontsnap(blok).includes(t.kop) && faq.includes('<b>07</b>'));
  check(`${c}: de hero linkt naar het blok`, ontsnap(html).includes(`<a href="#app">${t.hero} <span aria-hidden="true">↓</span></a>`));
  const kaarten = ['iphone', 'android', 'computer'].map((k) => {
    const kaart = new RegExp(`<li class="onthul" data-toestel="${k}"[\\s\\S]*?</ol>`).exec(blok)?.[0] ?? '';
    return ontsnap(kaart).includes(`<h3>${t[k][0]}</h3>`) && t[k][1].every((stap) => ontsnap(kaart).includes(`<li>${stap}</li>`));
  });
  check(`${c}: drie kaarten, iPhone, Android en computer, elk met zijn stappen`, kaarten.every(Boolean), kaarten.join());
  check(`${c}: de QR-code op de computerkaart, met een alt`,
    ontsnap(blok).includes(`<img class="qr" src="${p}site/beeld/app-qr.svg" alt="${t.qrAlt}"`)
      && blok.indexOf('class="qr"') > blok.indexOf('data-toestel="computer"'));
  check(`${c}: de knop Installeer staat er, verborgen`,
    ontsnap(blok).includes(`<button class="knop" type="button" data-installeer hidden>${t.knop}</button>`));
  check(`${c}: het manifest is gelinkt`, html.includes(`<link rel="manifest" href="${p}manifest.webmanifest">`));
  const tweede = ontsnap(/<details><summary><h3>([^<]*)<\/h3><\/summary>(?:[\s\S]*?<details><summary><h3>([^<]*)<\/h3>)/.exec(faq)?.[2] ?? '');
  check(`${c}: de tweede vraag in de FAQ gaat over een app voor iPhone en Android`,
    tweede === teksten[c].faq.items[1][0] && /iPhone/.test(tweede) && /Android/.test(tweede), tweede);
}

// ---- 2. de QR-code ----------------------------------------------------------------------
{
  const svg = readFileSync(join(wortel, 'site', 'beeld', 'app-qr.svg'), 'utf8');
  check('de QR-code is een svg van 33 bij 33 modules (versie 3), donker op wit',
    svg.startsWith('<svg') && svg.includes('viewBox="0 0 33 33"') && svg.includes('fill="#fff"'));
  const manifest = JSON.parse(readFileSync(join(wortel, 'manifest.webmanifest'), 'utf8'));
  check('hij wijst naar https://predicttherace.com/app/: is BASIS veranderd, maak hem dan opnieuw (scripts/maak-qr.py)',
    `${BASIS}/${manifest.start_url}` === 'https://predicttherace.com/app/', `${BASIS}/${manifest.start_url}`);
}

// Welke kaart staat als eerste in beeld, en welke hebben "jouw toestel"?
const kaartenInBeeld = (page) => page.evaluate(() => {
  const li = [...document.querySelectorAll('#app [data-toestel]')];
  const plek = (e) => e.getBoundingClientRect();
  li.sort((a, b) => plek(a).top - plek(b).top || plek(a).left - plek(b).left);
  return { eerste: li[0]?.dataset.toestel,
    jouw: li.filter((e) => getComputedStyle(e.querySelector('.jouw')).display !== 'none').map((e) => e.dataset.toestel) };
});
// Wat Chrome doet als hij aanbiedt te installeren, maar dan nagebootst.
const AANBOD = () => {
  const e = new Event('beforeinstallprompt', { cancelable: true });
  e.prompt = () => { window.__gevraagd = (window.__gevraagd ?? 0) + 1; };
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  dispatchEvent(e);
  return e.defaultPrevented;
};

// ---- 3. op een computer -----------------------------------------------------------------
{
  const { page, url, jsFouten, stoppen } = await startSite();
  await page.goto(url + 'en/');
  await page.waitForSelector('#app');
  const k = await kaartenInBeeld(page);
  check('op een computer staat de computerkaart vooraan, als enige met "jouw toestel"',
    k.eerste === 'computer' && k.jouw.join() === 'computer', JSON.stringify(k));
  check('zonder aanbod van de browser geen knop', await page.isHidden('[data-installeer]'));
  check('en is "Open de app" een gewone knop', (await page.$eval('#app .appactie a.knop',
    (a) => getComputedStyle(a).backgroundColor)) !== 'rgba(0, 0, 0, 0)');
  const tegengehouden = await page.evaluate(AANBOD);
  check('biedt de browser het aan, dan blijft zijn eigen balk weg', tegengehouden === true);
  check('en komt de knop "Install the app"', await page.isVisible('[data-installeer]')
    && (await page.textContent('[data-installeer]')) === 'Install the app');
  check('dan heeft "Open the app" alleen een rand', (await page.$eval('#app .appactie a.knop',
    (a) => getComputedStyle(a).backgroundColor)) === 'rgba(0, 0, 0, 0)');
  await page.click('[data-installeer]');
  await page.waitForFunction(() => document.querySelector('[data-installeer]').hidden);
  check('een tik stelt de vraag van de browser, één keer, en daarna is de knop weg',
    (await page.evaluate(() => window.__gevraagd)) === 1);
  check('geen javascriptfouten (computer)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}
{
  // Het aanbod komt meteen nadat de kop zijn luisteraar heeft gezet, als er
  // van de rest van de pagina nog niets is, ook de knop niet.
  const { page, url, jsFouten, stoppen } = await startSite({ voorafAan: (page) => page.addInitScript(`(${(aanbod) => {
    const luister = window.addEventListener;
    window.addEventListener = function (soort, ...rest) {
      luister.call(this, soort, ...rest);
      if (soort !== 'beforeinstallprompt' || window.__vroeg !== undefined) return;
      queueMicrotask(() => {
        window.__vroeg = !document.querySelector('[data-installeer]');
        window.__tegengehouden = aanbod();
      });
    };
  }})(${AANBOD})`) });
  await page.goto(url + 'en/');
  await page.waitForSelector('#app .jij');
  check('komt het aanbod voordat de knop er is, dan staat de knop er daarna toch',
    (await page.evaluate(() => window.__vroeg && window.__tegengehouden)) === true
      && await page.isVisible('[data-installeer]'));
  await page.click('[data-installeer]');
  await page.waitForFunction(() => document.querySelector('[data-installeer]').hidden);
  check('en stelt hij de vraag', (await page.evaluate(() => window.__gevraagd)) === 1);
  check('geen javascriptfouten (vroeg aanbod)', jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

// ---- 4 en 5. op een iPhone en op Android ------------------------------------------------------
for (const [naam, userAgent, kaart] of [['een iPhone', IPHONE, 'iphone'], ['Android', ANDROID, 'android']]) {
  const { page, url, jsFouten, stoppen } = await startSite({ userAgent });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url + 'en/');
  await page.waitForSelector('#app .jij');
  const k = await kaartenInBeeld(page);
  check(`op ${naam} staat die kaart vooraan, als enige met "jouw toestel"`,
    k.eerste === kaart && k.jouw.join() === kaart, JSON.stringify(k));
  if (kaart === 'iphone') check('op een iPhone geen knop Installeer', await page.isHidden('[data-installeer]'));
  await page.locator('#app').scrollIntoViewIfNeeded();
  check(`op ${naam} past het blok in de breedte`, await page.evaluate(() =>
    document.documentElement.scrollWidth <= innerWidth
      && [...document.querySelectorAll('#app *')].every((e) => e.getBoundingClientRect().right <= innerWidth + 0.5)));
  check(`geen javascriptfouten (${naam})`, jsFouten.length === 0, jsFouten.join(' | '));
  await stoppen();
}

process.exit(afronden() ? 0 : 1);
