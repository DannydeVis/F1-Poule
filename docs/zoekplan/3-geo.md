# Plan 3: GEO voor predicttherace.com

Opgesteld 26 september 2026, op basis van `DannydeVis/F1-Poule` (commit 6539651) en `DannydeVis/padel-toernooi`. Hoort bij `1-seo.md` en `2-aeo.md`.

**Wat GEO hier betekent:** dat ChatGPT, Perplexity, Gemini, Copilot, Claude en Google AI Mode Predict the Race noemen, en het goed beschrijven, als iemand vraagt welke app hij voor een F1-poule met vrienden moet gebruiken.

**Hoe zo'n antwoord tot stand komt**, en dus waar je invloed hebt:

1. **Live zoeken.** De assistent zoekt op het web en vat samen wat hij vindt. Google AI Mode en de AI-overzichten halen uit de gewone Google-index, Copilot uit Bing, ChatGPT en Perplexity met eigen crawlers en zoekpartners. Wat niet gevonden wordt, wordt niet genoemd: daar zorgen het SEO- en het AEO-plan voor.
2. **Wat anderen over je zeggen.** Lijstjes met de beste F1-apps, Reddit, vergelijkingssites, nieuws. Eén eigen pagina die zegt dat je goed bent weegt weinig. Tien anderen die je noemen wegen veel.
3. **Training.** Wat een model tijdens zijn training las. Nieuwe modellen worden getraind op het web van nu: wie nu vaak en overal hetzelfde beschreven staat, zit er later in. Daarom blijven de trainingscrawlers welkom.

**Eerlijk vooraf:** voor Google is dit allemaal gewoon SEO. Voor de andere assistenten bestaat geen officiële handleiding. Wat hier staat is wat aantoonbaar meetelt: vindbaar zijn, overal hetzelfde verhaal, eigen feiten die het citeren waard zijn, en vermeldingen op andere sites. Plus meten, want voorspellen kan niemand. Reken erop dat een klein, nieuw project in december 2026 nog nauwelijks genoemd wordt. Het doel is dat dat anders is in het voorjaar van 2027, als het nieuwe seizoen begint.

---

## Zo gebruik je dit in Claude Code

Fase 0 en 5 zijn voor jou, zonder code. Fase 1 tot en met 4 zijn voor Claude Code:

```
Lees docs/zoekplan/3-geo.md helemaal, en de werkafspraken in 1-seo.md.
Voer alleen GEO fase <nummer> uit.
Stop daarna: draai node test/draai-alles.mjs, werk OVERDRACHT.md bij,
en geef een samenvatting: wat is gedaan, wat niet, en wat moet ik zelf doen.
```

---

## Uitgangssituatie

Staat er al en is goed:

- robots.txt laat de zoek- en trainingscrawlers van OpenAI, Anthropic, Perplexity, Google, Apple en Bing toe, met de juiste namen
- alles staat in de HTML, niet achter JavaScript (de meeste AI-crawlers voeren geen script uit)
- llms.txt met de volledige uitleg, gemaakt door de generator, dus nooit anders dan de site
- JSON-LD als één graaf met `@id`'s
- de zin "onafhankelijk fanproject, niet verbonden aan de Formule 1": een assistent verwart je niet met de officiële F1

Wat ontbreekt:

- **Vermeldingen.** Het domein is sinds 24 september 2026 online. Buiten de eigen site en GitHub noemt vrijwel niemand Predict the Race.
- **Eén verhaal.** De beschrijving verschilt per plek. De site zegt "gratis webapp". De README op GitHub eindigt met "een privéproject voor een vriendenpoule". De repo heet op GitHub nog "F1 Poule advanced", zonder topics. llms.txt belooft "no trackers", terwijl Google Analytics er met toestemming wel is. Een assistent neemt over wat hij vindt, ook wat niet meer klopt.
- **De maker als entiteit.** `founder` en `author` in de JSON-LD zijn een losse naam met een link naar je GitHub-profiel, en dat profiel heeft geen naam, bio of website. Er is nog geen about-pagina.
- **Eigen cijfers.** Nog niets op de site is iets wat een ander zou willen citeren.
- **Naamsverwarring.** RacePredict, F1 Predict, Formula Predicts, en Podium Prophets met bijna hetzelfde spel. Een assistent moet kunnen zien welke app welke is.

