#!/usr/bin/env node
// Zoekcijfers: hoe predicttherace.com in Google staat, rechtstreeks uit
// Search Console, zonder dat iemand schermafbeeldingen hoeft te maken.
//
//   node scripts/zoekcijfers.mjs           ophalen en wegschrijven
//   DROOG=1 node scripts/zoekcijfers.mjs   ophalen en alleen tonen
//
// Wat het ophaalt, over de laatste 28 dagen waarvan Google gegevens heeft:
//   - klikken en vertoningen, in totaal en zonder het merk ("predict the race");
//   - de top 10 zoekopdrachten en de pagina's met de meeste vertoningen;
//   - zoekopdrachten die een vraag zijn (de regex uit docs/zoekplan/2-aeo.md);
//   - per pagina uit de sitemap of Google hem geïndexeerd heeft (URL-inspectie).
//
// Het schrijft docs/zoekplan/zoekcijfers.json (alles van de laatste meting) en
// zet in docs/zoekplan/meting.md bij SEO de regel van deze maand neer. Beide
// komen niet op het domein: _config.yml sluit docs/ uit.
//
// De sleutel is een serviceaccount van Google Cloud met alleen leesrecht
// (scope webmasters.readonly), als JSON in SEARCH_CONSOLE_SLEUTEL. Die staat
// alleen als GitHub-secret, nooit in de code. Zonder sleutel doet het script
// niets en zakt het niet: zo staat het uit tot het ingericht is
// (BEDIENING §18, "Search Console uitlezen").
// .github/workflows/zoekcijfers.yml draait dit elke week.

import { readFileSync, writeFileSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASIS } from '../site/teksten.mjs';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
// Voor de test kunnen de adressen en de datum anders; in het echt die van Google.
const TOKEN_URL = process.env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token';
const API = process.env.SEARCH_CONSOLE_API ?? 'https://searchconsole.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
// De domeinproperty, zoals in docs/zoekplan/meting.md.
export const PROPERTY = `sc-domain:${new URL(BASIS).host}`;
export const JSON_PAD = 'docs/zoekplan/zoekcijfers.json';
export const METING_PAD = 'docs/zoekplan/meting.md';
// Zoekopdrachten met het merk erin tellen niet als "gevonden zonder ons te kennen".
export const MERK = '(?i)predict\\s*the\\s*race|predicttherace';
// Een zoekopdracht die een vraag is: dezelfde regex als in docs/zoekplan/2-aeo.md.
export const VRAAG = '^(hoe|wat|wie|wanneer|waarom|welke|welk|kan|kun|moet|is|how|what|who|when|why|which|can|do|does|are)\\b';

// Search Console loopt een paar dagen achter. De periode eindigt drie dagen
// voor vandaag en is 28 dagen lang, net als in het rapport Prestaties.
export function periode(vandaag) {
  const dag = (n) => new Date(Date.parse(`${vandaag}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
  return { van: dag(30), tot: dag(3) };
}

export const sitemapUrls = (xml = readFileSync(join(wortel, 'sitemap.xml'), 'utf8')) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);

const b64 = (x) => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

// Een serviceaccount logt in met een zelf ondertekend JWT, dat het ruilt voor
// een toegangstoken van een uur.
export async function toegangstoken(sleutel, nu = Math.floor(Date.now() / 1000)) {
  const kop = b64({ alg: 'RS256', typ: 'JWT' });
  const claims = b64({ iss: sleutel.client_email, scope: SCOPE, aud: TOKEN_URL, iat: nu, exp: nu + 3600 });
  const handtekening = createSign('RSA-SHA256').update(`${kop}.${claims}`).sign(sleutel.private_key, 'base64url');
  const antwoord = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${kop}.${claims}.${handtekening}`,
    }),
  });
  const data = await antwoord.json().catch(() => ({}));
  if (!antwoord.ok || !data.access_token) {
    throw new Error(`Inloggen bij Google lukte niet (${antwoord.status}): ${data.error_description ?? data.error ?? 'onbekend'}`);
  }
  return data.access_token;
}

