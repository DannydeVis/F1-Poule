# Plan 1: SEO voor predicttherace.com

Opgesteld 26 september 2026, op basis van `DannydeVis/F1-Poule` (commit 6539651) en `DannydeVis/padel-toernooi`.

**Doel:** van 9 naar een kleine set sterke, indexeerbare pagina's die gevonden worden als iemand zoekt hoe je een F1-poule (Tippspiel, porra, bolão, pronostici) met vrienden opzet. Live en geïndexeerd ruim voor de zoekpiek rond de start van seizoen 2027 (februari en maart).

**Volgorde van de drie plannen:** 1 SEO (dit bestand, legt het fundament), 2 AEO (de antwoordvorm, toepassen tijdens SEO fase 2), 3 GEO (entiteit, eigen cijfers, vermeldingen, meten). GEO fase 0 kan meteen.

---

## Zo gebruik je dit in Claude Code

Eén fase per sessie en per branch. Plak dit als opdracht, met het plan erbij:

```
Lees het plan (docs/zoekplan/1-seo.md) helemaal.
Voer alleen Fase <nummer> uit, volgens de werkafspraken in het plan.
Stop daarna: draai node test/draai-alles.mjs, werk OVERDRACHT.md bij,
en geef een samenvatting: wat is gedaan, wat niet, en wat moet ik zelf doen.
```

Let op: zet de plannen pas in de repo (in `docs/zoekplan/`) nadat Fase 0.2 klaar is. Tot die tijd maakt GitHub Pages er waarschijnlijk openbare pagina's van op predicttherace.com. Tot dan: de tekst van de fase in de opdracht plakken.

---

## Uitgangssituatie

Staat er al, niet opnieuw bouwen:

- voorpagina in 7 talen: nl in de hoofdmap, en/de/fr/es/it/pt in eigen mappen, gemaakt door `scripts/maak-site.mjs` uit `site/teksten.mjs`
- canonical, wederkerige hreflang met x-default naar /en/, sitemap met hreflang en afbeeldingen, robots.txt, llms.txt, 404 op noindex, app en beheer op noindex
- JSON-LD als één `@graph` met `@id`'s: WebSite, Organization, WebPage, WebApplication, FAQPage, HowTo
- lokale zoektermen in de titels: F1-poule, F1-Tippspiel, pronostics F1, porra de F1, pronostici F1, bolão de F1
- `test/site.test.mjs` bewaakt titel- en omschrijvingslengte, één h1, canonical, hreflang, FAQ gelijk aan het scherm, geen externe bronnen, contrast en 360 pixels
- domein live sinds 24 september 2026, Search Console (domeinproperty) en Bing Webmaster Tools gekoppeld, sitemap ingediend, GA4 alleen na toestemming

Wat ontbreekt:

- **Breedte.** 9 indexeerbare URL's: 7 voorpagina's en 2 privacypagina's. Eén pagina per taal doet maar op een handvol zoektermen mee.
- **Autoriteit.** Nieuw domein, vrijwel geen links. Bij padel-bracket.com kwamen na drie maanden vooral klikken op de merknaam binnen: de rem was autoriteit, niet het aantal talen. Daarom hier eerst een paar sterke pagina's in NL en EN plus distributie (GEO-plan fase 5), en pas daarna meer talen.
- **Concurrentie.** In het Engels druk: onder meer Superbru, F1 Fantasy, GridRival, Kicktipp en Podium Prophets (die bijna hetzelfde doet: top 10 van kwalificatie en race, punten voor exact en bijna goed). In het Nederlands poules.com en GP Poule. De lokale long tail ("F1 poule excel", "F1 Tippspiel erstellen") is dunner bezet.
- **Zoekvolumes heb ik niet kunnen meten.** Valideer met Google Trends of Keyword Planner voordat je een taal of paginasoort uitbouwt.

Van padel-bracket.com overnemen:

- de paginasoorten: gidsen, een about-pagina, een vergelijkingspagina, vertaalde pagina's met hreflang per cluster (zie de functie `add()` met `cluster` in `scripts/gen-sitemap.mjs` van padel-toernooi)
- een IndexNow-sleutel in de hoofdmap
- de les over interne links: de blog van padel stond in juni los van de rest (geen links ernaartoe, niet in de sitemap)

