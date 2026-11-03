// Mail als tweede kanaal: wat de sync stuurt (Danny, 3 november).
//
// "Ik wil dat ze vaker de app openen." Wie mail aanzette, krijgt op
// vrijdagavond de vrije trainingen (en of hij al invulde) en na de race zijn
// punten en zijn plek (scripts/mailmomenten.mjs). Wat hier vastligt:
//   1. De vrijdagmail: alleen bij een nieuwe top 10 van de sleuteltraining en
//      met minstens een uur tot de deadline; één per account, ook met twee
//      poules; niet nog een keer (training_laatst); niet voor een poule die
//      niets open heeft. Met de top 10 (en de teams), per poule of je al
//      invulde en tot wanneer (in je eigen tijdzone, anders de sessie), en een
//      knop die zegt wat er te doen is. In zeven talen.
//   2. De mail na de race: alleen na de race (niet na de kwalificatie), één per
//      account, je punten, je plek dat weekend en je plek in de stand uit de
//      rekenkern van de app (met de joker), gedeelde plekken gedeeld, in je
//      eentje zonder plek, "beter dan p%" als dat er is, en niet nog een keer.
//   3. Elke mail: de afmeldlink met het token, een poulenaam die geen HTML
//      wordt, en geen namen van medespelers.
//   4. De échte sync tegen een nagebootste Supabase: hij stuurt de mails naar
//      de functie `mail`, onthoudt wat er ging, stuurt het geen tweede keer,
//      zegt het als de sleutel er nog niet is (en onthoudt dan niets), en zet
//      geen token, id of poulenaam in de log. Zonder de functie in de database
//      gaat de run gewoon door.

import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { maakControle, wortel } from './hulp.mjs';
import { vrijdagMails, raceMails, pouleStand, mailZinnen, TALEN } from '../scripts/mailmomenten.mjs';

const { check, afronden } = maakControle('mail: wat de sync stuurt');
const UIT = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
const NAMEN = { 1: 'Max Verstappen', 4: 'Lando Norris', 16: 'Charles Leclerc', 63: 'George Russell', 81: 'Oscar Piastri',
  44: 'Lewis Hamilton', 12: 'Kimi Antonelli', 14: 'Fernando Alonso', 10: 'Pierre Gasly', 18: 'Lance Stroll',
  6: 'Isack Hadjar', 43: 'Franco Colapinto' };
const TEAMS = { 1: 'Red Bull Racing', 4: 'McLaren', 16: 'Ferrari', 63: 'Mercedes', 81: 'McLaren', 44: 'Ferrari' };
const DRIVERS = UIT.map((nr) => ({ nr, code: NAMEN[nr].slice(-3).toUpperCase(), naam: NAMEN[nr], team: TEAMS[nr] ?? 'Team' }));
const APP = 'https://app.voorbeeld/app/';
const nu = Date.parse('2026-11-06T20:00:00Z');
const uur = (u, t = nu) => new Date(t + u * 36e5).toISOString();
const vrijdag = (extra = {}) => ({
  id: 21, season: 2026, round: 21, name: 'São Paulo', drivers: DRIVERS,
  deadline_quali: '2026-11-07T18:00:00Z', deadline_race: '2026-11-08T17:00:00Z',
  vrije_trainingen: [{ naam: 'Practice 2', top: UIT.slice(0, 10).map((nr, i) => ({ plek: i + 1, nr, code: null, naam: NAMEN[nr] })) }],
  ...extra,
});
const TOKEN = (n) => `0000000${n}-0000-4000-8000-00000000000${n}`;
const ontvanger = (n, extra = {}) => ({ user_id: `u${n}`, taal: 'nl', tijdzone: 'Europe/Amsterdam', token: TOKEN(n),
  training_laatst: null, uitslag_laatst: null, ...extra });

