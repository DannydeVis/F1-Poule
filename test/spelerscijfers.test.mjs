// Hoe deed jij het tegen iedereen (Danny, 1 november), zonder browser.
//
// "De sync rekent na elke sessie anonieme cijfers uit over alle poules ...
// Alleen echte voorspellingen: automatisch ingevulde antwoorden tellen niet
// mee. Alleen na de deadline, en pas vanaf 50 spelers uit minstens 5 poules
// per sessie; daaronder niets tonen. Nooit per poule, nooit namen of id's."
// En: "Tests: 49 spelers geeft niets en 50 wel, automatisch invullen telt niet
// mee, niets vóór de deadline (behalve de seizoenspagina), en geen namen,
// poules of id's in de openbare tabel."
//
// Wat hier vastligt:
//   1. De regels uit scripts/spelerscijfers.mjs: de drempel (49 niets, 50 wel,
//      50 uit 4 poules niets), alleen tien verschillende coureurs telt, niets
//      voor de deadline of zonder uitslag, de punten zoals de app ze geeft (de
//      sprint half), de verdeling, de winnaar, vaakst en minst vaak goed, de
//      grootste verrassing, en "beter dan p%".
//   2. Wanneer de sync narekent (een week na de deadline), en de seizoensvragen:
//      alleen van december tot de eerste sessie, met dezelfde drempel.
//   3. De échte sync tegen een nagebootste Supabase, OpenF1 en pushdienst: de
//      rijen in spelerscijfers, een poule met automatisch invullen telt niet
//      mee, een sessie die nog open is krijgt niets (ook met een uitslag), de
//      uitslagmelding noemt je plek, het bestand voor de site, nergens een
//      poule, een speler of een id, een tweede ronde schrijft niets, en met
//      49 spelers gaat de rij weer weg.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { sessieCijfers, beterDan, teBerekenen, seizoenCijfers, seizoenVenster, komendSeizoen, topPunten,
         echteLijst, sitebestand, scoreLijst, WEGING, DREMPEL, NAREKENEN_DAGEN } from '../scripts/spelerscijfers.mjs';
import { nieuwSleutelpaar } from '../scripts/push.mjs';

const { check, afronden } = maakControle('spelerscijfers: hoe deed jij het tegen iedereen');
const b64u = (b) => Buffer.from(b).toString('base64url');
const nu = Date.now();
const uur = (u) => new Date(nu + u * 3600e3).toISOString();

// Een uitslag en spelers met een lijst. Speler i schuift de uitslag i plekken
// op, zodat er een echte verdeling ontstaat.
const UIT = ['4', '81', '1', '16', '44', '63', '12', '23', '14', '10', '30', '22'];
const lijstVan = (i) => {
  const basis = UIT.slice(0, 11);
  const k = i % 4;
  return [...basis.slice(k), ...basis.slice(0, k)].slice(0, 10);
};
const spelers = (n, poules, { vraag = 'race_top10', van = 0 } = {}) => Array.from({ length: n }, (_, i) => ({
  pool_id: `00000000-0000-0000-0000-00000000000${(i % poules) + 1}`, member_id: `m-${van + i}`,
  question_id: vraag, waarde: lijstVan(van + i) }));
const RACE = { id: 1, season: 2026, round: 21, name: 'São Paulo', deadline_quali: uur(-26), deadline_race: uur(-2),
  race_result: UIT, quali_result: UIT, afgelast: false };