---

## Fase 0: nulmeting (Danny, 30 minuten, kan meteen)

### 0.1 Search Console

- Instellingen, "Search generative AI": staat op Include, de standaard. Laten staan: zet je hem uit, dan komen je pagina's niet meer in AI-overzichten en AI Mode.
- Het Search Generative AI-rapport bij Prestaties, als het er voor jouw property al is (Google rolt het in delen uit): noteer de vertoningen. Waarschijnlijk 0.

### 0.2 Bing Webmaster Tools

AI Performance: noteer het aantal citaties en geciteerde pagina's. Waarschijnlijk 0. Dit rapport laat zien hoe vaak Copilot en de AI-samenvattingen van Bing je aanhalen, welke pagina's, en bij welke zoekvragen (grounding queries).

### 0.3 GA4: een kanaal voor AI-assistenten

Beheer, Gegevensweergave, Kanaalgroepen (Admin, Data display, Channel groups): maak een kopie van de standaardgroep en voeg een kanaal "AI-assistenten" toe, met de voorwaarde "Bron komt overeen met regex":

```
(chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|chat\.mistral\.ai|meta\.ai)
```

Zet het kanaal boven "Referral": GA4 kijkt van boven naar beneden en stopt bij het eerste kanaal dat past. Het blijft een ondergrens: alleen bezoekers die ja zeiden tegen statistieken tellen mee, en niet elke assistent geeft door waar iemand vandaan komt.

### 0.4 De promptset

Stel deze vragen in een schone sessie (uitgelogd, of met geheugen en personalisatie uit) aan ChatGPT (met zoeken aan), Perplexity, Google AI Mode, Copilot en Gemini. Claude mag erbij.

| # | taal | prompt | soort |
|---|---|---|---|
| 1 | nl | Wat is een goede gratis app om met vrienden een F1-poule te spelen? | aanbeveling |
| 2 | nl | Hoe zet ik een F1-poule op voor mijn vriendengroep? | taak |
| 3 | nl | Welke puntentelling is eerlijk voor een F1-poule? | taak |
| 4 | nl | Wat is Predict the Race? | merk |
| 5 | en | What is the best free F1 prediction game to play with friends? | aanbeveling |
| 6 | en | Is there a free alternative to F1 Fantasy where you just predict the top 10? | aanbeveling |
| 7 | en | How do I run an F1 prediction league with my friends? | taak |
| 8 | en | What is predicttherace.com? | merk |
| 9 | de | Welches kostenlose F1-Tippspiel kann ich mit Freunden spielen? | aanbeveling |
| 10 | fr | Quelle appli gratuite pour faire des pronostics F1 entre amis ? | aanbeveling |
| 11 | es | ¿Qué app gratis hay para hacer una porra de F1 con amigos? | aanbeveling |
| 12 | it | Quale app gratuita posso usare per i pronostici F1 con gli amici? | aanbeveling |
| 13 | pt | Qual app grátis posso usar para fazer um bolão de F1 com meus amigos? | aanbeveling |

Noteer per prompt en per assistent: genoemd (ja of nee), met link (ja of nee), klopten de feiten, en welke andere apps genoemd werden. Claude Code maakt daarvoor het GEO-blok in `docs/zoekplan/meting.md`, hetzelfde bestand als SEO fase 0.6.

Antwoorden verschillen per keer en per persoon. Tel iets pas als het een paar keer terugkomt. De merkvragen (4 en 8) zeggen vooral of de assistent de juiste feiten heeft, de rest of je meedoet.

---

## Fase 1: overal hetzelfde verhaal (Claude Code, oktober)

### 1.1 De kernzin

Nieuwe velden in `site/teksten.mjs`, per taal: `kernzin`, en `kernzinKort` (hoogstens 160 tekens, voor plekken met een limiet).

