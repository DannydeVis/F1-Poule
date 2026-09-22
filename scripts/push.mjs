/**
 * Web push, met de ingebouwde crypto van Node en zonder npm install.
 *
 * Waarom dit hier staat en niet uit een pakket komt: `scripts/sync.mjs` draait
 * op een GitHub-runner zonder `npm install` — dat is een bewuste keuze die
 * elders in dit project uitgelegd staat, en één pakket erbij haalt die keuze
 * onderuit. Web push is bovendien twee RFC's die allebei een testvector
 * meeleveren, dus het is na te rekenen in plaats van te vertrouwen.
 *
 *   RFC 8188  het aes128gcm-formaat (de omhulling)
 *   RFC 8291  hoe je de sleutel afleidt uit het abonnement (de inhoud)
 *   RFC 8292  VAPID: bewijzen dat jij de afzender bent (de envelop)
 *
 * De testvectoren uit RFC 8291 en 8292 staan in test/push.test.mjs. Gaat er
 * hier iets kapot, dan zakt die test — en niet pas op iemands telefoon.
 */

import { createECDH, createPrivateKey, hkdfSync,
         createCipheriv, randomBytes, sign as cryptoSign,
         generateKeyPairSync } from 'node:crypto';

// base64url, want dat is wat een pushabonnement gebruikt en wat in een JWT
// gaat. Node kan het inmiddels zelf, maar niet op elke versie even lang, dus
// hier expliciet.
export const b64u = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const vanB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// ------------------------------------------------------------
//  De inhoud versleutelen (RFC 8291)
// ------------------------------------------------------------
//
// Het abonnement van de browser geeft twee dingen: `p256dh`, de publieke
// sleutel van dat toestel, en `auth`, een geheim van zestien bytes dat alleen
// dat toestel en de server kennen. Samen met een verse sleutel van onze kant
// leveren ze de sleutel waarmee de tekst versleuteld wordt. De pushdienst
// (Google, Apple, Mozilla) ziet daardoor alleen ruis — dat is het punt.
export function versleutel(tekst, p256dh, auth, { zout, eigenSleutel } = {}) {
  const uaPublic = vanB64u(p256dh);
  const authGeheim = vanB64u(auth);
  const salt = zout ? vanB64u(zout) : randomBytes(16);

  const ecdh = createECDH('prime256v1');
  if (eigenSleutel) ecdh.setPrivateKey(vanB64u(eigenSleutel));
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const gedeeld = ecdh.computeSecret(uaPublic);

  // Twee stappen, en de volgorde is niet willekeurig: eerst wordt het
  // ECDH-geheim met het auth-geheim vermengd (dát is wat een pushdienst die
  // wél de sleutels van het toestel zou hebben alsnog buitensluit), en pas
  // daarna komt het zout erbij dat per bericht verschilt.
  const authInfo = Buffer.concat([
    Buffer.from('WebPush: info\0'), uaPublic, asPublic]);
  const ikm = hkdfSync('sha256', gedeeld, authGeheim, authInfo, 32);
  const cek   = Buffer.from(hkdfSync('sha256', ikm, salt,
    Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt,
    Buffer.from('Content-Encoding: nonce\0'), 12));

  // De 0x02 is het einde-teken uit RFC 8188: dit is de laatste (en enige)
  // blok. Zonder dat byte weigert de browser het bericht zonder uit te leggen
  // waarom.
  const blok = Buffer.concat([Buffer.from(tekst, 'utf8'), Buffer.from([2])]);
  const gcm = createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([gcm.update(blok), gcm.final(), gcm.getAuthTag()]);

  // De kop staat onversleuteld voorop: het zout, de recordgrootte, en onze
  // publieke sleutel — die heeft de ontvanger nodig om hetzelfde geheim uit
  // te rekenen.
  const kop = Buffer.alloc(21);
  salt.copy(kop, 0);
  kop.writeUInt32BE(4096, 16);
  kop.writeUInt8(asPublic.length, 20);
  return Buffer.concat([kop, asPublic, body]);
}

// ------------------------------------------------------------
//  Bewijzen wie je bent (RFC 8292, VAPID)
// ------------------------------------------------------------
//
// Een pushdienst wil weten van wie een bericht komt, zodat hij een afzender
// die spamt kan blokkeren zonder iedereen te raken. Dat bewijs is een JWT,
// ondertekend met een sleutelpaar dat jij één keer maakt. De publieke helft
// staat ook in de app — de browser geeft hem mee bij het abonneren, en de
// pushdienst controleert dat die twee bij elkaar horen.
export function vapidKop(endpoint, onderwerp, priveSleutel, { nu = Date.now() } = {}) {
  const doel = new URL(endpoint).origin;
  const kop = { typ: 'JWT', alg: 'ES256' };
  const eis = { aud: doel, exp: Math.floor(nu / 1000) + 12 * 3600, sub: onderwerp };
  const tekst = `${b64u(JSON.stringify(kop))}.${b64u(JSON.stringify(eis))}`;

  const d = vanB64u(priveSleutel);
  const ecdh = createECDH('prime256v1');
  ecdh.setPrivateKey(d);
  const punt = ecdh.getPublicKey();   // 0x04 || x(32) || y(32)
  const sleutel = createPrivateKey({ format: 'jwk', key: {
    kty: 'EC', crv: 'P-256', d: b64u(d),
    x: b64u(punt.subarray(1, 33)), y: b64u(punt.subarray(33, 65)),
  }});
  // ieee-p1363 en niet DER: een JWT-handtekening is r||s als kale bytes, en
  // Node geeft standaard de DER-verpakking die een pushdienst weigert.
  const krabbel = cryptoSign('sha256', Buffer.from(tekst),
    { key: sleutel, dsaEncoding: 'ieee-p1363' });
  return {
    Authorization: `vapid t=${tekst}.${b64u(krabbel)}, k=${b64u(punt)}`,
    publiek: b64u(punt),
  };
}

// Een nieuw VAPID-sleutelpaar. Eén keer per project; de private helft gaat als
// repository-secret in GitHub, de publieke in index.html.
export function nieuwSleutelpaar() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  // Een prive-JWK draagt x en y gewoon mee, dus de publieke helft hoeft er
  // niet apart uit geexporteerd te worden.
  const jwk = privateKey.export({ format: 'jwk' });
  return {
    prive: jwk.d,
    publiek: b64u(Buffer.concat([
      Buffer.from([4]), vanB64u(jwk.x), vanB64u(jwk.y)])),
  };
}

// ------------------------------------------------------------
//  Versturen
// ------------------------------------------------------------
//
// Geeft terug wat er gebeurde in plaats van te gooien: één abonnement dat niet
// meer bestaat mag de hele ronde niet stilleggen. 404 en 410 betekenen dat het
// abonnement weg is — die rij kan opgeruimd worden en dat is geen fout.
export async function stuur(abonnement, bericht, { onderwerp, priveSleutel, haal = fetch } = {}) {
  const lading = versleutel(JSON.stringify(bericht), abonnement.p256dh, abonnement.auth);
  const { Authorization } = vapidKop(abonnement.endpoint, onderwerp, priveSleutel);
  const antwoord = await haal(abonnement.endpoint, {
    method: 'POST',
    headers: {
      Authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body: lading,
  });
  if (antwoord.ok) return { ok: true };
  if (antwoord.status === 404 || antwoord.status === 410) return { ok: false, weg: true };
  return { ok: false, status: antwoord.status,
           tekst: await antwoord.text().catch(() => '') };
}