// ---- 1. de regels --------------------------------------------------------------------
{
  check('de drempel is 50 spelers uit 5 poules', DREMPEL.spelers === 50 && DREMPEL.poules === 5);
  check('49 spelers: niets', sessieCijfers({ race: RACE, sessie: 'race', antwoorden: spelers(49, 5), nu }) === null);
  const vijftig = sessieCijfers({ race: RACE, sessie: 'race', antwoorden: spelers(50, 5), nu });
  check('50 spelers uit 5 poules: wel', vijftig?.spelers === 50 && vijftig?.poules === 5, JSON.stringify(vijftig)?.slice(0, 200));
  check('50 spelers uit 4 poules: niets', sessieCijfers({ race: RACE, sessie: 'race', antwoorden: spelers(50, 4), nu }) === null);

  // Alleen tien verschillende coureurs is een echte lijst.
  const kapot = [
    { pool_id: 'p9', member_id: 'k1', question_id: 'race_top10', waarde: UIT.slice(0, 9) },
    { pool_id: 'p9', member_id: 'k2', question_id: 'race_top10', waarde: [...UIT.slice(0, 9), '4'] },
    { pool_id: 'p9', member_id: 'k3', question_id: 'race_top10', waarde: [...UIT.slice(0, 9), null] },
    { pool_id: 'p9', member_id: 'k4', question_id: 'race_top10', waarde: 'nee' },
  ];
  check('alleen tien verschillende coureurs telt: 49 echte en 4 kapotte lijsten is niets',
    sessieCijfers({ race: RACE, sessie: 'race', antwoorden: [...spelers(49, 5), ...kapot], nu }) === null
      && !kapot.some((k) => echteLijst(k.waarde)) && echteLijst(UIT.slice(0, 10)));
  check('en een andere vraag of een andere sessie telt ook niet mee',
    sessieCijfers({ race: RACE, sessie: 'race', antwoorden: [...spelers(49, 5), ...spelers(10, 5, { vraag: 'quali_top10', van: 100 })], nu }) === null);

  check('vóór de deadline niets, ook niet met een uitslag (met de hand ingevuld)',
    sessieCijfers({ race: { ...RACE, deadline_race: uur(1) }, sessie: 'race', antwoorden: spelers(80, 8), nu }) === null);
  check('zonder uitslag niets, en een afgelaste race ook niet',
    sessieCijfers({ race: { ...RACE, race_result: null }, sessie: 'race', antwoorden: spelers(80, 8), nu }) === null
      && sessieCijfers({ race: { ...RACE, afgelast: true }, sessie: 'race', antwoorden: spelers(80, 8), nu }) === null);

  // De punten zijn die van de app, en de verdeling telt op tot het aantal spelers.
  const c = vijftig.cijfers;
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  check('een sprint telt half, net als SESSIES.sprint.weging in de app',
    WEGING.sprint === Number(app.match(/hand:'sprint_handmatig', weging:([\d.]+)/)?.[1]) && WEGING.race === 1);
  const verwacht = {};
  for (const s of spelers(50, 5)) { const p = scoreLijst(s.waarde, UIT).totaal; verwacht[p] = (verwacht[p] ?? 0) + 1; }
  check('de verdeling: per aantal punten hoeveel spelers, met de punten van de app',
    JSON.stringify(c.verdeling) === JSON.stringify(verwacht) && Object.values(c.verdeling).reduce((a, b) => a + b, 0) === 50,
    `${JSON.stringify(c.verdeling)} / ${JSON.stringify(verwacht)}`);
  const sprint = sessieCijfers({ race: { ...RACE, deadline_sprint: uur(-50), sprint_result: UIT }, sessie: 'sprint',
    antwoorden: spelers(50, 5, { vraag: 'sprint_top10' }), nu });
  check('op een sprint de helft, afgerond zoals de app (Math.round), en hoogstens 25',
    sprint?.cijfers.max === 25 && Object.keys(sprint.cijfers.verdeling).every((p) => Number.isInteger(Number(p)))
      && Object.keys(sprint.cijfers.verdeling).map(Number).sort((a, b) => a - b).join() === Object.keys(verwacht).map((p) => Math.round(p * 0.5)).sort((a, b) => a - b).join(),
    JSON.stringify(sprint?.cijfers.verdeling));
  check('het gemiddelde met één decimaal', c.gemiddeld === Math.round((Object.entries(verwacht)
    .reduce((a, [p, n]) => a + p * n, 0) / 50) * 10) / 10 && c.max === 50, String(c.gemiddeld));
  // Speler i schuift i % 4 plekken: een kwart heeft de winnaar (plek 1) goed.
  check('de winnaar: hoeveel spelers P1 goed hadden', c.p1.nr === '4' && c.p1.goed === 13, JSON.stringify(c.p1));
  check('vaakst goed: bij gelijk de hoogste plek, en minst vaak goed',
    c.vaakst.nr === '4' && c.vaakst.plek === 1 && c.vaakst.goed === 13 && c.minst.goed <= c.vaakst.goed,
    `${JSON.stringify(c.vaakst)} / ${JSON.stringify(c.minst)}`);

  // De grootste verrassing: iedereen zette 30 op P1, hij eindigde P11 (buiten
  // de top 10): overschat. Een tweede race: niemand had 22, hij werd tweede.
  const allemaal = (lijst, n = 50) => Array.from({ length: n }, (_, i) => ({ pool_id: `p${i % 5}`, member_id: `v${i}`,
    question_id: 'race_top10', waarde: lijst }));
  const over = sessieCijfers({ race: RACE, sessie: 'race', antwoorden: allemaal(['30', ...UIT.slice(0, 9)]), nu });
  check('de grootste verrassing: iedereen had hem op P1 en hij viel buiten de top 10, overschat',
    over?.cijfers.verrassing?.nr === '30' && over.cijfers.verrassing.plek === null
      && over.cijfers.verrassing.richting === 'overschat' && over.cijfers.verrassing.verwacht === 1
      && over.cijfers.verrassing.erin === 50, JSON.stringify(over?.cijfers.verrassing));
  const onder = sessieCijfers({ race: { ...RACE, race_result: ['4', '22', '81', '1', '16', '44', '63', '12', '23', '14', '10'] },
    sessie: 'race', antwoorden: allemaal(['4', '81', '1', '16', '44', '63', '12', '23', '14', '10']), nu });
  check('niemand had hem en hij werd tweede: onderschat',
    onder?.cijfers.verrassing?.nr === '22' && onder.cijfers.verrassing.plek === 2
      && onder.cijfers.verrassing.richting === 'onderschat' && onder.cijfers.verrassing.erin === 0,
    JSON.stringify(onder?.cijfers.verrassing));

  // Elke waarde in de cijfers, zonder de sleutels: geen enkele is een poule of een speler.
  const waarden = (x) => (x && typeof x === 'object' ? Object.values(x).flatMap(waarden) : [String(x)]);
  const ids = new Set([...spelers(50, 5), ...allemaal([]), ...spelers(50, 5, { vraag: 'sprint_top10' })]
    .flatMap((a) => [a.pool_id, a.member_id]));
  const gevonden = [vijftig, over, onder, sprint].flatMap(waarden).filter((w) => ids.has(w));
  check('nergens een poule of een speler in de cijfers', !gevonden.length, gevonden.join(', '));

  // Beter dan: wie lager scoorde, naar beneden afgerond; gelijk is niet beter.
  check('beter dan: het deel dat lager scoorde, naar beneden afgerond',
    beterDan({ 10: 1, 20: 2 }, 20) === 33 && beterDan({ 10: 1, 20: 2 }, 25) === 100 && beterDan({ 10: 2, 20: 1 }, 20) === 66);
  check('wie niemand voorbij was of zonder cijfers: niets', beterDan({ 10: 1, 20: 2 }, 10) === null
    && beterDan({}, 30) === null && beterDan(null, 30) === null);
  check('topPunten is de top 10 van de app, op een sprint half',
    topPunten(UIT.slice(0, 10), UIT, 'race') === 50 && topPunten(UIT.slice(0, 10), UIT, 'sprint') === 25);
}

