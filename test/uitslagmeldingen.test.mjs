// Een seintje als de uitslag binnen is (Danny, 1 november).
//
// Wat hier vastligt:
//   1. De regel (scripts/uitslagmeldingen.mjs), zonder netwerk: de laatste
//      sessie met een uitslag, binnen een dag na het begin; één melding per
//      toestel per sessie; niet bij een afgelaste race; alleen als de poule
//      op die sessie iets speelt; in de taal van het toestel; en een tag die
//      niet die van een herinnering is.
//   2. De échte sync (scripts/sync.mjs) tegen een nagebootste Supabase en
//      pushdienst: de melding gaat versleuteld naar het toestel, met de link
//      naar de app; `uitslag_laatst` onthoudt hem en `laatst` (de
//      herinneringen) blijft staan; een tweede ronde stuurt niets; een
//      verlopen abonnement gaat weg; een nieuwe uitslag gaat wel; zonder de
//      kolom (schema.sql nog niet bijgewerkt) en zonder VAPID_PRIVE gaat er
//      niets.

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createECDH, randomBytes, hkdfSync, createDecipheriv } from 'node:crypto';
import { wieKrijgtEenUitslag, laatsteUitslag, UITSLAG_VENSTER_UREN, SESSIEVRAGEN }
  from '../scripts/uitslagmeldingen.mjs';
import { wieKrijgtEenSeintje } from '../scripts/herinneringen.mjs';
import { nieuwSleutelpaar, b64u } from '../scripts/push.mjs';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('een seintje als de uitslag binnen is');

// ---- 1. de regel --------------------------------------------------------------

const NU = Date.parse('2026-11-01T22:00:00Z');
const geleden = (uren) => new Date(NU - uren * 3600e3).toISOString();
const TIEN = ['12', '16', '1', '63', '44', '81', '4', '6', '23', '30'];
// Mexico City: de kwalificatie gisteren, de race vandaag om 20:00.
const mexico = (extra = {}) => ({
  id: 20, name: 'Mexico City', round: 20, afgelast: false,
  deadline_sprint: null, deadline_quali: geleden(28), deadline_race: geleden(2),
  sprint_result: null, quali_result: TIEN, race_result: null, ...extra,
});
const danny = { endpoint: 'https://push/1', member_id: 'lid-1', pool_id: 'pool-1',
                p256dh: 'x', auth: 'y', laatst: null, uitslag_laatst: null, taal: 'nl' };
const roep = (opties) => wieKrijgtEenUitslag({ nu: NU, ...opties });

