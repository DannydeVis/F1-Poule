// Web push, nagerekend tegen de testvectoren uit de RFC's.
//
// Dit is de enige test in deze map die geen browser opstart, en met reden:
// wat hier kapot kan gaan is rekenwerk, en dat is precies wat een RFC met een
// testvector kan bewijzen. Zonder deze test zou een fout in de sleutelafleiding
// zich pas melden als een echte telefoon een melding níét krijgt — en dan weet
// je nog steeds niet waarom.
//
//   RFC 8291 Appendix A — de versleuteling van de inhoud
//   RFC 8292 §2.4       — een VAPID-kop met bekende sleutels
//
// Een pushdienst zelf wordt hier niet aangesproken. Wat wél getest wordt is
// dat stuur() het goede verzoek samenstelt en dat een verlopen abonnement geen
// fout is maar een opruimactie.

import { versleutel, vapidKop, nieuwSleutelpaar, stuur, b64u, vanB64u } from '../scripts/push.mjs';
import { maakControle } from './hulp.mjs';

const { check, afronden } = maakControle('web push');

// ---- RFC 8291 Appendix A ------------------------------------------------
// De ontvanger, de afzender en het zout liggen vast, dus de uitkomst ook.
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

const uit = versleutel(A.tekst, A.uaPublic, A.auth,
  { zout: A.zout, eigenSleutel: A.asPrivate });
check('de versleutelde inhoud klopt met het testvector uit RFC 8291',
  b64u(uit) === A.verwacht, b64u(uit));

// De kop is onversleuteld en moet leesbaar blijven voor de ontvanger: zout,
// recordgrootte, en de lengte plus de inhoud van onze publieke sleutel.
check('het zout staat vooraan', b64u(uit.subarray(0, 16)) === A.zout,
  b64u(uit.subarray(0, 16)));
check('de recordgrootte is 4096', uit.readUInt32BE(16) === 4096, String(uit.readUInt32BE(16)));
check('de publieke sleutel is 65 bytes en staat erachter',
  uit.readUInt8(20) === 65 && uit.subarray(21, 86).length === 65, String(uit.readUInt8(20)));

// Zonder zout hoort elke oproep een ander bericht te geven. Twee keer
// hetzelfde zou betekenen dat iemand die meeleest twee berichten kan
// vergelijken.
const een = versleutel('hallo', A.uaPublic, A.auth);
const twee = versleutel('hallo', A.uaPublic, A.auth);
check('zonder zout is elk bericht anders', !een.equals(twee));
check('maar wel even lang', een.length === twee.length, `${een.length} / ${twee.length}`);

// ---- RFC 8292 §2.4 ------------------------------------------------------
// De sleutel en het tijdstip liggen vast; de handtekening niet, want ECDSA
// gebruikt een willekeurig getal. Dus wordt gecontroleerd wat wél vastligt:
// de kop, de eisen, en dat de handtekening klopt met de publieke sleutel.
const VAPID_PRIVE = 'y1DnucGuP0hlQkG4lBfvfJdKhXjJ9uY6tsJsn2EaA1U';
const kop = vapidKop('https://push.example.net/push/abc', 'mailto:poule@voorbeeld.nl',
  VAPID_PRIVE, { nu: 1470944512000 });

// De kop is `vapid t=<jwt>, k=<sleutel>`. Alleen op de eerste spatie splitsen:
// de rest bevat er zelf ook een, na de komma.
const schema = kop.Authorization.slice(0, kop.Authorization.indexOf(' '));
const rest = kop.Authorization.slice(kop.Authorization.indexOf(' ') + 1);
check('het schema is vapid', schema === 'vapid', schema);
const delen = Object.fromEntries(rest.split(',').map((x) => {
  const stuk = x.trim(), i = stuk.indexOf('=');
  return [stuk.slice(0, i), stuk.slice(i + 1)];
}));
check('er staat een t= en een k= in de kop',
  !!delen.t && !!delen.k, Object.keys(delen).join(', '));

const [jwtKop, jwtEis, jwtKrabbel] = delen.t.split('.');
check('de JWT heeft drie delen', !!jwtKop && !!jwtEis && !!jwtKrabbel, delen.t);
const gelezenKop = JSON.parse(vanB64u(jwtKop).toString());
check('de JWT zegt dat hij met ES256 ondertekend is',
  gelezenKop.alg === 'ES256' && gelezenKop.typ === 'JWT', JSON.stringify(gelezenKop));

const eis = JSON.parse(vanB64u(jwtEis).toString());
check('aud is de herkomst van het endpoint, zonder pad',
  eis.aud === 'https://push.example.net', eis.aud);
