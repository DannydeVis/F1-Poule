// De Android-app voor de Play Store (24 oktober): het project in android/, de
// koppeling met het domein, de workflow en wat de winkel laat zien.
//
// Bouwen kan hier niet (de servers van Google voor Android zijn vanuit de
// testomgeving niet bereikbaar); dat doet de workflow "Android-app" bij elke
// pull request die android/ raakt. Wat hier vastligt:
//   1. android/twa-manifest.json past bij de site: dezelfde pakketnaam als
//      site/android.mjs, het domein uit BASIS, /app/ als start, de kleuren en
//      iconen van manifest.webmanifest, meldingen aan.
//   2. Het project zelf: applicationId, domein en start in build.gradle, Android
//      16 (API 36, verplicht voor nieuwe apps sinds 31 augustus 2026), het
//      versienummer van buitenaf, ondertekenen alleen met de uploadsleutel uit
//      de workflow, geen jcenter, de koppeling met het domein in strings.xml,
//      meldingen en het openen van links in AndroidManifest.xml, gradlew
//      uitvoerbaar. pasAan() twee keer draaien verandert niets.
//   3. .well-known/assetlinks.json: wat site/android.mjs zegt, als geldige
//      Digital Asset Links, en het komt online (_config.yml).
//   4. De workflow: een pull request bouwt zonder sleutel en zonder secrets,
//      alleen main ondertekent, de handtekening wordt nagelopen, één run
//      tegelijk, en de winkel krijgt zijn eigen bijlage.
//   5. De winkeltekst in zeven talen: binnen de grenzen van de Play Console,
//      zonder HTML, zonder "F1" in de titel, met de disclaimer, uit de teksten
//      van de site.
//   6. De plaatjes: schermafdrukken van 1080 bij 1920 en een banner van 1024
//      bij 500, en de kop van de banner past in elke taal.

import { readFileSync, mkdtempSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel, gepubliceerd } from './hulp.mjs';
import { BASIS, TALEN, teksten } from '../site/teksten.mjs';
import { ANDROID } from '../site/android.mjs';
import { WINKEL, GRENZEN } from '../site/winkel.mjs';
import { pasAan } from '../scripts/maak-android.mjs';
import { ALIAS } from '../scripts/android-sleutel.mjs';
import { winkelTekst, fouten, banner, schermafdrukken, SCHERMEN } from '../scripts/maak-winkel.mjs';

const { check, afronden } = maakControle('de Android-app voor de Play Store');
const lees = (...p) => readFileSync(join(wortel, ...p), 'utf8');
const twa = JSON.parse(lees('android', 'twa-manifest.json'));
const web = JSON.parse(lees('manifest.webmanifest'));

