#!/usr/bin/env node
/**
 * Het opstartscherm van de beginschermapp op een iPhone. Zonder plaatje is het
 * scherm wit tot de app er is, en de app is donker: een witte flits bij elke
 * start. iOS maakt geen opstartscherm uit het manifest (Android wel); het wil
 * per schermmaat een plaatje van precies die grootte, met een mediaquery.
 *
 *   node scripts/maak-opstartbeelden.mjs
 *
 * Schrijft pictogrammen/opstart/opstart-<breed>x<hoog>.png, en het blok tussen
 * <!-- opstartbeelden --> en <!-- /opstartbeelden --> in app/index.html.
 * Opnieuw draaien bij een nieuwe iPhone-maat of een ander logo; zet wat eruit
 * komt in de repo. test/iphone.test.mjs kijkt of blok en plaatjes kloppen.
 *
 * Staand: de app is een staande app (manifest.webmanifest). Behalve het
 * grote binnenscherm van de opvouwbare iPhone Duo: dat is bijna vierkant en
 * houd je net zo vaak dwars, dus daar ook liggend. Een iPhone die er niet
 * tussen staat krijgt geen plaatje, en dus weer de witte flits; verder gaat er
 * niets mis.
 *
 * De maten van de Duo (oktober 2026) heeft Apple alleen in schermpixels
 * gegeven (dicht 1398 x 2034, open 1878 x 2670); de maten hieronder zijn die
 * gedeeld door 3. Klopt dat niet met wat het toestel zelf zegt
 * (screen.width, screen.height, devicePixelRatio), pas het hier aan.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');

// [breedte en hoogte in CSS-pixels (staand), pixeldichtheid, welke iPhones,
//  en 'liggend' voor het plaatje als je hem dwars houdt]
export const IPHONES = [
  [626, 890, 3, 'Duo, open'],
  [626, 890, 3, 'Duo, open', 'liggend'],
  [466, 678, 3, 'Duo, dicht'],
  [440, 956, 3, '16 Pro Max, 17 Pro Max'],
  [420, 912, 3, 'Air'],
  [430, 932, 3, '14 Pro Max, 15 Plus en Pro Max, 16 Plus'],
  [428, 926, 3, '12 en 13 Pro Max, 14 Plus'],
  [414, 896, 3, 'XS Max, 11 Pro Max'],
  [414, 896, 2, 'XR, 11'],
  [402, 874, 3, '16 Pro, 17, 17 Pro'],
  [393, 852, 3, '14 Pro, 15, 15 Pro, 16'],
  [390, 844, 3, '12, 13, 14, 16e'],
  [375, 812, 3, 'X, XS, 11 Pro, 12 en 13 mini'],
  [414, 736, 3, '8 Plus'],
  [375, 667, 2, '8, SE 2 en 3'],
];

// De maat van het plaatje in CSS-pixels: liggend breedte en hoogte omgedraaid.
export const maatVan = ([b, h, , , stand]) => (stand === 'liggend' ? [h, b] : [b, h]);
export const bestandVan = (iphone) => {
  const [b, h] = maatVan(iphone);
  return `opstart-${b * iphone[2]}x${h * iphone[2]}.png`;
};
export const linkVan = (iphone) => {
  const [b, h, d, , stand] = iphone;
  return `<link rel="apple-touch-startup-image" media="screen and (device-width: ${b}px) and (device-height: ${h}px)`
    + ` and (-webkit-device-pixel-ratio: ${d}) and (orientation: ${stand === 'liggend' ? 'landscape' : 'portrait'})"`
    + ` href="../pictogrammen/opstart/${bestandVan(iphone)}">`;
};
export const blok = () => `<!-- opstartbeelden -->\n${IPHONES.map(linkVan).join('\n')}\n<!-- /opstartbeelden -->`;

async function maak() {
  const { chromium } = await import('playwright');
  const data = (pad, soort) => `data:${soort};base64,${readFileSync(join(wortel, pad)).toString('base64')}`;
  const logo = data('site/bron/logo.webp', 'image/webp');
  const letter = data('lettertypen/barlow-condensed-700-latin.woff2', 'font/woff2');
  mkdirSync(join(wortel, 'pictogrammen', 'opstart'), { recursive: true });
  const browser = await chromium.launch();
  for (const iphone of IPHONES) {
    const [b, h] = maatVan(iphone);
    const page = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: iphone[2] });
    // Donker zoals de app, het logo in het midden en de naam eronder.
    await page.setContent(`<!DOCTYPE html><html><head><style>
      @font-face{font-family:K;src:url(${letter})}
      html,body{margin:0;height:100%;background:#0b0b0c}
      body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
      img{width:min(32vw,140px);height:auto}
      b{font-family:K;font-size:26px;letter-spacing:.04em;text-transform:uppercase;color:#f2f3f5}
    </style></head><body><img src="${logo}" alt=""><b>Predict the Race</b></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    writeFileSync(join(wortel, 'pictogrammen', 'opstart', bestandVan(iphone)), await page.screenshot({ type: 'png' }));
    await page.close();
  }
  await browser.close();

  const pad = join(wortel, 'app', 'index.html');
  const html = readFileSync(pad, 'utf8');
  const nieuw = html.replace(/<!-- opstartbeelden -->[\s\S]*?<!-- \/opstartbeelden -->/, blok());
  if (nieuw === html && !html.includes(blok())) throw new Error('Het blok <!-- opstartbeelden --> staat niet in app/index.html');
  writeFileSync(pad, nieuw);
  console.log(`${IPHONES.length} opstartbeelden in pictogrammen/opstart, blok in app/index.html bijgewerkt.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await maak();