// ---- 2. wanneer ------------------------------------------------------------------------
{
  const races = [
    { ...RACE },
    { id: 2, season: 2026, round: 20, name: 'Oud', deadline_race: new Date(nu - (NAREKENEN_DAGEN + 1) * 864e5).toISOString(), race_result: UIT },
    { id: 3, season: 2026, round: 22, name: 'Open', deadline_quali: uur(30), deadline_race: uur(50), quali_result: UIT },
  ];
  const welk = teBerekenen(races, nu).map((x) => `${x.race.round}:${x.sessie}`).join();
  check('de sync rekent een week na de deadline na: niet ouder, niet open, niet zonder uitslag',
    welk === '21:quali,21:race', welk);

  const seizoen = [{ id: 10, season: 2027, round: 1, name: 'Melbourne', deadline_quali: '2027-03-06T05:00:00Z', deadline_race: '2027-03-07T04:00:00Z' },
    { id: 11, season: 2027, round: 2, name: 'Shanghai', deadline_quali: '2027-03-13T07:00:00Z' }];
  check('de seizoenspagina leeft van 1 december tot de eerste sessie',
    !seizoenVenster(seizoen, 2027, Date.UTC(2026, 10, 30, 23)) && !!seizoenVenster(seizoen, 2027, Date.UTC(2026, 11, 1, 0, 1))
      && !!seizoenVenster(seizoen, 2027, Date.parse('2027-03-06T04:59:00Z')) && !seizoenVenster(seizoen, 2027, Date.parse('2027-03-06T05:00:00Z')));
  check('en dat is het komende seizoen', komendSeizoen([...races, ...seizoen], Date.UTC(2026, 11, 10)) === 2027
    && komendSeizoen([...races, ...seizoen], Date.UTC(2026, 10, 10)) === null);

  const kies = (n, poules, vraag, waarde) => Array.from({ length: n }, (_, i) => ({ pool_id: `q${i % poules}`, question_id: vraag,
    waarde: typeof waarde === 'function' ? waarde(i) : waarde }));
  check('seizoensvragen: 49 spelers niets', seizoenCijfers({ antwoorden: kies(49, 5, 'kampioen', '1') }) === null);
  const s = seizoenCijfers({ antwoorden: [...kies(50, 5, 'kampioen', (i) => (i < 30 ? '1' : '4')),
    ...kies(49, 5, 'constructeur', 'McLaren')] });
  check('50 wel, per vraag: de kampioen erin, de constructeurs met 49 niet',
    s?.spelers === 50 && s.poules === 5 && s.cijfers.kampioen.verdeling['1'] === 30 && s.cijfers.kampioen.verdeling['4'] === 20
      && !s.cijfers.constructeur, JSON.stringify(s));
  const bestand = sitebestand({ jaar: 2027, rijen: [{ seizoen: 2027, ronde: 0, sessie: 'seizoen', ...s }],
    races: [...seizoen, { id: 9, season: 2026, round: 24, drivers: [{ nr: '1', code: 'VER', naam: 'Max VERSTAPPEN', team: 'Red Bull Racing' }] }] });
  check('voor de site met de naam erbij (de lijst van vorig jaar als het nieuwe er nog niet is), en tot wanneer',
    bestand.seizoen.kampioen.lijst[0].naam === 'Max VERSTAPPEN' && bestand.seizoen.kampioen.lijst[0].aantal === 30
      && bestand.seizoen.tot === '2027-03-06T05:00:00.000Z' && bestand.races.length === 0, JSON.stringify(bestand));
}