Niet overnemen, want predicttherace.com doet het al beter:

- de robots.txt van padel (die noemt "GoogleExtendedBot" en "anthropic-ai", zie de bijlage van het GEO-plan)
- losse JSON-LD-blokken zonder `@id`, de keywords-meta, automatische taal-doorverwijzing, Google Fonts

---

## Werkafspraken voor Claude Code (elke fase)

1. Nooit gegenereerde HTML met de hand aanpassen. Tekst en structuur in `site/*.mjs`, vorm in `scripts/maak-site.mjs`, daarna `node scripts/maak-site.mjs`.
2. Elke nieuwe regel krijgt een check in `test/site.test.mjs`. Alles groen voordat je stopt: `node test/draai-alles.mjs`.
3. Feiten over de app (punten, vragen, presets, deadlines, automatisch invullen) komen uit `app/index.html`, zoals nu via `PUNTEN` en `PRESET_VRAGEN`. Nooit overtypen.
4. Alles wat een zoekmachine moet lezen staat in de HTML, niet achter JavaScript. Geen externe scripts, lettertypen of plaatjes.
5. Na elke fase: afweging en valkuilen in `OVERDRACHT.md`, status in `ROUTEKAART.md`, handmatige stappen in `BEDIENING.md`.
6. Nederlandse namen in de code, zoals in de rest van de repo.
7. Geen en-dash of em-dash in nieuwe teksten, titels of commentaar. Gebruik een dubbele punt, een komma of " | ".
8. Eén fase per branch. `claude/*` wordt automatisch gemergd bij groene tests, dus de tests zijn het enige vangnet.

---

## Fase 0: hygiëne en nulmeting (klein, eerst doen)

### 0.1 Redirects nalopen

Met `curl -sI` (of in de browser als Claude Code geen netwerk heeft):

- `https://dannydevis.github.io/F1-Poule/` geeft een 301 naar `https://predicttherace.com/`
- `http://predicttherace.com/` en `https://www.predicttherace.com/` komen uit op `https://predicttherace.com/`

Alleen rapporteren. Niets aanpassen als het klopt.

### 0.2 Interne documenten niet als pagina publiceren

De repo heeft geen `.nojekyll` en geen `_config.yml`, en de site komt rechtstreeks van `main`. Dan draait GitHub Pages Jekyll, en die maakt van losse `.md`-bestanden standaard HTML-pagina's. Waarschijnlijk staan `ROUTEKAART.md`, `BEDIENING.md`, `OVERDRACHT.md` en `test/LEESMIJ.md` dus als pagina op je domein.

- Eerst controleren: `https://predicttherace.com/ROUTEKAART.html` en `https://predicttherace.com/ROUTEKAART`.
- Staan ze er: voeg `_config.yml` toe met een `exclude` voor de documenten, `docs/`, `test/`, `scripts/`, de `.sql`-bestanden en `site/*.mjs`. Niet `site/og/` en `site/beeld/`: die plaatjes zijn nodig.
- Na de deploy nalopen: die URL's geven 404, en de rest werkt precies als eerst (plaatjes, lettertypen, app, `sw.js`, `kalender.ics`, manifest, beheer).
- Test toevoegen: elk `.md`-bestand in de repo valt onder de exclude, zodat een nieuw document nooit per ongeluk online komt.
- Alternatief als Jekyll dwarsligt: `.nojekyll`. Dan komen de `.md`-bestanden als platte tekst online in plaats van als pagina. Minder netjes.

### 0.3 Titels: zoekterm eerst, merk achteraan

Google toont de sitenaam al apart boven het resultaat. Een merk dat nog niemand kent trekt minder klikken dan de zoekterm zelf. Pas `titel` en `ogTitel` in `site/teksten.mjs` aan, en de titel van de 404:

| taal | nieuwe titel | tekens |
|---|---|---|
| nl | Gratis F1-poule met je vrienden \| Predict the Race | 50 |
| en | Free F1 prediction game for friends \| Predict the Race | 54 |
| de | Kostenloses F1-Tippspiel mit Freunden \| Predict the Race | 56 |
| fr | Pronostics F1 gratuits entre amis \| Predict the Race | 52 |
| es | Porra de F1 gratis con tus amigos \| Predict the Race | 52 |
| it | Pronostici F1 gratis con gli amici \| Predict the Race | 53 |
| pt | Bolão de F1 grátis com seus amigos \| Predict the Race | 53 |

Allemaal binnen de 30 tot 65 tekens die de test eist. `ogTitel` mag de huidige tekst houden, met een dubbele punt in plaats van het streepje: "Predict the Race: voorspel de grid, versla je vrienden".

### 0.4 Sitenaam

Zet `alternateName: ['PredictTheRace', 'predicttherace.com']` op `WebSite` en `Organization`. Google gebruikt de WebSite-gegevens van de voorpagina voor de sitenaam in de resultaten.

### 0.5 lastmod per pagina

Nu krijgt elke URL `BIJGEWERKT`. Maak het per pagina:

- bewaar per URL een hash van de inhoud (zonder de datum zelf) en een datum in `site/lastmod.json`
- verandert de hash bij `node scripts/maak-site.mjs`, dan wordt de datum vandaag
- `--controle` verandert nooit iets en zakt als een hash niet meer klopt
- dezelfde datum wordt `dateModified` in de JSON-LD van die pagina

Een sitemap waarin alles tegelijk "gewijzigd" is, zegt een zoekmachine niets.

### 0.6 Handmatig (Danny)

- Search Console: URL-inspectie op `/` en `/en/`, "Indexering aanvragen". In het rapport Pagina's noteren hoeveel URL's geïndexeerd zijn.
- Bing Webmaster Tools: sitemapstatus en URL-inspectie op dezelfde twee.
- Nulmeting (geïndexeerd, vertoningen, klikken, top 10 zoekopdrachten) in `docs/zoekplan/meting.md`. Claude Code maakt het lege sjabloon, met een blok voor SEO, AEO en GEO.

**Klaar als:** tests groen, titels zoals in de tabel, elke URL in de sitemap heeft een eigen lastmod, de interne documenten geven 404 op het domein.

---

## Fase 1: de generator klaarmaken voor meer paginasoorten

Doel: een nieuwe pagina toevoegen is alleen nog data invullen. Geen gekopieerde HTML.

### 1.1 Datamodel

Nieuw bestand `site/paginas.mjs`:

```js
// Eén item per onderwerp. Het id is gelijk over alle talen: dat is het
// hreflang-cluster. Een taal die er niet is, staat er niet in.
export const PAGINAS = [
  {
    id: 'organiseren',
    soort: 'gids',              // gids | over | vergelijking | data | race
    verwant: ['puntentelling', 'excel'],
    talen: {
      nl: {
        pad: 'f1-poule-organiseren',
        titel: 'F1-poule organiseren in 5 minuten | Predict the Race',
        omschrijving: '...',    // 110 tot 165 tekens, zoals de test al eist
        kop: 'Een F1-poule organiseren',
        kort: '...',            // kort antwoord bovenaan, zie het AEO-plan
        secties: [],            // { vraag, id, kort, tekst, stappen?, tabel?, voorbeeld? }
        faq: [],                // [vraag, antwoord]
      },
      en: { pad: 'en/how-to-run-an-f1-prediction-league', /* ... */ },
    },
  },
];
```

### 1.2 Eén sjabloon voor alle artikelpagina's

`artikelPagina(pagina, code)` in `maak-site.mjs`, met dezelfde CSS-tokens, kop, taalmenu en voet als de voorpagina. Vaste volgorde:

1. kruimelpad (Home, Gidsen, titel)
2. h1, precies één
3. kort antwoord (component `vraagBlok` uit het AEO-plan)
4. secties: vraag als h2, kort antwoord, dan uitleg, stappen als `<ol>`, tabel als `<table>` met `<th scope>`, of een rekenvoorbeeld
5. FAQ, alleen met vragen die niet al op een andere pagina staan
6. "Lees ook": de `verwant`-pagina's in dezelfde taal
7. blok met de knop naar de app
8. zichtbaar "Bijgewerkt op", gelijk aan `dateModified`

