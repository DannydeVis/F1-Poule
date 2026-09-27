#!/usr/bin/env node
// IndexNow: vertel Bing (en de andere zoekmachines die meedoen) welke pagina's
// net veranderd zijn, zodat ze niet op de volgende ronde van hun crawler
// wachten. Via Bing pikken ook Copilot en deels ChatGPT nieuwe pagina's
// sneller op. Google doet niet mee; die leest de sitemap.
//
//   node scripts/indexnow.mjs [--droog] <bestand> ...    deze bestanden
//   git diff --name-only A B | node scripts/indexnow.mjs --stdin
//   node scripts/indexnow.mjs [--droog] --alles          alles uit de sitemap
//
// Bestanden zijn paden in de repo, zoals git diff ze geeft. Alleen de pagina's
// die in sitemap.xml staan tellen mee (dus nooit app/, beheer/ of 404.html,
// die staan op noindex), plus sitemap.xml zelf. Verandert er alleen iets
// anders, zoals kalender.ics na een sync, dan wordt er niets gemeld.
//
// De sleutel staat in site/teksten.mjs en is openbaar: maak-site.mjs zet hem
// als <sleutel>.txt in de hoofdmap, en daar kijkt IndexNow of de melding echt
// van deze site komt. .github/workflows/indexnow.yml draait dit na elke deploy.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASIS, INDEXNOW_SLEUTEL } from '../site/teksten.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
// Voor de test kan het adres anders; in het echt altijd de gedeelde ingang,
// die de melding doorgeeft aan alle zoekmachines die meedoen.
const INDEXNOW_URL = process.env.INDEXNOW_URL ?? 'https://api.indexnow.org/indexnow';

// De url's uit de sitemap: dat zijn precies de pagina's die gevonden mogen worden.
export const sitemapUrls = (xml = readFileSync(join(wortel, 'sitemap.xml'), 'utf8')) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

// Van gewijzigde bestanden naar url's: index.html wordt de map erboven,
// sitemap.xml blijft sitemap.xml. Wat niet in de sitemap staat, valt af.
export function urlsVoor(bestanden, bekend = sitemapUrls()) {
  const toegestaan = new Set(bekend);
  const urls = new Set();
  for (const ruw of bestanden) {
    const pad = String(ruw).trim().replace(/^\.?\//, '');
    if (!pad) continue;
    if (pad === 'sitemap.xml') {
      urls.add(`${BASIS}/sitemap.xml`);
      continue;
    }
    const map = pad === 'index.html' ? '' : pad.match(/^(.+\/)index\.html$/)?.[1];
    if (map === undefined) continue;
    const url = `${BASIS}/${map}`;
    if (toegestaan.has(url)) urls.add(url);
  }
  return [...urls].sort();
}

// Wat er naar IndexNow gaat.
export const melding = (urlList) => ({
  host: new URL(BASIS).host,
  key: INDEXNOW_SLEUTEL,
  keyLocation: `${BASIS}/${INDEXNOW_SLEUTEL}.txt`,
  urlList,
});

async function main(args) {
  const droog = args.includes('--droog');
  let bestanden = args.filter((a) => !a.startsWith('--'));
  if (args.includes('--stdin')) bestanden = readFileSync(0, 'utf8').split('\n');
  const urls = args.includes('--alles') ? [...sitemapUrls(), `${BASIS}/sitemap.xml`] : urlsVoor(bestanden);

  if (!urls.length) {
    console.log('IndexNow: geen pagina veranderd, niets te melden.');
    return 0;
  }
  console.log(`IndexNow: ${urls.length} ${urls.length === 1 ? 'url' : "url's"}${droog ? ' (droog, niets verstuurd)' : ''}`);
  for (const u of urls) console.log(`  ${u}`);
  if (droog) return 0;

  const antwoord = await fetch(INDEXNOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(melding(urls)),
  });
  // 200 is ontvangen, 202 is ontvangen maar de sleutel wordt nog nagekeken.
  if (antwoord.status === 200 || antwoord.status === 202) {
    console.log(`IndexNow: ontvangen (${antwoord.status}).`);
    return 0;
  }
  console.error(`IndexNow weigerde de melding: ${antwoord.status} ${await antwoord.text().catch(() => '')}`.trim());
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await main(process.argv.slice(2)));
}
