#!/usr/bin/env node
/**
 * De uploadsleutel van de Android-app, voor de workflow "Android-app".
 *
 * Google Play wil elke nieuwe versie ondertekend met dezelfde uploadsleutel.
 * Die mag niet in de repo (die is openbaar) en niet in de log. Hij staat als
 * één bestand in de privé-map "android" in Supabase Storage (schema.sql):
 * zonder policies, dus alleen te lezen met de service_role-sleutel, het secret
 * SUPABASE_KEY dat de sync ook gebruikt.
 *
 * De eerste keer is er nog geen sleutel. Dan maakt dit script hem met keytool,
 * met een willekeurig wachtwoord, en zet hem in die map. Alleen als Storage
 * zegt dat het bestand niet bestaat; elke andere fout stopt de run, en het
 * bestand wordt nooit overschreven (x-upsert: false). Een tweede sleutel zou
 * betekenen dat Google Play de volgende versie weigert. Raakt de sleutel toch
 * kwijt: in de Play Console een nieuwe uploadsleutel aanvragen (BEDIENING §21).
 *
 * Sleutel en wachtwoord staan samen in één JSON-bestand, zodat er nooit maar
 * de helft van in de map kan staan.
 *
 * In de workflow (zonder argumenten):
 *   - het wachtwoord gemaskeerd (::add-mask::) vóór er iets anders gebeurt;
 *   - ANDROID_SLEUTEL_PAD en ANDROID_SLEUTEL_WACHTWOORD in GITHUB_ENV, voor
 *     Gradle (android/app/build.gradle);
 *   - de SHA-256-vingerafdruk in de samenvatting van de run en in
 *     $RUNNER_TEMP/vingerafdruk.txt. Die is openbaar: hij hoort in
 *     .well-known/assetlinks.json (site/android.mjs).
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAP = 'android';
export const BESTAND = 'uploadsleutel.json';
export const ALIAS = 'upload';

// Een nieuwe sleutel met keytool: RSA 4096, 10000 dagen (Google Play wil een
// sleutel die tot na 2033 geldig is).
export function keytoolSleutel(pad, wachtwoord) {
  execFileSync('keytool', ['-genkeypair', '-noprompt', '-keystore', pad, '-storetype', 'PKCS12',
    '-storepass', wachtwoord, '-keypass', wachtwoord, '-alias', ALIAS, '-keyalg', 'RSA',
    '-keysize', '4096', '-validity', '10000', '-dname', 'CN=Predict the Race, O=Predict the Race, C=NL'],
  { stdio: 'pipe' });
}

// De SHA-256-vingerafdruk van het certificaat, als AA:BB:...
export function vingerafdruk(pad, wachtwoord) {
  const uit = execFileSync('keytool', ['-list', '-v', '-keystore', pad, '-storepass', wachtwoord,
    '-alias', ALIAS], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const v = /SHA256:\s*([0-9A-F]{2}(?::[0-9A-F]{2}){31})/.exec(uit)?.[1];
  if (!v) throw new Error('Geen SHA-256-vingerafdruk in de uitvoer van keytool.');
  return v;
}

// Zegt Storage dat het bestand er niet is? Alleen dan mag er een nieuwe
// sleutel komen. Een map die niet bestaat is iets anders: dan is schema.sql
// niet gedraaid.
async function bestaatNiet(antwoord) {
  if (antwoord.status === 404) return true;
  if (antwoord.status !== 400) return false;
  const tekst = await antwoord.clone().text();
  if (/bucket not found/i.test(tekst)) {
    throw new Error(`De map "${MAP}" bestaat niet in Supabase Storage: draai schema.sql opnieuw.`);
  }
  return /object not found|"statusCode"\s*:\s*"404"|not_found/i.test(tekst);
}

/**
 * Haalt de uploadsleutel op, of maakt hem de eerste keer. Schrijft de sleutel
 * naar `pad` en geeft { wachtwoord, nieuw } terug.
 */
export async function sleutelOphalen({ url, key, pad, fetch = globalThis.fetch, maakSleutel = keytoolSleutel }) {
  if (!url || !key) throw new Error('SUPABASE_URL en SUPABASE_KEY zijn nodig.');
  const adres = `${url.replace(/\/$/, '')}/storage/v1/object/${MAP}/${BESTAND}`;
  const kop = { authorization: `Bearer ${key}`, apikey: key };

  const antwoord = await fetch(adres, { headers: kop });
  if (antwoord.ok) {
    const { wachtwoord, p12 } = await antwoord.json();
    if (!wachtwoord || !p12) throw new Error(`${BESTAND} in Storage is onvolledig; niets overschreven.`);
    writeFileSync(pad, Buffer.from(p12, 'base64'));
    return { wachtwoord, nieuw: false };
  }
  if (!(await bestaatNiet(antwoord))) {
    throw new Error(`Storage gaf ${antwoord.status} bij het ophalen van de uploadsleutel; niets gemaakt.`);
  }

  const wachtwoord = randomBytes(24).toString('base64url');
  maakSleutel(pad, wachtwoord);
  const inhoud = JSON.stringify({ wachtwoord, p12: readFileSync(pad).toString('base64'),
    gemaakt: new Date().toISOString() });
  const op = await fetch(adres, { method: 'POST', body: inhoud,
    headers: { ...kop, 'content-type': 'application/json', 'x-upsert': 'false' } });
  if (!op.ok) throw new Error(`Storage gaf ${op.status} bij het bewaren van de nieuwe uploadsleutel.`);
  return { wachtwoord, nieuw: true };
}

async function inDeWorkflow() {
  const env = process.env;
  const map = env.RUNNER_TEMP || mkdtempSync(join(tmpdir(), 'android-sleutel-'));
  const pad = join(map, 'uploadsleutel.p12');
  const { wachtwoord, nieuw } = await sleutelOphalen({ url: env.SUPABASE_URL, key: env.SUPABASE_KEY, pad });
  console.log(`::add-mask::${wachtwoord}`);
  const v = vingerafdruk(pad, wachtwoord);
  if (env.GITHUB_ENV) appendFileSync(env.GITHUB_ENV, `ANDROID_SLEUTEL_PAD=${pad}\nANDROID_SLEUTEL_WACHTWOORD=${wachtwoord}\n`);
  else rmSync(pad, { force: true });
  writeFileSync(join(map, 'vingerafdruk.txt'), `${v}\n`);
  const { ANDROID } = await import('../site/android.mjs');
  const bekend = ANDROID.vingerafdrukken.includes(v);
  const regels = [
    '### Uploadsleutel',
    nieuw ? 'Nieuw gemaakt en bewaard in de privé-map in Supabase.' : 'Opgehaald uit de privé-map in Supabase.',
    '', `SHA-256: \`${v}\``, '',
    bekend ? 'Staat in site/android.mjs (en dus in .well-known/assetlinks.json).'
      : '**Staat nog niet in site/android.mjs**: zet hem erin, anders opent de app met een adresbalk.',
  ];
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${regels.join('\n')}\n`);
  console.log(`Uploadsleutel ${nieuw ? 'gemaakt' : 'opgehaald'}. SHA-256: ${v}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await inDeWorkflow(); } catch (e) { console.error(e.message); process.exit(1); }
}