// ---- 1. de vrijdagmail ------------------------------------------------------------------
{
  const pools = [{ id: 'p1', name: 'Vrijdagmiddagpoule', season: 2026 }, { id: 'p2', name: 'Werk <b>F1</b> & co', season: 2026 },
    { id: 'p3', name: 'Alleen seizoen', season: 2026 }];
  const leden = [
    { member_id: 'm1', pool_id: 'p1', user_id: 'u1' }, { member_id: 'm1b', pool_id: 'p2', user_id: 'u1' },
    { member_id: 'm2', pool_id: 'p1', user_id: 'u2' }, { member_id: 'm4', pool_id: 'p1', user_id: 'u4' },
    { member_id: 'm5', pool_id: 'p3', user_id: 'u5' }, { member_id: 'm6', pool_id: 'p1', user_id: 'u6' },
  ];
  const poulevragen = [{ pool_id: 'p3', question_id: 'kampioen' }];
  const antwoorden = [
    { member_id: 'm1', pool_id: 'p1', question_id: 'quali_top10', waarde: UIT.slice(0, 10) },
    { member_id: 'm6', pool_id: 'p1', question_id: 'quali_top10', waarde: UIT.slice(0, 10) },
    // Een lijst van negen telt niet als ingevuld.
    { member_id: 'm1b', pool_id: 'p2', question_id: 'quali_top10', waarde: UIT.slice(0, 9) },
  ];
  const ontvangers = [ontvanger(1), ontvanger(2, { taal: 'en', tijdzone: null }), ontvanger(4, { training_laatst: 'training:21' }),
    ontvanger(5), ontvanger(6)];
  const mails = vrijdagMails({ races: [vrijdag()], ontvangers, leden, pools, poulevragen, antwoorden, nu, appUrl: APP });
  const van = (u) => mails.find((m) => m.user_id === u);
  check('één mail per account, ook met twee poules; niet wie hem al had, niet wie niets open heeft',
    mails.map((m) => m.user_id).join() === 'u1,u2,u6' && mails.every((m) => m.tag === 'training:21'),
    mails.map((m) => m.user_id).join());
  const u1 = van('u1');
  check('het onderwerp: de race, de snelste en de training', u1?.onderwerp === 'São Paulo: Verstappen snelst in VT2', u1?.onderwerp);
  check('de top 10 van de training, op volgorde, met de teams erbij',
    /De top 10 van VT2\n1\. Max Verstappen, Red Bull Racing\n2\. Lando Norris, McLaren\n3\. Charles Leclerc, Ferrari\n4\. George Russell, Mercedes/.test(u1?.tekst)
      && u1.tekst.includes('10. Lance Stroll, Team'), u1?.tekst);
  check('per poule: al ingevuld, of nog niet (negen is niet genoeg), met de tijd in je eigen tijdzone',
    u1.tekst.includes('Vrijdagmiddagpoule: je top 10 voor de kwalificatie staat. Aanpassen kan nog tot zaterdag 19:00.')
      && u1.tekst.includes('Werk <b>F1</b> & co: je hebt de kwalificatie nog niet ingevuld. Dat kan nog tot zaterdag 19:00.'), u1.tekst);
  check('de knop zegt wat er te doen is: invullen als er iets open staat, anders bekijken',
    u1.tekst.includes(`Vul je top 10 in: ${APP}`) && van('u6')?.tekst.includes(`Bekijk je top 10: ${APP}`), van('u6')?.tekst);
  const u2 = van('u2');
  check('in het Engels, en zonder tijdzone de sessie in plaats van de tijd',
    u2?.onderwerp === 'São Paulo: Verstappen fastest in FP2'
      && u2.tekst.includes('Vrijdagmiddagpoule: you haven’t filled in qualifying yet. You have until qualifying starts.'), u2?.tekst);
  check('de afmeldlink met het token van dat account, in de tekst en de HTML',
    u1.afmelden === `${APP}?afmelden=${TOKEN(1)}` && u1.tekst.includes(u1.afmelden) && u1.html.includes(u1.afmelden)
      && u1.tekst.includes(`${APP}?afmelden=${TOKEN(1)}`) && u1.html.includes(`${APP}?afmelden=${TOKEN(1)}`)
      && !u1.tekst.includes(TOKEN(2)), '');
  check('een poulenaam wordt geen HTML', u1.html.includes('Werk &lt;b&gt;F1&lt;/b&gt; &amp; co') && !u1.html.includes('<b>F1</b>'));

  // Zeven talen, met de naam van de training zoals die taal hem noemt.
  const VT = { nl: 'VT2', en: 'FP2', de: '2. Training', fr: 'EL2', es: 'Libres 2', it: 'PL2', pt: 'TL2' };
  const fout = TALEN.filter((taal) => {
    const [m] = vrijdagMails({ races: [vrijdag()], ontvangers: [ontvanger(1, { taal })], leden, pools, antwoorden, nu, appUrl: APP });
    const z = mailZinnen(taal);
    return !(m?.onderwerp.includes(VT[taal]) && m.tekst.includes(z.waarom) && m.tekst.includes(z.afmelden)
      && m.html.includes(`lang="${taal}"`) && !/undefined|NaN|\{|\}/.test(m.tekst));
  });
  check('in zeven talen, elk met de eigen naam van de training, de reden en de afmeldlink', fout.length === 0, fout.join());

  check('geen mail zonder top 10 van de training', vrijdagMails({ races: [vrijdag({ vrije_trainingen: [] })],
    ontvangers, leden, pools, antwoorden, nu, appUrl: APP }).length === 0);
  check('geen mail met minder dan een uur tot de laatste deadline', vrijdagMails({
    races: [vrijdag({ deadline_quali: uur(-1), deadline_race: uur(0.5) })], ontvangers, leden, pools, antwoorden, nu, appUrl: APP }).length === 0);
  check('op een sprintweekend pas na VT1, niet na een VT2 die er niet is',
    vrijdagMails({ races: [vrijdag({ deadline_sprint: '2026-11-07T15:00:00Z' })], ontvangers, leden, pools, antwoorden, nu, appUrl: APP }).length === 0
      && vrijdagMails({ races: [vrijdag({ deadline_sprint: '2026-11-07T15:00:00Z',
        vrije_trainingen: [{ naam: 'Practice 1', top: vrijdag().vrije_trainingen[0].top }] })],
      ontvangers: [ontvanger(1)], leden, pools, antwoorden, nu, appUrl: APP })[0]?.tekst.includes('je hebt de sprint nog niet ingevuld'));
}

