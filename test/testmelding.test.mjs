// De testmelding: één melding naar de toestellen van één speler, met de hand
// gestart in Actions (.github/workflows/testmelding.yml).
//
// Draait zonder browser en zonder netwerk: Supabase en de pushdienst zijn
// hier één nagebootste fetch. Wat moet kloppen is wie de melding krijgt (en
// vooral wie niet: een naamgenoot in een andere poule), dat hij in de taal van
// het toestel komt, en dat de log van deze openbare repo geen endpoint of
// poulecode laat zien.

import { createECDH, randomBytes, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { kiesAbonnementen, testmelding, bericht, TEKST } from '../scripts/testmelding.mjs';
import { nieuwSleutelpaar, b64u } from '../scripts/push.mjs';
import { maakControle, wortel } from './hulp.mjs';

const { check, afronden } = maakControle('testmelding');

// ---- wie krijgt hem ------------------------------------------------------
const leden = [
  { member_id: 'l1', pool_id: 'p1', user_id: 'u1', display_name: 'Danny' },
  { member_id: 'l2', pool_id: 'p2', user_id: 'u1', display_name: 'danny' },
  { member_id: 'l3', pool_id: 'p3', user_id: 'u2', display_name: 'Danny' },
];
const poules = [{ id: 'p1', join_code: 'AAAAAA' }, { id: 'p3', join_code: 'CCCCCC' }];
const ab = (endpoint, member_id, taal = 'nl') => ({ endpoint, member_id, p256dh: 'x', auth: 'y', taal });

const een = kiesAbonnementen({ naam: ' DANNY ', leden, poules,
  abonnementen: [ab('https://a/1', 'l1'), ab('https://a/2', 'l2')] });
check('de naam zonder hoofdletters en spaties vindt de speler',
  een.abonnementen?.length === 2, JSON.stringify(een));
check('ook als zijn toestellen in twee poules hangen, want het is één account',
  !een.fout);

const twee = kiesAbonnementen({ naam: 'Danny', leden, poules,
  abonnementen: [ab('https://a/1', 'l1'), ab('https://a/3', 'l3')] });
check('twee mensen met dezelfde naam en meldingen aan: niets sturen',
  !twee.abonnementen && /poulecode/.test(twee.fout ?? ''), JSON.stringify(twee));

const metCode = kiesAbonnementen({ naam: 'Danny', code: 'cccccc', leden, poules,
  abonnementen: [ab('https://a/1', 'l1'), ab('https://a/3', 'l3')] });
check('met de poulecode erbij alleen die poule',
  metCode.abonnementen?.length === 1 && metCode.abonnementen[0].endpoint === 'https://a/3',
  JSON.stringify(metCode));

check('een onbekende poulecode is een fout',
  /Geen poule/.test(kiesAbonnementen({ naam: 'Danny', code: 'ZZZZZZ', leden, poules,
    abonnementen: [] }).fout ?? ''));
check('een onbekende naam ook', /Geen speler/.test(kiesAbonnementen({ naam: 'Max', leden,
  poules, abonnementen: [] }).fout ?? ''));
check('zonder naam ook', !!kiesAbonnementen({ naam: '  ', leden, poules, abonnementen: [] }).fout);
check('en een speler zonder meldingen krijgt uitgelegd hoe het aan moet',
  /Zet meldingen aan/.test(kiesAbonnementen({ naam: 'Danny', leden, poules,
    abonnementen: [] }).fout ?? ''));

// Een speler zonder account (nog niet geclaimd) is zichzelf.
const zonder = kiesAbonnementen({ naam: 'Lando',
  leden: [{ member_id: 'a', pool_id: 'p1', user_id: null, display_name: 'Lando' },
          { member_id: 'b', pool_id: 'p3', user_id: null, display_name: 'Lando' }],
  poules, abonnementen: [ab('https://a/a', 'a'), ab('https://a/b', 'b')] });
check('twee spelers zonder account met dezelfde naam tellen als twee mensen',
  !!zonder.fout, JSON.stringify(zonder));

// ---- in welke taal ---------------------------------------------------------
check('elke taal van de app heeft een eigen testmelding',
  ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt'].every((t) => TEKST[t]?.titel && TEKST[t]?.tekst)
    && new Set(Object.values(TEKST).map((t) => t.titel)).size === 7);
check('een onbekende taal valt terug op Engels',
  bericht('xx', 'u').titel === TEKST.en.titel);
check('met een eigen tag, zodat hij geen echte herinnering vervangt',
  bericht('nl', 'u').tag === 'testmelding');
check('geen gedachtestreepjes in de teksten',
  !/[–—]/.test(JSON.stringify(TEKST)));

// ---- de hele weg, met een nagebootste Supabase en pushdienst -------------
const { prive, publiek } = nieuwSleutelpaar();
const toestel = createECDH('prime256v1');
toestel.generateKeys();
const echtAb = (endpoint, member_id, taal) => ({ endpoint, member_id, taal,
  p256dh: b64u(toestel.getPublicKey()), auth: b64u(randomBytes(16)) });

// De kolommen zoals ze in schema.sql staan: create table plus elke latere
// "add column". Vraagt het script een kolom die niet bestaat, dan geeft deze
// nep-database een 400, net als PostgREST. Zo zakte de eerste echte run: hij
// vroeg pool_members.id, en die kolom heet member_id.
const SCHEMA = readFileSync(join(wortel, 'schema.sql'), 'utf8');
function kolommen(tabel) {
  const blok = SCHEMA.match(new RegExp(`create table if not exists public\\.${tabel} \\(([\\s\\S]*?)\\n\\);`))?.[1] ?? '';
  const uit = new Set([...blok.matchAll(/^\s+([a-z_0-9]+)\s+(?:uuid|text|int|bigint|boolean|timestamptz|jsonb|date|numeric)/gm)].map((m) => m[1]));
  for (const m of SCHEMA.matchAll(new RegExp(`alter table public\\.${tabel}\\s+add column if not exists ([a-z_0-9]+)`, 'g'))) uit.add(m[1]);
  return uit;
}
check('de nep-database kent de kolommen uit schema.sql',
  kolommen('pool_members').has('member_id') && !kolommen('pool_members').has('id')
    && kolommen('pools').has('join_code') && kolommen('push_abonnementen').has('taal'),
  [...kolommen('pool_members')].join(','));

function nep({ abonnementen, leden: l = leden, pushStatus = 201 }) {
  const verzoeken = [];
  const haal = async (url, opties = {}) => {
    verzoeken.push({ url: String(url), ...opties });
    const u = new URL(url);
    const json = (data) => new Response(JSON.stringify(data), { status: 200 });
    const tabel = u.pathname.replace('/rest/v1/', '');
    const gevraagd = (u.searchParams.get('select') ?? '').split(',').filter(Boolean);
    const onbekend = gevraagd.filter((k) => !kolommen(tabel).has(k));
    if (u.host === 'db.voorbeeld' && onbekend.length) {
      return new Response(`column ${tabel}.${onbekend[0]} does not exist`, { status: 400 });
    }
    if (u.pathname === '/rest/v1/pool_members') {
      const naam = u.searchParams.get('display_name').replace(/^ilike\./, '');
      return json(l.filter((x) => x.display_name.toLowerCase() === naam.toLowerCase()));
    }
    if (u.pathname === '/rest/v1/push_abonnementen') {
      return opties.method === 'DELETE' ? new Response('', { status: 204 }) : json(abonnementen);
    }
    if (u.pathname === '/rest/v1/pools') {
      const code = u.searchParams.get('join_code').replace(/^eq\./, '');
      return json(poules.filter((p) => p.join_code === code));
    }
    if (u.host === 'push.voorbeeld') return new Response('', { status: pushStatus });
    return new Response('onbekend', { status: 500 });
  };
  return { haal, verzoeken };
}

const env = { SUPABASE_URL: 'https://db.voorbeeld', SUPABASE_KEY: 'geheim', VAPID_PRIVE: prive,
              PUSH_CONTACT: 'mailto:contact@predicttherace.com', SPELER: 'danny' };

{
  const { haal, verzoeken } = nep({ abonnementen: [
    echtAb('https://push.voorbeeld/telefoon', 'l1', 'de'),
    echtAb('https://push.voorbeeld/laptop', 'l2', 'nl'),
    echtAb('https://push.voorbeeld/vreemde', 'l9', 'nl')] });
  const regels = [];
  const uit = await testmelding({ env, haal, log: (r) => regels.push(r) });
  const pushes = verzoeken.filter((v) => v.url.startsWith('https://push.voorbeeld/'));
  check('twee toestellen van Danny bereikt, die van een andere speler niet',
    uit.gelukt === 2 && pushes.length === 2
      && !pushes.some((p) => p.url.endsWith('/vreemde')),
    pushes.map((p) => p.url).join(', '));
  check('in de taal van elk toestel', regels.some((r) => r.includes('(de)'))
    && regels.some((r) => r.includes('(nl)')), regels.join(' | '));
}

{
  // Zelfde naam, twee accounts met meldingen aan: rood, en niemand gestoord.
  const { haal, verzoeken } = nep({ abonnementen: [
    echtAb('https://push.voorbeeld/telefoon', 'l1', 'nl'),
    echtAb('https://push.voorbeeld/vreemde', 'l3', 'nl')] });
  let fout = '';
  await testmelding({ env, haal, log: () => {} }).catch((e) => { fout = e.message; });
  check('bij twee mensen met die naam gooit hij een fout',
    /poulecode/.test(fout), fout);
  check('en stuurt hij niets',
    !verzoeken.some((v) => v.url.startsWith('https://push.voorbeeld/')));
}

{
  const { haal, verzoeken } = nep({ abonnementen: [
    echtAb('https://push.voorbeeld/telefoon', 'l1', 'nl'),
    echtAb('https://push.voorbeeld/vreemde', 'l3', 'nl')] });
  const regels = [];
  await testmelding({ env: { ...env, POULE: 'aaaaaa' }, haal, log: (r) => regels.push(r) });
  const push = verzoeken.find((v) => v.url.startsWith('https://push.voorbeeld/'));
  check('met de poulecode gaat hij alleen naar die poule',
    push?.url === 'https://push.voorbeeld/telefoon', push?.url);
  check('versleuteld zoals een pushdienst het wil',
    push?.headers['Content-Encoding'] === 'aes128gcm' && push?.body?.length > 86);
  // De VAPID-kop: ondertekend met de privésleutel, voor deze pushdienst, met
  // het contactadres erin.
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(push?.headers.Authorization ?? '');
  const [k, p, h] = (m?.[1] ?? '..').split('.');
  const claims = JSON.parse(Buffer.from(p || 'e30', 'base64url').toString());
  check('met een VAPID-kop voor deze pushdienst en het contactadres',
    m?.[2] === publiek && claims.aud === 'https://push.voorbeeld'
      && claims.sub === 'mailto:contact@predicttherace.com', JSON.stringify(claims));
  const sleutel = createPublicKey({ key: { kty: 'EC', crv: 'P-256',
    x: Buffer.from(publiek, 'base64url').subarray(1, 33).toString('base64url'),
    y: Buffer.from(publiek, 'base64url').subarray(33).toString('base64url') }, format: 'jwk' });
  check('en de handtekening klopt met de publieke sleutel',
    verify('sha256', Buffer.from(`${k}.${p}`), { key: sleutel, dsaEncoding: 'ieee-p1363' },
      Buffer.from(h, 'base64url')));
  const log = regels.join('\n');
  check('de log noemt geen endpoint en geen poulecode',
    !log.includes('/telefoon') && !/aaaaaa/i.test(log), log);
  check('wel de pushdienst en hoeveel er gestuurd is',
    log.includes('push.voorbeeld') && /1 van 1/.test(log), log);
  check('de poulecode gaat in hoofdletters naar de database',
    verzoeken.some((v) => v.url.includes('join_code=eq.AAAAAA')));
  check('en laatst wordt niet aangeraakt, dus de echte herinnering komt nog',
    !verzoeken.some((v) => v.method === 'PATCH'));
}

{
  // Een verlopen abonnement: opruimen, en zonder enig bereikt toestel rood.
  const { haal, verzoeken } = nep({ pushStatus: 410, abonnementen: [
    echtAb('https://push.voorbeeld/oud', 'l1', 'nl')] });
  let fout = '';
  await testmelding({ env, haal, log: () => {} }).catch((e) => { fout = e.message; });
  check('een verlopen abonnement wordt opgeruimd',
    verzoeken.some((v) => v.method === 'DELETE' && v.url.includes('push_abonnementen')));
  check('en zonder enig bereikt toestel is de run rood', /Geen enkel toestel/.test(fout), fout);
}

{
  let fout = '';
  await testmelding({ env: { ...env, VAPID_PRIVE: '' }, haal: async () => { throw new Error('niet bellen'); },
    log: () => {} }).catch((e) => { fout = e.message; });
  check('zonder VAPID_PRIVE zegt hij waar die heen moet', /VAPID_PRIVE/.test(fout) && /§11c/.test(fout), fout);
}

{
  // Een naam met een jokerteken wordt in de database een zoekpatroon, maar
  // daarna telt alleen een precieze treffer.
  const { haal, verzoeken } = nep({ abonnementen: [echtAb('https://push.voorbeeld/telefoon', 'l1', 'nl')],
    leden: [...leden, { member_id: 'l5', pool_id: 'p1', user_id: 'u5', display_name: 'D%n*y' }] });
  // De nep-database doet geen patronen; deze naam vindt dus alleen zichzelf.
  let fout = '';
  await testmelding({ env: { ...env, SPELER: 'D%n*y' }, haal, log: () => {} })
    .catch((e) => { fout = e.message; });
  check('een naam met jokertekens raakt alleen precies die speler',
    /geen enkel toestel meldingen aan/.test(fout)
      && !verzoeken.some((v) => v.url.startsWith('https://push.voorbeeld/')), fout);
}

// ---- de workflow ---------------------------------------------------------
const yml = readFileSync(join(wortel, '.github', 'workflows', 'testmelding.yml'), 'utf8');
check('de workflow is een knop met een spelernaam en een poulecode',
  /workflow_dispatch/.test(yml) && /speler:/.test(yml) && /poule:/.test(yml));
check('met dezelfde secrets als de sync',
  ['SUPABASE_URL', 'SUPABASE_KEY', 'VAPID_PRIVE', 'PUSH_CONTACT'].every(
    (s) => yml.includes(`${s}: \${{ secrets.${s} }}`)));
check('en de naam gaat via env, niet in de shellregel',
  /SPELER: \$\{\{ inputs\.speler \}\}/.test(yml) && !/run:.*inputs\./.test(yml));

process.exit(afronden() ? 0 : 1);
