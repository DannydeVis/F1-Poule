// Zoekcijfers: Search Console uitlezen met een serviceaccount (scripts/zoekcijfers.mjs).
//
// Draait zonder internet: het script praat met een nagebootste Google op
// localhost (GOOGLE_TOKEN_URL en SEARCH_CONSOLE_API), met een sleutel die de
// test zelf maakt.
//
// Wat hier vastligt:
//   1. Zonder sleutel doet het script niets en zakt het niet; met een sleutel
//      die geen serviceaccount is wel.
//   2. Inloggen: een JWT met RS256, ondertekend met de sleutel, alleen met de
//      leesscope, voor een uur.
//   3. De periode: 28 dagen, tot drie dagen voor vandaag.
//   4. Wat het vraagt: totaal, zonder merk, zoekopdrachten, pagina's, vragen
//      (dezelfde regex als het zoekplan) en elke pagina uit de sitemap bij de
//      URL-inspectie, voor de domeinproperty.
//   5. Wat het wegschrijft: de JSON met de meting, en in meting.md de regel van
//      deze maand (nieuw, of overschreven bij een tweede meting in die maand);
//      de nulmeting en de rest blijven staan. Met DROOG niets.
//   6. Een fout van Google (403) laat het script zakken met een uitleg.
//   7. De JSON en meting.md komen niet op het domein; de workflow geeft het
//      secret mee en legt alleen die twee bestanden vast.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, mkdirSync, existsSync } from 'node:fs';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { periode, metRegel, sitemapUrls, PROPERTY, VRAAG, JSON_PAD, METING_PAD } from '../scripts/zoekcijfers.mjs';

const { check, afronden } = maakControle('zoekcijfers uit Search Console');

// ---- 3. de periode --------------------------------------------------------------
{
  const p = periode('2026-10-26');
  check('de periode is 28 dagen, tot drie dagen voor vandaag', p.van === '2026-09-26' && p.tot === '2026-10-23', JSON.stringify(p));
  const q = periode('2026-03-02');
  check('ook over het eind van februari heen', q.van === '2026-01-31' && q.tot === '2026-02-27', JSON.stringify(q));
}
check('de property is de domeinproperty van de site', PROPERTY === 'sc-domain:predicttherace.com', PROPERTY);
{
  const plan = readFileSync(join(wortel, 'docs', 'zoekplan', '2-aeo.md'), 'utf8');
  check('de regex voor vragen is dezelfde als in het zoekplan (2-aeo.md)', plan.includes('\n' + VRAAG + '\n'), VRAAG);
}