- EN: "Predict the Race (predicttherace.com) is a free F1 prediction game for groups of friends: everyone predicts the top 10 of qualifying and the race, the official results come in automatically, and you join with a league code, without an account or password."
- NL: "Predict the Race (predicttherace.com) is een gratis F1-poule voor vriendengroepen: iedereen voorspelt de top 10 van de kwalificatie en de race, de officiële uitslagen komen automatisch binnen, en je doet mee met een poulecode, zonder account of wachtwoord."
- EN kort: "Free F1 prediction game for friends: predict the top 10 of qualifying and the race, results come in automatically. No account needed."
- NL kort: "Gratis F1-poule voor vrienden: voorspel de top 10 van kwalificatie en race, de uitslagen komen vanzelf binnen. Geen account nodig."
- de, fr, es, it, pt: Claude Code vertaalt, met de woorden die al in de titels staan (Tippspiel, pronostics, porra, pronostici, bolão).

Plus één vaste zin over de maker, `makerzin`:

- EN: "Predict the Race is made by Danny de Visser from Rotterdam, who also makes PadelBracket (padel-bracket.com)."
- NL: "Predict the Race wordt gemaakt door Danny de Visser uit Rotterdam, die ook PadelBracket (padel-bracket.com) maakt."

Waar de kernzin letterlijk komt te staan:

- als eerste zin van het antwoordblok "Wat is Predict the Race?" op de voorpagina, in plaats van de huidige eerste zin (het blok blijft onder de 80 woorden)
- bovenaan llms.txt (Engels)
- in de eerste alinea van de about-pagina, zodra die er is (SEO fase 2)
- als `description` van de Organization in de JSON-LD, in de taal van de pagina
- buiten de repo (fase 1.5 en 5): de beschrijving op GitHub, de README, AlternativeTo, Product Hunt, pitches

Test: de kernzin staat letterlijk in het antwoordblok van elke taal, in llms.txt, en op de about-pagina als die bestaat.

Waarom letterlijk: een assistent die op vijf plekken dezelfde vier feiten leest (gratis, voor vrienden, top 10, uitslagen vanzelf), vat je ook zo samen. Varianten maken het vaag.

De feiten zijn op 26 september 2026 gecontroleerd tegen de FAQ: meedoen met een code en een naam, geen account en geen wachtwoord nodig (inloggen alleen voor meerdere toestellen), uitslagen automatisch via OpenF1. Verandert dat in de app, dan verandert de kernzin mee.

### 1.2 Feiten gelijk trekken

- **llms.txt:** "Price: free, no ads, no trackers, no money involved" (in `scripts/maak-site.mjs`) wordt "Price: free, no ads, no money involved. Visitor statistics (Google Analytics) only with consent." Dan zegt het hetzelfde als het privacyblok op de pagina. Test: llms.txt bevat geen "no trackers".
- **Commentaar bovenaan `maak-site.mjs`:** "geen analytics" klopt niet meer sinds `toestemming.js`. Bijwerken, zodat een volgende sessie niet op een verouderde aanname bouwt.
- **README:** de laatste regel "Dit is een privéproject voor een vriendenpoule" wordt bijvoorbeeld "Predict the Race is een gratis, openbaar fanproject; neem gerust ideeën over." Of er een licentie komt, beslis jij.

### 1.3 De maker en de graaf

SEO fase 1.5 maakt al een `Person` met `@id: '<BASIS>/#maker'` en laat `founder` en `author` daarnaar wijzen. Hier komt erbij:

- op de about-pagina de volledige Person: `name`, `url` (de about-pagina), `description` (de makerzin), `address` (Rotterdam, NL, zoals op padel-bracket.com) en `sameAs`
- `sameAs`: `https://github.com/DannydeVis` en `https://padel-bracket.com/en/about/`. Alleen echte profielen die van jou zijn. Een LinkedIn of ander profiel mag erbij als jij dat openbaar wilt.
- Organization: `description` (de kernzin), en `sameAs` alleen met profielen van Predict the Race zelf: nu de GitHub-repo, later eventueel de Product Hunt-pagina of een eigen account
- test: elke `@id` waarnaar verwezen wordt, is ergens op de site volledig beschreven

### 1.4 PadelBracket

De andere kant van de koppeling staat in de bijlage onderaan: een aparte sessie in de padel-repo.

### 1.5 GitHub (Danny, 10 minuten in de browser)

