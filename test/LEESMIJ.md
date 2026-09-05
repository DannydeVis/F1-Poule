# Tests

Deze map is er voor de CI op GitHub. **De poule zelf heeft geen npm of
build-stap nodig** — `index.html` en `sync.html` blijven bestanden die je
rechtstreeks in een browser opent. Wie geen Node kan installeren hoeft hier
dus niets mee te doen; GitHub draait het bij elke pull request vanzelf.
Hetzelfde geldt voor `scripts/sync.mjs`: dat draait op de runner, niet op
je eigen computer.

## Wat er getest wordt

| Bestand | Waarop |
|---|---|
| `voorspelling-bewaren.test.mjs` | De bug waarbij een opgeslagen voorspelling verdween na terugkeren naar het overzicht |
| `poule-onthouden.test.mjs` | Of de poule na herladen onthouden wordt, en of een bestaande naam intypen geen tweede speler aanmaakt |
| `ontbrekende-sleutel.test.mjs` | Of een database zonder de unieke sleutel een leesbare melding geeft in plaats van stille dubbele rijen |
| `uitslag-invoeren.test.mjs` | Handmatig een uitslag invullen: de vlag komt mee, en een bestaande uitslag wordt niet overschreven |
| `uitnodiging.test.mjs` | De link met `?code=`: hij wint van de onthouden poule, verdwijnt daarna uit de adresbalk, en een kapotte code zegt dat. Plus je eigen link met `&speler=`, waarmee je op een tweede toestel dezelfde speler bent |
| `duel.test.mjs` | De onderlinge duels tussen spelers, vooral welke weekenden níét meetellen |
| `winnaar.test.mjs` | De losse winnaar van 25 punten |
| `vraagsoorten.test.mjs` | De puntentelling van de losse vragen: vooral dat alleen invullen wat je weet niet minder oplevert dan alles gokken |
| `pole-en-duels.test.mjs` | Diezelfde twee in de app: kiezen, opslaan, terugzien, en dat één keuze per team blijft staan |
| `invulscherm.test.mjs` | Het keuzeblad: een plek aantikken en dán kiezen, P7 vóór P1 kunnen invullen, en dat een halve top 10 niet bewaard wordt |
| `afgelast.test.mjs` | Een race die niet doorgegaan is: hij zegt dat, is niet in te vullen, en een uitslag wint alsnog van de vlag |
| `uitslagen.test.mjs` | De vier losse uitslagen uit de gegevens van OpenF1: vooral welke berichten van de wedstrijdleiding wél en niet een safety car zijn |
| `duel-weergave.test.mjs` | Dat "jij" vaststaat aan je eigen cijfer in het onderlinge duel, en niet aan dat van de tegenstander |
| `inleg.test.mjs` | De inleg en het betaalverzoek: hoe een bedrag gelezen wordt, dat alleen http(s) als betaalknop doorkomt (ook uit de database), en het afvinken wie betaald heeft |
| `poules-en-omschrijving.test.mjs` | De omschrijving van een poule, en meer dan één poule op hetzelfde toestel: wisselen zonder de code, en een poule die weg is |
| `poule-aanmaken.test.mjs` | Het aanmaken in vier stappen: de presets, de losse vragen met hun live puntentotaal, de gokwaarschuwing, en wat er in de database belandt |
| `vragen-beheren.test.mjs` | De vragenset aanpassen onder Poule, en dat er niets meer verandert zodra hij op slot zit |
| `snelste.test.mjs` | De snelste ronde en de snelste pitstop, inclusief zelf invullen als OpenF1 ze niet heeft |
| `safetycar-en-vlag.test.mjs` | De laatste twee vragen, en vooral dat "nul" en "nee" echte antwoorden zijn |
| `scorelijst.test.mjs` | De puntentelling, inclusief het cascade-geval waarvoor die formule is gekozen |
| `vragen.test.sql` | De vragenlijst: dat de presets uit BEDIENING.md kloppen met de punten in de database, en dat vinkjes en antwoorden meegaan als een poule weggaat |
| `schema-gedrag.test.sql` | De deadline-trigger en het upsert-gedrag, tegen een echte PostgreSQL |
| `schema-herstel.test.sql` | Of een tweede run van `schema.sql` een beschadigde tabel opruimt |
| `oude-structuur.sql` + `-controle.sql` | Of `schema.sql` een oudere tabelopzet rechtzet zonder gegevens te raken (fout 42830) |

De browsertests draaien `index.html` echt in Chromium, met de import van
supabase-js vervangen door `nabootsing-supabase.mjs`: een kleine
nabootsing die net als Postgres een unieke sleutel afdwingt — op `answers`
is dat `(pool_id, race_id, member_id, question_id)`, één rij per ingevulde
vraag.

`uitslagen.test.mjs` is de enige die geen browser nodig heeft: die draait de
functies uit `scripts/uitslagen.mjs` op berichten die letterlijk uit OpenF1
komen. Ze staan los van `sync.mjs` omdat dat bestand zichzelf uitdraait zodra
je het importeert — een test die dat deed zou de echte database aanraken.

Naast deze tests staat er een verkenner: `scripts/verkennen.mjs`, met een knop
in het Actions-tabblad. Die schrijft niets weg en laat zien wat OpenF1 voor een
race heeft. Nodig omdat `api.openf1.org` niet vanaf elke plek bereikbaar is; op
een GitHub-runner wel. Draai hem als een uitslag niet binnenkomt: dan zie je of
OpenF1 hem niet heeft, of dat wij ernaast kijken.

De SQL-tests draaien tegen een echte PostgreSQL 16 in de workflow, dus
`schema.sql` wordt bij elke pull request daadwerkelijk uitgevoerd — twee keer
zelfs, om te controleren dat het opnieuw uit te voeren is.

## Zelf draaien

```sh
npm install --no-save playwright
npx playwright install chromium
node test/draai-alles.mjs
```

De SQL-tests hebben een PostgreSQL nodig met de rollen `anon` en
`authenticated`; zie `.github/workflows/tests.yml` voor de volgorde.
