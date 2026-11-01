// Een seintje op vrijdagavond, de vrije trainingen in de database, de
// racepagina en de meldingen per soort (Danny, 1 november).
//
// Wat hier vastligt:
//   1. De regel van de trainingsmelding (scripts/trainingmeldingen.mjs),
//      zonder netwerk: na VT2, op een sprintweekend na VT1; ook voor wie al
//      ingevuld heeft; hooguit één per weekend; niet voor wie hem uitzette;
//      alleen zolang er voor die poule nog een top 10 open is met een uur te
//      gaan; de deadline in de tijd van het toestel, anders de sessie; in
//      zeven talen.
//   2. De wekker voor de trainingen (scripts/bewaking.mjs), de regels voor
//      het rooster en de top 10 (scripts/vrijetrainingen.mjs), de racepagina
//      en de paden uit de sitemap (scripts/racepagina.mjs), en de agenda met
//      de racepagina als URL (scripts/agenda.mjs).
//   3. De échte sync tegen een nagebootste OpenF1, Supabase en pushdienst:
//      hij schrijft het rooster en de top 10 van de trainingen en de
//      racepagina weg, stuurt de melding versleuteld (één keer), zet de
//      paden van de sitemap voor de teller, zet de racepagina in kalender.ics,
//      zet een wekker na een training, en slaat een soort over die iemand
//      uitzette (de herinnering voor de deadline, en de uitslag).

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createECDH, randomBytes, hkdfSync, createDecipheriv } from 'node:crypto';
import { wieKrijgtEenTraining, trainingNieuws, sleuteltraining, achternaam, deadlineTekst,
  TRAINING_MARGE_MIN } from '../scripts/trainingmeldingen.mjs';
import { trainingRooster, teHalen, trainingTop10, zelfdeRooster } from '../scripts/vrijetrainingen.mjs';
import { racePaginas, sitemapPaden } from '../scripts/racepagina.mjs';
import { trainingWekker } from '../scripts/bewaking.mjs';
import { maakAgenda } from '../scripts/agenda.mjs';
import { wieKrijgtEenUitslag } from '../scripts/uitslagmeldingen.mjs';
import { nieuwSleutelpaar, b64u } from '../scripts/push.mjs';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('vrije trainingen, racepagina en meldingen per soort');

// ---- 1. de regel van de trainingsmelding ------------------------------------------
const NU = Date.parse('2026-11-06T20:00:00Z');      // vrijdagavond in São Paulo
const over = (uren) => new Date(NU + uren * 3600e3).toISOString();
const TOP = (codes) => codes.map((c, i) => ({ plek: i + 1, nr: String(i + 1), code: c, naam: `Iemand ${c}` }));
const DRIE = [{ plek: 1, nr: '4', code: 'NOR', naam: 'Lando NORRIS' }, { plek: 2, nr: '1', code: 'VER', naam: 'Max VERSTAPPEN' },
  { plek: 3, nr: '12', code: 'ANT', naam: 'Andrea Kimi ANTONELLI' }];
const weekend = (extra = {}) => ({
  id: 21, season: 2026, round: 21, name: 'São Paulo', afgelast: false,
  deadline_sprint: null, deadline_quali: over(20), deadline_race: over(44),
  vrije_trainingen: [
    { naam: 'Practice 1', sessie: 1, start: over(-27), eind: over(-26), top: TOP(['VER']) },
    { naam: 'Practice 2', sessie: 2, start: over(-3), eind: over(-2), top: DRIE },
    { naam: 'Practice 3', sessie: 3, start: over(17), eind: over(18), top: null },
  ], ...extra,
});
const anna = { endpoint: 'https://push/1', member_id: 'lid-1', pool_id: 'pool-1', taal: 'nl', training_laatst: null };
const roep = (opties) => wieKrijgtEenTraining({ nu: NU, ...opties });

check('de training na een gewoon weekend is VT2, op een sprintweekend VT1',
  sleuteltraining(weekend()) === 'Practice 2' && sleuteltraining(weekend({ deadline_sprint: over(15) })) === 'Practice 1');