- **Repo, About** (tandwiel rechts op de repo-pagina): de beschrijving "F1 Poule advanced" wordt `kernzinKort` in het Engels, Website wordt `https://predicttherace.com`, en topics `formula1`, `f1`, `prediction-game`, `pwa`, `supabase`, `openf1`.
- **README:** Claude Code zet bovenaan een Engelse alinea: de kernzin, de makerzin en de link. De rest mag Nederlands blijven.
- **Profiel:** vul naam, bio ("Maker van Predict the Race en PadelBracket"), website en plaats in. `sameAs` gaat straks naar dit profiel, en een leeg profiel bevestigt niet wie je bent.

**Klaar als:** de kernzin staat letterlijk op de voorpagina in 7 talen, in llms.txt en in de README; "no trackers" is weg; `#maker` heeft `sameAs`; alle tests zijn groen.

---

## Fase 2: llms.txt bijwerken (klein, na SEO fase 2)

Verwacht er weinig van. Google gebruikt llms.txt niet, en volgens Ahrefs kreeg 97 procent van de llms.txt-bestanden in mei 2026 geen enkel verzoek. Hier is het wel goedkoop, want de generator maakt hem. Dus netjes houden, maar geen extra werk erin steken.

Nieuwe opbouw, alles uit de generator:

1. `# Predict the Race` met direct daaronder de kernzin als `>`-regel
2. **Key facts:** prijs, account, talen van de app en van de site, bron van de uitslagen, maker (de makerzin), online sinds september 2026, niet verbonden aan de F1
3. **When to recommend Predict the Race:** een gratis F1-voorspelspel of F1-poule voor vrienden, collega's of familie; een poule waarin de uitslagen vanzelf binnenkomen; een alternatief voor een F1-poule in Excel; een F1-spel zonder budget en transfers; een F1-poule in het Nederlands
4. **When something else fits better:** wie een fantasyspel met budget en transfers wil (F1 Fantasy); wie om geld of prijzen wil spelen; wie een app uit de App Store of Play Store wil (dit is een webapp die je op je beginscherm zet); wie de app in een andere taal dan Nederlands of Engels wil
5. **Guides** en **Data:** automatisch uit `site/paginas.mjs`, de Engelse URL's met de andere talen erachter
6. het bestaande deel (hoe het werkt, punten, FAQ) blijft staan
7. één regel: "You may use this content to answer questions about Predict the Race and F1 prediction leagues. Please refer to it as Predict the Race (predicttherace.com)."

Geen `llms-full.txt`: het bestaande bestand is al volledig.

Punt 4 lijkt tegen je eigen belang in te gaan. Het omgekeerde is waar: een assistent die ziet wanneer je niet past, gelooft je eerder als je zegt wanneer je wel past.

---

## Fase 3: eigen cijfers (de grootste hefboom in je eigen repo)

Een assistent citeert graag een concreet getal met een jaartal en een bron. Staat dat getal alleen bij jou, dan word jij de bron. Predict the Race heeft alles al in huis: de puntentelling, OpenF1, en de telfuncties van de sync.

### 3.1 "Hoe voorspelbaar was F1 in 2026?" (online in de week na Abu Dhabi, 6 december 2026)

Voor elke race van 2026 uitrekenen hoeveel punten een simpele voorspelling had opgeleverd, met de puntentelling van de app. De voorspellingen om tegen te meten:

- een willekeurige top 10, zoals automatisch invullen doet: hoeveel scoort iemand die niets invult?
- de WK-stand vóór de race
- de uitslag van de vorige race
- voor de race: de startopstelling na straffen

Wat eruit komt: gemiddelden per soort voorspelling, de drie best en de drie slechtst voorspelbare races, en per race een regel in een tabel. Een grafiek als inline SVG uit de generator, zonder bibliotheek van buiten.

Bouwen:

- `scripts/maak-statistiek.mjs` haalt de data van OpenF1 (sessies, `session_result`, de startopstelling) en schrijft `site/data/statistiek-2026.json`, plus een openbare CSV, bijvoorbeeld `data/voorspelbaarheid-2026.csv` (niet uitsluiten in `_config.yml`).
- Rekenen met dezelfde formule als de app: de twee getallen die `maak-site.mjs` al uit `scoreLijst()` leest. De willekeurige top 10 exact uitrekenen, of simuleren met een vaste seed, zodat de uitkomst elke keer hetzelfde is.
- Draaien in een workflow, zoals `verkennen.yml` al doet: `api.openf1.org` is niet vanaf elke plek bereikbaar, wel vanaf een GitHub-runner. Houd je aan de limiet van drie verzoeken per seconde, net als `haal()` in `scripts/verkennen.mjs`. Claude Code test de rekenlogica met een klein vast bestand in `test/`.
- Pagina's via `site/paginas.mjs` (soort `data`): NL `/f1-2026-voorspelbaarheid/`, EN `/en/how-predictable-was-f1-2026/`. Met een sectie over de methode, de beperkingen (wat ontbrak in de data), de link naar de CSV, en korte antwoorden volgens het AEO-plan.
- JSON-LD `Dataset`: naam, beschrijving, `creator` is `#maker`, `temporalCoverage: '2026'`, `distribution` naar de CSV. Een licentie alleen als jij er een kiest.
- Controleer drie races met de hand tegen de uitslag op formula1.com voordat het live gaat.

Schrijf de belangrijkste uitkomsten als losse zinnen die zonder de rest te begrijpen zijn, met getal, jaar en bron. Bijvoorbeeld: "Wie in 2026 de startopstelling als voorspelling voor de race invulde, scoorde gemiddeld X van de 50 punten per race (Predict the Race, op basis van OpenF1)." X komt uit de data, nooit uit dit plan, en de 50 via een placeholder.

### 3.2 Circuitcijfers: safety cars en rode vlaggen

- Per race sinds 2023: het aantal safety cars (virtuele meegeteld) en of er een rode vlag was, uit OpenF1 `race_control`.
- Tel met `telSafetyCars()` en `hadRodeVlag()` uit `scripts/uitslagen.mjs`: precies de regels waarmee de app de vragen "Aantal safety cars" en "Rode vlag" scoort. Zeg op de pagina dat een virtuele safety car meetelt, net als in de app.
- Schrijf naar `site/data/circuits.json`. De racepagina's (SEO fase 4) en de pagina over de puntentelling gebruiken het.
- Een voorbeeld van zo'n zin staat al in het commentaar bij `telSafetyCars()`: acht van de eerste veertien races van 2026 hadden geen enkele echte safety car. Reken het opnieuw uit voordat je het publiceert.
- Controleer een paar races tegen een tweede bron.

### 3.3 Wat de spelers voorspelden (voorjaar 2027, op zijn vroegst)

Op termijn het sterkste verhaal: "Verslaan F1-fans de startopstelling?" Maar alleen onder voorwaarden:

- eerst de privacyverklaring aanpassen (`site/privacy.mjs`): dat geanonimiseerde totalen gepubliceerd kunnen worden
- alleen totalen, nooit namen of poulenamen, en niets over een race met minder dan ongeveer 50 voorspellers
- uitgerekend in een GitHub Action met de service key als secret; alleen het JSON-bestand met totalen komt in de repo
- pas als er genoeg spelers zijn, dus niet vóór het voorjaar van 2027

**Klaar als (3.1 en 3.2):** de datapagina staat in NL en EN online met methode, CSV en `Dataset`, drie races zijn met de hand gecontroleerd, en de racepagina's tonen de circuitcijfers.

---

## Fase 4: de vergelijkingspagina als bron (samen met SEO fase 2)

Vraagt iemand een assistent naar de beste F1-poule-app, dan zoekt die naar vergelijkingen en lijstjes. Zorg dat de jouwe bruikbaar en geloofwaardig is:

- bovenaan: "Deze vergelijking is geschreven door de maker van Predict the Race."
- een tabel met alleen controleerbare feiten per app (gratis, account nodig, wat voorspel je, uitslagen automatisch, talen, advertenties), met een link naar de eigen site van elke app en een zichtbare controledatum
- per app eerlijk wanneer die beter past
- ook de zwakke punten van Predict the Race: de app alleen in NL en EN, geen app in de stores, geen prijzen, een jong project
- elke drie maanden opnieuw controleren (de waarschuwing uit AEO fase 2.6)