{
  const metRace = roep({ races: [mexico({ race_result: TIEN })], abonnementen: [danny] });
  check('de uitslag van de race van vandaag levert een seintje op', metRace.length === 1,
    JSON.stringify(metRace.map((x) => x.bericht)));
  check('met de race en de sessie in de titel',
    metRace[0]?.bericht.titel === 'Mexico City: uitslag race binnen', metRace[0]?.bericht.titel);
  check('en wat je ermee kunt', metRace[0]?.bericht.tekst === 'Bekijk je punten en de stand.',
    metRace[0]?.bericht.tekst);
  check('met een eigen tag per sessie, anders dan die van een herinnering',
    metRace[0]?.tag === 'uitslag:20:race' && metRace[0]?.bericht.tag === 'uitslag:20:race', metRace[0]?.tag);
  check('al gehad: niet nog een keer',
    roep({ races: [mexico({ race_result: TIEN })],
           abonnementen: [{ ...danny, uitslag_laatst: 'uitslag:20:race' }] }).length === 0);
  check('een melding over de kwalificatie houdt die van de race niet tegen',
    roep({ races: [mexico({ race_result: TIEN })],
           abonnementen: [{ ...danny, uitslag_laatst: 'uitslag:20:quali' }] }).length === 1);
  check('en een herinnering (in laatst) ook niet',
    roep({ races: [mexico({ race_result: TIEN })],
           abonnementen: [{ ...danny, laatst: '20:race' }] }).length === 1);

  // Zonder race-uitslag is de kwalificatie van gisteren te oud.
  check(`een uitslag van meer dan ${UITSLAG_VENSTER_UREN} uur na het begin is geen nieuws meer`,
    roep({ races: [mexico()], abonnementen: [danny] }).length === 0);
  check('binnen die dag wel, voor de kwalificatie',
    roep({ races: [mexico({ deadline_quali: geleden(3), deadline_race: geleden(-21) })],
           abonnementen: [danny] })[0]?.tag === 'uitslag:20:quali');
  check('geen uitslag, geen seintje',
    roep({ races: [mexico({ quali_result: null, deadline_quali: geleden(3) })], abonnementen: [danny] }).length === 0);
  check('een lege uitslag telt niet als uitslag',
    roep({ races: [mexico({ race_result: [] })], abonnementen: [danny] }).length === 0);
  check('een afgelaste race levert niets op',
    roep({ races: [mexico({ race_result: TIEN, afgelast: true })], abonnementen: [danny] }).length === 0);
  check('een sessie die nog moet beginnen ook niet (ook als er al iets staat)',
    roep({ races: [mexico({ race_result: TIEN, deadline_race: geleden(-1) })], abonnementen: [danny] })
      .every((x) => x.tag !== 'uitslag:20:race'));

  // Een sprintweekend: de sprint zaterdagmiddag, de kwalificatie erna.
  const sprint = { id: 21, name: 'São Paulo', round: 21, afgelast: false,
    deadline_sprint: geleden(6), deadline_quali: geleden(2), deadline_race: geleden(-20),
    sprint_result: TIEN, quali_result: TIEN, race_result: null };
  const twee = roep({ races: [sprint], abonnementen: [danny] });
  check('twee uitslagen tegelijk: één seintje, over de laatste',
    twee.length === 1 && twee[0].tag === 'uitslag:21:quali', JSON.stringify(twee.map((x) => x.tag)));
  check('de laatste over alle races heen, niet de laatste in de lijst',
    laatsteUitslag({ races: [sprint, mexico({ race_result: TIEN, deadline_race: geleden(5) })], nu: NU })?.tag
      === 'uitslag:21:quali');
  check('alleen de sprint binnen: een seintje over de sprint',
    roep({ races: [{ ...sprint, quali_result: null }], abonnementen: [danny] })[0]?.bericht.titel
      === 'São Paulo: uitslag sprint binnen');

  // Welke poule speelt wat.
  const zonder = [{ pool_id: 'pool-1', question_id: 'race_top10' }];
  const metRaceUitslag = mexico({ race_result: TIEN });
  check('een poule zonder vragenkeuze speelt alles en krijgt het seintje',
    roep({ races: [metRaceUitslag], abonnementen: [danny], poulevragen: [] }).length === 1);
  check('een poule die op de kwalificatie niets speelt, hoort niets over de kwalificatie',
    roep({ races: [mexico({ deadline_quali: geleden(3), deadline_race: geleden(-21) })],
           abonnementen: [danny], poulevragen: zonder }).length === 0);
  check('een poule die alleen de pole speelt wel',
    roep({ races: [mexico({ deadline_quali: geleden(3), deadline_race: geleden(-21) })],
           abonnementen: [danny], poulevragen: [{ pool_id: 'pool-1', question_id: 'pole' }] }).length === 1);
  check('een poule die op de race alleen de duels speelt ook',
    roep({ races: [metRaceUitslag], abonnementen: [danny],
           poulevragen: [{ pool_id: 'pool-1', question_id: 'teamgenoot_duels' }] }).length === 1);
  check('de vragen van een sessie zijn die van de app: top 10, pole en de losse vragen van de race',
    SESSIEVRAGEN.quali.join() === 'quali_top10,pole'
      && SESSIEVRAGEN.race.length === 7 && SESSIEVRAGEN.sprint.join() === 'sprint_top10');
  const app = readFileSync(join(wortel, 'app', 'index.html'), 'utf8');
  const sessieVan = (id) => app.match(new RegExp(`\\n  ${id}: \\{\\n    sessie:'(\\w+)'`))?.[1];
  check('en elke losse vraag uit de app hangt aan de sessie waar de regel hem zoekt',
    ['pole', 'winnaar', 'snelste_ronde', 'snelste_pitstop', 'safety_cars', 'rode_vlag']
      .every((id) => SESSIEVRAGEN[sessieVan(id)]?.includes(id)),
    ['pole', 'winnaar', 'snelste_ronde', 'snelste_pitstop', 'safety_cars', 'rode_vlag']
      .map((id) => `${id}=${sessieVan(id)}`).join(' '));

  const kim = { ...danny, endpoint: 'https://push/2', member_id: 'lid-2', pool_id: 'pool-2', taal: 'en' };
  const beide = roep({ races: [metRaceUitslag], abonnementen: [danny, kim], poulevragen: zonder });
  check('per toestel, over poules heen', beide.length === 2, JSON.stringify(beide.map((x) => x.abonnement.endpoint)));

  // De talen.
  const titel = (taal) => roep({ races: [metRaceUitslag], abonnementen: [{ ...danny, taal }] })[0]?.bericht;
  const verwacht = {
    en: ['Mexico City: race result is in', 'See your points and the standings.'],
    de: ['Mexico City: Ergebnis Rennen ist da', 'Sieh dir deine Punkte und die Tabelle an.'],
    fr: ['Mexico City : résultat disponible (course)', 'Découvrez vos points et le classement.'],
    es: ['Mexico City: ya está el resultado (carrera)', 'Mira tus puntos y la clasificación.'],
    it: ['Mexico City: risultato disponibile (gara)', 'Guarda i tuoi punti e la classifica.'],
    pt: ['Mexico City: resultado disponível (corrida)', 'Veja seus pontos e a classificação.'],
    xx: ['Mexico City: uitslag race binnen', 'Bekijk je punten en de stand.'],
  };
  for (const [taal, [t, x]] of Object.entries(verwacht)) {
    const b = titel(taal);
    check(`in het ${taal === 'xx' ? 'Nederlands bij een onbekende taal' : taal}`,
      b?.titel === t && b?.tekst === x, JSON.stringify(b));
  }
  const tekst = readFileSync(join(wortel, 'scripts', 'uitslagmeldingen.mjs'), 'utf8');
  check('zonder gedachtestreepjes in de zinnen', !/[\u2013\u2014]/.test(tekst));

  // Naast de herinneringen: die gaan over wat nog dicht moet, deze over wat
  // gereden is, dus op hetzelfde moment nooit over dezelfde sessie.
  const herinnering = wieKrijgtEenSeintje({ nu: NU, races: [metRaceUitslag], abonnementen: [danny] });
  check('een herinnering over een sessie die al begon, bestaat niet', herinnering.length === 0);
}

