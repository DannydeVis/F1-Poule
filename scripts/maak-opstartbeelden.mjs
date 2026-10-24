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
 * Alleen staand: de app is een staande app (manifest.webmanifest). Een
 * iPhone die er niet tussen staat krijgt geen plaatje, en dus weer de witte
 * flits; verder gaat er niets mis.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');

// [breedte en hoogte in CSS-pixels, pixeldichtheid, welke iPhones]
export const IPHONES = [
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

export const bestandVan = ([b, h, d]) => `opstart-${b * d}x${h * d}.png`;
export const linkVan = (iphone) => {
  const [b, h, d] = iphone;
  return `<link rel="apple-touch-startup-image" media="screen and (device-width: ${b}px) and (device-height: ${h}px)`
    + ` and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait)" href="../pictogrammen/opstart/${bestandVan(iphone)}">`;
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
    const [b, h, d] = iphone;
    const page = await browser.newPage({ viewport: { width: b, height: h }, deviceScaleFactor: d });
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