// JPEG-afmetingen zonder extra bibliotheek: de SOF-kop.
function afmetingen(pad) {
  const d = readFileSync(pad);
  for (let i = 2; i < d.length;) {
    const m = d[i + 1];
    if (m === 0xC0 || m === 0xC2) return [d.readUInt16BE(i + 7), d.readUInt16BE(i + 5)];
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}

// ---- 1. twa-manifest.json --------------------------------------------------------------
check('dezelfde pakketnaam als site/android.mjs', twa.packageId === ANDROID.pakket && /^com\.predicttherace\.\w+$/.test(twa.packageId),
  twa.packageId);
check('het domein uit BASIS, en /app/ als start, net als manifest.webmanifest',
  `https://${twa.host}` === BASIS && twa.startUrl === '/app/' && web.start_url === 'app/');
check('de kleuren van de app', [twa.themeColor, twa.backgroundColor, twa.navigationColor].every((c) => c.toLowerCase() === web.theme_color)
  && web.background_color === web.theme_color);
check('de iconen van de site, en ze bestaan', [twa.iconUrl, twa.maskableIconUrl, twa.monochromeIconUrl].every((u) => {
  if (!u.startsWith(`${BASIS}/pictogrammen/`)) return false;
  try { return statSync(join(wortel, new URL(u).pathname)).size > 0; } catch { return false; }
}));
check('meldingen aan (de herinneringen voor deadlines), portret, sleutel met alias upload',
  twa.enableNotifications === true && twa.orientation === 'portrait' && twa.signingKey.alias === ALIAS && twa.display === web.display);

// ---- 2. het project ----------------------------------------------------------------------
{
  const gradle = lees('android', 'app', 'build.gradle');
  check('applicationId, domein en start in build.gradle', gradle.includes(`applicationId: '${ANDROID.pakket}'`)
    && gradle.includes(`hostName: '${twa.host}'`) && gradle.includes("launchUrl: '/app/'"));
  const sdk = (naam) => Number(new RegExp(`${naam}\\s+(\\d+)`).exec(gradle)?.[1]);
  check('Android 16 (API 36): verplicht voor nieuwe apps in de Play Store sinds 31 augustus 2026',
    sdk('targetSdkVersion') >= 36 && sdk('compileSdkVersion') >= 36, `${sdk('targetSdkVersion')} ${sdk('compileSdkVersion')}`);
  // androidbrowserhelper 2.7.4 vraagt Android 7 (API 24); Bubblewrap vult
  // standaard nog 21 in, en daarop zakte de tweede build op GitHub.
  check('minimaal Android 7 (API 24), zoals androidbrowserhelper vraagt, en gelijk aan twa-manifest.json',
    sdk('minSdkVersion') >= 24 && sdk('minSdkVersion') === twa.minSdkVersion, String(sdk('minSdkVersion')));
  check('een versienaam (appVersion in twa-manifest.json, niet appVersionName)',
    /^\d+\.\d+\.\d+$/.test(twa.appVersion) && gradle.includes(`versionName "${twa.appVersion}"`) && !('appVersionName' in twa));
  check('het versienummer komt van buitenaf (-PversieCode), zonder haakjes direct na versionCode (Groovy leest dat als aanroep)',
    /versionCode Integer\.parseInt\(String\.valueOf\(project\.findProperty\('versieCode'\) \?: '1'\)\)/.test(gradle)
      && !/versionCode \(/.test(gradle));
  check('ondertekenen alleen met de uploadsleutel uit de workflow, nooit met een sleutel in de repo',
    /def sleutel = System\.getenv\('ANDROID_SLEUTEL_PAD'\)/.test(gradle) && /if \(sleutel\) signingConfig signingConfigs\.upload/.test(gradle)
      && !/storePassword ['"]/.test(gradle) && /\*\.p12/.test(lees('android', '.gitignore')));
  check('pasAan() twee keer draaien verandert niets', pasAan(gradle) === gradle);
  check('geen jcenter meer', !/jcenter\(\)/.test(lees('android', 'build.gradle') + gradle));
  check('de koppeling met het domein in strings.xml', lees('android', 'app', 'src', 'main', 'res', 'values', 'strings.xml')
    .includes(`\\"site\\": \\"${BASIS}\\"`));
  const am = lees('android', 'app', 'src', 'main', 'AndroidManifest.xml');
  check('meldingen mogen (Android 13 en later) en gaan via de app', am.includes('android.permission.POST_NOTIFICATIONS')
    && am.includes('android:name=".DelegationService"') && am.includes('TRUSTED_WEB_ACTIVITY_SERVICE'));
  check('links naar het domein openen in de app (autoVerify)', /<intent-filter android:autoVerify="true">[\s\S]*?android:host="@string\/hostName"/.test(am));
  const modus = execFileSync('git', ['ls-files', '-s', '--', 'android/gradlew'], { cwd: wortel, encoding: 'utf8' }).split(' ')[0];
  check('gradlew is uitvoerbaar (ook in git)', (statSync(join(wortel, 'android', 'gradlew')).mode & 0o111) !== 0
    && (modus === '' || modus === '100755'), modus);
  const winkelIcoon = afmetingenPng(join(wortel, 'android', 'store_icon.png'));
  check('het icoon voor de winkel is 512 bij 512 met doorzichtigheid', winkelIcoon.join() === '512,512,6', winkelIcoon.join());
}
function afmetingenPng(pad) {
  const d = readFileSync(pad);
  return [d.readUInt32BE(16), d.readUInt32BE(20), d[25]];
}

// ---- 3. assetlinks.json --------------------------------------------------------------------
{
  const links = JSON.parse(lees('.well-known', 'assetlinks.json'));
  check('.well-known/assetlinks.json zegt wat site/android.mjs zegt', links.length === 1
    && links[0].relation.join() === 'delegate_permission/common.handle_all_urls'
    && links[0].target.namespace === 'android_app' && links[0].target.package_name === ANDROID.pakket
    && JSON.stringify(links[0].target.sha256_cert_fingerprints) === JSON.stringify(ANDROID.vingerafdrukken));
  check('elke vingerafdruk is een SHA-256 (AA:BB:...)',
    ANDROID.vingerafdrukken.every((v) => /^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/.test(v)));
  check('en hij komt online, het project niet', gepubliceerd('.well-known/assetlinks.json') && !gepubliceerd('android/twa-manifest.json'));
  check('de link naar de winkel is er nog niet, of een link naar de Play Store',
    ANDROID.winkel === null || ANDROID.winkel === `https://play.google.com/store/apps/details?id=${ANDROID.pakket}`);
}

// ---- 4. de workflow -------------------------------------------------------------------------
{
  const wf = lees('.github', 'workflows', 'android.yml');
  const pr = /pull_request:\n\s+paths:\n((?:\s+- '[^']+'\n)+)/.exec(wf)?.[1] ?? '';
  check('een pull request die android/ raakt bouwt het project', pr.includes("'android/**'"));
  check('ondertekenen alleen op main, nooit bij een pull request',
    wf.includes("ONDERTEKENEN: ${{ github.event_name != 'pull_request' && github.ref == 'refs/heads/main' }}"));
  const sleutelStap = /- name: Uploadsleutel\n([\s\S]*?)\n\n/.exec(wf)?.[1] ?? '';
  check('de secrets alleen in de stap van de sleutel, en die alleen bij ondertekenen',
    sleutelStap.includes("if: env.ONDERTEKENEN == 'true'") && sleutelStap.includes('secrets.SUPABASE_KEY')
      && (wf.match(/\$\{\{ secrets\./g) ?? []).length === 2);
  check('de handtekening van de .aab en de .apk wordt nagelopen', /keytool -printcert -jarfile "\$AAB"/.test(wf) && /apksigner" verify/.test(wf));
  check('met het openbare certificaat erbij, voor een reset van de sleutel', /keytool -exportcert -rfc/.test(wf) && /uit\/uploadcertificaat\.pem/.test(wf));
  check('één run tegelijk (de eerste maakt de sleutel)', /concurrency:\n\s+group: android-/.test(wf) && /cancel-in-progress: false/.test(wf));
  check('de .aab en de winkel als bijlage, 30 dagen', /name: predicttherace-android-/.test(wf) && /name: predicttherace-winkel-/.test(wf)
    && (wf.match(/retention-days: 30/g) ?? []).length === 2);
  check('het versienummer is het aantal commits (loopt alleen op)', /fetch-depth: 0/.test(wf) && /-PversieCode="\$VERSIE"/.test(wf));

  // Een merge door de automerge start "push" niet (GitHub start geen
  // workflows vanuit een push van een workflow); de automerge start de
  // workflow daarom zelf, voor dezelfde paden.
  const am = lees('.github', 'workflows', 'automerge.yml');
  const paden = (/push:\n\s+branches: \[main\]\n\s+paths:\n((?:\s+- '[^']+'\n)+)/.exec(wf)?.[1] ?? '')
    .match(/'[^']+'/g)?.map((p) => p.slice(1, -1)) ?? [];
  const re = new RegExp(/const android = \/(.+)\/;/.exec(am)?.[1] ?? '$^');
  const voorbeeld = (p) => p.replace('**', 'app/build.gradle');
  check('na een merge die de Android-app raakt start de automerge de workflow op main, voor dezelfde paden als push',
    /actions: write/.test(am) && /createWorkflowDispatch\(\{ owner, repo, workflow_id: 'android\.yml', ref: 'main' \}\)/.test(am)
      && paden.length >= 4 && paden.every((p) => re.test(voorbeeld(p))) && !re.test('site/teksten.mjs') && !re.test('app/index.html'),
    paden.join(' '));
}

// ---- 5. de winkeltekst ------------------------------------------------------------------------
{
  const codes = Object.keys(WINKEL.talen);
  check('de winkel in alle zeven talen van de site, met geldige taalcodes', codes.join() === TALEN.join()
    && codes.every((c) => /^[a-z]{2}-[A-Z]{2}$/.test(WINKEL.talen[c].taal))
    && new Set(codes.map((c) => WINKEL.talen[c].taal)).size === codes.length);
  check('de titel zonder "F1", een merk van een ander', WINKEL.titel === 'Predict the Race' && !/F1|Formul/i.test(WINKEL.titel));
  for (const c of TALEN) {
    const t = winkelTekst(c);
    check(`${c}: binnen de grenzen van de Play Console, zonder HTML`, fouten(t).length === 0
      && [...t.kort].length <= GRENZEN.kort && [...t.lang].length <= GRENZEN.lang,
      `${[...t.kort].length} / ${[...t.lang].length} tekens ${fouten(t).join(', ')}`);
    check(`${c}: uit de teksten van de site, met de disclaimer onderaan`, t.lang.startsWith(teksten[c].hero.sub)
      && t.lang.endsWith(teksten[c].voet.disclaimer) && teksten[c].functies.items.every(([kop]) => t.lang.includes(kop))
      && !/\?\.|:\./.test(t.lang));
  }
}

// ---- 6. de plaatjes --------------------------------------------------------------------------
{
  const map = mkdtempSync(join(tmpdir(), 'winkel-'));
  await schermafdrukken('nl', map);
  const bestanden = readdirSync(map).sort();
  check('vier schermafdrukken, op volgorde', bestanden.join() === SCHERMEN.map((s, i) => `${i + 1}-${s}.jpg`).join(), bestanden.join());
  check('elk 1080 bij 1920 (9:16)', bestanden.every((b) => afmetingen(join(map, b))?.join() === '1080,1920'),
    bestanden.map((b) => afmetingen(join(map, b))).join(' '));
  for (const c of TALEN) {
    const doel = join(map, `banner-${c}.jpg`);
    let melding = '';
    try { await banner(c, join(wortel, 'site', 'beeld', `races-${c}-donker.jpg`), doel); } catch (e) { melding = e.message; }
    check(`${c}: de banner is 1024 bij 500 en de kop past`, !melding && afmetingen(doel)?.join() === '1024,500', melding);
  }
}

process.exit(afronden() ? 0 : 1);
