// De mailsjablonen (docs/mail/) in zeven talen.
//
// Supabase rendert ze met Go-templates, en een kapotte {{ }} betekent dat de
// mail niet verstuurd wordt: dan kan niemand meer inloggen met een mailadres.
// Daarom rendert dit bestand elk sjabloon zelf, met een kleine renderer die
// precies het stukje Go-template kent dat de sjablonen gebruiken en alles
// daarbuiten weigert. Dat voor alle zeven talen, zonder taal, en met een taal
// die niet bestaat of geen tekst is (user_metadata kan een speler zelf zetten).
//
// Staat Go op de machine (op de runners van GitHub wel), dan rendert ook het
// echte html/template van Go ze, met dezelfde gevallen.
//
// En: de bestanden zijn precies wat scripts/mailsjablonen.mjs maakt.

import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakControle, wortel } from './hulp.mjs';
import { SJABLONEN, TALEN, maak } from '../scripts/mailsjablonen.mjs';

const { check, afronden } = maakControle('mailsjablonen in zeven talen');

// ---- de renderer ------------------------------------------------------------
// Kent: de regel bovenaan ($t), if/else if/else/end op `eq $t "xx"`, en de
// velden die Supabase meegeeft. Al het andere is een fout.
const BOVENAAN = '$t := printf "%v" (or .Data.taal "en")';
const VELDEN = ['.Token', '.TokenHash', '.NewEmail', '.Email', '.SiteURL'];

export function render(bron, gegevens) {
  const delen = bron.split(/(\{\{.*?\}\})/s);
  let $t = null;
  // Een stapel van takken: { actief, alGedaan }.
  const stapel = [];
  const aan = () => stapel.every((s) => s.actief);
  let uit = '';
  for (const [i, deel] of delen.entries()) {
    if (i % 2 === 0) {
      if (deel.includes('{{') || deel.includes('}}')) throw new Error(`losse accolades: ${deel.slice(0, 60)}`);
      if (aan()) uit += deel;
      continue;
    }
    const actie = deel.slice(2, -2).trim();
    let m;
    if (actie === BOVENAAN) {
      if (i !== 1 || stapel.length) throw new Error('$t hoort helemaal bovenaan');
      const v = gegevens.Data?.taal;
      $t = String(v === undefined || v === null || v === '' || v === false || v === 0 ? 'en' : v);
    } else if ((m = /^if eq \$t "([a-z]{2})"$/.exec(actie))) {
      if ($t === null) throw new Error('$t gebruikt voordat hij bestaat');
      stapel.push({ actief: $t === m[1], alGedaan: $t === m[1], else: false });
    } else if ((m = /^else if eq \$t "([a-z]{2})"$/.exec(actie))) {
      const s = stapel.at(-1);
      if (!s || s.else) throw new Error('else if zonder if');
      s.actief = !s.alGedaan && $t === m[1];
      s.alGedaan ||= s.actief;
    } else if (actie === 'else') {
      const s = stapel.at(-1);
      if (!s || s.else) throw new Error('else zonder if');
      s.actief = !s.alGedaan;
      s.else = true;
    } else if (actie === 'end') {
      if (!stapel.pop()) throw new Error('end zonder if');
    } else if (VELDEN.includes(actie)) {
      if (aan()) uit += gegevens[actie.slice(1)] ?? '';
    } else {
      throw new Error(`onbekende actie: {{ ${actie} }}`);
    }
  }
  if (stapel.length) throw new Error(`${stapel.length} if zonder end`);
  return uit;
}

// De renderer zelf: weigert wat hij moet weigeren.
const weigert = (bron) => { try { render(bron, { Data: {} }); return false; } catch { return true; } };
check('de renderer weigert een if zonder end, een losse }}, een onbekende actie en $t vóór de regel bovenaan',
  weigert(`{{ ${BOVENAAN} }}{{ if eq $t "nl" }}x`)
    && weigert(`{{ ${BOVENAAN} }}x }}`)
    && weigert(`{{ ${BOVENAAN} }}{{ .Data.taal }}`)
    && weigert('{{ if eq $t "nl" }}x{{ end }}')
    && weigert(`{{ ${BOVENAAN} }}{{ else }}{{ end }}`));

// ---- de bestanden -------------------------------------------------------------
const GEVALLEN = [...TALEN.map((t) => [t, t]), ['en', 'en'], ['geen taal', null],
                  ['een onbekende taal', 'xx'], ['een getal', 5]];
const gegevens = (taal) => ({ Data: taal === null ? {} : { taal }, Token: '123456',
                             TokenHash: 'hashvandemail', NewEmail: 'speler@voorbeeld.nl' });

