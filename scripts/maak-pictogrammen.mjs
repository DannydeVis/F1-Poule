#!/usr/bin/env node
/**
 * De pictogrammen van de app en de site, uit het logo in site/bron/.
 *
 *   node scripts/maak-pictogrammen.mjs
 *
 * Net als maak-beelden.mjs geen onderdeel van de gewone gang van zaken: draai
 * dit als het logo verandert, en zet wat eruit komt in de repo.
 *
 * Bron:
 *   site/bron/pictogram.png   de P op zwart, 512×512: het app-pictogram zelf
 *   site/bron/logo.webp       de P los (doorzichtig), 1254×1254: voor de
 *                             meldingsbadge, die alleen een vorm mag zijn
 *
 * Wat eruit komt, en waarom elk ervan:
 *   pictogrammen/predicttherace-192.png, -512.png
 *       Het gewone pictogram (manifest "any", het tabblad, de JSON-LD).
 *   pictogrammen/predicttherace-maskable-192.png, -512.png
 *       Voor Android, dat er een cirkel of druppel uit knipt. Alleen het
 *       middelste rondje (80% breed) blijft gegarandeerd staan, en de P uit de
 *       bron komt daar met zijn poot net buiten. Hier staat hij kleiner.
 *   pictogrammen/predicttherace-apple-180.png
 *       Het beginscherm van een iPhone. Zonder doorzichtigheid: iOS maakt
 *       doorzichtig zwart.
 *   pictogrammen/predicttherace-badge-96.png
 *       Het kleine icoontje in de statusbalk van Android bij een melding.
 *       Android gebruikt daar alleen de vorm (de alfa) en kleurt die zelf; een
 *       volledig pictogram wordt een wit vierkantje.
 *   pictogrammen/predicttherace-logo.png
 *       De P zelf, in zijn eigen kleuren op doorzichtig, zonder de schaduw uit
 *       de bron en strak bijgesneden: het logo in de kop van de app en de site,
 *       waar eerst een rood blokje stond. 128 pixels, voor een logo van 22 tot
 *       30 pixels op een scherm dat drie pixels per pixel tekent.
 *   favicon.ico (16, 32 en 48)
 *       Wat browsers en zoekmachines vanzelf opvragen, ook op pagina's zonder
 *       <link rel="icon">, zoals 404.html. Google wil een veelvoud van 48.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const bron = (f) => readFileSync(join(wortel, 'site', 'bron', f)).toString('base64');
mkdirSync(join(wortel, 'pictogrammen'), { recursive: true });

// Het deel van de maskable-versie dat de P mag innemen. De veilige zone is een
// cirkel van 80%; de verste punt van de P (de onderkant van de poot) ligt in de
// bron op 44% van het midden, dus op 82% komt hij op 36% en blijft er wat lucht.
export const MASKABLE_SCHAAL = 0.82;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!DOCTYPE html><body></body>');

// In de browser: laad een plaatje, en teken het op een canvas van een bepaalde
// maat. Verkleinen gaat in stappen van hooguit de helft, anders wordt een
// pictogram van 16 pixels een vlek.
const teken = (opties) => page.evaluate(async ({ data, soort, maat, schaal = 1, achter = null, alleenVorm = false }) => {
  const img = new Image();
  img.src = `data:image/${soort};base64,${data}`;
  await img.decode();
  let doek = document.createElement('canvas');
  doek.width = img.width; doek.height = img.height;
  doek.getContext('2d').drawImage(img, 0, 0);
  const doel = Math.round(maat * schaal);
  while (doek.width / 2 >= doel) {
    const half = document.createElement('canvas');
    half.width = Math.round(doek.width / 2); half.height = Math.round(doek.height / 2);
    const x = half.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.drawImage(doek, 0, 0, half.width, half.height);
    doek = half;
  }
  const uit = document.createElement('canvas');
  uit.width = maat; uit.height = maat;
  const x = uit.getContext('2d');
  if (achter) { x.fillStyle = achter; x.fillRect(0, 0, maat, maat); }
  x.imageSmoothingQuality = 'high';
  const rand = (maat - doel) / 2;
  x.drawImage(doek, rand, rand, doel, doel);
  if (alleenVorm) {
    // Alleen wat oranje is telt als vorm; de grijze schaduw uit de bron niet.
    // Hoe oranjer, hoe dekkender: zo blijven de randen zacht.
    const d = x.getImageData(0, 0, maat, maat);
    for (let i = 0; i < d.data.length; i += 4) {
      const [r, , b, a] = d.data.slice(i, i + 4);
      // De P in de bron is zelf net niet dekkend (alfa 252); tot 250 telt als vol.
      const oranje = Math.max(0, Math.min(1, (r - b - 60) / 150)) * Math.min(1, a / 250);
      d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
      d.data[i + 3] = Math.round(oranje * 255);
    }
    x.putImageData(d, 0, 0);
  }
  return uit.toDataURL('image/png').split(',')[1];
}, opties);

const pictogram = { data: bron('pictogram.png'), soort: 'png' };
const logo = { data: bron('logo.webp'), soort: 'webp' };
const schrijf = (pad, b64) => writeFileSync(join(wortel, pad), Buffer.from(b64, 'base64'));

// De bron is zelf al 512: die gaat er ongewijzigd in. Opnieuw tekenen levert
// hetzelfde plaatje op, maar de PNG-encoder van de browser maakt hem bijna twee
// keer zo groot.
writeFileSync(join(wortel, 'pictogrammen/predicttherace-512.png'), readFileSync(join(wortel, 'site/bron/pictogram.png')));
schrijf('pictogrammen/predicttherace-192.png', await teken({ ...pictogram, maat: 192 }));
for (const maat of [192, 512]) {
  schrijf(`pictogrammen/predicttherace-maskable-${maat}.png`,
    await teken({ ...pictogram, maat, schaal: MASKABLE_SCHAAL, achter: '#000' }));
}
schrijf('pictogrammen/predicttherace-apple-180.png', await teken({ ...pictogram, maat: 180, achter: '#000' }));
schrijf('pictogrammen/predicttherace-badge-96.png', await teken({ ...logo, maat: 96, schaal: 0.9, alleenVorm: true }));

// Het logo: dezelfde oranjetoets als de badge, maar met de kleur van de bron
// erin, en bijgesneden tot de P zelf.
schrijf('pictogrammen/predicttherace-logo.png', await page.evaluate(async ({ data, maat }) => {
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
  // Vierkant om de P heen, met een randje van 3% zodat de schuine punten niet
  // tegen de kant komen.
  const zijde = Math.round(Math.max(rechts - links, onder - boven) * 1.06);
  const mx = (links + rechts) / 2, my = (boven + onder) / 2;
  let doek = document.createElement('canvas'); doek.width = doek.height = zijde;
  doek.getContext('2d').drawImage(c, mx - zijde / 2, my - zijde / 2, zijde, zijde, 0, 0, zijde, zijde);
  while (doek.width / 2 >= maat) {
    const half = document.createElement('canvas'); half.width = half.height = Math.round(doek.width / 2);
    const h = half.getContext('2d'); h.imageSmoothingQuality = 'high';
    h.drawImage(doek, 0, 0, half.width, half.height); doek = half;
  }
  const uit = document.createElement('canvas'); uit.width = uit.height = maat;
  const u = uit.getContext('2d'); u.imageSmoothingQuality = 'high';
  u.drawImage(doek, 0, 0, maat, maat);
  return uit.toDataURL('image/png').split(',')[1];
}, { ...logo, maat: 128 }));

// favicon.ico: een ICO mag gewone PNG's bevatten, en dat doet elke browser van
// de afgelopen tien jaar goed. Kop van 6 bytes, per plaatje 16 bytes, dan de
// PNG's achter elkaar.
const ico = [];
for (const maat of [16, 32, 48]) ico.push({ maat, png: Buffer.from(await teken({ ...pictogram, maat }), 'base64') });
const kop = Buffer.alloc(6 + 16 * ico.length);
kop.writeUInt16LE(0, 0); kop.writeUInt16LE(1, 2); kop.writeUInt16LE(ico.length, 4);
let plek = kop.length;
ico.forEach(({ maat, png }, i) => {
  const o = 6 + 16 * i;
  kop.writeUInt8(maat, o); kop.writeUInt8(maat, o + 1); kop.writeUInt8(0, o + 2); kop.writeUInt8(0, o + 3);
  kop.writeUInt16LE(1, o + 4); kop.writeUInt16LE(32, o + 6);
  kop.writeUInt32LE(png.length, o + 8); kop.writeUInt32LE(plek, o + 12);
  plek += png.length;
});
writeFileSync(join(wortel, 'favicon.ico'), Buffer.concat([kop, ...ico.map((x) => x.png)]));

await browser.close();
console.log('Pictogrammen gemaakt in pictogrammen/ en favicon.ico.');