// ---- 5. de regel in meting.md, los ------------------------------------------------
const voorbeeld = (gemeten, extra = {}) => ({
  gemeten, periode: periode(gemeten), index: { geindexeerd: 37, van: 41 },
  totaal: { klikken: 5, vertoningen: 120 }, nietMerk: { klikken: 1, vertoningen: 30 }, ...extra,
});
{
  const md = readFileSync(join(wortel, METING_PAD), 'utf8');
  const een = metRegel(md, voorbeeld('2026-10-26'));
  const verwacht = '| 2026-10 | 37 van 41 | 120 | 5 | 1 | automatisch, 26 oktober (26 september tot en met 23 oktober) |';
  check('meting.md krijgt de regel van deze maand in de SEO-tabel, met de periode erbij', een.includes(verwacht),
    een.split('\n').filter((r) => r.startsWith('| 2026')).join(' / '));
  const kop = een.indexOf('| maand | geïndexeerd |');
  check('de regel staat direct onder de kop van die tabel, en de lege voorbeeldregel is weg',
    een.slice(kop).split('\n')[2] === verwacht && !een.slice(kop).split('\n').slice(0, 4).includes('| | | | | | |'),
    een.slice(kop).split('\n').slice(0, 4).join(' / '));
  const twee = metRegel(een, voorbeeld('2026-10-30', { totaal: { klikken: 9, vertoningen: 150 } }));
  check('een tweede meting in dezelfde maand overschrijft die regel',
    (twee.match(/^\| 2026-10 \|/gm) ?? []).length === 1 && twee.includes('| 2026-10 | 37 van 41 | 150 | 9 |'),
    twee.split('\n').filter((r) => r.startsWith('| 2026')).join(' / '));
  const drie = metRegel(twee, voorbeeld('2026-11-02'));
  const rijen = drie.split('\n').filter((r) => /^\| 2026-\d\d \|/.test(r)).map((r) => r.slice(2, 9));
  check('een nieuwe maand komt eronder', JSON.stringify(rijen) === JSON.stringify(['2026-10', '2026-11']), rijen.join(' '));
  const buiten = (s) => s.replace(/^\| 2026-\d\d \|.*\n/gm, '').replace(/^\| \| \| \| \| \| \|\n/m, '');
  check('de rest van meting.md (de nulmeting, AEO, GEO) blijft precies staan', buiten(drie) === buiten(md),
    'verschil buiten de SEO-tabel');
  let fout = '';
  try { metRegel('# zonder tabel\n', voorbeeld('2026-10-26')); } catch (e) { fout = e.message; }
  check('zonder de SEO-tabel zakt het, in plaats van een regel ergens neer te zetten', /SEO-tabel/.test(fout), fout);
}

