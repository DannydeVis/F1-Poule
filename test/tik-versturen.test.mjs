// De tik versturen (premium, 26 oktober): de functie `tik` in
// supabase/functions/tik, zonder Deno en zonder Supabase.
//
// Wat hier vastligt:
//   1. push-web.mjs (WebCrypto, voor de functie) versleutelt precies zoals
//      RFC 8291 het voorschrijft, met het testvector uit Appendix A, en elk
//      bericht is anders zonder vast zout.
//   2. De VAPID-kop: ES256, aud is de pushdienst, k is de publieke sleutel, en
//      de handtekening klopt (met dezelfde sleutel als in test/push.test.mjs,
//      en dezelfde publieke helft als scripts/push.mjs eruit haalt).
//   3. stuur(): het verzoek aan de pushdienst, en 404/410 is "weg", geen fout.
//   4. De kern (tik-kern.mjs): zonder sleutel in de Vault gebeurt er niets
//      (ook geen tik in de tabel); een weigering van de database gaat met zijn
//      hint terug; de melding gaat naar elk toestel van de ontvanger in de
//      taal van dat toestel, met een vaste link naar de app; een verlopen
//      abonnement wordt opgeruimd; er wordt vastgelegd op hoeveel toestellen
//      hij aankwam.
//   5. De kopie van scripts/herinneringen.mjs naast de functie is gelijk aan
//      het origineel, en elke taal heeft de titel van een tik.
//   6. De sync zet de sleutel in de Vault (scripts/vault-sleutel.mjs): met de
//      publieke helft en het contact erbij, alleen als hij er nog niet of
//      anders staat, en niet zonder sleutel.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { versleutel, vapidKop, stuur, b64u, vanB64u } from '../supabase/functions/tik/push-web.mjs';
import { verwerkTik, tikBericht, APP_URL } from '../supabase/functions/tik/tik-kern.mjs';
import { vapidKop as nodeVapidKop } from '../scripts/push.mjs';
import { woorden } from '../scripts/herinneringen.mjs';
import { sleutelInVault } from '../scripts/vault-sleutel.mjs';

const { check, afronden } = maakControle('de tik versturen');

