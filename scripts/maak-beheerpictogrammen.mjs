#!/usr/bin/env node
/**
 * De pictogrammen van de beheerpagina (beheer/), uit hetzelfde logo als de app.
 *
 *   node scripts/maak-beheerpictogrammen.mjs
 *
 * Dezelfde P, maar op de lichte achtergrond van de app in plaats van op zwart:
 * zo staan de app en het beheer op een beginscherm niet als twee dezelfde
 * tegels naast elkaar. Net als maak-pictogrammen.mjs: draai dit als het logo
 * verandert, en zet wat eruit komt in de repo.
 *
 * Wat eruit komt:
 *   beheer/pictogrammen/beheer-192.png, -512.png           manifest "any"
 *   beheer/pictogrammen/beheer-maskable-192.png, -512.png  Android knipt er een
 *       vorm uit; de P staat binnen de veilige cirkel van 80%
 *   beheer/pictogrammen/beheer-apple-180.png               beginscherm iPhone
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(join(wortel, 'site', 'bron', 'logo.webp')).toString('base64');
const map = join(wortel, 'beheer', 'pictogrammen');
mkdirSync(map, { recursive: true });

// De lichte achtergrond van de app (--bg in app/index.html).
const ACHTER = '#f2f1ee';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!DOCTYPE html><body></body>');

// De P uit de bron halen zonder zijn grijze schaduw (hetzelfde recept als het
// logo in maak-pictogrammen.mjs), en hem op `schaal` van de breedte midden op
// een vlak in de achtergrondkleur zetten.
const teken = (maat, schaal) => page.evaluate(async ({ data, maat, schaal, achter }) => {
  const img = new Image(); img.src = `data:image/webp;base64,${data}`; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height);
  let links = c.width, rechts = 0, boven = c.height, onder = 0;
  for (let i = 0; i < d.data.length; i += 4) {
    const [r, , b, a] = d.data.slice(i, i + 4);
    const alfa = Math.round(Math.max(0, Math.min(1, (r - b - 60) / 150)) * Math.min(1, a / 250) * 255);
    d.data[i + 3] = alfa;
    if (alfa > 16) {
      const px = (i / 4) % c.width, py = Math.floor(i / 4 / c.width);
      links = Math.min(links, px); rechts = Math.max(rechts, px);
      boven = Math.min(boven, py); onder = Math.max(onder, py);
    }
  }
  x.putImageData(d, 0, 0);
  const zijde = Math.max(rechts - links, onder - boven);
  const mx = (links + rechts) / 2, my = (boven + onder) / 2;
  let doek = document.createElement('canvas'); doek.width = doek.height = zijde;
  doek.getContext('2d').drawImage(c, mx - zijde / 2, my - zijde / 2, zijde, zijde, 0, 0, zijde, zijde);
  const doel = Math.round(maat * schaal);
  while (doek.width / 2 >= doel) {
    const half = document.createElement('canvas'); half.width = half.height = Math.round(doek.width / 2);
    const h = half.getContext('2d'); h.imageSmoothingQuality = 'high';
    h.drawImage(doek, 0, 0, half.width, half.height); doek = half;
  }
  const uit = document.createElement('canvas'); uit.width = uit.height = maat;
  const u = uit.getContext('2d');
  u.fillStyle = achter; u.fillRect(0, 0, maat, maat);
  u.imageSmoothingQuality = 'high';
  const rand = (maat - doel) / 2;
  u.drawImage(doek, rand, rand, doel, doel);
  return uit.toDataURL('image/png').split(',')[1];
}, { data: logo, maat, schaal, achter: ACHTER });

const schrijf = (naam, b64) => writeFileSync(join(map, naam), Buffer.from(b64, 'base64'));
for (const maat of [192, 512]) {
  schrijf(`beheer-${maat}.png`, await teken(maat, 0.62));
  // Binnen de veilige cirkel van 80%: de P op 52% raakt de rand nergens.
  schrijf(`beheer-maskable-${maat}.png`, await teken(maat, 0.52));
}
schrijf('beheer-apple-180.png', await teken(180, 0.62));

await browser.close();
console.log('Pictogrammen gemaakt in beheer/pictogrammen/.');