// ---- 2. de mail na de race --------------------------------------------------------------
const naRace = (extra = {}) => ({ ...vrijdag(), quali_result: UIT, race_result: UIT, ...extra });
const naDeRace = Date.parse('2026-11-08T19:30:00Z');
{
  const race = naRace();
  const leden4 = [{ member_id: 'm1', display_name: 'Danny', pool_id: 'p1' }, { member_id: 'm2', display_name: 'Eva', pool_id: 'p1' },
    { member_id: 'm3', display_name: 'Bram', pool_id: 'p1' }, { member_id: 'm4', display_name: 'Lotte', pool_id: 'p1' }];
  const lijst = (m, w) => ({ member_id: m, pool_id: 'p1', race_id: 21, question_id: 'race_top10', waarde: w });
  const antwoorden = [lijst('m1', UIT.slice(0, 10)), lijst('m2', UIT.slice(0, 10)), lijst('m3', UIT.slice(1, 11))];
  const p1 = pouleStand({ leden: leden4, races: [race], antwoorden, vragen: [], poule: { id: 'p1', season: 2026 }, jokers: [], poulevragen: [] }, race);
  check('de rekenkern van de app: een perfecte top 10 is 50, gelijke punten bovenaan',
    p1.weekend[0].punten === 50 && p1.weekend[1].punten === 50 && p1.weekend.at(-1).punten === 0, JSON.stringify(p1.weekend));
  const metJoker = pouleStand({ leden: leden4, races: [race], antwoorden, vragen: [],
    poule: { id: 'p1', season: 2026, jokers_vanaf: '2026-01-01' }, jokers: [{ pool_id: 'p1', race_id: 21, member_id: 'm3' }],
    poulevragen: [] }, race);
  const bram = (s) => s.weekend.find((r) => r.id === 'm3').punten;
  check('met de joker telt het weekend dubbel, net als in de app', bram(metJoker) === 2 * bram(p1) && bram(p1) > 0,
    `${bram(p1)} -> ${bram(metJoker)}`);
  const p2 = pouleStand({ leden: [{ member_id: 'm9', display_name: 'Danny', pool_id: 'p2' }], races: [race], antwoorden: [],
    vragen: [], poule: { id: 'p2', season: 2026 }, jokers: [], poulevragen: [] }, race);

  const pools = [{ id: 'p1', name: 'Vrijdagmiddagpoule', season: 2026 }, { id: 'p2', name: 'Solo', season: 2026 }];
  const leden = [{ member_id: 'm1', pool_id: 'p1', user_id: 'u1' }, { member_id: 'm9', pool_id: 'p2', user_id: 'u1' },
    { member_id: 'm2', pool_id: 'p1', user_id: 'u2' }, { member_id: 'm4', pool_id: 'p1', user_id: 'u4' },
    { member_id: 'm3', pool_id: 'p1', user_id: 'u3' }];
  const standen = new Map([['p1', p1], ['p2', p2]]);
  const ontvangers = [ontvanger(1), ontvanger(2), ontvanger(3, { uitslag_laatst: 'race:21' }), ontvanger(4, { taal: 'en' })];
  const mails = raceMails({ races: [race], ontvangers, leden, pools, standen, nu: naDeRace, appUrl: APP,
    beterDan: (lid) => (lid.member_id === 'm2' ? 63 : lid.member_id === 'm4' ? 0 : null) });
  const van = (u) => mails.find((m) => m.user_id === u);
  check('na de race één mail per account, niet nog een keer', mails.map((m) => m.user_id).join() === 'u1,u2,u4'
    && mails.every((m) => m.tag === 'race:21'), mails.map((m) => m.user_id).join());
  check('twee poules: het onderwerp noemt geen punten, de mail per poule wel',
    van('u1')?.onderwerp === 'São Paulo: je punten en je plek'
      && van('u1').tekst.includes('Vrijdagmiddagpoule: 50 punten dit weekend, plek 1 van 4. In de stand sta je op plek 1.')
      && van('u1').tekst.includes('Solo: 0 punten dit weekend.'), van('u1')?.tekst);
  check('gedeelde punten, gedeelde plek; en "beter dan p%" als dat er is',
    van('u2')?.onderwerp === 'São Paulo: 50 punten voor jou' && van('u2').tekst.includes('plek 1 van 4')
      && van('u2').tekst.includes('Je top 10: beter dan 63% van alle spelers.'), van('u2')?.tekst);
  check('wie niets inleverde: 0 points, de laatste plek, en geen "beter dan 0%"',
    van('u4')?.onderwerp === 'São Paulo: 0 points for you' && van('u4').tekst.includes('0 points this weekend, 4th of 4. You’re 4th in the standings.')
      && !van('u4').tekst.includes('better than'), van('u4')?.tekst);
  check('geen namen van medespelers in de mail', !mails.some((m) => /Eva|Bram|Lotte/.test(m.tekst + m.html)));
  check('na alleen de kwalificatie geen mail', raceMails({ races: [naRace({ race_result: null })], ontvangers, leden, pools,
    standen, nu: Date.parse('2026-11-07T19:30:00Z'), appUrl: APP }).length === 0);
  check('een poule die de race niet speelt, krijgt geen regel', raceMails({ races: [race], ontvangers: [ontvanger(2)], leden, pools,
    poulevragen: [{ pool_id: 'p1', question_id: 'kampioen' }], standen, nu: naDeRace, appUrl: APP }).length === 0);
  const fout = TALEN.filter((taal) => {
    const [m] = raceMails({ races: [race], ontvangers: [ontvanger(2, { taal })], leden, pools, standen, nu: naDeRace, appUrl: APP });
    return !(m && m.onderwerp.startsWith('São Paulo') && m.tekst.includes(mailZinnen(taal).kopRace) && !/undefined|NaN/.test(m.tekst));
  });
  check('in zeven talen', fout.length === 0, fout.join());
}