Het taalmenu op een artikelpagina toont alleen de talen die in het cluster bestaan.

### 1.3 Paden op elke diepte

`voor(code)` en `naar()` gaan nu uit van diepte 0 of 1. Maak ze afhankelijk van het pad: `/en/races/2026/singapore/` is diepte 4. Houd de relatieve paden aan zoals nu, en leg de keuze vast in `OVERDRACHT.md`.

### 1.4 hreflang per cluster

Alleen de talen die voor dat `id` bestaan, wederkerig binnen het cluster. x-default is `en` als die bestaat, anders `nl`. In de HTML en in de sitemap precies hetzelfde. De bestaande test "elke pagina heeft precies dezelfde hreflang-set" wordt: "elke pagina in een cluster heeft dezelfde set".

### 1.5 JSON-LD per pagina

Dezelfde `@graph`-aanpak als de voorpagina, met verwijzingen naar de bestaande `@id`'s:

- `WebPage` (of `AboutPage`, `CollectionPage`) met `isPartOf: {@id: '<BASIS>/#website'}`, `about: {@id: '<BASIS>/#app'}`, `inLanguage`, `dateModified`
- `BreadcrumbList`
- voor gidsen `Article` met `headline`, `datePublished`, `dateModified`, `author: {@id: '<BASIS>/#maker'}`, `publisher: {@id: '<BASIS>/#organisatie'}`
- `FAQPage` alleen als de FAQ zichtbaar op de pagina staat, woord voor woord, zoals nu
- `Person` met `@id: '<BASIS>/#maker'` één keer volledig op de about-pagina, elders alleen als verwijzing. Zet ook `Organization.founder` en `WebApplication.author` op die verwijzing, zodat de graaf aan elkaar vast zit.

Verwacht hier geen rich results van. Het gaat om begrip.

### 1.6 Interne links, geen weespagina's

- Voorpagina per taal: links naar alle artikelpagina's in die taal. Liefst in de tekst waar het past (bij de puntentabel: "Welk puntensysteem is het eerlijkst?"), plus een lijst in de voet. Let op de bestaande test op de sectienummering (01, 02 en verder zonder gat) als je een sectie toevoegt.
- Elke artikelpagina linkt naar de voorpagina in haar taal, naar de app en naar 2 of 3 verwante pagina's.
- Nieuwe test: elke URL in de sitemap wordt vanaf minstens één andere gegenereerde pagina gelinkt.

### 1.7 Sitemap en llms.txt

- sitemap: alle pagina's uit `PAGINAS`, met hreflang per cluster en lastmod uit fase 0.5
- llms.txt: een sectie "Guides" met de Engelse URL's en de andere talen erachter (details in GEO-plan fase 2)

### 1.8 Tests uitbreiden

Wat nu per voorpagina gecontroleerd wordt, geldt voortaan voor elke gegenereerde pagina: taal, titel 30 tot 65 tekens, omschrijving 110 tot 165, één h1, canonical naar zichzelf, indexeerbaar, hreflang per cluster, geldige JSON-LD, FAQ gelijk aan het scherm, kruimelpad klopt, interne links bestaan, niets van buiten, contrast licht en donker, geen horizontale scroll op 360 pixels. Nieuw: niet wees, en de zichtbare datum is gelijk aan `dateModified`.

**Klaar als:** de gids "organiseren" (NL en EN, uit fase 2) staat online via alleen data in `site/paginas.mjs`, en alles is groen.

---

## Fase 2: kernpagina's in NL en EN (oktober tot half november 2026)

Schrijfregels (de volledige antwoordvorm staat in het AEO-plan):