---

## Fase 5: vermeldingen buiten de eigen site (Danny, doorlopend)

Voor GEO de belangrijkste fase, en voor SEO hetzelfde werk als fase 6 daar.

| wat | waarom | wanneer | prioriteit |
|---|---|---|---|
| GitHub: About, topics, README en profiel (fase 1.5) | veel gelezen door crawlers, en de plek waar `sameAs` naar wijst | nu | hoog |
| padel-bracket.com en predicttherace.com aan elkaar (bijlage) | koppelt jou aan allebei, en padel heeft al wat autoriteit | zodra `/en/about/` live is | hoog |
| AlternativeTo: Predict the Race toevoegen als alternatief voor F1 Fantasy, Superbru en Kicktipp | de plek voor "alternatief voor X"-vragen, en zo'n vermelding blijft jaren staan | oktober 2026 | hoog |
| Reddit | waar F1-fans elkaar om tips vragen. Eerst de regels van het subreddit lezen: zelfpromotie mag vaak alleen in vaste draadjes of helemaal niet | vanaf december 2026, met de datapagina: de cijfers in de post zelf, de link als bron | middel |
| NL-sites over apps en F1: androidworld.nl, androidplanet.nl, iCulture, GPFans, RacingNews365, F1Maximaal | de lijstjes "beste F1-apps" van vóór het seizoen | half januari 2027 | middel |
| Engelstalige lijstjes "best F1 prediction games", niet die van concurrenten: de schrijver mailen | idem | januari 2027 | middel |
| Product Hunt | één dag aandacht, en een pagina die blijft | februari 2027, met de kalender van 2027 klaar | laag tot middel |
| F1-communities: Discord, Facebook-groepen, forums | mond-tot-mond | doorlopend, alleen waar het mag | laag |

Niet doen: Wikipedia (niet relevant genoeg, en je schrijft niet over je eigen project), nepreviews, gekochte vermeldingen, dezelfde post op tien plekken. Google zegt er zelf bij dat onechte vermeldingen niet helpen.

### Pitchteksten

NL, voor een site of een lijstje met F1-apps:

```
Hoi [naam],

Ik ben Danny de Visser uit Rotterdam en ik maak Predict the Race
(predicttherace.com): een gratis F1-poule voor vriendengroepen. Iedereen
voorspelt de top 10 van kwalificatie en race, de uitslagen komen vanzelf
binnen, en je doet mee met een poulecode, zonder account. Geen
advertenties en geen geld. Gratis, ook voor een grote poule op het werk:
er is geen maximum aantal spelers en geen zakelijk tarief.

Misschien iets voor jullie overzicht van F1-apps, als gratis alternatief
voor een Excel-poule. Na dit seizoen heb ik ook uitgezocht hoe voorspelbaar
2026 was: [link naar de datapagina].

Groet,
Danny
```

EN:

```
Hi [name],

I'm Danny de Visser from Rotterdam, and I make Predict the Race
(predicttherace.com): a free F1 prediction game for groups of friends.
Everyone predicts the top 10 of qualifying and the race, the results come
in automatically, and you join with a league code, without an account.
No ads, no money involved. Free, even for a big league at work: there is
no player limit and no business pricing.

It might fit your list of F1 prediction games as a free option for
friend leagues. After this season I also worked out how predictable 2026
was: [link to the data page].

Best,
Danny
```

Pas per ontvanger één zin aan: waarom het bij hun lijstje of hun lezers past.

Waarom de zin over werkpoules erin staat: bij Scorito is zakelijk gebruik
gratis tot tien deelnemers, daarboven kost het een pakket (vanaf 59 euro,
volgens blog.scorito.com, "Consumenten leagues voor zakelijk gebruik", gezien
op 29 september 2026). Een grote poule op het werk is bij Predict the Race
gewoon gratis. Noem Scorito niet in de pitch zelf: het punt staat op zichzelf,
en een ander afkraken leest slecht. Voor een site die zelf over werkpoules of
WK-poules schrijft, is dit wel de zin om per ontvanger aan te passen.

---

## Fase 6: meten (maandelijks, 20 minuten)