// ---- 4. de échte sync ----------------------------------------------------------------------
const wereld = { races: [], pools: [], pool_members: [], pool_questions: [], answers: [], questions: [], jokers: [],
  pool_eigen_vragen: [], pool_eigen_antwoorden: [], mail_abonnementen: [], push_abonnementen: [], sync_runs: [],
  site_paden: [], spelerscijfers: [] };
const bevestigd = new Set(['u1', 'u2']);
const verzoeken = [];
let functieAntwoord = (mails) => ({ status: 200, body: { verstuurd: mails.map((m) => m.user_id), overgeslagen: 0, mislukt: 0 } });
let metRpc = true;
const filters = (zoek) => [...zoek.entries()]
  .filter(([k]) => !['order', 'select', 'limit', 'offset', 'on_conflict'].includes(k))
  .map(([veld, uitdr]) => {
    const [op, ...rest] = uitdr.split('.');
    const waarde = rest.join('.');
    if (op === 'eq') return (r) => String(r[veld]) === waarde;
    if (op === 'in') { const l = waarde.replace(/^\(|\)$/g, '').split(','); return (r) => l.includes(String(r[veld])); }
    if (op === 'is') return (r) => String(r[veld] ?? 'null') === waarde;
    if (['gte', 'lte', 'gt', 'lt'].includes(op)) return () => true;
    throw new Error(`filter ${veld}=${uitdr} kent de nabootsing niet`);
  });