for (const naam of Object.keys(SJABLONEN)) {
  const s = SJABLONEN[naam];
  const bron = readFileSync(join(wortel, 'docs', 'mail', naam), 'utf8');
  check(`${naam}: precies wat scripts/mailsjablonen.mjs maakt`, bron === maak(naam),
    'draai node scripts/mailsjablonen.mjs');

  const fouten = [];
  for (const [omschrijving, taal] of GEVALLEN) {
    const verwacht = typeof taal === 'string' && TALEN.includes(taal) ? taal : 'en';
    let html;
    try { html = render(bron, gegevens(taal)); } catch (e) { fouten.push(`${omschrijving}: ${e.message}`); continue; }
    const tekst = (t) => t.replace('{{ .NewEmail }}', 'speler@voorbeeld.nl');
    if (html.includes('{{') || html.includes('}}')) fouten.push(`${omschrijving}: er staat nog {{ }} in`);
    for (const veld of ['voorvertoning', 'kop', 'tekst', 'knop']) {
      if (!html.includes(tekst(s[veld][verwacht]))) fouten.push(`${omschrijving}: ${veld} niet in het ${verwacht}`);
    }
    // Geen tekst van een andere taal erbij. De knop en de voorvertoning
    // verschillen in elke taal, dus die zijn het bewijs.
    for (const ander of ['en', ...TALEN].filter((t) => t !== verwacht)) {
      if (html.includes(s.knop[ander]) || html.includes(s.voorvertoning[ander])) {
        fouten.push(`${omschrijving}: ook tekst in het ${ander}`);
      }
    }
    if (!html.includes(`href="https://predicttherace.com/app/?token_hash=hashvandemail&amp;type=${s.soort}"`)) {
      fouten.push(`${omschrijving}: de knop gaat niet naar de app met de sleutel`);
    }
    if (s.code !== html.includes('>123456</div>')) fouten.push(`${omschrijving}: de code ${s.code ? 'ontbreekt' : 'staat erin'}`);
    if (naam === 'mailadres-koppelen.html' && !html.includes('speler@voorbeeld.nl')) {
      fouten.push(`${omschrijving}: het nieuwe adres staat er niet in`);
    }
  }
  check(`${naam}: rendert in alle zeven talen, zonder taal en met een vreemde taal, elk in de juiste taal`,
    fouten.length === 0, fouten.join(' · '));
  check(`${naam}: het onderwerp is kort en Engels (Supabase kent daar geen {{ if }})`,
    !s.onderwerp.includes('{{') && s.onderwerp.length <= 50 && /Predict the Race/.test(s.onderwerp));
}

// ---- met Go zelf, als dat er is ---------------------------------------------------
let go = null;
try { execFileSync('go', ['version'], { stdio: 'ignore' }); go = 'go'; } catch { /* geen Go */ }
if (go) {
  const map = mkdtempSync(join(tmpdir(), 'mailsjablonen-'));
  writeFileSync(join(map, 'go.mod'), 'module mailsjablonen\n\ngo 1.18\n');
  writeFileSync(join(map, 'main.go'), `package main

import (
	"fmt"
	"html/template"
	"os"
	"strings"
)

// Rendert elk bestand met html/template, zoals Supabase, en drukt per geval
// de voorvertoning af. Een parse- of uitvoerfout eindigt met exitcode 1.
func main() {
	gevallen := []map[string]interface{}{nil, {}, {"taal": "nl"}, {"taal": "de"}, {"taal": "fr"},
		{"taal": "es"}, {"taal": "it"}, {"taal": "pt"}, {"taal": "en"}, {"taal": "xx"}, {"taal": 5}}
	for _, pad := range os.Args[1:] {
		b, _ := os.ReadFile(pad)
		t, err := template.New(pad).Parse(string(b))
		if err != nil { fmt.Println("FOUT", err); os.Exit(1) }
		for _, d := range gevallen {
			var uit strings.Builder
			err := t.Execute(&uit, map[string]interface{}{"Data": d, "Token": "123456",
				"TokenHash": "hashvandemail", "NewEmail": "speler@voorbeeld.nl"})
			if err != nil { fmt.Println("FOUT", err); os.Exit(1) }
			s := uit.String()
			i := strings.Index(s, "color:#f2f1ee;\\">")
			j := strings.Index(s[i:], "</div>")
			fmt.Println(s[i+16 : i+j])
		}
	}
}
`);
  const bestanden = Object.keys(SJABLONEN).map((n) => join(wortel, 'docs', 'mail', n));
  let uit = '';
  try {
    uit = execFileSync(go, ['run', '.', ...bestanden], { cwd: map, encoding: 'utf8',
      env: { ...process.env, GOFLAGS: '-mod=mod', GOTOOLCHAIN: 'local' } });
  } catch (e) { uit = `FOUT ${e.stdout ?? ''} ${e.message}`; }
  const regels = uit.trim().split('\n');
  const verwacht = Object.values(SJABLONEN).flatMap((s) =>
    [null, null, ...TALEN, 'en', 'xx', 5].map((t) => s.voorvertoning[TALEN.includes(t) ? t : 'en']));
  check('Go (html/template) rendert alle drie, ook zonder metadata en met een getal als taal, elk in de juiste taal',
    !uit.includes('FOUT') && JSON.stringify(regels) === JSON.stringify(verwacht),
    uit.includes('FOUT') ? uit.slice(0, 300) : regels.filter((r, i) => r !== verwacht[i]).slice(0, 3).join(' | '));
} else {
  console.log('  (geen Go op deze machine: alleen de eigen renderer)');
}

process.exit(afronden() ? 0 : 1);