// ---- 2. de échte sync ---------------------------------------------------------

const wereld = { races: [], answers: [], pools: [], pool_questions: [], push_abonnementen: [],
                 sync_runs: [] };
const pushes = [];
let pushAntwoord = {};      // per toestel: de status die de pushdienst geeft

const filters = (zoek) => [...zoek.entries()]
  .filter(([k]) => !['order', 'select', 'limit', 'on_conflict'].includes(k))
  .map(([veld, uitdr]) => {
    const [op, ...rest] = uitdr.split('.');
    const waarde = rest.join('.');
    if (op === 'eq') return (r) => String(r[veld]) === waarde;
    if (op === 'in') {
      const lijst = waarde.replace(/^\(|\)$/g, '').split(',');
      return (r) => lijst.includes(String(r[veld]));
    }
    if (op === 'is') return (r) => String(r[veld] ?? 'null') === waarde;
    if (op === 'gte' || op === 'lte' || op === 'gt' || op === 'lt') return () => true;
    throw new Error(`filter ${veld}=${uitdr} kent de nabootsing niet`);
  });

function postgrest(req, res, tabel, zoek, body) {
  const rijen = wereld[tabel];
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(data === null ? '' : JSON.stringify(data)); };
  if (!rijen) { res.writeHead(404); return res.end(`geen tabel ${tabel}`); }
  const past = (r) => filters(zoek).every((f) => f(r));
  if (req.method === 'GET') {
    let uit = rijen.filter(past);
    if (zoek.get('limit')) uit = uit.slice(0, Number(zoek.get('limit')));
    // select=a,b: alleen die kolommen, zoals PostgREST.
    const kolommen = zoek.get('select');
    if (kolommen && kolommen !== '*') {
      const k = kolommen.split(',');
      uit = uit.map((r) => Object.fromEntries(k.filter((x) => x in r).map((x) => [x, r[x]])));
    }
    return stuur(uit);
  }
  if (req.method === 'POST') { rijen.push(...[].concat(JSON.parse(body))); return stuur(null); }
  if (req.method === 'PATCH') {
    const patch = JSON.parse(body);
    // Een kolom die er niet is, weigert PostgREST.
    if (tabel === 'push_abonnementen' && rijen.length
        && Object.keys(patch).some((k) => !(k in rijen[0]))) {
      res.writeHead(400); return res.end('kolom bestaat niet');
    }
    for (const r of rijen.filter(past)) Object.assign(r, patch);
    return stuur(null);
  }
  if (req.method === 'DELETE') {
    wereld[tabel] = rijen.filter((r) => !past(r));
    return stuur(null);
  }
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
      // De pushdienst: onthoudt wat er binnenkwam en antwoordt per toestel.
      if (pad[0] === 'push') {
        pushes.push({ toestel: pad[1], kop: req.headers, lengte: body.length, body,
                      klaartekst: body.toString('latin1') });
        res.writeHead(pushAntwoord[pad[1]] ?? 201); return res.end();
      }
      // OpenF1 heeft niets nieuws: de uitslagen staan al in de database.
      if (pad[0] === 'v1') { res.writeHead(404); return res.end('[]'); }
      if (pad[0] === 'rest' && pad[1] === 'v1') return postgrest(req, res, pad[2], url.searchParams, body.toString());
      res.writeHead(404); res.end();
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;