// ---- de nagebootste Google --------------------------------------------------------
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const sleutel = { type: 'service_account', client_email: 'zoekcijfers@test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
let log = [];
let weiger = false;
const TOKEN = 'token-van-de-test';
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (d) => { body += d; });
  req.on('end', () => {
    const stuur = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (req.url === '/token') {
      log.push({ soort: 'token', body: Object.fromEntries(new URLSearchParams(body)) });
      return stuur(200, { access_token: TOKEN, expires_in: 3600, token_type: 'Bearer' });
    }
    const json = JSON.parse(body || '{}');
    log.push({ soort: 'api', pad: req.url, auth: req.headers.authorization, json });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return stuur(401, { error: { message: 'geen token' } });
    if (weiger) return stuur(403, { error: { message: 'User does not have sufficient permission for site' } });
    if (req.url.endsWith('/searchAnalytics/query')) {
      const filter = json.dimensionFilterGroups?.[0]?.filters?.[0];
      if (!json.dimensions) {
        return stuur(200, { rows: [filter ? { clicks: 2, impressions: 40, ctr: 0.05, position: 18.4 }
          : { clicks: 7, impressions: 130, ctr: 0.054, position: 9.123 }] });
      }
      if (json.dimensions.join() === 'query') {
        // Op klikken gesorteerd, zoals Google doet; het script zet ze op vertoningen.
        return stuur(200, { rows: [
          { keys: ['predict the race'], clicks: 5, impressions: 60, position: 1.2 },
          { keys: ['f1 poule'], clicks: 1, impressions: 25, position: 14 },
          { keys: ['f1 poule maken'], clicks: 1, impressions: 45, position: 8 },
          ...Array.from({ length: 12 }, (_, i) => ({ keys: [`zoek ${i}`], clicks: 0, impressions: 12 - i, position: 30 })),
        ] });
      }
      if (json.dimensions.join() === 'page') {
        return stuur(200, { rows: [{ keys: ['https://predicttherace.com/'], clicks: 6, impressions: 90, position: 5 }] });
      }
      return stuur(200, { rows: [{ keys: ['hoe werkt een f1 poule', 'https://predicttherace.com/f1-poule-organiseren/'],
        clicks: 0, impressions: 8, position: 11 }] });
    }
    if (req.url === '/v1/urlInspection/index:inspect') {
      const nietIn = json.inspectionUrl === 'https://predicttherace.com/races/2026/qatar/';
      return stuur(200, { inspectionResult: { indexStatusResult: nietIn
        ? { verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed', lastCrawlTime: '2026-09-28T10:00:00Z' }
        : { verdict: 'PASS', coverageState: 'Submitted and indexed', lastCrawlTime: '2026-09-30T08:00:00Z' } } });
    }
    return stuur(404, { error: { message: 'onbekend pad' } });
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;

// Het script in een kopie van de docs, zodat de echte meting.md niet verandert.
const kopie = mkdtempSync(join(tmpdir(), 'zoekcijfers-'));
for (const p of ['scripts', 'site', 'docs']) cpSync(join(wortel, p), join(kopie, p), { recursive: true });
cpSync(join(wortel, 'sitemap.xml'), join(kopie, 'sitemap.xml'));
const draai = (env) => new Promise((klaar) => {
  const p = spawn(process.execPath, [join(kopie, 'scripts', 'zoekcijfers.mjs')], {
    env: { PATH: process.env.PATH, GOOGLE_TOKEN_URL: `${adres}/token`, SEARCH_CONSOLE_API: adres, VANDAAG: '2026-10-26', ...env },
  });
  let uit = '';
  p.stdout.on('data', (d) => { uit += d; });
  p.stderr.on('data', (d) => { uit += d; });
  p.on('close', (code) => klaar({ code, uit }));
});
const mdVoor = readFileSync(join(kopie, METING_PAD), 'utf8');

// ---- 1. zonder sleutel ------------------------------------------------------------
{
  log = [];
  const r = await draai({});
  check('zonder sleutel: niets gevraagd, niets geschreven, en het zakt niet', r.code === 0 && log.length === 0
    && !existsSync(join(kopie, JSON_PAD)) && readFileSync(join(kopie, METING_PAD), 'utf8') === mdVoor, `${r.code} ${r.uit.trim()}`);
  check('en het zegt dat het uit staat tot het ingericht is', /staat uit tot het ingericht is/.test(r.uit), r.uit.trim());
  const kapot = await draai({ SEARCH_CONSOLE_SLEUTEL: '{"type":"authorized_user"}' });
  check('een sleutel die geen serviceaccount is laat het zakken, met uitleg', kapot.code === 1 && /serviceaccount/.test(kapot.uit), kapot.uit.trim());
}

// ---- 5. droog ----------------------------------------------------------------------
{
  log = [];
  const r = await draai({ SEARCH_CONSOLE_SLEUTEL: JSON.stringify(sleutel), DROOG: '1' });
  check('droog: wel opgehaald en getoond, niets weggeschreven', r.code === 0 && log.length > 0 && /geïndexeerd: \d+ van \d+/.test(r.uit)
    && !existsSync(join(kopie, JSON_PAD)) && readFileSync(join(kopie, METING_PAD), 'utf8') === mdVoor, r.uit.slice(0, 200));
}

// ---- 2 en 4. een echte run ---------------------------------------------------------
log = [];
const run = await draai({ SEARCH_CONSOLE_SLEUTEL: JSON.stringify(sleutel) });
check('met een sleutel draait het zonder fouten', run.code === 0, run.uit.slice(-400));
{
  const t = log.filter((x) => x.soort === 'token');
  const jwt = t[0]?.body.assertion ?? '';
  const [kop, claims, handtekening] = jwt.split('.');
  const lees = (s) => { try { return JSON.parse(Buffer.from(s, 'base64url').toString()); } catch { return {}; } };
  const c = lees(claims ?? '');
  check('één keer ingelogd, met een JWT-bearer-grant', t.length === 1 && t[0].body.grant_type === 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    JSON.stringify(t.map((x) => x.body.grant_type)));
  check('het JWT is RS256 en klopt met de sleutel', lees(kop ?? '').alg === 'RS256'
    && createVerify('RSA-SHA256').update(`${kop}.${claims}`).verify(publicKey, handtekening ?? '', 'base64url'), kop);
  check('van het serviceaccount, voor de tokenplek, alleen met de leesscope, voor een uur',
    c.iss === sleutel.client_email && c.aud === `${adres}/token` && c.scope === 'https://www.googleapis.com/auth/webmasters.readonly'
      && c.exp - c.iat === 3600, JSON.stringify(c));
}
const api = log.filter((x) => x.soort === 'api');
check('elke vraag aan Search Console draagt het token', api.length > 0 && api.every((x) => x.auth === `Bearer ${TOKEN}`),
  String(api.length));
{
  const pa = api.filter((x) => x.pad.endsWith('/searchAnalytics/query'));
  check('de prestaties komen van de domeinproperty', pa.length > 0
    && pa.every((x) => x.pad === `/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`), pa[0]?.pad);
  check('steeds dezelfde 28 dagen', pa.every((x) => x.json.startDate === '2026-09-26' && x.json.endDate === '2026-10-23'),
    JSON.stringify(pa.map((x) => [x.json.startDate, x.json.endDate])));
  const f = (x) => x.json.dimensionFilterGroups?.[0]?.filters?.[0];
  const soort = pa.map((x) => `${(x.json.dimensions ?? []).join('+') || 'totaal'}${f(x) ? ':' + f(x).operator : ''}`);
  check('gevraagd: totaal, zonder merk, zoekopdrachten, pagina\'s en vragen per pagina',
    JSON.stringify(soort) === JSON.stringify(['totaal', 'totaal:excludingRegex', 'query', 'page', 'query+page:includingRegex']), soort.join(' '));
  const merk = f(pa[1])?.expression ?? '';
  const merkRe = new RegExp(merk.replace('(?i)', ''), 'i');
  check('zonder merk laat "predict the race" en "predicttherace" weg, en "f1 poule" niet',
    merkRe.test('Predict the Race') && merkRe.test('predicttherace app') && merkRe.test('predict therace') && !merkRe.test('f1 poule'), merk);
  check('de vragen met de regex uit het zoekplan', f(pa[4])?.expression === VRAAG, f(pa[4])?.expression);
  const insp = api.filter((x) => x.pad === '/v1/urlInspection/index:inspect');
  const urls = sitemapUrls(readFileSync(join(kopie, 'sitemap.xml'), 'utf8'));
  check('elke pagina uit de sitemap gaat langs de URL-inspectie, voor de domeinproperty',
    JSON.stringify(insp.map((x) => x.json.inspectionUrl)) === JSON.stringify(urls) && insp.every((x) => x.json.siteUrl === PROPERTY),
    `${insp.length} van ${urls.length}`);
}

// ---- 5. wat er weggeschreven is ------------------------------------------------------
{
  const m = existsSync(join(kopie, JSON_PAD)) ? JSON.parse(readFileSync(join(kopie, JSON_PAD), 'utf8')) : {};
  const urls = sitemapUrls(readFileSync(join(kopie, 'sitemap.xml'), 'utf8'));
  check('de JSON heeft de datum, de property en de periode', m.gemeten === '2026-10-26' && m.property === PROPERTY
    && m.periode?.van === '2026-09-26' && m.periode?.tot === '2026-10-23', JSON.stringify({ g: m.gemeten, p: m.periode }));
  check('totaal en zonder merk, afgerond op twee decimalen', JSON.stringify(m.totaal) === JSON.stringify({ klikken: 7, vertoningen: 130, positie: 9.12 })
    && JSON.stringify(m.nietMerk) === JSON.stringify({ klikken: 2, vertoningen: 40, positie: 18.4 }), JSON.stringify([m.totaal, m.nietMerk]));
  const top = (m.top10 ?? []).map((z) => z.zoekopdracht);
  check('de top 10 zoekopdrachten op vertoningen, niet op klikken', top.length === 10
    && JSON.stringify(top.slice(0, 4)) === JSON.stringify(['predict the race', 'f1 poule maken', 'f1 poule', 'zoek 0']), top.join(', '));
  check('de vragen met hun pagina', m.vragen?.[0]?.zoekopdracht === 'hoe werkt een f1 poule'
    && m.vragen?.[0]?.pagina === 'https://predicttherace.com/f1-poule-organiseren/', JSON.stringify(m.vragen));
  const niet = (m.urls ?? []).filter((u) => !u.geindexeerd);
  check('per pagina of hij geïndexeerd is, met de reden als hij dat niet is',
    m.index?.van === urls.length && m.index?.geindexeerd === urls.length - 1 && niet.length === 1
      && niet[0].url === 'https://predicttherace.com/races/2026/qatar/' && niet[0].status === 'Crawled - currently not indexed'
      && niet[0].gecrawld === '2026-09-28', JSON.stringify(m.index) + ' ' + JSON.stringify(niet));
  const md = readFileSync(join(kopie, METING_PAD), 'utf8');
  check('meting.md heeft de regel van oktober met deze cijfers',
    md.includes(`| 2026-10 | ${urls.length - 1} van ${urls.length} | 130 | 7 | 2 | automatisch, 26 oktober (26 september tot en met 23 oktober) |`),
    md.split('\n').filter((r) => r.startsWith('| 2026')).join(' / '));
  check('de log noemt de pagina die niet geïndexeerd is', /niet geïndexeerd: https:\/\/predicttherace\.com\/races\/2026\/qatar\//.test(run.uit),
    run.uit.slice(0, 300));
}

// ---- 6. Google weigert -------------------------------------------------------------------
{
  weiger = true;
  writeFileSync(join(kopie, METING_PAD), mdVoor);
  const r = await draai({ SEARCH_CONSOLE_SLEUTEL: JSON.stringify(sleutel) });
  check('weigert Search Console (403), dan zakt het, met de tip over de gebruiker in Search Console',
    r.code === 1 && /403/.test(r.uit) && /gebruiker/.test(r.uit), r.uit.trim());
  check('en dan blijft meting.md zoals hij was', readFileSync(join(kopie, METING_PAD), 'utf8') === mdVoor, 'veranderd');
  check('de sleutel en het token komen nooit in de log', !run.uit.includes(TOKEN) && !r.uit.includes(TOKEN)
    && !run.uit.includes('PRIVATE KEY') && !r.uit.includes('PRIVATE KEY'), 'gelekt');
  weiger = false;
}
server.close();

// ---- 7. niet op het domein, en de workflow ---------------------------------------------
check('de JSON en meting.md komen niet op het domein', !gepubliceerd(JSON_PAD) && !gepubliceerd(METING_PAD),
  `${gepubliceerd(JSON_PAD)} ${gepubliceerd(METING_PAD)}`);
{
  const wf = readFileSync(join(wortel, '.github', 'workflows', 'zoekcijfers.yml'), 'utf8');
  check('de workflow draait elke week en met de hand', /workflow_dispatch:/.test(wf) && /cron: '\d+ \d+ \* \* 1'/.test(wf), 'zie zoekcijfers.yml');
  check('hij geeft het secret mee aan het script', /SEARCH_CONSOLE_SLEUTEL: \$\{\{ secrets\.SEARCH_CONSOLE_SLEUTEL \}\}/.test(wf)
    && /node scripts\/zoekcijfers\.mjs/.test(wf), 'zie zoekcijfers.yml');
  check('en legt alleen de JSON en meting.md vast', /git add docs\/zoekplan\/zoekcijfers\.json docs\/zoekplan\/meting\.md\n/.test(wf)
    && !/git add -A/.test(wf), 'zie zoekcijfers.yml');
  check('geen sleutel in de repo: het script leest hem alleen uit de omgeving',
    !/PRIVATE KEY/.test(readFileSync(join(wortel, 'scripts', 'zoekcijfers.mjs'), 'utf8')) && !/PRIVATE KEY/.test(wf), 'gevonden');
}

process.exit(afronden() ? 0 : 1);