// ---- 3. de échte sync ------------------------------------------------------------------
const DRIVERS = UIT.map((nr, i) => ({ nr, code: `C${nr}`, naam: `Coureur NUMMER${nr}`, team: `Team ${i % 5}`, kleur: '#888888' }));
const wereld = { races: [], answers: [], pools: [], pool_questions: [], push_abonnementen: [], sync_runs: [],
  site_paden: [], spelerscijfers: [] };
const schrijven = [];
const pushes = [];
const sleutelsVan = (zoek, prefer) => {
  const op = zoek.get('on_conflict');
  return op && /merge-duplicates/.test(prefer ?? '') ? op.split(',') : null;
};
const filters = (zoek) => [...zoek.entries()]
  .filter(([k]) => !['order', 'select', 'limit', 'offset', 'on_conflict'].includes(k))
  .map(([veld, uitdr]) => {
    const [op, ...rest] = uitdr.split('.');
    const waarde = rest.join('.');
    if (op === 'eq') return (r) => String(r[veld]) === waarde;
    if (op === 'in') { const lijst = waarde.replace(/^\(|\)$/g, '').split(','); return (r) => lijst.includes(String(r[veld])); }
    if (op === 'is') return (r) => String(r[veld] ?? 'null') === waarde;
    if (['gte', 'lte', 'gt', 'lt'].includes(op)) return () => true;
    throw new Error(`filter ${veld}=${uitdr} kent de nabootsing niet`);
  });