check('sub is het contactadres', eis.sub === 'mailto:poule@voorbeeld.nl', eis.sub);
check('exp ligt twaalf uur vooruit en niet verder',
  eis.exp === Math.floor(1470944512000 / 1000) + 12 * 3600, String(eis.exp));

// En de handtekening zelf. Dit is het punt waarop een pushdienst zou
// weigeren; hier wordt hij nagerekend met dezelfde publieke sleutel die in de
// kop meegaat.
const { createPublicKey, verify } = await import('node:crypto');
const punt = vanB64u(delen.k);
const publiek = createPublicKey({ format: 'jwk', key: {
  kty: 'EC', crv: 'P-256',
  x: b64u(punt.subarray(1, 33)), y: b64u(punt.subarray(33, 65)),
}});
check('de handtekening klopt met de publieke sleutel uit de kop',
  verify('sha256', Buffer.from(`${jwtKop}.${jwtEis}`),
    { key: publiek, dsaEncoding: 'ieee-p1363' }, vanB64u(jwtKrabbel)));
check('en die publieke sleutel is 65 bytes, ongecomprimeerd',
  punt.length === 65 && punt[0] === 4, `${punt.length} bytes, begint met ${punt[0]}`);

// Een andere sleutel hoort niet te kloppen. Anders bewijst de controle
// hierboven niets.
const ander = nieuwSleutelpaar();
const kop2 = vapidKop('https://push.example.net/push/abc', 'mailto:poule@voorbeeld.nl',
  ander.prive);
const t2 = kop2.Authorization.slice(kop2.Authorization.indexOf('t=') + 2,
  kop2.Authorization.indexOf(', k='));
const [k2, e2, s2] = t2.split('.');
check('een vers sleutelpaar levert een andere publieke sleutel op',
  kop2.publiek !== kop.publiek);
check('en ondertekent net zo goed geldig',
  verify('sha256', Buffer.from(`${k2}.${e2}`),
    { key: createPublicKey({ format: 'jwk', key: {
      kty: 'EC', crv: 'P-256',
      x: b64u(vanB64u(ander.publiek).subarray(1, 33)),
      y: b64u(vanB64u(ander.publiek).subarray(33, 65)),
    }}), dsaEncoding: 'ieee-p1363' }, vanB64u(s2)));
check('maar niet met de sleutel van iemand anders',
  !verify('sha256', Buffer.from(`${k2}.${e2}`),
    { key: publiek, dsaEncoding: 'ieee-p1363' }, vanB64u(s2)));

// ---- het verzoek zelf ----------------------------------------------------
const abonnement = { endpoint: 'https://push.example.net/push/abc',
                     p256dh: A.uaPublic, auth: A.auth };
let gezien = null;
const nepHaal = (url, opties) => { gezien = { url, opties }; return { ok: true, status: 201 }; };
const uitkomst = await stuur(abonnement, { titel: 'Suzuka sluit over 2 uur' },
  { onderwerp: 'mailto:poule@voorbeeld.nl', priveSleutel: VAPID_PRIVE, haal: nepHaal });
check('versturen lukt', uitkomst.ok === true, JSON.stringify(uitkomst));
check('en gaat naar het endpoint van dat abonnement',
  gezien.url === abonnement.endpoint, gezien.url);
check('met de juiste content-encoding',
  gezien.opties.headers['Content-Encoding'] === 'aes128gcm',
  gezien.opties.headers['Content-Encoding']);
check('een TTL, zodat een melding niet eeuwig blijft hangen',
  gezien.opties.headers.TTL === '86400', gezien.opties.headers.TTL);
check('en de inhoud is versleuteld, niet de kale tekst',
  !gezien.opties.body.includes(Buffer.from('Suzuka')));

// Een abonnement dat niet meer bestaat is geen fout maar een opruimactie: de
// telefoon is opnieuw ingesteld of de app is verwijderd. Eén dode rij mag de
// hele ronde niet stilleggen.
for (const status of [404, 410]) {
  const weg = await stuur(abonnement, { titel: 'x' }, {
    onderwerp: 'mailto:poule@voorbeeld.nl', priveSleutel: VAPID_PRIVE,
    haal: () => ({ ok: false, status, text: async () => '' }) });
  check(`een ${status} betekent "dit abonnement is weg"`,
    weg.ok === false && weg.weg === true, JSON.stringify(weg));
}
const stuk = await stuur(abonnement, { titel: 'x' }, {
  onderwerp: 'mailto:poule@voorbeeld.nl', priveSleutel: VAPID_PRIVE,
  haal: () => ({ ok: false, status: 500, text: async () => 'boem' }) });
check('een 500 is wel een fout, maar gooit niet',
  stuk.ok === false && !stuk.weg && stuk.status === 500, JSON.stringify(stuk));

process.exit(afronden() ? 0 : 1);
