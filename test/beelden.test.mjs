// Het logo en de deelplaatjes: wat een telefoon, een browser, Google en
// WhatsApp ervan te zien krijgen.
//
// Gemaakt door scripts/maak-pictogrammen.mjs en scripts/maak-beelden.mjs, en
// als plaatjes in de repo gezet. Wat hier vastligt is wat je er niet aan ziet
// als je ze op je eigen scherm bekijkt:
//
//   1. Elk pictogram heeft de maat die zijn naam en het manifest beloven.
//   2. Het manifest heeft een gewone en een maskable versie, los van elkaar.
//      Eén bestand voor allebei ("any maskable") betekent dat Android de poot
//      van de P eraf knipt, of dat het pictogram overal te klein staat.
//   3. De maskable versie houdt de P binnen de veilige cirkel (80%).
//   4. Het pictogram voor de iPhone is niet doorzichtig (iOS maakt dat zwart
//      of wit), de meldingsbadge juist wel en alleen wit (Android kleurt hem
//      zelf; een vol plaatje wordt een wit vierkantje).
//   5. favicon.ico is een echte ICO met 16, 32 en 48.
//   6. De deelplaatjes: één per taal, allemaal anders, 1200×630 zoals de
//      pagina belooft, en onder de 300 kB, want daarboven laat WhatsApp het
//      plaatje weg.
//   7. Elke pagina wijst naar het favicon en het iPhone-pictogram, en die
//      bestaan.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { maakControle, wortel } from './hulp.mjs';
import { teksten, TALEN } from '../site/teksten.mjs';
import { PRIVACY } from '../site/privacy.mjs';

const { check, afronden } = maakControle('het logo en de deelplaatjes');
const bestand = (pad) => readFileSync(join(wortel, pad));

// De maat van een PNG staat in de IHDR, meteen na de handtekening.
const pngMaat = (buf) => (buf.subarray(1, 4).toString() === 'PNG'
  ? { b: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null);
// Bij een JPEG in het SOF-blok; zoek de eerste.
const jpegMaat = (buf) => {
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) return null;
    const soort = buf[i + 1], lengte = buf.readUInt16BE(i + 2);
    if (soort >= 0xc0 && soort <= 0xc3) return { h: buf.readUInt16BE(i + 5), b: buf.readUInt16BE(i + 7) };
    i += 2 + lengte;
  }
  return null;
};

// ---- 1 en 2. de pictogrammen en het manifest ------------------------------------
const PICTOGRAMMEN = {
  'pictogrammen/predicttherace-192.png': 192,
  'pictogrammen/predicttherace-512.png': 512,
  'pictogrammen/predicttherace-maskable-192.png': 192,
  'pictogrammen/predicttherace-maskable-512.png': 512,
  'pictogrammen/predicttherace-apple-180.png': 180,
  'pictogrammen/predicttherace-badge-96.png': 96,
  'pictogrammen/predicttherace-logo.png': 128,
};
for (const [pad, maat] of Object.entries(PICTOGRAMMEN)) {
  const m = existsSync(join(wortel, pad)) ? pngMaat(bestand(pad)) : null;
  check(`${pad.split('/').pop()} is een PNG van ${maat}×${maat}`, m?.b === maat && m?.h === maat,
    m ? `${m.b}×${m.h}` : 'ontbreekt');
}
{
  const manifest = JSON.parse(bestand('manifest.webmanifest'));
  const soort = (doel) => manifest.icons.filter((i) => i.purpose.split(/\s+/).includes(doel));
  const kloppen = (lijst) => lijst.every((i) => {
    const m = existsSync(join(wortel, i.src)) ? pngMaat(bestand(i.src)) : null;
    return m && i.sizes === `${m.b}x${m.h}`;
  });
  check('het manifest heeft een gewone versie in 192 en 512',
    JSON.stringify(soort('any').map((i) => i.sizes)) === '["192x192","512x512"]' && kloppen(soort('any')));
  check('en een aparte maskable versie in 192 en 512',
    JSON.stringify(soort('maskable').map((i) => i.sizes)) === '["192x192","512x512"]' && kloppen(soort('maskable')));
  check('en geen pictogram dat allebei tegelijk moet zijn',
    manifest.icons.every((i) => i.purpose.trim().split(/\s+/).length === 1),
    manifest.icons.map((i) => i.purpose).join(' | '));
}