check('de achternaam zoals in de app: "Lando NORRIS" is Norris, "Andrea Kimi ANTONELLI" is Antonelli',
  achternaam('Lando NORRIS') === 'Norris' && achternaam('Andrea Kimi ANTONELLI') === 'Antonelli'
    && achternaam(null, 'NOR') === 'NOR');
{
  const uit = roep({ races: [weekend()], abonnementen: [anna] });
  check('na VT2: één melding, met wie het snelst was, en zonder tijdzone de sessie',
    uit.length === 1 && uit[0].bericht.titel === 'VT2 is binnen: Norris was het snelst'
      && uit[0].bericht.tekst === 'Je top 10 kan nog tot de start van de kwalificatie.'
      && uit[0].tag === 'training:21' && uit[0].bericht.tag === 'training:21', JSON.stringify(uit));
  // De functie kijkt niet naar de antwoorden: ook wie al invulde krijgt hem.
  check('ook voor wie al ingevuld heeft: de regel kijkt niet naar de antwoorden',
    wieKrijgtEenTraining.length <= 1 && !String(wieKrijgtEenTraining).includes('antwoorden'));
}
{
  const met = roep({ races: [weekend()], abonnementen: [{ ...anna, tijdzone: 'Europe/Amsterdam' }] });
  const verwacht = deadlineTekst(over(20), 'nl', 'Europe/Amsterdam');
  check('met een tijdzone de deadline in de tijd van het toestel: "zaterdag 17:00"',
    verwacht === 'zaterdag 17:00' && met[0]?.bericht.tekst === `Je top 10 kan nog tot ${verwacht}.`, JSON.stringify(met));
  const kapot = roep({ races: [weekend()], abonnementen: [{ ...anna, tijdzone: 'Nergens/Niet' }] });
  check('een tijdzone die niet bestaat: dan de sessie', kapot[0]?.bericht.tekst === 'Je top 10 kan nog tot de start van de kwalificatie.',
    JSON.stringify(kapot));
}
{
  const talen = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt'].map((taal) =>
    roep({ races: [weekend()], abonnementen: [{ ...anna, taal, tijdzone: 'Europe/London' }] })[0]?.bericht);
  check('in zeven talen, elk met de coureur en een tijd',
    talen.every((b) => b && b.titel.includes('Norris') && /\d\d:\d\d/.test(b.tekst))
      && new Set(talen.map((b) => b.titel)).size === 7, JSON.stringify(talen.map((b) => b?.titel)));
  check('in het Engels: "FP2 is in: Norris was fastest", "Your top 10 is open until Saturday 16:00."',
    talen[1]?.titel === 'FP2 is in: Norris was fastest' && talen[1]?.tekst === 'Your top 10 is open until Saturday 16:00.',
    JSON.stringify(talen[1]));
  const onbekend = roep({ races: [weekend()], abonnementen: [{ ...anna, taal: 'xx' }] })[0]?.bericht;
  check('een taal die er niet is: Nederlands', onbekend?.titel.startsWith('VT2 is binnen'), JSON.stringify(onbekend));
}
{
  check('al gehad dit weekend: niets', roep({ races: [weekend()], abonnementen: [{ ...anna, training_laatst: 'training:21' }] }).length === 0);
  check('wie hem onder Profiel uitzette: niets',
    roep({ races: [weekend()], abonnementen: [{ ...anna, meld_training: false }] }).length === 0);
  check('maar een rij zonder de kolom (een oude database) krijgt hem wel',
    roep({ races: [weekend()], abonnementen: [{ ...anna, meld_training: undefined }] }).length === 1);
  const zonderTop = weekend({ vrije_trainingen: weekend().vrije_trainingen.map((t) => ({ ...t, top: t.naam === 'Practice 2' ? null : t.top })) });
  check('zolang VT2 er niet is: niets, ook al is VT1 er wel', roep({ races: [zonderTop], abonnementen: [anna] }).length === 0
    && trainingNieuws({ races: [zonderTop], nu: NU }) === null);
  const krap = weekend({ deadline_quali: new Date(NU + (TRAINING_MARGE_MIN - 1) * 60e3).toISOString() });
  const uit = roep({ races: [krap], abonnementen: [anna] });
  check('minder dan een uur voor de kwalificatie: dan de race, als de poule die speelt',
    uit[0]?.bericht.tekst === 'Je top 10 kan nog tot de start van de race.', JSON.stringify(uit));
  check('en een poule die alleen de kwalificatie speelt: niets meer',
    roep({ races: [krap], abonnementen: [anna], poulevragen: [{ pool_id: 'pool-1', question_id: 'quali_top10' }] }).length === 0);
  const voorbij = weekend({ deadline_quali: over(-1), deadline_race: over(0.5) });
  check('alles dicht of bijna dicht: niets', roep({ races: [voorbij], abonnementen: [anna] }).length === 0);
  check('een afgelaste race: niets', roep({ races: [weekend({ afgelast: true })], abonnementen: [anna] }).length === 0);
}
{
  const sprint = weekend({ deadline_sprint: over(15), vrije_trainingen: [
    { naam: 'Practice 1', sessie: 1, start: over(-3), eind: over(-2), top: DRIE }] });
  const uit = roep({ races: [sprint], abonnementen: [anna] });
  check('op een sprintweekend na VT1, met de sprint als eerste deadline',
    uit[0]?.bericht.titel === 'VT1 is binnen: Norris was het snelst'
      && uit[0]?.bericht.tekst === 'Je top 10 kan nog tot de start van de sprint.', JSON.stringify(uit));
  const zonderSprint = roep({ races: [sprint], abonnementen: [anna],
    poulevragen: [{ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' }] });
  check('een poule zonder sprint krijgt de kwalificatie als deadline',
    zonderSprint[0]?.bericht.tekst === 'Je top 10 kan nog tot de start van de kwalificatie.', JSON.stringify(zonderSprint));
}
check('de uitslagmelding slaat ook over wie hem uitzette',
  wieKrijgtEenUitslag({ nu: Date.parse('2026-11-01T22:00:00Z'), races: [{ id: 20, name: 'Mexico City',
    deadline_race: '2026-11-01T20:00:00Z', race_result: ['1'] }],
  abonnementen: [{ endpoint: 'a', pool_id: 'p', taal: 'nl', meld_uitslag: false }, { endpoint: 'b', pool_id: 'p', taal: 'nl' }] })
    .map((x) => x.abonnement.endpoint).join() === 'b');

// ---- 2. de wekker, het rooster, de racepagina, de sitemap en de agenda ------------
{
  const rooster = weekend().vrije_trainingen.map((t) => ({ ...t, top: null }));
  const r = weekend({ vrije_trainingen: rooster });
  check('wekker: 35 minuten na het einde van een training zonder top 10',
    trainingWekker({ races: [weekend({ vrije_trainingen: [{ ...rooster[2] }] })], nu: Date.parse(over(17.5)) })
      === new Date(Date.parse(over(18)) + 35 * 60e3).toISOString());
  check('daarna elke 30 minuten opnieuw, tot 4 uur na het einde',
    trainingWekker({ races: [r], nu: NU }) === new Date(NU + 30 * 60e3).toISOString()
      && trainingWekker({ races: [weekend({ vrije_trainingen: [rooster[0]] })], nu: NU }) === null);
  check('met een top 10, na de race of zonder rooster: geen wekker',
    trainingWekker({ races: [weekend()], nu: NU }) === null
      && trainingWekker({ races: [weekend({ vrije_trainingen: rooster, race_result: ['1'] })], nu: NU }) === null
      && trainingWekker({ races: [weekend({ vrije_trainingen: null })], nu: NU }) === null);
}
{
  const sessies = [
    { session_name: 'Practice 2', session_key: 2, date_start: over(-3), date_end: over(-2) },
    { session_name: 'Qualifying', session_key: 4, date_start: over(20), date_end: over(21) },
    { session_name: 'Practice 1', session_key: 1, date_start: over(-27), date_end: over(-26) },
  ];
  const rooster = trainingRooster(sessies, [{ naam: 'Practice 1', sessie: 1, top: DRIE }, { naam: 'Practice 2', sessie: 99, top: DRIE }]);
  check('het rooster: alleen de vrije trainingen, op tijd, met de top 10 die er al stond (van dezelfde sessie)',
    rooster.map((t) => t.naam).join() === 'Practice 1,Practice 2' && rooster[0].top === DRIE && rooster[1].top === null
      && rooster[1].eind === over(-2), JSON.stringify(rooster));
  check('op te halen: gereden en een half uur voorbij, zonder top 10, het weekend niet gescoord',
    teHalen(rooster, {}, NU).map((t) => t.naam).join() === 'Practice 2'
      && teHalen(rooster, {}, Date.parse(over(-1.75))).length === 0
      && teHalen(rooster, { race_result: ['1'] }, NU).length === 0);
  const top = trainingTop10([{ position: 2, driver_number: 1 }, { position: 1, driver_number: 4 }, { position: null, driver_number: 5 }],
    [{ nr: '4', code: 'NOR', naam: 'Lando NORRIS' }, { nr: '1', code: 'VER', naam: 'Max VERSTAPPEN' }]);
  check('de top 10 op plek, met code en naam uit de deelnemerslijst, zonder wie geen plek heeft',
    JSON.stringify(top) === JSON.stringify([{ plek: 1, nr: '4', code: 'NOR', naam: 'Lando NORRIS' },
      { plek: 2, nr: '1', code: 'VER', naam: 'Max VERSTAPPEN' }]) && trainingTop10([], []) === null, JSON.stringify(top));
  check('hetzelfde rooster in een andere sleutelvolgorde (zo geeft jsonb het terug) is hetzelfde',
    zelfdeRooster([{ naam: 'a', top: [{ plek: 1, nr: '4' }] }], [{ top: [{ nr: '4', plek: 1 }], naam: 'a' }])
      && !zelfdeRooster([{ naam: 'a', top: null }], [{ naam: 'a', top: [] }]));
}
{
  const data = { jaar: 2026, races: [
    { slug: 'sao-paulo', sessies: [{ naam: 'Qualifying', sessie: 4 }, { naam: 'Race', sessie: 9001 }] },
    { slug: 'las-vegas', sessies: [{ naam: 'Race', sessie: 9002 }] },
    { slug: '../app', sessies: [{ naam: 'Race', sessie: 9003 }] }] };
  const kaart = racePaginas(data, (pad) => pad === 'races/2026/sao-paulo/index.html' || pad.includes('app'));
  check('racepagina: de racesessie naar het stuk url, alleen als de pagina bestaat en alleen een net stuk url',
    [...kaart].join() === '9001,sao-paulo', JSON.stringify([...kaart]));
  check('de paden uit de sitemap, zoals de browser ze ziet',
    sitemapPaden('<url><loc>https://predicttherace.com/</loc></url><url><loc>https://predicttherace.com/en/races/2026/sao-paulo/</loc></url>'
      + '<url><loc>https://predicttherace.com/en/</loc></url><url><loc>https://predicttherace.com/en/</loc></url>').join()
      === '/,/en/races/2026/sao-paulo/,/en/');
  const ics = maakAgenda([{ id: 1, round: 21, name: 'São Paulo', race_key: 9001, deadline_quali: over(20), deadline_race: over(44), pagina: 'sao-paulo' }],
    { url: 'https://app.voorbeeld/app/', pagina: (r) => (r.pagina ? `https://app.voorbeeld/races/2026/${r.pagina}/?ref=kalender` : null) });
  check('agenda: de URL van een item is de racepagina, de app staat in de beschrijving',
    (ics.match(/^URL:.*$/gm) ?? []).every((u) => u === 'URL:https://app.voorbeeld/races/2026/sao-paulo/?ref=kalender')
      && (ics.match(/^URL:/gm) ?? []).length === 2 && ics.includes('https://app.voorbeeld/app/'), ics.slice(0, 600));
  const zonder = maakAgenda([{ id: 1, round: 21, name: 'São Paulo', deadline_quali: over(20) }], { url: 'https://app.voorbeeld/app/' });
  check('zonder racepagina blijft het de app', /^URL:https:\/\/app\.voorbeeld\/app\/\r?$/m.test(zonder));
}

// ---- 3. de échte sync -------------------------------------------------------------
const nu = Date.now();
const uur = (u) => new Date(nu + u * 3600e3).toISOString();
const DRIVERS = [['4', 'NOR', 'Lando NORRIS'], ['1', 'VER', 'Max VERSTAPPEN'], ['16', 'LEC', 'Charles LECLERC'],
  ['44', 'HAM', 'Lewis HAMILTON'], ['63', 'RUS', 'George RUSSELL'], ['12', 'ANT', 'Andrea Kimi ANTONELLI'],
  ['81', 'PIA', 'Oscar PIASTRI'], ['23', 'ALB', 'Alexander ALBON'], ['14', 'ALO', 'Fernando ALONSO'],
  ['10', 'GAS', 'Pierre GASLY'], ['30', 'LAW', 'Liam LAWSON']].map(([nr, code, naam]) => ({ nr, code, naam, team: 'Team', kleur: '#888888' }));
let sessies = [];
const zetSessies = ({ vt2Eind = -2 } = {}) => {
  sessies = [
    { session_key: 9101, session_name: 'Practice 1', meeting_key: 1288, date_start: uur(-27), date_end: uur(-26) },
    { session_key: 9102, session_name: 'Practice 2', meeting_key: 1288, date_start: uur(vt2Eind - 1), date_end: uur(vt2Eind) },
    { session_key: 9103, session_name: 'Practice 3', meeting_key: 1288, date_start: uur(17), date_end: uur(18) },
    { session_key: 9104, session_name: 'Qualifying', meeting_key: 1288, date_start: uur(20), date_end: uur(21) },
    { session_key: 9001, session_name: 'Race', meeting_key: 1288, date_start: uur(44), date_end: uur(46) },
  ];
};
zetSessies();
const UITSLAG = { 9101: ['1', '4', '16', '44', '63', '12', '81', '23', '14', '10', '30'],
                  9102: ['4', '1', '16', '44', '63', '12', '81', '23', '14', '10', '30'] };

const wereld = { races: [], answers: [], pools: [], pool_questions: [], push_abonnementen: [], sync_runs: [], site_paden: [] };
const pushes = [];
const filters = (zoek) => [...zoek.entries()]
  .filter(([k]) => !['order', 'select', 'limit', 'on_conflict'].includes(k))
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
    if (zoek.get('limit')) uit = uit.slice(0, Number(zoek.get('limit')));
    const kolommen = zoek.get('select');
    if (kolommen && kolommen !== '*') {
      const k = kolommen.split(',');
      uit = uit.map((r) => Object.fromEntries(k.filter((x) => x in r).map((x) => [x, r[x]])));
    }
    // Zoals jsonb: de sleutels van een object in een andere volgorde terug.
    return stuur(JSON.parse(JSON.stringify(uit), (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).reverse()) : v)));
  }
  if (req.method === 'POST') { rijen.push(...[].concat(JSON.parse(body))); return stuur(null); }
  if (req.method === 'PATCH') {
    const patch = JSON.parse(body);
    if (tabel === 'races') wereld.racePatches.push(Object.keys(patch));
    for (const r of rijen.filter(past)) Object.assign(r, patch);
    return stuur(null);
  }
  if (req.method === 'DELETE') { wereld[tabel] = rijen.filter((r) => !past(r)); return stuur(null); }
  res.writeHead(405); res.end();
}
wereld.racePatches = [];
const server = createServer((req, res) => {
  const delen = [];
  req.on('data', (d) => delen.push(d));
  req.on('end', () => {
    const body = Buffer.concat(delen);
    const url = new URL(req.url, 'http://x');
    const pad = url.pathname.split('/').filter(Boolean);
    try {
      if (pad[0] === 'push') {
        pushes.push({ toestel: pad[1], kop: req.headers, body });
        res.writeHead(201); return res.end();
      }
      if (pad[0] === 'v1') {
        const stuur = (x) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(x)); };
        if (pad[1] === 'sessions') return stuur(sessies);
        if (pad[1] === 'drivers') {
          return stuur(DRIVERS.map((d) => ({ driver_number: Number(d.nr), name_acronym: d.code, full_name: d.naam,
            team_name: d.team, team_colour: '888888' })));
        }
        if (pad[1] === 'session_result') {
          const lijst = UITSLAG[url.searchParams.get('session_key')];
          if (!lijst) { res.writeHead(404); return res.end('[]'); }
          return stuur(lijst.map((nr, i) => ({ position: i + 1, driver_number: Number(nr) })));
        }
        res.writeHead(404); return res.end('[]');
      }
      if (pad[0] === 'rest' && pad[1] === 'v1') return postgrest(req, res, pad[2], url.searchParams, body.toString());
      res.writeHead(404); res.end();
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;

// De repo zoals de sync hem ziet: de scripts, de racegegevens van de site, de
// pagina van São Paulo en de sitemap.
const map = mkdtempSync(join(tmpdir(), 'trainingmelding-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
cpSync(join(wortel, 'site'), join(map, 'site'), { recursive: true });
mkdirSync(join(map, 'site', 'data'), { recursive: true });
writeFileSync(join(map, 'site', 'data', 'races-2026.json'), JSON.stringify({ jaar: 2026, races: [
  { slug: 'sao-paulo', sessies: [{ naam: 'Race', sessie: 9001 }] }] }));
mkdirSync(join(map, 'races', '2026', 'sao-paulo'), { recursive: true });
writeFileSync(join(map, 'races', '2026', 'sao-paulo', 'index.html'), '<!doctype html>');
writeFileSync(join(map, 'sitemap.xml'), '<urlset><url><loc>https://predicttherace.com/</loc></url>'
  + '<url><loc>https://predicttherace.com/races/2026/sao-paulo/</loc></url></urlset>');
const uitvoerBestand = join(map, 'uitvoer.txt');
const { prive } = nieuwSleutelpaar();

function sync(extra = {}) {
  writeFileSync(uitvoerBestand, '');
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'test', OPENF1_URL: `${adres}/v1`,
             SEIZOEN: '2026', KALENDER: '', VAPID_PRIVE: prive, PUSH_CONTACT: 'mailto:test@voorbeeld.nl',
             APP_URL: 'https://app.voorbeeld/app/', GITHUB_OUTPUT: uitvoerBestand, ...extra },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}
const sleutels = new Map();
const toestel = (nr, extra = {}) => {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  sleutels.set(String(nr), { ecdh, auth });
  return { endpoint: `${adres}/push/${nr}`, member_id: `lid-${nr}`, pool_id: 'pool-1',
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

wereld.races = [{ id: 21, season: 2026, round: 21, name: 'São Paulo', country: 'Brazil',
  race_key: 9001, quali_key: 9104, sprint_key: null, deadline_sprint: null,
  deadline_quali: uur(20), deadline_race: uur(44), afgelast: false, drivers: DRIVERS, lijst_herkomst: 'openf1',
  quali_result: null, race_result: null, sprint_result: null, fastest_lap: null, fastest_pitstop: null,
  safety_cars: null, rode_vlag: null, pagina: null, vrije_trainingen: null }];
wereld.pools = [{ id: 'pool-1', season: 2026, name: 'Vrijdagmiddagpoule' }];
wereld.push_abonnementen = [toestel(1), toestel(2, { taal: 'en', tijdzone: 'Europe/London' }),
  toestel(3, { meld_training: false })];
const rij = (nr) => wereld.push_abonnementen.find((a) => a.endpoint.endsWith(`/push/${nr}`));

{
  const { code, log } = await sync();
  check('de sync draait zonder fouten', code === 0, log.slice(-800));
  const race = wereld.races[0];
  check('de racepagina staat in de database', race.pagina === 'sao-paulo', `${race.pagina} · ${log.slice(-300)}`);
  const vt = race.vrije_trainingen ?? [];
  check('het rooster van de trainingen, met de top 10 van VT1 en VT2 en VT3 nog leeg',
    vt.map((t) => `${t.naam}:${t.top?.length ?? 0}`).join() === 'Practice 1:10,Practice 2:10,Practice 3:0'
      && vt[1].top[0].code === 'NOR' && vt[1].top[0].naam === 'Lando NORRIS' && vt[1].eind === sessies[1].date_end,
    JSON.stringify(vt).slice(0, 400));
  const naar = pushes.map((p) => p.toestel).sort().join(',');
  check('de trainingsmelding naar wie hem aan heeft, niet naar wie hem uitzette', naar === '1,2', `${naar} · ${log.slice(-300)}`);
  let gelezen = null;
  try { gelezen = ['1', '2'].map((t) => lees(pushes.find((p) => p.toestel === t))); } catch (e) { gelezen = String(e); }
  const tijd = deadlineTekst(uur(20), 'en', 'Europe/London');
  check('versleuteld, met de tekst in de taal en de tijd van het toestel en de link naar de app',
    Array.isArray(gelezen) && gelezen[0].titel === 'VT2 is binnen: Norris was het snelst'
      && gelezen[0].tekst === 'Je top 10 kan nog tot de start van de kwalificatie.'
      && gelezen[1].titel === 'FP2 is in: Norris was fastest' && gelezen[1].tekst === `Your top 10 is open until ${tijd}.`
      && gelezen[0].tag === 'training:21' && gelezen[0].url === 'https://app.voorbeeld/app/', JSON.stringify(gelezen));
  check('onthouden in training_laatst', rij(1).training_laatst === 'training:21' && rij(2).training_laatst === 'training:21'
    && rij(3).training_laatst === null && rij(1).laatst === null);
  check('de log en het logboek zeggen het', /Trainingsmeldingen: 2 verstuurd/.test(log)
    && wereld.sync_runs.some((r) => /2 trainingsmelding\(en\) verstuurd/.test(JSON.stringify(r))), log.slice(-300));
  check('de paden uit de sitemap staan klaar voor de teller',
    wereld.site_paden.map((p) => p.pad).sort().join() === '/,/races/2026/sao-paulo/', JSON.stringify(wereld.site_paden));
  const ics = readFileSync(join(map, 'kalender.ics'), 'utf8');
  check('kalender.ics: de URL wijst naar de racepagina, de app staat in de beschrijving',
    /^URL:https:\/\/app\.voorbeeld\/races\/2026\/sao-paulo\/\?ref=kalender\r?$/m.test(ics)
      && ics.includes('https://app.voorbeeld/app/'), (ics.match(/^URL:.*$/m) ?? [''])[0]);
}

{
  pushes.length = 0;
  wereld.racePatches.length = 0;
  const { log } = await sync();
  check('een tweede ronde stuurt niets', pushes.length === 0, `${pushes.length} · ${log.slice(-300)}`);
  check('en schrijft het rooster niet opnieuw weg (ook al komt jsonb in een andere volgorde terug)',
    !wereld.racePatches.some((k) => k.includes('vrije_trainingen') || k.includes('pagina')), JSON.stringify(wereld.racePatches));
}

{
  // VT2 is net voorbij: nog geen top 10. Dan een wekker voor 35 minuten na het einde.
  zetSessies({ vt2Eind: -0.1 });
  wereld.races[0].vrije_trainingen = null;
  pushes.length = 0;
  const { log } = await sync();
  const wekker = readFileSync(uitvoerBestand, 'utf8').match(/^wekker=(.*)$/m)?.[1];
  const verwacht = Date.parse(uur(-0.1)) + 35 * 60e3;
  check('VT2 net voorbij: nog geen top 10 en geen melding, wel een wekker 35 minuten na het einde',
    !wereld.races[0].vrije_trainingen[1].top && pushes.length === 0
      && Math.abs(Date.parse(wekker) - verwacht) < 2000, `${wekker} · ${log.match(/Wekker:.*$/m)?.[0]}`);
  zetSessies();
}

{
  // De herinnering voor de deadline: wie hem uitzette krijgt hem niet, ook al
  // heeft hij nog niets ingevuld. Toestel 4 is nieuw: die krijgt de
  // trainingsmelding nog (hij had hem niet), maar geen herinnering.
  wereld.races[0].deadline_quali = uur(2);
  sessies[3].date_start = uur(2);
  wereld.push_abonnementen.push(toestel(4, { meld_deadline: false }));
  pushes.length = 0;
  const { code, log } = await sync();
  const per = {};
  for (const p of pushes) (per[p.toestel] ??= []).push(lees(p).tag);
  check('de herinnering voor de deadline gaat niet naar wie hem uitzette, de trainingsmelding wel',
    code === 0 && (per[1] ?? []).some((t) => /^21:quali/.test(t)) && (per[3] ?? []).some((t) => /^21:quali/.test(t))
      && !(per[4] ?? []).some((t) => /^21:/.test(t)) && (per[4] ?? []).includes('training:21'),
    `${JSON.stringify(per)} · ${log.slice(-300)}`);
}

server.close();
process.exit(afronden() ? 0 : 1);