// ---- 1. RFC 8291 Appendix A -------------------------------------------------------
const A = {
  tekst: 'When I grow up, I want to be a watermelon',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  zout: 'DGv6ra1nlYgDCS1FRnbzlw',
  verwacht: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3'
          + 'vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXL'
          + 'WyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};
// WebCrypto wil de publieke helft van de afzender erbij; die staat in de kop
// van het verwachte bericht (bytes 21 tot 86).
const asPublic = b64u(vanB64u(A.verwacht).subarray(21, 86));
const uit = await versleutel(A.tekst, A.uaPublic, A.auth,
  { zout: A.zout, eigen: { prive: A.asPrivate, publiek: asPublic } });
check('de versleuteling klopt met het testvector uit RFC 8291', b64u(uit) === A.verwacht, b64u(uit));
const een = await versleutel('hallo', A.uaPublic, A.auth);
const twee = await versleutel('hallo', A.uaPublic, A.auth);
check('zonder vast zout is elk bericht anders, maar even lang',
  b64u(een) !== b64u(twee) && een.length === twee.length);
check('met het zout voorop, recordgrootte 4096 en een sleutel van 65 bytes',
  new DataView(een.buffer, een.byteOffset).getUint32(16) === 4096 && een[20] === 65);

// ---- 2. VAPID -------------------------------------------------------------------------
const VAPID_PRIVE = 'y1DnucGuP0hlQkG4lBfvfJdKhXjJ9uY6tsJsn2EaA1U';
const VAPID_PUBLIEK = nodeVapidKop('https://push.example.net/x', 'mailto:a@b', VAPID_PRIVE).publiek;
const kop = await vapidKop('https://push.example.net/push/abc', 'mailto:poule@voorbeeld.nl',
  { prive: VAPID_PRIVE, publiek: VAPID_PUBLIEK }, { nu: 1470944512000 });
const m = kop.Authorization.match(/^vapid t=([^,]+), k=(.+)$/);
check('de kop is "vapid t=..., k=..." met de publieke sleutel', !!m && m[2] === VAPID_PUBLIEK, kop.Authorization);
const [jkop, jeis, jkrabbel] = m[1].split('.');
const leesJson = (x) => JSON.parse(new TextDecoder().decode(vanB64u(x)));
check('ES256, voor de pushdienst, twaalf uur geldig', leesJson(jkop).alg === 'ES256'
  && leesJson(jeis).aud === 'https://push.example.net' && leesJson(jeis).sub === 'mailto:poule@voorbeeld.nl'
  && leesJson(jeis).exp === 1470944512 + 12 * 3600, JSON.stringify(leesJson(jeis)));
const controle = await crypto.subtle.importKey('raw', vanB64u(VAPID_PUBLIEK),
  { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
check('en de handtekening klopt met de publieke sleutel', await crypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' }, controle, vanB64u(jkrabbel), new TextEncoder().encode(`${jkop}.${jeis}`)));

// ---- 3. stuur() -----------------------------------------------------------------------
const abonnement = { endpoint: 'https://push.voorbeeld/abc', p256dh: A.uaPublic, auth: A.auth };
let gezien = null;
const goed = await stuur(abonnement, { titel: 'x' }, { onderwerp: 'mailto:a@b',
  sleutel: { prive: VAPID_PRIVE, publiek: VAPID_PUBLIEK },
  haal: async (url, opties) => { gezien = { url, ...opties }; return new Response('', { status: 201 }); } });
check('stuur() post naar het endpoint, versleuteld, met VAPID en hoge urgentie', goed.ok
  && gezien.url === abonnement.endpoint && gezien.method === 'POST'
  && gezien.headers['Content-Encoding'] === 'aes128gcm' && gezien.headers.Authorization.startsWith('vapid t=')
  && gezien.headers.Urgency === 'high' && gezien.body instanceof Uint8Array, JSON.stringify(gezien?.headers));
const weg = await stuur(abonnement, {}, { onderwerp: 'mailto:a@b', sleutel: { prive: VAPID_PRIVE, publiek: VAPID_PUBLIEK },
  haal: async () => new Response('', { status: 410 }) });
const kapot = await stuur(abonnement, {}, { onderwerp: 'mailto:a@b', sleutel: { prive: VAPID_PRIVE, publiek: VAPID_PUBLIEK },
  haal: async () => new Response('nee', { status: 500 }) });
check('410 is een abonnement dat weg is, 500 een fout met de status', weg.weg === true && !weg.ok
  && kapot.status === 500 && kapot.tekst === 'nee');

// ---- 4. de kern -------------------------------------------------------------------------
// Een nagebootste Supabase-client: rpc, en from().delete()/update().eq().
function nepDb({ sleutel = { prive: VAPID_PRIVE, publiek: VAPID_PUBLIEK, contact: 'mailto:c@voorbeeld.nl' },
                 tikFout = null, toestellen = [] } = {}) {
  const log = [];
  return {
    log,
    rpc: async (naam, args) => {
      log.push(['rpc', naam, args]);
      if (naam === 'push_sleutel') return { data: sleutel, error: null };
      if (naam === 'tik_geven') return tikFout ? { data: null, error: tikFout } : { data: {
        id: 7, aan: args.p_aan, aan_naam: 'Kees', van_naam: 'Danny', race: 'Austin', sessie: args.p_sessie,
        deadline: new Date(Date.UTC(2026, 9, 18, 15)).toISOString() }, error: null };
      if (naam === 'tik_ontvangers') return { data: toestellen, error: null };
      return { data: null, error: { message: 'onbekend' } };
    },
    from: (tabel) => ({
      delete: () => ({ eq: async (k, v) => { log.push(['delete', tabel, k, v]); return {}; } }),
      update: (rij) => ({ eq: async (k, v) => { log.push(['update', tabel, rij, k, v]); return {}; } }),
    }),
  };
}
const NU = Date.UTC(2026, 9, 18, 12);   // drie uur voor de deadline
const verzoek = { race: 19, sessie: 'quali', aan: 'lid-kees' };
const gebruiker = { id: 'account-danny' };

{
  const db = nepDb({ sleutel: null });
  let gestuurd = 0;
  const r = await verwerkTik({ verzoek, gebruiker, db, stuur: async () => { gestuurd++; return { ok: true }; }, nu: NU });
  check('zonder sleutel in de Vault: niet ingericht, en er wordt niets vastgelegd of verstuurd',
    r.status === 503 && r.body.hint === 'tik_niet_ingericht' && gestuurd === 0
      && !db.log.some(([, naam]) => naam === 'tik_geven'), JSON.stringify(r));
}
{
  const db = nepDb({ tikFout: { message: 'Iemand heeft die speler voor deze race al aangetikt.', hint: 'tik_al' } });
  let gestuurd = 0;
  const r = await verwerkTik({ verzoek, gebruiker, db, stuur: async () => { gestuurd++; return { ok: true }; }, nu: NU });
  check('weigert de database, dan gaat de hint terug naar de app en gaat er niets uit',
    r.status === 400 && r.body.hint === 'tik_al' && gestuurd === 0, JSON.stringify(r));
}
{
  const toestellen = [
    { endpoint: 'https://push.voorbeeld/kees-nl', taal: 'nl', p256dh: 'p', auth: 'a' },
    { endpoint: 'https://push.voorbeeld/kees-en', taal: 'en', p256dh: 'p', auth: 'a' },
    { endpoint: 'https://push.voorbeeld/kees-oud', taal: 'nl', p256dh: 'p', auth: 'a' },
  ];
  const db = nepDb({ toestellen });
  const berichten = [];
  const r = await verwerkTik({ verzoek, gebruiker, db, nu: NU, stuur: async (ab, bericht, opties) => {
    berichten.push({ ab, bericht, opties });
    return ab.endpoint.endsWith('oud') ? { ok: false, weg: true } : { ok: true };
  } });
  const tik = db.log.find(([, naam]) => naam === 'tik_geven')?.[2];
  check('de tik gaat met het account van wie tikte naar de database', tik?.p_van === 'account-danny'
    && tik?.p_race === 19 && tik?.p_sessie === 'quali' && tik?.p_aan === 'lid-kees', JSON.stringify(tik));
  const nl = berichten.find((b) => b.ab.taal === 'nl')?.bericht;
  const en = berichten.find((b) => b.ab.taal === 'en')?.bericht;
  check('de melding: wie er tikt, welke sessie wanneer sluit, en dat je nog niets invulde',
    nl?.titel === 'Danny tikt je aan'
      && nl?.tekst === 'Austin: kwalificatie sluit over 3 uur. Je hebt hier nog niets ingevuld.', JSON.stringify(nl));
  check('in de taal van elk toestel', en?.titel === 'Danny nudged you'
    && en?.tekst === 'Austin: qualifying closes in 3 hours. You have not filled anything in here yet.', JSON.stringify(en));
  check('met een vaste link naar de app en een eigen tag, en de sleutel en het contact uit de Vault',
    nl?.url === APP_URL && nl?.tag === 'tik:7' && berichten[0].opties.onderwerp === 'mailto:c@voorbeeld.nl'
      && berichten[0].opties.sleutel.prive === VAPID_PRIVE);
  check('een verlopen abonnement wordt opgeruimd', db.log.some(([soort, tabel, k, v]) => soort === 'delete'
    && tabel === 'push_abonnementen' && k === 'endpoint' && v === 'https://push.voorbeeld/kees-oud'));
  check('en er staat vast op hoeveel toestellen hij aankwam', r.status === 200 && r.body.verstuurd === 2
    && r.body.aan === 'Kees' && db.log.some(([soort, tabel, rij, k, v]) => soort === 'update' && tabel === 'tikken'
      && rij.verstuurd === 2 && k === 'id' && v === 7), JSON.stringify(r));
}
{
  const db = nepDb({ toestellen: [] });
  const r = await verwerkTik({ verzoek, gebruiker, db, nu: NU, stuur: async () => ({ ok: true }) });
  check('zonder toestellen: nul verstuurd (de app biedt dan de groepsapp aan)', r.status === 200 && r.body.verstuurd === 0);
}
{
  const r = await verwerkTik({ verzoek: { race: 19 }, gebruiker, db: nepDb(), stuur: async () => ({ ok: true }) });
  check('een verzoek zonder sessie of ontvanger wordt geweigerd', r.status === 400);
}
check('een tik in de laatste minuten zegt "zo meteen"', tikBericht({ id: 1, van_naam: 'D', race: 'R', sessie: 'race',
  deadline: new Date(NU + 5 * 60e3).toISOString() }, 'nl', NU).tekst.startsWith('R: race sluit zo meteen.'));

// ---- 5. de kopie naast de functie, en de link -------------------------------------------
const lees = (...p) => readFileSync(join(wortel, ...p), 'utf8');
check('supabase/functions/tik/herinneringen.mjs is gelijk aan scripts/herinneringen.mjs',
  lees('supabase', 'functions', 'tik', 'herinneringen.mjs') === lees('scripts', 'herinneringen.mjs'),
  'kopieer scripts/herinneringen.mjs opnieuw naar supabase/functions/tik/');
const talen = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt'];
check('elke taal heeft de titel van een tik, met de naam erin',
  talen.every((t) => woorden(t).tik('Zoë').includes('Zoë')) && new Set(talen.map((t) => woorden(t).tik('X'))).size === 7);
const syncUrl = lees('scripts', 'sync.mjs').match(/const APP_URL = process\.env\.APP_URL \?\? '([^']*)'/)?.[1];
check('de link in de melding is dezelfde als die van de herinneringen', APP_URL === syncUrl, `${APP_URL} / ${syncUrl}`);

// ---- 6. de sleutel in de Vault ---------------------------------------------------------
{
  const vault = { afdruk: null, gezet: [] };
  const sb = async (pad, opties) => {
    if (pad === 'rpc/push_sleutel_vingerafdruk') return vault.afdruk;
    if (pad === 'rpc/push_sleutel_zetten') {
      const { p_sleutel } = JSON.parse(opties.body);
      vault.gezet.push(p_sleutel);
      vault.afdruk = p_sleutel.vingerafdruk;
      return null;
    }
    throw new Error(`onverwacht: ${pad}`);
  };
  const eerst = await sleutelInVault({ prive: VAPID_PRIVE, contact: 'mailto:c@voorbeeld.nl', sb });
  const gezet = vault.gezet[0];
  check('de sync zet de sleutel in de Vault, met de publieke helft, het contact en een vingerafdruk',
    eerst === 'gezet' && gezet?.prive === VAPID_PRIVE && gezet?.publiek === VAPID_PUBLIEK
      && gezet?.contact === 'mailto:c@voorbeeld.nl' && /^[0-9a-f]{64}$/.test(gezet?.vingerafdruk ?? ''),
    JSON.stringify({ ...gezet, prive: gezet?.prive ? '…' : null }));
  const daarna = await sleutelInVault({ prive: VAPID_PRIVE, contact: 'mailto:c@voorbeeld.nl', sb });
  check('staat hij er al, dan zet hij hem niet nog eens', daarna === 'staat er al' && vault.gezet.length === 1);
  const ander = await sleutelInVault({ prive: VAPID_PRIVE, contact: 'mailto:ander@voorbeeld.nl', sb });
  check('verandert er iets (hier het contact), dan wel', ander === 'gezet' && vault.gezet.length === 2);
  const geen = await sleutelInVault({ prive: '', contact: 'mailto:c@voorbeeld.nl', sb });
  check('zonder sleutel (VAPID_PRIVE leeg) gebeurt er niets', geen === 'geen sleutel' && vault.gezet.length === 2);
  const metPush = await versleutel('x', A.uaPublic, A.auth);
  check('en met wat er in de Vault komt kan de functie versturen', (await vapidKop('https://push.voorbeeld/x',
    gezet.contact, { prive: gezet.prive, publiek: gezet.publiek })).Authorization.endsWith(`k=${VAPID_PUBLIEK}`)
      && metPush.length > 86);
}

process.exit(afronden() ? 0 : 1);
