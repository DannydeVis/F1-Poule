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
| `duel.test.mjs` | De onderlinge duels, vooral welke weekenden níét meetellen |
| `scorelijst.test.mjs` | De puntentelling, inclusief het cascade-geval waarvoor die formule is gekozen |
| `schema-gedrag.test.sql` | De deadline-trigger en het upsert-gedrag, tegen een echte PostgreSQL |
| `schema-herstel.test.sql` | Of een tweede run van `schema.sql` een beschadigde tabel opruimt |
| `oude-structuur.sql` + `-controle.sql` | Of `schema.sql` een oudere tabelopzet rechtzet zonder gegevens te raken (fout 42830) |

De browsertests draaien `index.html` echt in Chromium, met de import van
supabase-js vervangen door `nabootsing-supabase.mjs`: een kleine
nabootsing die net als Postgres een unieke sleutel op
`(pool_id, race_id, member_id)` afdwingt.

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