const map = mkdtempSync(join(tmpdir(), 'uitslagmelding-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
const { prive } = nieuwSleutelpaar();

function sync(extra = {}) {
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'test', OPENF1_URL: `${adres}/v1`,
             SEIZOEN: '2026', KALENDER: '', VAPID_PRIVE: prive, PUSH_CONTACT: 'mailto:test@voorbeeld.nl',
             APP_URL: 'https://app.voorbeeld/app/', GITHUB_OUTPUT: '', ...extra },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}

// Een echt abonnement: een sleutelpaar zoals een browser het maakt, zodat de
// sync er echt naar kan versleutelen. De privéhelft houdt de test, om te
// lezen wat er aankwam, zoals de browser dat doet.
const sleutels = new Map();
const toestel = (nr, extra = {}) => {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  sleutels.set(String(nr), { ecdh, auth });
  return { endpoint: `${adres}/push/${nr}`, member_id: `lid-${nr}`, pool_id: 'pool-1',
           p256dh: b64u(ecdh.getPublicKey()), auth: b64u(auth),
           created_at: new Date().toISOString(), laatst: '20:race', taal: 'nl', uitslag_laatst: null, ...extra };
};
// RFC 8291 en 8188 andersom: wat de browser met een binnengekomen melding doet.
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
const nu = Date.now();
const uurGeleden = (u) => new Date(nu - u * 3600e3).toISOString();
const raceRij = (extra = {}) => ({
  id: 20, season: 2026, round: 20, name: 'Mexico City', country: 'Mexico',
  quali_key: null, race_key: null, sprint_key: null,
  deadline_quali: uurGeleden(28), deadline_race: uurGeleden(2), deadline_sprint: null,
  afgelast: false, drivers: null, lijst_herkomst: 'openf1',
  quali_result: TIEN, race_result: TIEN, sprint_result: null,
  fastest_lap: '1', fastest_pitstop: '4', safety_cars: 1, rode_vlag: false, ...extra,
});

wereld.races = [raceRij()];
wereld.pools = [{ id: 'pool-1', season: 2026, name: 'Vrijdagmiddagpoule' }];
wereld.push_abonnementen = [toestel(1), toestel(2, { taal: 'en' }), toestel(3)];
pushAntwoord = { 3: 410 };      // toestel 3 is opnieuw ingesteld

{
  const { code, log } = await sync();
  const naar = pushes.map((p) => p.toestel).sort().join(',');
  check('de sync draait zonder fouten', code === 0, log.slice(-600));
  check('elk toestel krijgt één seintje', naar === '1,2,3', `${naar} · ${log.slice(-400)}`);
  const een = pushes.find((p) => p.toestel === '1');
  check('versleuteld, met de afzender erbij (VAPID)',
    een?.kop['content-encoding'] === 'aes128gcm' && /^vapid t=.+, k=.+/.test(een?.kop.authorization ?? '')
      && !een.klaartekst.includes('Mexico'), JSON.stringify(een?.kop));
  let gelezen = null;
  try { gelezen = [lees(een), lees(pushes.find((p) => p.toestel === '2'))]; } catch (e) { gelezen = String(e); }
  check('het toestel leest: de titel, de tekst, de tag en de link naar de app',
    Array.isArray(gelezen) && gelezen[0].titel === 'Mexico City: uitslag race binnen'
      && gelezen[0].tekst === 'Bekijk je punten en de stand.' && gelezen[0].tag === 'uitslag:20:race'
      && gelezen[0].url === 'https://app.voorbeeld/app/', JSON.stringify(gelezen));
  check('en een Engels toestel in het Engels',
    Array.isArray(gelezen) && gelezen[1].titel === 'Mexico City: race result is in', JSON.stringify(gelezen?.[1]));
  const rij = (nr) => wereld.push_abonnementen.find((a) => a.endpoint.endsWith(`/push/${nr}`));
  check('onthouden in uitslag_laatst, en de herinnering in laatst blijft staan',
    rij(1)?.uitslag_laatst === 'uitslag:20:race' && rij(1)?.laatst === '20:race'
      && rij(2)?.uitslag_laatst === 'uitslag:20:race', JSON.stringify(rij(1)));
  check('een verlopen abonnement (410) gaat weg', !rij(3), JSON.stringify(wereld.push_abonnementen.map((a) => a.endpoint)));
  check('de log zegt wat er gebeurde',
    /Uitslagmeldingen: 2 verstuurd, 1 verlopen abonnement\(en\) opgeruimd/.test(log), log.slice(-400));
  check('en het logboek voor het beheer ook',
    wereld.sync_runs.some((r) => /2 uitslagmelding\(en\) verstuurd/.test(r.samenvatting ?? JSON.stringify(r))),
    JSON.stringify(wereld.sync_runs.at(-1)));
}

{
  pushes.length = 0;
  const { log } = await sync();
  check('een tweede ronde stuurt niets', pushes.length === 0, `${pushes.length} · ${log.slice(-300)}`);
}

{
  // Een nieuwe uitslag, later begonnen dan de race van Mexico. (Zo snel na
  // elkaar gebeurt dat niet, maar de regel kijkt alleen naar de volgorde.)
  pushes.length = 0;
  wereld.races.push(raceRij({ id: 21, round: 21, name: 'São Paulo', deadline_quali: uurGeleden(1.5),
    deadline_race: uurGeleden(-21), race_result: null, fastest_lap: null, fastest_pitstop: null,
    safety_cars: null, rode_vlag: null }));
  await sync();
  check('een nieuwe uitslag gaat wel', pushes.map((p) => p.toestel).sort().join(',') === '1,2',
    pushes.map((p) => p.toestel).join(','));
  check('en wordt onthouden',
    wereld.push_abonnementen.every((a) => a.uitslag_laatst === 'uitslag:21:quali'),
    JSON.stringify(wereld.push_abonnementen.map((a) => a.uitslag_laatst)));
}

{
  // Zonder de kolom: de sync weet dan niet wat hij al stuurde.
  pushes.length = 0;
  wereld.races.push(raceRij({ id: 22, round: 22, name: 'Las Vegas', deadline_quali: uurGeleden(0.5),
    deadline_race: uurGeleden(-23), race_result: null }));
  const voor = wereld.push_abonnementen.map(({ uitslag_laatst: _weg, ...rest }) => rest);
  const bewaard = wereld.push_abonnementen;
  wereld.push_abonnementen = voor;
  const { code, log } = await sync();
  check('zonder de kolom uitslag_laatst gaat er niets, en de sync zakt niet',
    pushes.length === 0 && code === 0 && /de kolom uitslag_laatst ontbreekt/.test(log),
    `${pushes.length} · ${code} · ${log.slice(-300)}`);
  wereld.push_abonnementen = bewaard;
  const zonderSleutel = await sync({ VAPID_PRIVE: '' });
  check('zonder VAPID_PRIVE gaat er niets', pushes.length === 0 && zonderSleutel.code === 0,
    `${pushes.length} · ${zonderSleutel.log.slice(-200)}`);
  await sync();
  check('met de kolom weer wel', pushes.map((p) => p.toestel).sort().join(',') === '1,2',
    pushes.map((p) => p.toestel).join(','));
}

server.close();
process.exit(afronden() ? 0 : 1);