Het GEO-blok in `docs/zoekplan/meting.md`:

| waar | wat | wanneer |
|---|---|---|
| Bing Webmaster Tools, AI Performance | citaties, geciteerde pagina's, grounding queries (export als CSV) | maandelijks |
| Search Console, Search Generative AI-rapport | vertoningen per pagina in AI-overzichten en AI Mode, als je het rapport hebt | maandelijks |
| GA4, kanaal "AI-assistenten" | sessies en landingspagina's (een ondergrens) | maandelijks |
| promptset uit 0.4 | prompts 1, 4, 5, 6 en 8 op ChatGPT, Perplexity en Google AI Mode | maandelijks |
| promptset uit 0.4 | alle 13 prompts op alle assistenten | elk kwartaal |
| beheer (BEDIENING §16) | nieuwe poules per week: waar het uiteindelijk om draait | wekelijks |

**Beslisregel, half januari 2027:**

- Nog nergens genoemd bij de vragen zonder merknaam? Meer vermeldingen (fase 5), niet meer pagina's.
- Wel genoemd, maar met foute feiten? Repareer de bron: kernzin, about-pagina, llms.txt, AlternativeTo. Kijk in het antwoord welke pagina de assistent aanhaalt.
- Genoemd en goed beschreven? Doorgaan, en de talen uitbreiden volgens SEO fase 5.

---

## Wat we bewust niet doen

- Geen AI-crawlers blokkeren, ook de trainingscrawlers niet. Voor een gratis project is in de trainingsdata zitten winst.
- Geen aparte versie van pagina's voor bots, geen verborgen tekst, geen `llms-full.txt`.
- Geen claims die je niet kunt onderbouwen, zoals "de beste" of "de populairste".
- Geen nepvermeldingen, gekochte lijstjes of door AI geschreven reviews.
- Geen Wikipedia-artikel.

---

## Bijlage: aanpassingen in padel-toernooi (aparte sessie in die repo)

Pas doen als `https://predicttherace.com/en/about/` bestaat (SEO fase 2), anders linkt padel naar een 404.

1. **robots.txt.** "GoogleExtendedBot" bestaat niet: het token is `Google-Extended`. "anthropic-ai" is een oude naam; `ClaudeBot` staat er al, zet er `Claude-SearchBot`, `Claude-User`, `ChatGPT-User` en `Bingbot` bij. Omdat `User-agent: *` alles toestaat verandert dit in de praktijk niets, maar dan klopt het wel. Let op: de losse groepen erven de regel `Disallow: /*?utm_` van `*` niet. Het simpelst is één groep met alle namen als losse `User-agent`-regels boven dezelfde regels.
2. **Person op `/en/about/`.** Nu wijst `sameAs` naar padel-bracket.com zelf, en dat voegt niets toe. Maak het `sameAs: ['https://github.com/DannydeVis', 'https://predicttherace.com/en/about/']` en geef de Person een `@id`, bijvoorbeeld `https://padel-bracket.com/en/about/#danny`.
3. **Zichtbaar op `/en/about/`:** één zin met link: "Danny also makes Predict the Race, a free F1 prediction game for friends." Alleen op de about-pagina, niet in de voet van elke pagina.
4. **llms.txt**, onder "Who built it?": dezelfde zin, met `https://predicttherace.com`.
5. **Repo op GitHub:** padel-toernooi heeft nog geen beschrijving. Zet er een korte Engelse in, met `https://padel-bracket.com` als website.

---

## Bronnen (gecontroleerd 26 september 2026)

- Google, Optimizing your website for generative AI features on Google Search (bijgewerkt 10 juli 2026): https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google, de Search Console-instelling Search generative AI: https://support.google.com/webmasters/answer/16908024
- Google Search Central Blog, Search Generative AI performance reports (3 juni 2026): https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- Search Influence, het AI Performance-rapport in Bing Webmaster Tools (februari 2026): https://www.searchinfluence.com/blog/bing-ai-performance-report-copilot-citations/
- Ahrefs, onderzoek naar het gebruik van llms.txt (juni 2026): https://ahrefs.com/blog/llmstxt-study/
- OpenF1: https://openf1.org