async function vraag(token, pad, body) {
  const antwoord = await fetch(`${API}${pad}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await antwoord.json().catch(() => ({}));
  if (!antwoord.ok) {
    const melding = data.error?.message ?? 'onbekend';
    const tip = antwoord.status === 403
      ? ` Staat het serviceaccount als gebruiker (Volledig) bij de property ${PROPERTY} in Search Console?` : '';
    throw new Error(`Search Console gaf ${antwoord.status} op ${pad}: ${melding}.${tip}`);
  }
  return data;
}

const prestaties = (token, body) =>
  vraag(token, `/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`, body);

const getal = (rij, veld) => Math.round((rij?.[veld] ?? 0) * 100) / 100;
const cijfers = (rij) => ({ klikken: getal(rij, 'clicks'), vertoningen: getal(rij, 'impressions'),
  positie: getal(rij, 'position') });
// De API sorteert op klikken; wij willen de meeste vertoningen bovenaan.
const opVertoningen = (rijen, n) => [...(rijen ?? [])]
  .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks).slice(0, n);

export async function ophalen(token, vandaag) {
  const { van, tot } = periode(vandaag);
  const basis = { startDate: van, endDate: tot };
  const zonder = (regex) => ({ dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'excludingRegex', expression: regex }] }] });
  const met = (regex) => ({ dimensionFilterGroups: [{ filters: [{ dimension: 'query', operator: 'includingRegex', expression: regex }] }] });

  const totaal = await prestaties(token, basis);
  const nietMerk = await prestaties(token, { ...basis, ...zonder(MERK) });
  const zoek = await prestaties(token, { ...basis, dimensions: ['query'], rowLimit: 1000 });
  const paginas = await prestaties(token, { ...basis, dimensions: ['page'], rowLimit: 1000 });
  const vragen = await prestaties(token, { ...basis, ...met(VRAAG), dimensions: ['query', 'page'], rowLimit: 1000 });

  // Per pagina uit de sitemap: geïndexeerd of niet, en waarom niet.
  const urls = [];
  for (const url of sitemapUrls()) {
    const r = await vraag(token, '/v1/urlInspection/index:inspect', { inspectionUrl: url, siteUrl: PROPERTY, languageCode: 'nl' });
    const s = r.inspectionResult?.indexStatusResult ?? {};
    urls.push({ url, geindexeerd: s.verdict === 'PASS', status: s.coverageState ?? 'onbekend',
      gecrawld: s.lastCrawlTime?.slice(0, 10) ?? null });
  }

  return {
    gemeten: vandaag,
    property: PROPERTY,
    periode: { van, tot },
    totaal: cijfers(totaal.rows?.[0]),
    // Zoekopdrachten die Google anoniem houdt, vallen weg zodra je op de
    // zoekopdracht filtert: dit is dus een ondergrens.
    nietMerk: cijfers(nietMerk.rows?.[0]),
    top10: opVertoningen(zoek.rows, 10).map((r) => ({ zoekopdracht: r.keys[0], ...cijfers(r) })),
    paginas: opVertoningen(paginas.rows, 20).map((r) => ({ pagina: r.keys[0], ...cijfers(r) })),
    vragen: opVertoningen(vragen.rows, 20).map((r) => ({ zoekopdracht: r.keys[0], pagina: r.keys[1], ...cijfers(r) })),
    index: { geindexeerd: urls.filter((u) => u.geindexeerd).length, van: urls.length },
    urls,
  };
}

const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september',
  'oktober', 'november', 'december'];
const datumNl = (d) => `${Number(d.slice(8, 10))} ${MAANDEN[Number(d.slice(5, 7)) - 1]}`;

// De regel van deze maand in de SEO-tabel van meting.md: een nieuwe als hij
// er nog niet is, anders overschreven (de laatste meting van de maand telt).
export function metRegel(md, m) {
  const maand = m.gemeten.slice(0, 7);
  const regel = `| ${maand} | ${m.index.geindexeerd} van ${m.index.van} | ${m.totaal.vertoningen} | ${m.totaal.klikken} `
    + `| ${m.nietMerk.klikken} | automatisch, ${datumNl(m.gemeten)} (${datumNl(m.periode.van)} tot en met ${datumNl(m.periode.tot)}) |`;
  const kop = '| maand | geïndexeerd | vertoningen | klikken | niet-merk klikken | opmerking |';
  const regels = md.split('\n');
  const begin = regels.indexOf(kop);
  if (begin < 0) throw new Error(`De SEO-tabel staat niet meer in ${METING_PAD} (kop "${kop}")`);
  let eind = begin + 2;
  while (eind < regels.length && regels[eind].startsWith('|')) eind++;
  const tabel = regels.slice(begin + 2, eind).filter((r) => !/^\|(\s*\|)+\s*$/.test(r));
  const bestaand = tabel.findIndex((r) => r.startsWith(`| ${maand} |`));
  if (bestaand >= 0) tabel[bestaand] = regel; else tabel.push(regel);
  return [...regels.slice(0, begin + 2), ...tabel, ...regels.slice(eind)].join('\n');
}

export function samenvatting(m) {
  const regels = [
    `Search Console ${m.property}, ${m.periode.van} tot en met ${m.periode.tot}`,
    `  geïndexeerd: ${m.index.geindexeerd} van ${m.index.van}`,
    `  vertoningen ${m.totaal.vertoningen}, klikken ${m.totaal.klikken}; zonder merk: vertoningen ${m.nietMerk.vertoningen}, klikken ${m.nietMerk.klikken}`,
  ];
  for (const u of m.urls.filter((x) => !x.geindexeerd)) regels.push(`  niet geïndexeerd: ${u.url} (${u.status})`);
  for (const z of m.top10) regels.push(`  zoekopdracht: ${z.zoekopdracht} (${z.vertoningen} vertoningen, ${z.klikken} klikken)`);
  return regels.join('\n');
}

async function main() {
  const ruw = process.env.SEARCH_CONSOLE_SLEUTEL;
  if (!ruw) {
    console.log('Zoekcijfers: geen SEARCH_CONSOLE_SLEUTEL, dus niets opgehaald. Dit staat uit tot het ingericht is (BEDIENING §18).');
    return 0;
  }
  let sleutel;
  try { sleutel = JSON.parse(ruw); } catch { sleutel = null; }
  if (!sleutel?.client_email || !sleutel?.private_key) {
    console.error('Zoekcijfers: SEARCH_CONSOLE_SLEUTEL is geen sleutel van een serviceaccount (de hele JSON, met client_email en private_key).');
    return 1;
  }
  const vandaag = process.env.VANDAAG ?? new Date().toISOString().slice(0, 10);
  const token = await toegangstoken(sleutel);
  const meting = await ophalen(token, vandaag);
  console.log(samenvatting(meting));
  if (process.env.DROOG) {
    console.log('(droog: niets weggeschreven)');
    return 0;
  }
  writeFileSync(join(wortel, JSON_PAD), JSON.stringify(meting, null, 1) + '\n');
  const md = readFileSync(join(wortel, METING_PAD), 'utf8');
  writeFileSync(join(wortel, METING_PAD), metRegel(md, meting));
  console.log(`Weggeschreven: ${JSON_PAD} en de regel van ${meting.gemeten.slice(0, 7)} in ${METING_PAD}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => process.exit(code), (fout) => {
    console.error(`Zoekcijfers: ${fout.message}`);
    process.exit(1);
  });
}
