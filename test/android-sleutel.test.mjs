// De uploadsleutel van de Android-app (scripts/android-sleutel.mjs), tegen een
// nagebootste Supabase Storage. Met de echte keytool.
//
// Wat hier vastligt:
//   1. De eerste keer: een nieuwe sleutel, als één bestand bewaard in de map
//      android, met x-upsert: false (nooit overschrijven) en de
//      service_role-sleutel.
//   2. Daarna: dezelfde sleutel terug, geen nieuwe, en dezelfde vingerafdruk.
//   3. Geen map (schema.sql niet gedraaid), een fout van Storage, een
//      onvolledig bestand of een bestand dat er intussen staat: de run stopt,
//      er komt geen nieuwe sleutel.
//   4. In de workflow: het wachtwoord gemaskeerd voordat er iets anders in de
//      log komt, en daarna nergens; pad en wachtwoord in GITHUB_ENV voor
//      Gradle; de vingerafdruk in de samenvatting en in vingerafdruk.txt, met
//      de waarschuwing dat hij nog niet in site/android.mjs staat.

import { createServer } from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { sleutelOphalen, vingerafdruk, MAP, BESTAND } from '../scripts/android-sleutel.mjs';

const { check, afronden } = maakControle('de uploadsleutel van de Android-app');
const KEY = 'service-role-nep';
const tmp = () => mkdtempSync(join(tmpdir(), 'android-sleutel-'));

// Een Storage zoals die van Supabase, zo ver als het script hem gebruikt.
function nepStorage({ bucket = true, storing = false } = {}) {
  const bestanden = new Map();
  const verzoeken = [];
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const stuk of req) body += stuk;
    verzoeken.push({ methode: req.method, url: req.url, kop: req.headers, body });
    const stuur = (code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };
    if (req.headers.authorization !== `Bearer ${KEY}` || req.headers.apikey !== KEY) return stuur(401, { error: 'Unauthorized' });
    if (storing) return stuur(500, { error: 'internal' });
    const m = /^\/storage\/v1\/object\/([^/]+)\/(.+)$/.exec(req.url);
    if (!m) return stuur(404, { error: 'not found' });
    if (!bucket || m[1] !== MAP) return stuur(400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
    if (req.method === 'GET') {
      if (!bestanden.has(m[2])) return stuur(400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(bestanden.get(m[2]));
    }
    if (req.method === 'POST') {
      if (bestanden.has(m[2]) && req.headers['x-upsert'] !== 'true') return stuur(400, { statusCode: '409', error: 'Duplicate' });
      bestanden.set(m[2], body);
      return stuur(200, { Key: `${m[1]}/${m[2]}` });
    }
    return stuur(405, {});
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () =>
    r({ url: `http://127.0.0.1:${server.address().port}`, bestanden, verzoeken, stop: () => server.close() })));
}
const fout = async (p) => { try { await p; return null; } catch (e) { return e.message; } };

// ---- 1 en 2. de eerste keer, en daarna ----------------------------------------------
{
  const s = await nepStorage();
  const pad1 = join(tmp(), 'a.p12');
  const eerst = await sleutelOphalen({ url: s.url, key: KEY, pad: pad1 });
  const op = s.verzoeken.filter((v) => v.methode === 'POST');
  check('de eerste keer een nieuwe sleutel, als één bestand in de map android', eerst.nieuw === true
    && op.length === 1 && op[0].url === `/storage/v1/object/${MAP}/${BESTAND}` && s.bestanden.size === 1);
  check('nooit overschrijven: x-upsert false', op[0].kop['x-upsert'] === 'false');
  const opgeslagen = JSON.parse(s.bestanden.get(BESTAND));
  check('met het wachtwoord en de sleutel erin', opgeslagen.wachtwoord === eerst.wachtwoord
    && Buffer.from(opgeslagen.p12, 'base64').equals(readFileSync(pad1)) && eerst.wachtwoord.length >= 32);
  const v1 = vingerafdruk(pad1, eerst.wachtwoord);
  check('een echte sleutel met een SHA-256-vingerafdruk', /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(v1), v1);
  const lijst = execFileSync('keytool', ['-list', '-v', '-keystore', pad1, '-storepass', eerst.wachtwoord], { encoding: 'utf8' });
  check('RSA van 4096 bits, alias upload, geldig tot na 2033 (Google Play)', /Alias name: upload/.test(lijst)
    && /4096-bit RSA/.test(lijst) && Number(/until: .* (\d{4})\s*$/m.exec(lijst)?.[1]) > 2033, lijst.split('\n').slice(0, 14).join(' | '));

  const pad2 = join(tmp(), 'b.p12');
  const daarna = await sleutelOphalen({ url: s.url, key: KEY, pad: pad2 });
  check('daarna dezelfde sleutel, geen nieuwe', daarna.nieuw === false && daarna.wachtwoord === eerst.wachtwoord
    && s.verzoeken.filter((v) => v.methode === 'POST').length === 1 && vingerafdruk(pad2, daarna.wachtwoord) === v1);

  // Er staat intussen al een sleutel (een tweede run tegelijk): niet overschrijven.
  const nep = async (adres, opties = {}) => (opties.method === 'POST' ? fetch(adres, opties)
    : new Response(JSON.stringify({ statusCode: '404', error: 'not_found', message: 'Object not found' }), { status: 400 }));
  const melding = await fout(sleutelOphalen({ url: s.url, key: KEY, pad: join(tmp(), 'c.p12'), fetch: nep }));
  check('staat er intussen een sleutel, dan stopt de run en blijft die staan', /bewaren/.test(melding ?? '')
    && JSON.parse(s.bestanden.get(BESTAND)).wachtwoord === eerst.wachtwoord, melding);
  s.stop();
}