function postgrest(req, res, tabel, zoek, body) {
  const stuur = (data) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(data === null ? '' : JSON.stringify(data)); };
  const rijen = wereld[tabel];
  if (!rijen) { res.writeHead(404); return res.end(`geen tabel ${tabel}`); }
  const past = (r) => filters(zoek).every((f) => f(r));
  if (req.method === 'GET') {
    const vanaf = Number(zoek.get('offset') ?? 0);
    return stuur(rijen.filter(past).slice(vanaf, zoek.get('limit') ? vanaf + Number(zoek.get('limit')) : undefined));
  }
  if (req.method === 'PATCH') { for (const r of rijen.filter(past)) Object.assign(r, JSON.parse(body)); return stuur(null); }
  if (req.method === 'POST') { rijen.push(...[].concat(JSON.parse(body))); return stuur(null); }
  if (req.method === 'DELETE') { wereld[tabel] = rijen.filter((r) => !past(r)); return stuur(null); }
  res.writeHead(405); res.end();
}
const server = createServer((req, res) => {
  const delen = [];
  req.on('data', (d) => delen.push(d));
  req.on('end', () => {
    const body = Buffer.concat(delen).toString();
    const url = new URL(req.url, 'http://x');
    const pad = url.pathname.split('/').filter(Boolean);
    try {
      if (pad[0] === 'v1') { res.writeHead(404); return res.end('[]'); }
      if (pad[0] === 'functions' && pad[2] === 'mail') {
        const verzoek = JSON.parse(body);
        verzoeken.push({ sleutel: req.headers.authorization, ...verzoek });
        const { status, body: uit } = functieAntwoord(verzoek.mails);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(uit));
      }
      if (pad[0] === 'rest' && pad[2] === 'rpc' && pad[3] === 'mail_ontvangers') {
        if (!metRpc) { res.writeHead(404); return res.end('{"message":"function not found"}'); }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(wereld.mail_abonnementen.filter((m) => bevestigd.has(m.user_id))));
      }
      if (pad[0] === 'rest' && pad[1] === 'v1') return postgrest(req, res, pad[2], url.searchParams, body);
      res.writeHead(404); res.end();
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const adres = `http://127.0.0.1:${server.address().port}`;
const map = mkdtempSync(join(tmpdir(), 'mailmomenten-'));
cpSync(join(wortel, 'scripts'), join(map, 'scripts'), { recursive: true });
cpSync(join(wortel, 'site'), join(map, 'site'), { recursive: true });
mkdirSync(join(map, 'app'), { recursive: true });
cpSync(join(wortel, 'app', 'index.html'), join(map, 'app', 'index.html'));
writeFileSync(join(map, 'sitemap.xml'), '<urlset></urlset>');
const uitvoer = join(map, 'uitvoer.txt');
function sync() {
  writeFileSync(uitvoer, '');
  return new Promise((klaar) => {
    const p = spawn(process.execPath, [join(map, 'scripts', 'sync.mjs')], {
      env: { ...process.env, SUPABASE_URL: adres, SUPABASE_KEY: 'sleutel-van-de-sync', OPENF1_URL: `${adres}/v1`,
             SEIZOEN: '2026', KALENDER: '', VAPID_PRIVE: '', APP_URL: APP, GITHUB_OUTPUT: uitvoer },
    });
    let log = '';
    p.stdout.on('data', (d) => { log += d; });
    p.stderr.on('data', (d) => { log += d; });
    p.on('close', (code) => klaar({ code, log }));
  });
}

{
  const nuEcht = Date.now();
  const echt = (u) => new Date(nuEcht + u * 36e5).toISOString();
  wereld.races = [{ ...vrijdag({ deadline_quali: echt(20), deadline_race: echt(44) }), afgelast: false }];
  wereld.pools = [{ id: 'p1', name: 'Geheime Poulenaam', season: 2026 }];
  wereld.pool_members = [{ member_id: 'm1', pool_id: 'p1', user_id: 'u1', display_name: 'Danny' },
    { member_id: 'm2', pool_id: 'p1', user_id: 'u2', display_name: 'Eva' },
    { member_id: 'm3', pool_id: 'p1', user_id: 'u3', display_name: 'Bram' }];
  wereld.mail_abonnementen = [ontvanger(1), ontvanger(2, { taal: 'en' }), ontvanger(3)];

  const een = await sync();
  const [eerste] = verzoeken;
  check('de sync stuurt de vrijdagmails naar de functie mail, met de sleutel van de sync',
    een.code === 0 && verzoeken.length === 1 && eerste.sleutel === 'Bearer sleutel-van-de-sync'
      && eerste.mails.map((m) => m.user_id).join() === 'u1,u2', `${een.code} ${JSON.stringify(verzoeken.map((v) => v.mails?.map((m) => m.user_id)))}\n${een.log.slice(-600)}`);
  check('alleen wie nog een bevestigd adres heeft (de functie mail_ontvangers), met onderwerp, tekst, HTML en afmeldlink',
    eerste.mails.every((m) => m.onderwerp && m.tekst && m.html && m.afmelden?.startsWith(`${APP}?afmelden=`) && !('tag' in m) && !('kolom' in m)),
    JSON.stringify(eerste.mails.map((m) => Object.keys(m))));
  check('en onthoudt wat er ging', wereld.mail_abonnementen.filter((m) => m.training_laatst === 'training:21').map((m) => m.user_id).join() === 'u1,u2',
    JSON.stringify(wereld.mail_abonnementen));
  check('de log noemt alleen aantallen: geen token, geen id, geen poulenaam',
    /Mail: 2 verstuurd/.test(een.log) && !/0000000\d-|\bu1\b|\bu2\b|Geheime Poulenaam/.test(een.log), een.log.slice(-400));
  const twee = await sync();
  check('een tweede run stuurt niets opnieuw', twee.code === 0 && verzoeken.length === 1, twee.log.slice(-300));

  // Na de race, met de sleutel nog niet ingericht.
  wereld.races = [{ ...naRace({ deadline_quali: echt(-26), deadline_race: echt(-2) }), afgelast: false }];
  wereld.answers = [{ member_id: 'm1', pool_id: 'p1', race_id: 21, question_id: 'race_top10', waarde: UIT.slice(0, 10) }];
  functieAntwoord = () => ({ status: 503, body: { fout: 'RESEND_API_KEY ontbreekt', hint: 'mail_geen_sleutel' } });
  const zonder = await sync();
  check('zonder sleutel bij de functies: de log zegt het, en er wordt niets onthouden',
    zonder.code === 0 && /nog geen RESEND_API_KEY/.test(zonder.log) && !wereld.mail_abonnementen.some((m) => m.uitslag_laatst),
    zonder.log.slice(-400));
  functieAntwoord = (mails) => ({ status: 200, body: { verstuurd: mails.map((m) => m.user_id), overgeslagen: 0, mislukt: 0 } });
  const race = await sync();
  const laatste = verzoeken.at(-1);
  const danny = laatste?.mails.find((m) => m.user_id === 'u1');
  check('na de race: de punten en de plek uit de rekenkern van de app, en onthouden',
    race.code === 0 && danny?.onderwerp === 'São Paulo: 50 punten voor jou'
      && danny.tekst.includes('Geheime Poulenaam: 50 punten dit weekend, plek 1 van 3. In de stand sta je op plek 1.')
      && wereld.mail_abonnementen.filter((m) => m.uitslag_laatst === 'race:21').length === 2, `${danny?.tekst}\n${race.log.slice(-400)}`);

  metRpc = false;
  wereld.races = [{ ...vrijdag({ id: 22, round: 22, deadline_quali: echt(20), deadline_race: echt(44) }), afgelast: false }];
  const oud = await sync();
  check('een database zonder mail_ontvangers: de run gaat door en zegt waarom', oud.code === 0
    && /Mail: niemand opgehaald/.test(oud.log) && verzoeken.length === 3, oud.log.slice(-300));
}

server.close();
process.exit(afronden() ? 0 : 1);
