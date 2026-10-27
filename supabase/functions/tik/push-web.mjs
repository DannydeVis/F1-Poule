/**
 * Web push met WebCrypto, voor de functie `tik` (Supabase Edge Function).
 *
 * scripts/push.mjs doet hetzelfde voor de sync, met de crypto van Node. Hier
 * staat de versie die overal draait waar WebCrypto is: in Deno (de functie),
 * in Node (de tests) en in een browser. Zelfde drie RFC's:
 *
 *   RFC 8188  het aes128gcm-formaat (de omhulling)
 *   RFC 8291  hoe je de sleutel afleidt uit het abonnement (de inhoud)
 *   RFC 8292  VAPID: bewijzen dat jij de afzender bent (de envelop)
 *
 * Eén verschil met scripts/push.mjs: WebCrypto kan van een privésleutel alleen
 * niets maken, hij wil de publieke helft erbij. De sleutel is hier dus altijd
 * een paar { prive, publiek }; de sync zet ze allebei in de Vault.
 *
 * test/tik-versturen.test.mjs rekent dit na met het testvector uit RFC 8291,
 * en de VAPID-kop met dezelfde sleutel als scripts/push.mjs.
 */

const subtle = globalThis.crypto.subtle;
const tekst = new TextEncoder();

export const b64u = (bytes) => {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const vanB64u = (s) => {
  const schoon = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const rauw = atob(schoon + '='.repeat((4 - (schoon.length % 4)) % 4));
  return Uint8Array.from(rauw, (c) => c.charCodeAt(0));
};
const plak = (...delen) => {
  const uit = new Uint8Array(delen.reduce((t, d) => t + d.length, 0));
  let i = 0;
  for (const d of delen) { uit.set(d, i); i += d.length; }
  return uit;
};
// Een privésleutel als JWK: d, met x en y uit de publieke helft (0x04||x||y).
const jwk = (prive, publiek) => ({
  kty: 'EC', crv: 'P-256', ext: true, d: b64u(prive),
  x: b64u(publiek.subarray(1, 33)), y: b64u(publiek.subarray(33, 65)),
});

async function hkdf(ikm, zout, info, lengte) {
  const sleutel = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: zout, info }, sleutel, lengte * 8));
}

// ------------------------------------------------------------
//  De inhoud versleutelen (RFC 8291)
// ------------------------------------------------------------
// Precies de stappen van versleutel() in scripts/push.mjs; daar staat bij elke
// stap waarom. `zout` en `eigen` ({ prive, publiek }) alleen voor de test.
export async function versleutel(bericht, p256dh, auth, { zout, eigen } = {}) {
  const uaPublic = vanB64u(p256dh);
  const authGeheim = vanB64u(auth);
  const salt = zout ? vanB64u(zout) : globalThis.crypto.getRandomValues(new Uint8Array(16));

  let eigenPrive, asPublic;
  if (eigen) {
    asPublic = vanB64u(eigen.publiek);
    eigenPrive = await subtle.importKey('jwk', jwk(vanB64u(eigen.prive), asPublic),
      { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  } else {
    const paar = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    eigenPrive = paar.privateKey;
    asPublic = new Uint8Array(await subtle.exportKey('raw', paar.publicKey));
  }
  const ontvanger = await subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const gedeeld = new Uint8Array(await subtle.deriveBits({ name: 'ECDH', public: ontvanger }, eigenPrive, 256));

  const ikm = await hkdf(gedeeld, authGeheim, plak(tekst.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(ikm, salt, tekst.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, tekst.encode('Content-Encoding: nonce\0'), 12);

  const aes = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const body = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes,
    plak(tekst.encode(bericht), new Uint8Array([2]))));

  const kop = new Uint8Array(21);
  kop.set(salt, 0);
  new DataView(kop.buffer).setUint32(16, 4096);
  kop[20] = asPublic.length;
  return plak(kop, asPublic, body);
}

// ------------------------------------------------------------
//  Bewijzen wie je bent (RFC 8292, VAPID)
// ------------------------------------------------------------
// WebCrypto geeft een ECDSA-handtekening als r||s: precies wat een JWT wil.
export async function vapidKop(endpoint, onderwerp, sleutel, { nu = Date.now() } = {}) {
  const kop = { typ: 'JWT', alg: 'ES256' };
  const eis = { aud: new URL(endpoint).origin, exp: Math.floor(nu / 1000) + 12 * 3600, sub: onderwerp };
  const ondertekend = `${b64u(tekst.encode(JSON.stringify(kop)))}.${b64u(tekst.encode(JSON.stringify(eis)))}`;
  const publiek = vanB64u(sleutel.publiek);
  const ondertekenaar = await subtle.importKey('jwk', jwk(vanB64u(sleutel.prive), publiek),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const krabbel = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, ondertekenaar,
    tekst.encode(ondertekend));
  return { Authorization: `vapid t=${ondertekend}.${b64u(krabbel)}, k=${b64u(publiek)}` };
}

// ------------------------------------------------------------
//  Versturen
// ------------------------------------------------------------
// Zoals stuur() in scripts/push.mjs: geeft terug wat er gebeurde in plaats van
// te gooien, en 404 of 410 betekent dat het abonnement weg is. Urgency high en
// een TTL van zes uur: een tik gaat over een deadline die vandaag sluit.
export async function stuur(abonnement, bericht, { onderwerp, sleutel, haal = fetch } = {}) {
  const lading = await versleutel(JSON.stringify(bericht), abonnement.p256dh, abonnement.auth);
  const { Authorization } = await vapidKop(abonnement.endpoint, onderwerp, sleutel);
  const antwoord = await haal(abonnement.endpoint, {
    method: 'POST',
    headers: {
      Authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(6 * 3600),
      Urgency: 'high',
    },
    body: lading,
  });
  if (antwoord.ok) return { ok: true };
  if (antwoord.status === 404 || antwoord.status === 410) return { ok: false, weg: true };
  return { ok: false, status: antwoord.status, tekst: await antwoord.text().catch(() => '') };
}
