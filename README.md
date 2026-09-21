# RacePicks

**Het F1-voorspelspel voor jou en je vrienden. Voorspel de grid, versla je
maten en win het weekend.**

Voor elke race voorspel je de top 10 van de kwalificatie en de top 10 van de
race, plus een paar losse vragen: wie wint, wie pakt pole, hoeveel safety cars.
Punten per plek: **5** exact, **3** één plek ernaast, **1** twee plekken
ernaast. De uitslagen komen automatisch binnen, dus niemand hoeft ze bij te
houden.

Gratis, geen wachtwoord, en er zit geen geld in — geen inleg, geen pot, geen
prijzen. Je speelt om de eer.

---

## Hoe het in elkaar zit

| | |
|---|---|
| **Frontend** | `index.html` — één bestand, geen bouwstap, geen framework |
| **Database** | Supabase (PostgreSQL), met row level security |
| **Uitslagen** | [OpenF1](https://openf1.org), opgehaald door een GitHub Action |
| **Hosting** | GitHub Pages, vanaf `main` |
| **Tests** | Playwright, die `index.html` in een echte browser naspeelt |

Dat eerste is een keuze en geen achterstand. De app is klein genoeg om in één
bestand te passen, en zolang dat zo is kost een wijziging geen build, geen
bundel en geen wachten. Zie `ROUTEKAART.md` voor de meting die bij die keuze
hoort, en wanneer hij vervalt.

## Zelf draaien

```bash
git clone https://github.com/DannydeVis/F1-Poule
cd F1-Poule
python3 -m http.server 8000      # of welke statische server dan ook
```

Open `http://localhost:8000`. Zonder Supabase-gegevens start de app in
demomodus met verzonnen data — genoeg om alle schermen te zien.

Voor een echte poule vervang je `SUPABASE_URL` en `SUPABASE_ANON_KEY` in
`index.html` (bovenaan het scriptblok) door die van je eigen project, en draai
je `schema.sql` in de SQL-editor van Supabase.
Die anon key hoort publiek te zijn; wat hem veilig maakt zijn de policies.
Zie `BEDIENING.md` §7.

## De vier SQL-bestanden

Van onschuldig naar onomkeerbaar:

| bestand | wat het doet |
|---|---|
| `diagnose.sql` | leest alleen, wijzigt niets |
| `schema.sql` | maakt en repareert de structuur; twee keer draaien mag |
| `leegmaken.sql` | gooit poules en spelers weg, laat de kalender staan |
| `reset.sql` | sloopt alle tabellen — alleen als `schema.sql` het niet meer rechttrekt |

## Tests

```bash
npm install --no-save playwright@1.56.1
npx playwright install --with-deps chromium
node test/draai-alles.mjs
```

Dat draait elk `test/*.test.mjs`-bestand in Chromium tegen een nagebootste
Supabase (`test/nabootsing-supabase.mjs`). De `*.test.sql`-bestanden draaien in
CI tegen een echte PostgreSQL 16; hoe dat gaat staat in
`.github/workflows/tests.yml`.

Elke pull request draait allebei. Een `claude/*`-branch wordt automatisch
gemergd zodra ze groen zijn — de controle blijft, alleen het wachten is weg.

## De documenten

| | |
|---|---|
| `BEDIENING.md` | hoe de app werkt: schermen, regels, rechten, privacy |
| `OVERDRACHT.md` | waaróm hij zo werkt — per wijziging wat de afweging was |
| `ROUTEKAART.md` | wat er nog kan, in fases, met wat het kost |

`OVERDRACHT.md` is de belangrijkste van de drie als je iets gaat veranderen.
Daar staat niet alleen wat er gebouwd is maar ook wat er onderweg misging, en
dat is meestal precies waar het de volgende keer weer mis kan gaan.

## Licentie

Geen. Dit is een privéproject voor een vriendenpoule; neem gerust ideeën over.