function postgrest(req, res, tabel, zoek, body) {
  const rijen = wereld[tabel];
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(data === null ? '' : JSON.stringify(data)); };
  if (!rijen) { res.writeHead(404); return res.end(`geen tabel ${tabel}`); }
  const past = (r) => filters(zoek).every((f) => f(r));
  if (req.method === 'GET') {
    let uit = rijen.filter(past);
    const vanaf = Number(zoek.get('offset') ?? 0);
    uit = uit.slice(vanaf, zoek.get('limit') ? vanaf + Number(zoek.get('limit')) : undefined);
    const kolommen = zoek.get('select');
    if (kolommen && kolommen !== '*') {
      const k = kolommen.split(',');
      uit = uit.map((r) => Object.fromEntries(k.filter((x) => x in r).map((x) => [x, r[x]])));
    }
    // Zoals jsonb: de sleutels van een object in een andere volgorde terug.
    return stuur(JSON.parse(JSON.stringify(uit), (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).reverse()) : v)));
  }
  if (req.method === 'POST') {
    const nieuw = [].concat(JSON.parse(body));
    if (tabel === 'spelerscijfers') schrijven.push(...nieuw);
    const sleutels = sleutelsVan(zoek, req.headers.prefer);
    for (const r of nieuw) {
      const i = sleutels ? rijen.findIndex((x) => sleutels.every((k) => String(x[k]) === String(r[k]))) : -1;
      if (i >= 0) rijen[i] = { ...rijen[i], ...r }; else rijen.push(r);
    }
    return stuur(null);
  }
  if (req.method === 'PATCH') {
    for (const r of rijen.filter(past)) Object.assign(r, JSON.parse(body));
    return stuur(null);
  }
  if (req.method === 'DELETE') { wereld[tabel] = rijen.filter((r) => !past(r)); return stuur(null); }
  res.writeHead(405); res.end();
}
const server = createServer((req, res) => {
  const delen = [];
  req.on('data', (d) => delen.push(d));
  req.on('end', () => {
    const body = Buffer.concat(delen);
    const url = new URL(req.url, 'http://x');
    const pad = url.pathname.split('/').filter(Boolean);
    try {
      if (pad[0] === 'push') { pushes.push({ toestel: pad[1], body }); res.writeHead(201); return res.end(); }
      if (pad[0] === 'v1') { res.writeHead(404); return res.end('[]'); }
      if (pad[0] === 'rest' && pad[1] === 'v1') return postgrest(req, res, pad[2], url.searchParams, body.toString());
      res.writeHead(404); res.end();
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;

// De repo zoals de sync hem ziet: de scripts, de app (voor de puntentelling) en
// de site.
const map = mkdtempSync(join(tmpdir(), 'spelerscijfers-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
cpSync(join(wortel, 'site'), join(map, 'site'), { recursive: true });
mkdirSync(join(map, 'app'), { recursive: true });
cpSync(join(wortel, 'app', 'index.html'), join(map, 'app', 'index.html'));
writeFileSync(join(map, 'sitemap.xml'), '<urlset></urlset>');
const uitvoerBestand = join(map, 'uitvoer.txt');
const { prive } = nieuwSleutelpaar();
const bestand = join(map, 'site', 'data', 'spelers-2026.json');

function sync() {
  writeFileSync(uitvoerBestand, '');
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'test', OPENF1_URL: `${adres}/v1`,
             SEIZOEN: '2026', KALENDER: '', VAPID_PRIVE: prive, PUSH_CONTACT: 'mailto:test@voorbeeld.nl',
             APP_URL: 'https://app.voorbeeld/app/', GITHUB_OUTPUT: uitvoerBestand },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}
const sleutels = new Map();
const toestel = (nr, member, pool, extra = {}) => {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  sleutels.set(String(nr), { ecdh, auth });
  return { endpoint: `${adres}/push/${nr}`, member_id: member, pool_id: pool,
           p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth), created_at: new Date().toISOString(),
           laatst: null, taal: 'nl', uitslag_laatst: null, training_laatst: null, tijdzone: null,
           meld_deadline: true, meld_uitslag: true, meld_training: true, ...extra };
};
function lees(push) {
  const { ecdh, auth } = sleutels.get(push.toestel);
  const b = push.body;
  const zout = b.subarray(0, 16);
  const lengte = b.readUInt8(20);
  const afzender = b.subarray(21, 21 + lengte);
  const inhoud = b.subarray(21 + lengte);
  const gedeeld = ecdh.computeSecret(afzender);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), ecdh.getPublicKey(), afzender]);
  const ikm = Buffer.from(hkdfSync('sha256', gedeeld, auth, info, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, zout, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, zout, Buffer.from('Content-Encoding: nonce\0'), 12));
  const gcm = createDecipheriv('aes-128-gcm', cek, nonce);
  gcm.setAuthTag(inhoud.subarray(inhoud.length - 16));
  const blok = Buffer.concat([gcm.update(inhoud.subarray(0, inhoud.length - 16)), gcm.final()]);
  return JSON.parse(blok.subarray(0, blok.lastIndexOf(2)).toString('utf8'));
}

// Vijf poules met tien spelers die de race en de kwalificatie invulden, en een
// zesde poule met automatisch invullen aan waar niemand iets invulde: die
// tien spelers zijn er wel, maar hun lijsten maakt de app pas als hij de
// poule toont, en die komen nooit in answers. Plus een race die nog open is,
// met een kwalificatie die al met de hand ingevuld is.
const POULE = (i) => `11111111-0000-0000-0000-00000000000${i}`;
wereld.pools = [1, 2, 3, 4, 5, 6].map((i) => ({ id: POULE(i), season: 2026, name: `Geheime poule ${i}`, join_code: `GEHEIM${i}`,
  autofill_vanaf: i === 6 ? uur(-500) : null }));
const LEDEN = Array.from({ length: 60 }, (_, i) => ({ member_id: `aaaa0000-0000-0000-0000-${String(i).padStart(12, '0')}`,
  pool_id: POULE((i % 6) + 1), display_name: `Speler Geheimnaam${i}` }));
wereld.races = [
  { id: 21, season: 2026, round: 21, name: 'São Paulo', race_key: 9001, deadline_sprint: null,
    deadline_quali: uur(-27), deadline_race: uur(-3), afgelast: false, drivers: DRIVERS,
    quali_result: UIT, race_result: UIT, sprint_result: null, pagina: null, vrije_trainingen: null },
  { id: 22, season: 2026, round: 22, name: 'Las Vegas', race_key: 9002, deadline_sprint: null,
    deadline_quali: uur(30), deadline_race: uur(54), afgelast: false, drivers: DRIVERS,
    quali_result: UIT, race_result: null, sprint_result: null, pagina: null, vrije_trainingen: null },
];
const vul = () => {
  wereld.answers = [];
  LEDEN.forEach((l, i) => {
    if (l.pool_id === POULE(6)) return;
    for (const [race, vraag] of [[21, 'race_top10'], [21, 'quali_top10'], [22, 'quali_top10'], [22, 'race_top10']]) {
      wereld.answers.push({ pool_id: l.pool_id, race_id: race, member_id: l.member_id, question_id: vraag, waarde: lijstVan(i) });
    }
  });
};
vul();
const IK = LEDEN[0];
// Toestel 3 hoort bij een speler uit de poule met automatisch invullen: die
// had geen eigen lijst. Toestel 4 bij de laagste score: die was niemand
// voorbij, en "beter dan 0%" zegt de melding niet.
wereld.push_abonnementen = [toestel(1, IK.member_id, IK.pool_id), toestel(2, LEDEN[9].member_id, LEDEN[9].pool_id, { taal: 'en' }),
  toestel(3, LEDEN[5].member_id, LEDEN[5].pool_id), toestel(4, LEDEN[7].member_id, LEDEN[7].pool_id)];

const geheim = (tekst) => [...LEDEN.map((l) => l.member_id), ...LEDEN.map((l) => l.display_name),
  ...wereld.pools.flatMap((p) => [p.id, p.name, p.join_code]), 'aaaa0000', '11111111']
  .filter((x) => tekst.includes(x));

{
  const { code, log } = await sync();
  check('de sync draait zonder fouten', code === 0, log.slice(-600));
  const rij = (ronde, sessie) => wereld.spelerscijfers.find((r) => r.ronde === ronde && r.sessie === sessie);
  check('na de deadline een rij per sessie: 50 spelers uit 5 poules (de poule met automatisch invullen telt niet mee)',
    rij(21, 'race')?.spelers === 50 && rij(21, 'race').poules === 5 && rij(21, 'quali')?.spelers === 50,
    JSON.stringify(wereld.spelerscijfers.map((r) => [r.ronde, r.sessie, r.spelers, r.poules])) + log.slice(-300));
  check('een sessie die nog open is krijgt niets, ook niet met een uitslag die er al staat',
    !rij(22, 'quali') && !rij(22, 'race'), JSON.stringify(wereld.spelerscijfers.map((r) => [r.ronde, r.sessie])));
  const verwacht = {};
  LEDEN.forEach((l, i) => { if (l.pool_id !== POULE(6)) { const p = topPunten(lijstVan(i), UIT, 'race'); verwacht[p] = (verwacht[p] ?? 0) + 1; } });
  check('de verdeling is die van de app', JSON.stringify(Object.entries(rij(21, 'race').cijfers.verdeling).sort())
    === JSON.stringify(Object.entries(verwacht).sort()), JSON.stringify(rij(21, 'race').cijfers.verdeling));
  const openbaar = JSON.stringify(wereld.spelerscijfers);
  check('in de openbare tabel geen poule, geen speler, geen naam, geen code en geen id',
    !geheim(openbaar).length && !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(openbaar)
      && wereld.spelerscijfers.every((r) => Object.keys(r).sort().join() === 'bijgewerkt,cijfers,poules,ronde,seizoen,sessie,spelers'),
    geheim(openbaar).join(', ') || Object.keys(wereld.spelerscijfers[0] ?? {}).join());

  // De uitslagmelding: de race is de laatste sessie met een uitslag.
  const mijn = topPunten(lijstVan(0), UIT, 'race');
  const p = beterDan(rij(21, 'race').cijfers.verdeling, mijn);
  let gelezen = [];
  try { gelezen = ['1', '2', '3', '4'].map((t) => lees(pushes.find((x) => x.toestel === t))); } catch (e) { gelezen = [String(e)]; }
  check('de uitslagmelding noemt je plek tegen iedereen, in de taal van het toestel',
    p > 0 && gelezen[0]?.tekst === `Je top 10: beter dan ${p}% van alle spelers. Bekijk je punten en de stand.`
      && /^Your top 10: better than \d+% of all players\. See your points and the standings\.$/.test(gelezen[1]?.tekst ?? ''),
    `${p} · ${JSON.stringify(gelezen)}`);
  check('wie geen eigen lijst had (de app vulde hem in), krijgt de melding zonder plek',
    gelezen[2]?.tekst === 'Bekijk je punten en de stand.', JSON.stringify(gelezen[2]));
  check('en wie de laagste score had ook: geen "beter dan 0%"',
    topPunten(lijstVan(7), UIT, 'race') === Math.min(...Object.keys(rij(21, 'race').cijfers.verdeling).map(Number))
      && gelezen[3]?.tekst === 'Bekijk je punten en de stand.', JSON.stringify(gelezen[3]));

  check('het bestand voor de site, met de race, de racesessie en de namen van de coureurs',
    existsSync(bestand) && (() => {
      const b = JSON.parse(readFileSync(bestand, 'utf8'));
      const r = b.races[0];
      return b.jaar === 2026 && b.races.length === 1 && r.ronde === 21 && r.naam === 'São Paulo' && r.race_key === 9001
        && r.sessies.race.spelers === 50 && r.sessies.race.p1.naam === 'Coureur NUMMER4' && r.sessies.quali && b.seizoen === null;
    })(), existsSync(bestand) ? readFileSync(bestand, 'utf8').slice(0, 300) : 'geen bestand');
  check('en ook daarin geen poule, speler, naam, code of id',
    existsSync(bestand) && !geheim(readFileSync(bestand, 'utf8')).length && !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(readFileSync(bestand, 'utf8')));
  check('de log en het logboek zeggen het', /Spelerscijfers: 2 bijgewerkt/.test(log)
    && wereld.sync_runs.some((r) => /Spelerscijfers: 2 bijgewerkt/.test(JSON.stringify(r))), log.slice(-400));
}

{
  schrijven.length = 0;
  pushes.length = 0;
  const voor = readFileSync(bestand, 'utf8');
  const { code } = await sync();
  check('een tweede ronde schrijft niets (ook al geeft jsonb de sleutels in een andere volgorde terug)',
    code === 0 && schrijven.length === 0 && readFileSync(bestand, 'utf8') === voor, `${schrijven.length} geschreven`);
  check('en stuurt de uitslagmelding niet nog een keer', pushes.length === 0);
}

{
  // Eén speler minder in de race: 49. Dan gaat die rij weg, en uit het bestand.
  wereld.answers = wereld.answers.filter((a) => !(a.member_id === LEDEN[1].member_id && a.race_id === 21 && a.question_id === 'race_top10'));
  const { code, log } = await sync();
  const b = JSON.parse(readFileSync(bestand, 'utf8'));
  check('met 49 spelers gaat de rij weer weg, de kwalificatie (50) blijft',
    code === 0 && !wereld.spelerscijfers.some((r) => r.ronde === 21 && r.sessie === 'race')
      && wereld.spelerscijfers.some((r) => r.ronde === 21 && r.sessie === 'quali')
      && !b.races[0].sessies.race && !!b.races[0].sessies.quali, `${JSON.stringify(b.races[0]?.sessies && Object.keys(b.races[0].sessies))} · ${log.slice(-300)}`);
}

{
  // Het komende seizoen: een tweede wereld waarin 2026 nog moet beginnen
  // (de eerste sessie over een week). Dan wel vóór de deadline, alleen het
  // totaal.
  wereld.spelerscijfers = [];
  wereld.races = [{ id: 31, season: 2026, round: 1, name: 'Melbourne', race_key: 9100, deadline_sprint: null,
    deadline_quali: uur(24 * 7), deadline_race: uur(24 * 8), afgelast: false, drivers: DRIVERS,
    quali_result: null, race_result: null, sprint_result: null, pagina: null, vrije_trainingen: null }];
  wereld.answers = LEDEN.filter((l) => l.pool_id !== POULE(6)).flatMap((l, i) => [
    { pool_id: l.pool_id, race_id: 31, member_id: l.member_id, question_id: 'kampioen', waarde: i < 20 ? '4' : '1' },
    { pool_id: l.pool_id, race_id: 31, member_id: l.member_id, question_id: 'constructeur', waarde: 'Team 1' },
  ]);
  const { code, log } = await sync();
  const s = wereld.spelerscijfers.find((r) => r.sessie === 'seizoen');
  check('de seizoensvragen van het komende seizoen: wel voor de deadline, alleen het totaal',
    code === 0 && s?.seizoen === 2026 && s.ronde === 0 && s.spelers === 50 && s.cijfers.kampioen.verdeling['1'] === 30
      && s.cijfers.kampioen.verdeling['4'] === 20 && s.cijfers.constructeur.verdeling['Team 1'] === 50,
    `${JSON.stringify(s)} · ${log.slice(-300)}`);
  check('maar geen sessie: die is nog open', !wereld.spelerscijfers.some((r) => r.sessie !== 'seizoen'));
  const b = JSON.parse(readFileSync(bestand, 'utf8'));
  check('en in het bestand voor de site, met namen en tot wanneer',
    b.seizoen?.kampioen?.lijst[0]?.nr === '1' && b.seizoen.kampioen.lijst[0].naam === 'Coureur NUMMER1'
      && b.seizoen.constructeur.lijst[0].team === 'Team 1' && Math.abs(Date.parse(b.seizoen.tot) - Date.parse(uur(24 * 7))) < 1000
      && !geheim(JSON.stringify(b)).length, JSON.stringify(b.seizoen).slice(0, 300));
}

server.close();
process.exit(afronden() ? 0 : 1);