- Open met het antwoord, niet met een inleiding.
- Eigen ervaring en eigen cijfers boven algemene tips. Google noemt dat "non-commodity content" en zegt dat dit op lange termijn het meeste uitmaakt, ook voor AI Overviews en AI Mode. De les uit `ROUTEKAART.md` over wat vriendenpoules kapotmaakt (een onbereikbare achterstand, vergeten in te vullen, geen reden om terug te komen) is precies zulke inhoud.
- Eén sterke pagina per taak, niet één per zoekvariant. Google's spambeleid over "scaled content" gaat precies daarover.
- NL en EN elk zelf schrijven, niet de een uit de ander vertalen. Danny leest beide voor publicatie.

| id | NL | EN | zoekintentie | kern van de inhoud |
|---|---|---|---|---|
| organiseren | /f1-poule-organiseren/ | /en/how-to-run-an-f1-prediction-league/ | F1 poule maken of organiseren; how to run an F1 prediction league | stappen; keuzes (puntentelling, deadlines, jokers, vergeten in te vullen, sprint); de drie valkuilen en wat ertegen helpt (weekendwinnaar, agenda-abonnement, onderlinge duels); checklist. In de NL-versie ook het Vlaamse woord "pronostiek" |
| puntentelling | /f1-poule-puntentelling/ | /en/f1-prediction-scoring-system/ | F1 poule puntentelling; F1 prediction scoring system | vier systemen vergeleken (alleen exact, afstand 5/3/1, F1-punten, bonusvragen) met voor en tegen; een volledige top 10 doorgerekend; waarom punten voor bijna goed eerlijker zijn; de niveaus uit `PRESET_PUNTEN` (100, 145, 202); later de cijfers uit GEO-plan fase 3 |
| excel | /f1-poule-excel/ | /en/f1-prediction-league-spreadsheet/ | F1 poule excel; F1 prediction spreadsheet | eerlijk laten zien hoe het in Excel of Google Sheets kan (kolommen en formule), waar het misgaat (uitslagen overtypen, straffen achteraf, deadlines, discussie), en dan de app. De formule is die van `scoreLijst()`: NL-Excel `=MAX(0;5-2*ABS(B2-C2))`, Engels `=MAX(0,5-2*ABS(B2-C2))`. Kijk hoe de app een coureur buiten de top 10 of een uitvaller telt en zeg dat in de tekst. Optioneel een sjabloon om te downloaden, als linkmagneet |
| over | /over/ | /en/about/ | wie maakt Predict the Race; vertrouwen | wie (Danny de Visser, Rotterdam, ook maker van PadelBracket), waarom (de eigen vriendenpoule), hoe het gratis blijft (GitHub Pages, Supabase, geen advertenties), waar de uitslagen vandaan komen (OpenF1), privacy in één alinea, broncode, contact. `AboutPage` met volledige `Person` |
| vergelijking | /f1-poule-apps-vergeleken/ | /en/f1-prediction-games-compared/ | F1 Fantasy alternatief; best F1 prediction game for friends | bovenaan eerlijk zeggen dat de maker van Predict the Race dit schreef; tabel (gratis, account nodig, wat voorspel je, uitslagen automatisch, extra vragen, talen, advertenties); per alternatief "wanneer past dat beter"; datum van controle. NL: F1 Fantasy, poules.com, GP Poule, Superbru, Excel. EN: F1 Fantasy, Superbru, GridRival, Kicktipp, Podium Prophets, spreadsheet. Elk feit over een ander checken op diens eigen site; wat je niet kunt checken laat je weg |

Titelvoorstellen (allemaal 30 tot 65 tekens):

| id | NL | EN |
|---|---|---|
| organiseren | F1-poule organiseren in 5 minuten \| Predict the Race | How to run an F1 prediction league \| Predict the Race |
| puntentelling | Puntentelling voor een F1-poule \| Predict the Race | F1 prediction scoring systems explained \| Predict the Race |
| excel | F1-poule bijhouden in Excel \| Predict the Race | F1 prediction league spreadsheet \| Predict the Race |
| over | Over Predict the Race: wie het maakt en waarom | About Predict the Race: who makes it and why |
| vergelijking | F1-poule-apps vergeleken \| Predict the Race | F1 prediction games compared \| Predict the Race |

Vanaf januari 2027: zet "2027" in titel en kop van organiseren en puntentelling, en werk de inhoud echt bij (niet alleen het jaartal). Geen aparte jaarpagina's.