// ---- 3 en 4. wat er in de pictogrammen staat -------------------------------------
{
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bekijk = (pad) => page.evaluate(async (data) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const m = c.width / 2, veilig = c.width * 0.4;
    let buiten = 0, oranje = 0, doorzichtig = 0, gekleurd = 0, leeg = 0, vol = 0, grijs = 0;
    for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
      const i = (y * c.width + xx) * 4, [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
      const isOranje = a > 128 && r > 180 && r - b > 120;
      if (isOranje) oranje++;
      if (isOranje && Math.hypot(xx + 0.5 - m, y + 0.5 - m) > veilig) buiten++;
      if (a < 255) doorzichtig++;
      if (a === 0) leeg++;
      if (a === 255) vol++;
      // Zichtbaar en niet oranje: een schaduw of een rand van iets anders.
      if (a > 30 && r - b < 60) grijs++;
      if (a > 0 && (r < 250 || g < 250 || b < 250)) gekleurd++;
    }
    return { buiten, oranje, doorzichtig, gekleurd, leeg, vol, grijs, totaal: c.width * c.height };
  }, bestand(pad).toString('base64'));

  const gewoon = await bekijk('pictogrammen/predicttherace-512.png');
  const maskable = await bekijk('pictogrammen/predicttherace-maskable-512.png');
  check('de maskable versie houdt de P binnen de veilige cirkel', maskable.oranje > 5000 && maskable.buiten === 0,
    `${maskable.buiten} oranje pixels buiten de cirkel, ${maskable.oranje} in totaal`);
  // Anders bewijst de vorige controle niets: de gewone versie steekt er wél
  // buiten, en daarom bestaat de maskable.
  check('(de gewone versie zou daar wel buiten steken)', gewoon.buiten > 0, `${gewoon.buiten}`);
  for (const pad of ['pictogrammen/predicttherace-maskable-512.png', 'pictogrammen/predicttherace-apple-180.png']) {
    const z = await bekijk(pad);
    check(`${pad.split('/').pop()} is nergens doorzichtig`, z.doorzichtig === 0, `${z.doorzichtig} pixels`);
  }
  const badge = await bekijk('pictogrammen/predicttherace-badge-96.png');
  check('de meldingsbadge is een witte vorm op doorzichtig',
    badge.gekleurd === 0 && badge.leeg > badge.totaal / 3 && badge.vol > badge.totaal / 20,
    `${badge.gekleurd} gekleurd, ${badge.leeg} leeg, ${badge.vol} vol, van ${badge.totaal}`);
  // Het logo in de kop: de oranje P op doorzichtig, zonder de grijze schaduw
  // uit de bron (die zou op de donkere kop als een vlek staan), en groot genoeg
  // in zijn vak dat hij op 24 pixels nog een P is.
  const logo = await bekijk('pictogrammen/predicttherace-logo.png');
  check('het logo is de oranje P op doorzichtig, zonder schaduw, en vult zijn vak',
    logo.leeg > logo.totaal / 4 && logo.oranje > logo.totaal / 5 && logo.grijs === 0,
    `${logo.oranje} oranje, ${logo.leeg} leeg, ${logo.grijs} grijs, van ${logo.totaal}`);
  await browser.close();
}
{
  const sw = bestand('sw.js').toString();
  const badge = sw.match(/badge:\s*'([^']+)'/)?.[1];
  check('de service worker gebruikt die badge', badge === 'pictogrammen/predicttherace-badge-96.png', badge ?? '');
}

// ---- 5. favicon.ico ------------------------------------------------------------
{
  const ico = existsSync(join(wortel, 'favicon.ico')) ? bestand('favicon.ico') : Buffer.alloc(0);
  const aantal = ico.length > 6 && ico.readUInt16LE(2) === 1 ? ico.readUInt16LE(4) : 0;
  const maten = [];
  for (let i = 0; i < aantal; i++) {
    const o = 6 + 16 * i, maat = ico[o] || 256;
    const png = pngMaat(ico.subarray(ico.readUInt32LE(o + 12), ico.readUInt32LE(o + 12) + ico.readUInt32LE(o + 8)));
    maten.push(png && png.b === maat && png.h === maat ? maat : `fout(${maat})`);
  }
  check('favicon.ico is een ICO met 16, 32 en 48', maten.join() === '16,32,48', maten.join() || 'geen ICO');
}