// ---- 3. wat de run laat stoppen zonder nieuwe sleutel ----------------------------------------
{
  let gemaakt = 0;
  const maakSleutel = () => { gemaakt += 1; throw new Error('mag niet'); };
  const zonderMap = await nepStorage({ bucket: false });
  const m1 = await fout(sleutelOphalen({ url: zonderMap.url, key: KEY, pad: join(tmp(), 'x.p12'), maakSleutel }));
  check('geen map android: draai schema.sql, en geen sleutel', /schema\.sql/.test(m1 ?? '') && gemaakt === 0, m1);
  zonderMap.stop();

  const kapot = await nepStorage({ storing: true });
  const m2 = await fout(sleutelOphalen({ url: kapot.url, key: KEY, pad: join(tmp(), 'y.p12'), maakSleutel }));
  check('een fout van Storage: stoppen, geen sleutel', /500/.test(m2 ?? '') && gemaakt === 0
    && !kapot.verzoeken.some((v) => v.methode === 'POST'), m2);
  kapot.stop();

  const half = await nepStorage();
  half.bestanden.set(BESTAND, JSON.stringify({ wachtwoord: 'x' }));
  const m3 = await fout(sleutelOphalen({ url: half.url, key: KEY, pad: join(tmp(), 'z.p12'), maakSleutel }));
  check('een onvolledig bestand: stoppen, niets overschreven', /onvolledig/.test(m3 ?? '') && gemaakt === 0
    && half.bestanden.get(BESTAND) === JSON.stringify({ wachtwoord: 'x' }), m3);
  half.stop();

  const m4 = await fout(sleutelOphalen({ url: '', key: KEY, pad: join(tmp(), 'q.p12'), maakSleutel }));
  check('zonder SUPABASE_URL: stoppen', /SUPABASE_URL/.test(m4 ?? '') && gemaakt === 0, m4);
}

// ---- 4. in de workflow ----------------------------------------------------------------------
{
  const s = await nepStorage();
  const map = tmp();
  const genv = join(map, 'env');
  const samenvatting = join(map, 'samenvatting');
  writeFileSync(genv, '');
  writeFileSync(samenvatting, '');
  // Niet spawnSync: dan staat de nagebootste Storage in dit proces stil.
  const draai = () => new Promise((klaar) => {
    const kind = spawn('node', [join(wortel, 'scripts', 'android-sleutel.mjs')], {
      env: { PATH: process.env.PATH, SUPABASE_URL: s.url, SUPABASE_KEY: KEY, RUNNER_TEMP: map,
        GITHUB_ENV: genv, GITHUB_STEP_SUMMARY: samenvatting } });
    let stdout = '', stderr = '';
    kind.stdout.on('data', (d) => { stdout += d; });
    kind.stderr.on('data', (d) => { stderr += d; });
    kind.on('close', (status) => klaar({ status, stdout, stderr }));
  });
  const r = await draai();
  const wachtwoord = JSON.parse(s.bestanden.get(BESTAND) ?? '{}').wachtwoord ?? '???';
  const regels = r.stdout.split('\n').filter(Boolean);
  check('de run slaagt', r.status === 0, r.stderr);
  check('het wachtwoord wordt gemaskeerd voordat er iets anders in de log komt',
    regels[0] === `::add-mask::${wachtwoord}`, regels[0]);
  check('en staat daarna nergens meer in de log, net als de sleutel zelf',
    !regels.slice(1).join('\n').includes(wachtwoord) && !r.stderr.includes(wachtwoord)
      && !r.stdout.includes(JSON.parse(s.bestanden.get(BESTAND)).p12.slice(0, 40)));
  const env = readFileSync(genv, 'utf8');
  check('pad en wachtwoord in GITHUB_ENV voor Gradle', env.includes(`ANDROID_SLEUTEL_PAD=${join(map, 'uploadsleutel.p12')}\n`)
    && env.includes(`ANDROID_SLEUTEL_WACHTWOORD=${wachtwoord}\n`) && existsSync(join(map, 'uploadsleutel.p12')));
  const v = readFileSync(join(map, 'vingerafdruk.txt'), 'utf8').trim();
  const sv = readFileSync(samenvatting, 'utf8');
  check('de vingerafdruk in vingerafdruk.txt en in de samenvatting, met "nieuw gemaakt"',
    /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(v) && sv.includes(v) && sv.includes('Nieuw gemaakt'), sv);
  check('en de waarschuwing dat hij nog niet in site/android.mjs staat', sv.includes('Staat nog niet in site/android.mjs'));
  const r2 = await draai();
  check('de tweede run haalt hem op, met dezelfde vingerafdruk', r2.status === 0
    && readFileSync(samenvatting, 'utf8').includes('Opgehaald uit de privé-map')
    && readFileSync(join(map, 'vingerafdruk.txt'), 'utf8').trim() === v, r2.stderr);
  s.stop();
}

process.exit(afronden() ? 0 : 1);
