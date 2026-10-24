#!/usr/bin/env node
/**
 * Het Android-project in android/: de app van Predict the Race voor de Play
 * Store, als Trusted Web Activity. Dat is de webapp in een Android-schil, geen
 * tweede app: de schil opent https://predicttherace.com/app/ in Chrome, zonder
 * adresbalk zolang .well-known/assetlinks.json de sleutel van de app noemt
 * (site/android.mjs).
 *
 * Gemaakt met Bubblewrap van Google (@bubblewrap/core) uit
 * android/twa-manifest.json. Alleen opnieuw draaien als daar iets in
 * verandert, of voor een nieuwere Bubblewrap:
 *
 *   npm i --prefix /tmp/bw @bubblewrap/core@1.27.0
 *   BUBBLEWRAP=/tmp/bw/node_modules/@bubblewrap/core node scripts/maak-android.mjs
 *
 * De iconen en het webmanifest komen uit deze repo, niet van het domein: het
 * script beantwoordt de downloads van Bubblewrap zelf. Daarna past pasAan()
 * drie dingen aan die Bubblewrap anders doet:
 *   - ondertekenen met de uploadsleutel als ANDROID_SLEUTEL_PAD gezet is (de
 *     workflow "Android-app" met scripts/android-sleutel.mjs);
 *   - het versienummer voor de Play Store uit -PversieCode (de workflow geeft
 *     het aantal commits mee, en dat loopt alleen maar op);
 *   - mavenCentral() in plaats van jcenter(), dat niet meer bijgewerkt wordt.
 */

import { readFileSync, writeFileSync, rmSync, cpSync, mkdtempSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const wortel = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = join(wortel, 'android');
// Wat in android/ van ons is en niet van Bubblewrap.
export const EIGEN = ['twa-manifest.json', '.gitignore', 'winkel'];

const ONDERTEKENEN = `    // Ondertekenen met de uploadsleutel, alleen in de workflow "Android-app":
    // scripts/android-sleutel.mjs zet ANDROID_SLEUTEL_PAD en het wachtwoord.
    // Zonder die twee een build zonder handtekening, zoals bij een pull request.
    def sleutel = System.getenv('ANDROID_SLEUTEL_PAD')
    signingConfigs {
        if (sleutel) {
            upload {
                storeFile file(sleutel)
                storePassword System.getenv('ANDROID_SLEUTEL_WACHTWOORD')
                keyAlias 'upload'
                keyPassword System.getenv('ANDROID_SLEUTEL_WACHTWOORD')
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            if (sleutel) signingConfig signingConfigs.upload
        }
    }`;

// De aanpassingen op app/build.gradle. Twee keer draaien verandert niets.
// Niet "versionCode (a ?: b).toInteger()": Groovy leest dat als
// versionCode(a ?: b) en roept .toInteger() aan op wat dat teruggeeft (de
// eerste build op GitHub zakte daarop, 24 oktober).
export function pasAan(gradle) {
  let uit = gradle.replace(/^(\s*)versionCode (\d+)$/m,
    "$1versionCode Integer.parseInt(String.valueOf(project.findProperty('versieCode') ?: '$2'))");
  if (!uit.includes('ANDROID_SLEUTEL_PAD')) {
    const oud = /    buildTypes \{\n        release \{\n            minifyEnabled true\n        \}\n    \}/;
    if (!oud.test(uit)) throw new Error('buildTypes in app/build.gradle niet gevonden: is de sjabloon van Bubblewrap veranderd?');
    uit = uit.replace(oud, ONDERTEKENEN);
  }
  return uit;
}

async function maak() {
  if (!process.env.BUBBLEWRAP) throw new Error('Zet BUBBLEWRAP op de map van @bubblewrap/core (zie bovenin dit script).');
  const require = createRequire(import.meta.url);
  const core = require(process.env.BUBBLEWRAP);
  const { fetchUtils } = require(join(process.env.BUBBLEWRAP, 'dist', 'lib', 'FetchUtils.js'));
  const manifest = JSON.parse(readFileSync(join(MAP, 'twa-manifest.json'), 'utf8'));
  const domein = `https://${manifest.host}`;
  fetchUtils.fetch = async (url) => {
    const u = new URL(url);
    if (u.origin !== domein) throw new Error(`Onverwachte download: ${url}`);
    const soort = { '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[extname(u.pathname)];
    if (!soort) throw new Error(`Onverwachte download: ${url}`);
    return new Response(readFileSync(join(wortel, decodeURIComponent(u.pathname))), {
      status: 200, headers: { 'content-type': soort } });
  };

  const tijdelijk = mkdtempSync(join(tmpdir(), 'android-'));
  await new core.TwaGenerator().createTwaProject(tijdelijk, new core.TwaManifest(manifest), new core.ConsoleLog('android'));

  for (const naam of readdirSync(MAP)) if (!EIGEN.includes(naam)) rmSync(join(MAP, naam), { recursive: true, force: true });
  cpSync(tijdelijk, MAP, { recursive: true });
  rmSync(tijdelijk, { recursive: true, force: true });

  const app = join(MAP, 'app', 'build.gradle');
  writeFileSync(app, pasAan(readFileSync(app, 'utf8')));
  const hoofd = join(MAP, 'build.gradle');
  writeFileSync(hoofd, readFileSync(hoofd, 'utf8').replaceAll('jcenter()', 'mavenCentral()'));
  console.log(`Klaar: ${MAP}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await maak();