// ---- 6. de deelplaatjes -----------------------------------------------------------
{
  const vingerafdruk = new Set();
  for (const code of TALEN) {
    const pad = `site/og/og-${code}.jpg`;
    const buf = existsSync(join(wortel, pad)) ? bestand(pad) : Buffer.alloc(0);
    const m = jpegMaat(buf);
    check(`${code}: het deelplaatje is een JPEG van 1200×630`, m?.b === 1200 && m?.h === 630, m ? `${m.b}×${m.h}` : 'ontbreekt');
    check(`${code}: en kleiner dan 300 kB, anders toont WhatsApp het niet`, buf.length > 20000 && buf.length < 300 * 1024,
      `${Math.round(buf.length / 1024)} kB`);
    vingerafdruk.add(createHash('sha1').update(buf).digest('hex'));
    check(`${code}: er staat een eigen regel voor op`, typeof teksten[code].ogRegel === 'string'
      && teksten[code].ogRegel.length >= 8 && teksten[code].ogRegel.length <= 30, teksten[code].ogRegel ?? '');
  }
  check('elke taal heeft zijn eigen plaatje (geen zeven keer hetzelfde)', vingerafdruk.size === TALEN.length,
    `${vingerafdruk.size} verschillend`);
  const regels = new Set(TALEN.map((c) => teksten[c].ogRegel));
  check('en zijn eigen regel', regels.size === TALEN.length, [...regels].join(' | '));
}

// ---- 7. elke pagina wijst ernaar ------------------------------------------------------
{
  const paginas = [
    ...TALEN.map((c) => (teksten[c].pad ? `${teksten[c].pad}/index.html` : 'index.html')),
    ...Object.values(PRIVACY).map((p) => `${p.pad}/index.html`),
    'app/index.html',
  ];
  for (const pad of paginas) {
    const html = bestand(pad).toString();
    const map = pad.split('/').slice(0, -1).join('/');
    const doel = (rel) => { const m = html.match(new RegExp(`<link rel="${rel}" href="([^"]+)"`)); return m?.[1]; };
    const icoon = doel('icon'), appel = doel('apple-touch-icon');
    const bestaat = (href) => href && existsSync(join(wortel, map, href));
    check(`${pad}: favicon.ico en het iPhone-pictogram`, icoon?.endsWith('favicon.ico') && bestaat(icoon)
      && appel?.endsWith('predicttherace-apple-180.png') && bestaat(appel), `${icoon} ${appel}`);
  }
  const nl = bestand('index.html').toString();
  check('de landingspagina zegt welk soort plaatje het deelplaatje is, en hoe groot',
    nl.includes('<meta property="og:image:type" content="image/jpeg">')
    && nl.includes('<meta property="og:image:width" content="1200">')
    && nl.includes('<meta property="og:image:height" content="630">'));
}

// ---- 8. het logo in de kop, waar eerst een rood blokje stond ------------------------
{
  const app = bestand('app/index.html').toString();
  const regel = app.match(/\.merk \.blok\{[^}]*\}/)?.[0] ?? '';
  check('de app zet het logo in de kop, niet meer een rood vlak',
    regel.includes('url(../pictogrammen/predicttherace-logo.png)') && !regel.includes('var(--accent)'), regel);
  const kop = [
    ...TALEN.map((c) => (teksten[c].pad ? `${teksten[c].pad}/index.html` : 'index.html')),
    ...Object.values(PRIVACY).map((p) => `${p.pad}/index.html`),
  ].filter((pad) => {
    const m = bestand(pad).toString().match(/<a class="merk"[^>]*><img class="blok" src="([^"]+)" alt=""/);
    return !(m && m[1].endsWith('pictogrammen/predicttherace-logo.png')
      && existsSync(join(wortel, pad.split('/').slice(0, -1).join('/'), m[1])));
  });
  check('en elke pagina van de site ook, met een logo dat bestaat', kop.length === 0, kop.join(', '));
}

process.exit(afronden() ? 0 : 1);