Na livegang (Danny): in Search Console per nieuwe URL "Indexering aanvragen". Er zit een daglimiet op van ongeveer 10, dus spreid het over een paar dagen, belangrijkste eerst.

**Klaar als:** 10 pagina's live, elk met een kort antwoord bovenaan, minstens één tabel of rekenvoorbeeld waar het past, 2 of 3 interne links, een knop naar de app, en alles groen.

---

## Fase 3: IndexNow

Bing en een paar kleinere zoekmachines doen mee aan IndexNow, Google niet. Via Bing pikken ook Copilot en deels de zoekfunctie van ChatGPT nieuwe pagina's sneller op.

1. Maak een eigen sleutel (32 hex-tekens) als constante in `site/teksten.mjs`, en laat `maak-site.mjs` het bestand `<sleutel>.txt` in de hoofdmap schrijven met de sleutel als inhoud. Zo bewaakt `--controle` het. Padel doet hetzelfde; gebruik niet dezelfde sleutel.
2. `scripts/indexnow.mjs`: krijgt een lijst gewijzigde bestanden, maakt er URL's van (alleen `index.html` van indexeerbare pagina's plus `sitemap.xml`, nooit `app/`, `beheer/` of `404.html`) en stuurt één POST naar `https://api.indexnow.org/indexnow` met `host`, `key`, `keyLocation` en `urlList`. Met `--droog` alleen tonen.
3. `.github/workflows/indexnow.yml`: draait nadat GitHub Pages klaar is met deployen (zoek uit welke trigger in deze repo werkt, `page_build` of `deployment_status` voor `github-pages`), bepaalt welke HTML-bestanden in die push veranderden en roept het script aan. De sync commit vaak `kalender.ics`: zulke commits pingen niets.
4. Test voor de omzetting van pad naar URL.
5. Danny: in Bing Webmaster Tools onder IndexNow kijken of de pings binnenkomen.

---

## Fase 4: pilot met race-weekendpagina's (oktober tot december 2026)

Pas beginnen als fase 1 tot en met 3 staan. Pilot met de laatste zeven races van 2026: Singapore, Austin, Mexico-Stad, São Paulo, Las Vegas, Qatar en Abu Dhabi. Alleen NL en EN.

Waarom het de moeite kan zijn: rond elk raceweekend zoeken mensen naar voorspellingen voor die race. Waarom het mis kan gaan: F1.com en de grote sites winnen de algemene vragen altijd (hoe laat begint de race), en dunne pagina's per race vallen onder "scaled content". Dus alleen met inhoud die elders niet zo staat, en met een stopcriterium.

Inhoud per race (NL `/races/2026/singapore/`, EN `/en/races/2026/singapore/`):

- tijden van kwalificatie, sprint en race, met de deadlines om te voorspellen (dezelfde bron als `kalender.ics`); tijden in UTC plus Nederlandse tijd op de NL-pagina; een klein script mag ze omzetten naar de tijd van de bezoeker, de vaste tekst blijft staan
- de top 10 van kwalificatie en race van vorig jaar
- circuitcijfers voor de extra vragen: safety cars, virtuele safety cars en rode vlaggen per editie sinds 2023 (OpenF1 `race_control`, zie GEO-plan fase 3.2)
- na de race de uitslag, en later hoe de spelers voorspelden (GEO-plan fase 3.3)
- knop "Voorspel de GP van Singapore" naar de app
- JSON-LD `SportsEvent` (naam, start, eind, plaats) voor begrip, zonder rich result te verwachten
- per seizoen een overzicht: `/races/` en `/en/races/` (`CollectionPage` met `ItemList`)

Data:

- `scripts/maak-racedata.mjs` haalt OpenF1 op en schrijft `site/data/races-2026.json` in de repo. `maak-site.mjs` leest alleen die JSON, zodat `--controle` offline en reproduceerbaar blijft.
- Verversen na elk raceweekend: in de sync-workflow of een eigen workflow `maak-racedata` en `maak-site` draaien en committen. Leg in `OVERDRACHT.md` vast hoe sync en site nu aan elkaar vastzitten.
- Drempel: geen pagina zonder schema en zonder vorige editie. Liever geen pagina dan een lege.
- Controleer de telling van safety cars en rode vlaggen voor een paar races tegen een tweede bron voordat je publiceert.
- Houd je aan de voorwaarden en limieten van OpenF1: ophalen in een script en cachen in de repo, nooit per bezoeker.

**Stopcriterium:** 4 tot 6 weken na de eerste racepagina in Search Console kijken. Geen vertoningen? Niet uitrollen naar 2027, de pilotpagina's laten staan als archief. Wel vertoningen? In januari de pagina's voor 2027 klaarzetten zodra die kalender in de database staat (`scripts/seizoenen.mjs` haalt hem op).

---

## Fase 5: meer talen, alleen waar de data het zegt (vanaf december 2026)

- Search Console, Prestaties, Landen: waar krijgen de voorpagina's in de/fr/es/it/pt vertoningen? Begin met de taal met de meeste.
- Vertaal dan eerst organiseren en puntentelling, daarna excel (F1 Tippspiel Excel, porra F1 Excel, bolão F1 planilha, pronostici F1 Excel, pronostics F1 Excel).
- Lokaliseren, niet letterlijk vertalen: de eigen woorden (Tippspiel en Tipprunde; porra, en in Latijns-Amerika quiniela; pronostici; pronostics; bolão), lokale concurrenten (Kicktipp in Duitsland), en Excel-formules per taal (functienamen en scheidingstekens verschillen, controleer het per taal).
- Per taal een moedertaalspreker laten meelezen. Zonder die check liever niet publiceren.
- De app zelf is er alleen in NL en EN. Zeg dat eerlijk op die pagina's, zoals de FAQ nu al doet.

---

## Fase 6: links

Voor een nieuw domein de grootste hefboom. De volledige lijst met acties, prioriteit en timing staat in GEO-plan fase 5, want vermeldingen en links zijn daar hetzelfde werk. Voor SEO telt vooral: links van sites over F1 of apps, en een link vanaf de about-pagina van padel-bracket.com (niet sitebreed).

---

## Meten

| waar | wat | wanneer |
|---|---|---|
| Search Console, Prestaties (web) | vertoningen, klikken, positie; filter op pad per paginasoort; zoekopdrachten zonder "predict the race" (niet-merk) | wekelijks, 5 minuten |
| Search Console, Pagina's | welke URL's geïndexeerd zijn en waarom niet | na elke fase |
| Bing Webmaster Tools | zoekprestaties en IndexNow | maandelijks |
| GA4 | landingspagina's en bron (alleen wie ja zei, dus een ondergrens) | maandelijks |
| beheer (BEDIENING §16) | nieuwe poules per week: de uitkomst waar het om draait | wekelijks |

Richtpunten, geen belofte: eind december 2026 alle kernpagina's geïndexeerd; februari 2027 vertoningen op niet-merkzoektermen in NL en EN; maart 2027 de eerste poules via de zoekresultaten. Eén regel per maand in `docs/zoekplan/meting.md`.

---

## Wat we bewust niet doen

- Geen pagina per zoekvariant, geen vertalingen zonder controle.
- Niet rekenen op FAQ- of HowTo-rich results. Google toont FAQ-rich results sinds 7 mei 2026 aan niemand meer, HowTo al sinds 2023. De bestaande markup mag blijven: hij klopt met het scherm en kost niets.
- Geen keywords-meta, geen automatische taal-doorverwijzing, geen externe lettertypen of scripts.
- Geen gekochte links of linkruil.

## Bronnen (gecontroleerd 26 september 2026)

- Google, Optimizing your website for generative AI features on Google Search (bijgewerkt 10 juli 2026): https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Search Engine Journal over het einde van FAQ-rich results (mei 2026): https://www.searchenginejournal.com/google-drops-faq-rich-results/574429/
- Podium Prophets, overzicht van F1-voorspelspellen (concurrent): https://podiumprophets.com/blog/best-f1-prediction-games-2026
