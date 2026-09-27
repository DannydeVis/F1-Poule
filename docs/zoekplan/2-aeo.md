# Plan 2: AEO voor predicttherace.com

Opgesteld 26 september 2026, op basis van `DannydeVis/F1-Poule` (commit 6539651). Hoort bij `1-seo.md` en `3-geo.md`.

**Wat AEO hier betekent:** dat een pagina van Predict the Race het antwoord is op een concrete vraag. Het uitgelichte fragment bovenaan Google, een vraag onder "Mensen vragen ook", het stuk tekst dat een AI-overzicht of een assistent als bron aanhaalt. SEO zorgt dat de pagina's er zijn en gevonden worden. AEO gaat over welke vragen erop staan, waar precies, en hoe het antwoord is opgeschreven. GEO (plan 3) gaat over of AI-assistenten Predict the Race noemen en aanbevelen.

**Eerlijk vooraf:** Google zegt zelf dat optimaliseren voor AI-zoekfuncties "still SEO" is, en noemt het opknippen van tekst in hapklare blokjes voor AI overbodig. Er bestaat dus geen apart trucje. Wat hier staat is gewoon goed schrijven: de vraag als kop, het antwoord eerst, getallen die kloppen met de app, en elke vraag op precies één plek. Dat werkt voor iemand die snel iets wil weten net zo goed als voor een zoekmachine.

**Volgorde:** fase 1 (de vragenlijst) kan meteen. Fase 2 (de antwoordvorm in de generator) bouw je in dezelfde sessie als SEO fase 1, want het sjabloon van de artikelpagina gebruikt hem. Fase 3 pas je toe tijdens SEO fase 2 en 4.

---

## Zo gebruik je dit in Claude Code

```
Lees docs/zoekplan/1-seo.md en docs/zoekplan/2-aeo.md helemaal.
Voer alleen AEO fase <nummer> uit, volgens de werkafspraken in het SEO-plan.
Stop daarna: draai node test/draai-alles.mjs, werk OVERDRACHT.md bij,
en geef een samenvatting: wat is gedaan, wat niet, en wat moet ik zelf doen.
```

Voor fase 2 vervang je de tweede regel door: "Voer SEO fase 1 uit en bouw daarbij de antwoordvorm uit AEO fase 2."

---

## Uitgangssituatie

Staat er al en is goed:

- het antwoordblok "Wat is Predict the Race?" direct onder de opening, in 7 talen (69 tot 80 woorden)
- de puntentabel als echte `<table>`
- 12 veelgestelde vragen per taal in `<details>`: de tekst staat in de HTML, ook als hij dichtgeklapt is, en is woord voor woord gelijk aan de FAQPage in de JSON-LD
- `max-snippet:-1` in de robots-meta: Google mag lange fragmenten tonen. Dezelfde regels (nosnippet, max-snippet) bepalen ook wat een AI-overzicht mag overnemen, dus dit blijft zo

Wat ontbreekt:

- **De vragen van vóór de keuze.** De voorpagina beantwoordt vragen over Predict the Race zelf. De vragen die mensen stellen voordat ze een app kiezen (hoe organiseer je een poule, welke puntentelling is eerlijk, hoe doe je het in Excel, wat is een alternatief voor F1 Fantasy) hebben nog geen antwoord op de site.
- **Een lijst.** Er is geen overzicht van welke vragen er leven, en dus ook geen afspraak over welke vraag op welke pagina hoort. Met tien pagina's erbij lopen ze anders door elkaar en gaan pagina's met elkaar concurreren.
- **Getallen uit de app.** Een paar getallen staan letterlijk in de tekst: de punten in de FAQ "Hoe werkt de puntentelling?" en in het voorbeeld onder de puntentabel ("dus 3 punten", "50 punten per sessie"). Nu kloppen ze. Verandert de puntentelling in de app, dan niet meer, en de bestaande test op de puntentabel ziet dat niet.

Extra werkafspraken, bovenop die van het SEO-plan:

1. Elke vraag heeft precies één plek op de site.
2. Geen los getal over punten of vragen in de tekst. Altijd een placeholder die uit de app komt.
3. Danny leest elke nieuwe vraag en elk kort antwoord voordat het live gaat.

---

## Fase 1: de vragenlijst (kan meteen)

Doel: weten welke vragen mensen echt stellen, in hun eigen woorden, en per vraag vastleggen waar het antwoord komt.

### 1.1 Verzamelen (Danny, ongeveer 45 minuten)

- **Google, in een incognitovenster.** Op google.nl en google.com: typ de zoektermen hieronder rustig in en noteer de suggesties. Zoek ze daarna echt en noteer de vragen onder "Mensen vragen ook" of "People also ask". Klap er een paar open: dan komen er nieuwe bij.
  - NL: f1 poule, f1 poule maken, f1 poule excel, f1 poule punten, formule 1 poule, f1 pronostiek (Vlaams)
  - EN: f1 prediction league, f1 prediction game, f1 predictions with friends, f1 fantasy alternative, f1 prediction spreadsheet
- **Bing Webmaster Tools, Keyword Research.** Dezelfde termen. Geeft een indicatie van zoekvolumes. Het zijn Bing-cijfers, dus laag, maar de verhouding tussen termen zegt iets. Samen met Google Trends en Keyword Planner (zie het SEO-plan) je gratis bronnen voor volumes.
- **Reddit.** Zoek in r/formula1 op "prediction league", "prediction game" en "spreadsheet". Noteer letterlijke vragen, en waar mensen over klagen.
- **Search Console**, zodra er vertoningen zijn (reken op november): Prestaties, Zoekopdrachten, filter "Aangepast (regex)":

```
^(hoe|wat|wie|wanneer|waarom|welke|welk|kan|kun|moet|is|how|what|who|when|why|which|can|do|does|are)\b
```

Plak alles ongesorteerd in een bericht aan Claude Code. Die doet 1.2.

### 1.2 Vastleggen (Claude Code)

Nieuw bestand `site/vragen.mjs`:

```js
// Elke vraag die mensen stellen, met precies één plek op de site waar het
// antwoord staat. Andere woorden voor dezelfde vraag zijn varianten, geen
// nieuwe vraag: die krijgen nooit een eigen sectie of pagina.
export const VRAGEN = [
  {
    vraag: 'Hoe maak je een F1-poule?',   // zo staat hij als kop op de pagina
    taal: 'nl',
    varianten: ['f1 poule maken', 'f1 poule opzetten', 'f1 pronostiek maken'],
    bron: 'hypothese',       // hypothese | autocomplete | paa | reddit | gsc | bing
    doel: 'organiseren#maken', // id uit site/paginas.mjs + sectie-id, of 'voorpagina#faq'
    status: 'open',          // open | beantwoord | bewust-niet
    waarom: '',              // verplicht bij bewust-niet
  },
];
```

Tests (nieuw `test/vragen.test.mjs`, en zorg dat `node test/draai-alles.mjs` hem meedraait):

- elke vraag met status `beantwoord` heeft een doel dat bestaat, en de kop (h2, of de vraag in de FAQ) op die plek is letterlijk de vraag
- geen vraag staat twee keer in de lijst, ook niet als variant van een andere
- over alle gegenereerde pagina's van één taal heen komt geen vraag twee keer voor als kop of als FAQ
- `bewust-niet` heeft een `waarom`

### 1.3 Startlijst

Hypotheses (`bron: 'hypothese'`) tot 1.1 ze bevestigt of vervangt. De sectie-ids komen terug in fase 3.

| vraag | doel |
|---|---|
| Hoe maak je een F1-poule? | organiseren#maken |
| Wat laat je iedereen voorspellen? | organiseren#voorspellen |
| Wat doe je als iemand vergeet in te vullen? | organiseren#vergeten |
| Hoe houd je een F1-poule het hele seizoen spannend? | organiseren#spannend |
| Kun je halverwege het seizoen nog beginnen? | organiseren#halverwege |
| Welke puntentelling is het eerlijkst voor een F1-poule? | puntentelling#eerlijk |
| Hoe reken je de punten voor een top 10 uit? | puntentelling#rekenen |
| Hoeveel punten geef je voor de losse vragen? | puntentelling#losse-vragen |
| Wat als iedereen hetzelfde voorspelt? | puntentelling#hetzelfde |
| Hoe houd je een F1-poule bij in Excel? | excel#opzetten |
| Welke formule rekent de punten uit? | excel#formule |
| Waar gaat een Excel-poule mis? | excel#misgaat |
| Welke F1-poule-app past bij jouw groep? | vergelijking#welke |
| Wat is een gratis alternatief voor F1 Fantasy? | vergelijking#alternatief |
| Wanneer past iets anders beter? | vergelijking#anders |
| Wie maakt Predict the Race? | over#wie |
| Hoe blijft Predict the Race gratis? | over#gratis |
| Hoe werkt Predict the Race achter de schermen? | over#techniek |
| Hoeveel punten kun je per weekend halen? | voorpagina#faq |
| Wat is het verschil met F1 Fantasy? | voorpagina#faq |

Engels, zelfde doelen: How do you run an F1 prediction league? | What should everyone predict? | What if someone forgets to predict? | How do you keep an F1 league exciting all season? | Can you start an F1 prediction league mid-season? | What is the fairest scoring system for F1 predictions? | How do you score a top 10 prediction? | How many points should the extra questions be worth? | What if everyone predicts the same thing? | How do you run an F1 prediction league in a spreadsheet? | Which formula calculates the points? | Where does a spreadsheet league go wrong? | Which F1 prediction game suits your group? | What is a free alternative to F1 Fantasy? | When does something else fit better? | Who makes Predict the Race? | How does Predict the Race stay free? | How does Predict the Race work behind the scenes? | How many points can you score per weekend? | How is this different from F1 Fantasy?

De andere talen krijgen voorlopig alleen de twee nieuwe FAQ's op de voorpagina (fase 3.1). Varianten om vast te leggen voor later (SEO fase 5): F1-Tippspiel erstellen, Tipprunde F1; organiser des pronostics F1 entre amis; cómo hacer una porra de F1; come organizzare i pronostici F1 con gli amici; como fazer um bolão de F1.

Bewust niet (`status: 'bewust-niet'`):

- "Hoe laat begint de race?" F1.com en de grote sites winnen dat altijd, en het brengt geen poules. De racepagina's noemen de tijden wel, maar mikken er niet op.
- "Wie wint de GP van ...?" We spelen geen tipgever. De racepagina's geven cijfers, geen voorspelling.
- Alles over F1 Fantasy-teams samenstellen. Ander spel.

**Klaar als:** `site/vragen.mjs` staat er met de startlijst en de vragen uit 1.1, elke vraag heeft een doel of een `waarom`, en de tests draaien (vragen met status `open` mogen nog geen pagina hebben).

---

## Fase 2: de antwoordvorm in de generator (samen met SEO fase 1)

### 2.1 Het korte antwoord bovenaan

Direct onder de h1, zonder eigen kop:

1. één regel: "Door Danny de Visser, bijgewerkt op 12 oktober 2026". De naam linkt naar de about-pagina, de datum is `dateModified` (SEO fase 0.5). Deze regel mag de "Bijgewerkt op" onderaan uit SEO 1.2 vervangen.
2. `<p class="kort">`: het antwoord op de hoofdvraag van de pagina, met dezelfde regels als in 2.2.

### 2.2 Het vraagblok

Elke sectie van een artikelpagina is één vraag. Component `vraagBlok()` in `scripts/maak-site.mjs`, gevuld uit de `secties` in `site/paginas.mjs`:

```html
<section class="vraag" id="eerlijk">
  <h2>Welke puntentelling is het eerlijkst voor een F1-poule?</h2>
  <p class="kort">...</p>
  ... uitleg, stappen, tabel of rekenvoorbeeld ...
</section>
```

Regels voor `kort`:

1. **Het antwoord eerst.** Ja of nee, het getal, of de definitie in de eerste zin. Geen aanloop, geen "In dit artikel".
2. **Richtlijn 40 tot 60 woorden.** Kort genoeg om als fragment te passen en voor te lezen. De test zakt onder 25 en boven 80.
3. **Zelfstandig leesbaar.** Iemand die alleen deze alinea ziet, begrijpt hem. Noem het onderwerp bij naam. Test: `kort` begint niet met een verwijswoord (nl: Dit, Deze, Dat, Die, Hier, Zoals; en: This, These, That, Those, Here, As, Above).
4. **Geen HTML in de tekst.** Net als in `site/teksten.mjs`: de sjabloon maakt de opmaak.

Daarna de uitleg, in de vorm die bij de vraag past:

| soort vraag | vorm | eis |
|---|---|---|
| hoe doe je ... | `stappen` wordt `<ol>` | 3 tot 8 stappen, elke stap begint met een werkwoord |
| welke, wat is het verschil | `tabel` wordt `<table>` | met `<caption>`, `<th scope="col">` boven en `<th scope="row">` voor elke rij |
| hoeveel | getal in de eerste zin, dan `voorbeeld` | het rekenvoorbeeld rekent de generator uit, niet de schrijver |
| wat is ... | definitie | eerste zin: "X is ..." |

### 2.3 Getallen komen uit de app

- Breid `vars` in `maak-site.mjs` uit: `exact`, `een`, `twee` (uit `PLEKPUNTEN`), `perfect` (tien keer `exact`), de punten per vraag uit `PUNTEN` (`{winnaar}`, `{pole}`, `{sprint_top10}` en zo verder), `{simpel}`, `{klassiek}`, `{gevorderd}` (uit `PRESET_PUNTEN`) en `{meest}` (het aantal vragen van Gevorderd, zoals de lichtkrant al doet).
- Bouw de Excel-formule uit dezelfde twee getallen die `maak-site.mjs` al uit `scoreLijst()` leest, als `{formuleNL}` en `{formuleEN}`.
- Getallen die bewust niet uit de app komen (de 25 punten van een echte F1-zege bijvoorbeeld) schrijf je als `{=25}`. Pas `vul()` daarvoor aan.
- **Test:** in `site/teksten.mjs` en `site/paginas.mjs` staat nergens een kaal getal vlak voor een puntenwoord (punt, punten, point, points, Punkt, Punkte, punto, puntos, punti, ponto, pontos). Die komen altijd uit een placeholder.
- **Voorpagina meteen repareren**, anders is deze fase niet groen: de FAQ "Hoe werkt de puntentelling?" en het voorbeeld onder de puntentabel krijgen `{exact}`, `{een}`, `{twee}` en `{perfect}` in plaats van 5, 3, 1 en 50. Dat zijn 14 regels in `site/teksten.mjs`, twee per taal. De tekst op het scherm blijft precies hetzelfde, dus `--controle` ziet geen verschil in de HTML.

### 2.4 FAQ per artikelpagina

- Hoogstens 5 vragen. Liever 3 goede dan 5 opgevulde, en geen FAQ is ook goed.
- Geen vraag die al als h2 op die pagina staat of ergens anders als FAQ (de test uit 1.2).
- Zelfde component als op de voorpagina, zelfde FAQPage in de JSON-LD, woord voor woord gelijk aan het scherm. Een rich result levert het niet meer op: Google toont sinds 7 mei 2026 aan niemand nog FAQ-rich results. Het kost niets zolang het klopt.
- HowTo en speakable blijven op de voorpagina staan, maar komen niet op nieuwe pagina's.

### 2.5 Techniek

- Het korte antwoord staat altijd open in de HTML: niet in `<details>`, niet achter een knop of tab. `<details>` mag alleen voor de FAQ.
- Artikelpagina's krijgen dezelfde robots-meta als de voorpagina (met `max-snippet:-1`). Nergens `nosnippet` of `data-nosnippet` op een indexeerbare pagina. Test.
- Elke sectie heeft een uniek `id`, zodat je er rechtstreeks naar kunt linken (`/f1-poule-puntentelling/#eerlijk`).

### 2.6 Tests

Per gegenereerde artikelpagina: elke `section.vraag` heeft een h2 die eindigt op een vraagteken, met direct daarna `p.kort`; `kort` telt 25 tot 80 woorden en begint niet met een verwijswoord; elke tabel heeft een `caption` en `th` met `scope`; het rekenvoorbeeld klopt met de formule uit de app; ids zijn uniek; geen `nosnippet`. Plus de test op getallen uit 2.3.

Geen test die op datum zakt. Een controledatum die te oud is (fase 3.2, vergelijking) geeft een waarschuwing in de uitvoer van `maak-site.mjs`, want een test die op datum zakt blokkeert elke andere merge.

**Klaar als:** de gids "organiseren" uit SEO fase 1 heeft een kort antwoord bovenaan en zijn secties als vraagblok, en alle tests zijn groen.

---

## Fase 3: toepassen

### 3.1 Voorpagina, alle 7 talen (klein, kan direct na fase 2)

- **Twee nieuwe FAQ's**, achteraan de lijst:
  - "Hoeveel punten kun je per weekend halen?" Het antwoord noemt de drie niveaus met `{simpel}`, `{klassiek}` en `{gevorderd}`, zegt dat de sprint en de seizoensvragen daar nog bij komen, en dat een joker een weekend dubbel laat tellen.
  - "Wat is het verschil met F1 Fantasy?" In F1 Fantasy stel je binnen een budget een team samen en scoor je op de prestaties van je coureurs en teams. In Predict the Race voorspel je de volgorde: de top 10 van kwalificatie en race, plus losse vragen. Controleer elk woord over F1 Fantasy op hun eigen spelregels voordat het live gaat.
  - Vertalingen: de, fr, es, it en pt schrijft Claude Code, kort en feitelijk. Laat ze nalezen als dat kan.
- **Het antwoordblok zelf laat je hier staan.** GEO fase 1.1 maakt de eerste zin gelijk aan de kernzin.

### 3.2 Kernpagina's in NL en EN (tijdens SEO fase 2)

Per sectie wat het korte antwoord in elk geval moet zeggen. Waar staat "check": Claude Code zoekt het op in `app/index.html` of `BEDIENING.md` en laat het weg als het niet zo werkt.

**organiseren**

| id | kern van het korte antwoord |
|---|---|
| maken | In vier stappen: kies wat iedereen voorspelt, kies de puntentelling, spreek de deadline af (de start van elke sessie), nodig iedereen uit. In Predict the Race: poule maken, vragen kiezen, code delen. |
| voorspellen | Minimaal de top 10 van de race. De top 10 van de kwalificatie maakt het weekend langer, losse vragen zijn voor wie meer wil. De drie niveaus uit de app als voorbeeld, met hun punten via placeholders. |
| vergeten | Twee keuzes: nul punten (streng, en wie één keer vergeet raakt achter) of automatisch een willekeurige top 10. Plus de deadlines in je eigen agenda. |
| spannend | De drie dingen die een vriendenpoule kapotmaken, uit `ROUTEKAART.md`: iemand staat onbereikbaar achter, mensen vergeten in te vullen, er is geen reden om na de race terug te komen. Per ding wat helpt: weekendwinnaar, jokers, onderlinge duels, agenda-abonnement. Dit is eigen ervaring, dus het belangrijkste stuk van de pagina. |
| halverwege | Ja. Wie later instapt mist de punten van de races die al gereden zijn, en kan open seizoensvragen nog één keer invullen (check: `BEDIENING.md`, het stuk over wie halverwege instapt). Noem geen aantal resterende races: dat veroudert elke week. |

FAQ: "Wat is een F1-pronostiek?" (het Vlaamse woord voor een poule, in één zin) en "Kun je ook zonder app een F1-poule doen?" (ja, met een spreadsheet, link naar de Excel-pagina).

**puntentelling**

| id | kern van het korte antwoord |
|---|---|
| eerlijk | Een telling die ook bijna goed beloont. Alleen exact tellen maakt het een loterij, de echte F1-punten laten één coureur zwaar wegen, en punten naar afstand (`{exact}`, `{een}`, `{twee}`) belonen wie de volgorde goed inschat. Tabel: systeem, hoe het werkt, voor, tegen. |
| rekenen | Per coureur `{exact}` voor exact, `{een}` voor één plek ernaast, `{twee}` voor twee plekken, daarna niets. Tel de tien regels op; een perfecte top 10 is `{perfect}`. Daaronder een volledige top 10 als tabel (voorspeld, coureur, echt, verschil, punten, totaal), uitgerekend door de generator. Gebruik coureur A tot en met J, en laat alle tien in de echte top 10 eindigen: dan hangt het voorbeeld niet af van hoe de app buiten de top 10 telt. |
| losse-vragen | De punten van de app per vraag in een tabel, via placeholders. Waarom de winnaar `{winnaar}` punten waard is en de pole `{pole}`: haal de reden uit `OVERDRACHT.md` of vraag Danny. Verzin er geen. |
| hetzelfde | Als iedereen dezelfde winnaar kiest, maakt die vraag geen verschil. Daarom heeft de app "contrair voorspellen": een zeldzaam goed antwoord op een losse vraag telt zwaarder, tot bijna dubbel, terwijl de top 10 en de duels gelijk blijven. De precieze regel staat in `contrairVoor()` in `app/index.html`. Een eigen idee, dus precies het soort inhoud dat elders niet staat. |

FAQ: "Telt de sprint mee?" (op sprintweekenden `{sprint_top10}` punten voor de top 10 van de sprint, in Gevorderd), "Krijg je punten als een coureur uitvalt?" (check hoe `scoreLijst()` de uitslag krijgt), "Wat gebeurt er bij een gelijke stand?" (gelijke punten is een gedeelde plek, 1, 1, 3, zie `BEDIENING.md`, Stand).

Later, na GEO fase 3: een sectie met eigen cijfers, bijvoorbeeld hoeveel punten een willekeurige top 10 gemiddeld haalde in 2026.

**excel**

| id | kern van het korte antwoord |
|---|---|
| opzetten | Eén tabblad per race: per speler een kolom met zijn voorspelde top 10, een kolom met de echte plek, en per regel de formule. Daarna een tabblad met de totalen. Kolommen in een tabel. |
| formule | `{formuleNL}` in Nederlandse Excel, `{formuleEN}` in Engelstalige Excel. In Google Sheets zijn de functienamen Engels en hangt het scheidingsteken af van de landinstelling (Nederland: puntkomma). Leg uit wat B en C zijn, en hoe je een coureur buiten de top 10 of een uitvaller invult, net zoals de app het telt (check). |
| misgaat | Uitslagen overtypen na elke sessie, straffen achteraf die de uitslag nog veranderen, wie vult na de start nog stiekem in, en discussie over wat er afgesproken was. Precies wat een app oplost: daar pas de knop naar de app. |

FAQ: "Werkt het ook in Google Sheets?" en "Hoe verwerk je een straf na de race?"

**vergelijking**

| id | kern van het korte antwoord |
|---|---|
| welke | Welk soort app bij welk soort groep past, in één of twee zinnen, zonder Predict the Race als enige antwoord. Daaronder de tabel uit SEO fase 2, met een zichtbare controledatum. |
| alternatief | Een voorspelspel, waarin je de volgorde voorspelt in plaats van een team samenstelt. Noem Predict the Race en minstens één ander, met wat je op hun eigen site hebt gecontroleerd. |
| anders | Eerlijk per situatie: wie budget en transfers wil, zit goed bij F1 Fantasy; wie om prijzen wil spelen, niet bij Predict the Race; wie de app in een andere taal dan Nederlands of Engels wil, ook niet. |

Bovenaan de pagina, vóór het korte antwoord: "Deze vergelijking is geschreven door de maker van Predict the Race."

**over**

| id | kern van het korte antwoord |
|---|---|
| wie | Danny de Visser uit Rotterdam, ook de maker van PadelBracket, begonnen voor zijn eigen vriendenpoule. Danny controleert de formulering. |
| gratis | Geen advertenties en geen abonnement. Hoe de kosten gedekt worden schrijft Danny zelf. |
| techniek | Uitslagen van OpenF1 via een GitHub Action, database op Supabase, hosting op GitHub Pages, broncode openbaar op GitHub. |

### 3.3 Racepagina's (tijdens SEO fase 4)

Per race drie vragen, gevuld uit de data, altijd met jaartal en bron in het antwoord:

- "Wanneer sluit het voorspellen voor de GP van Singapore?" Bij de start van de kwalificatie en van de race, met de tijden uit dezelfde bron als `kalender.ics`.
- "Wie won de GP van Singapore in 2025?" Met de top 10 als tabel.
- "Hoeveel safety cars waren er in de GP van Singapore?" Per editie sinds 2023, bron OpenF1 (GEO fase 3.2).

Het antwoord is een sjabloon met getallen uit `site/data/races-2026.json`. Test: elk getal in de tekst staat ook in de JSON. Is een getal er niet, dan komt de vraag niet op de pagina.

**Klaar als:** de voorpagina heeft 14 vragen per taal, en elke kernpagina heeft een kort antwoord bovenaan en 3 tot 5 vraagblokken, allemaal gelezen door Danny.

---

## Fase 4: onderhoud

- **Elk kwartaal** (januari, april, juli, oktober), 30 minuten: de regex in Search Console, de grounding queries in Bing (GEO fase 6) en een ronde "Mensen vragen ook". Nieuwe vragen gaan in `site/vragen.mjs`. Een nieuwe vraag krijgt een plek in een bestaande sectie of FAQ, alleen een nieuwe sectie als het echt een nieuwe vraag is, en nooit een eigen pagina.
- **Elk nieuw seizoen:** jaartallen en cijfers bijwerken, liefst uit de data zodat het vanzelf gaat.
- **Vergelijking:** elke drie maanden opnieuw controleren. De waarschuwing uit fase 2.6 herinnert je eraan.

---

## Meten

Het AEO-blok in `docs/zoekplan/meting.md`:

| waar | wat | wanneer |
|---|---|---|
| Search Console, Prestaties, met de regex uit 1.1 | vertoningen en klikken op vraag-zoekopdrachten, per pagina | maandelijks |
| Search Console, Search Generative AI-rapport, als het er voor jouw property is | vertoningen per pagina in AI-overzichten en AI Mode. Alleen vertoningen: geen klikken en geen zoekopdrachten | maandelijks |
| Google, met de hand | 10 kernvragen (5 NL, 5 EN) in incognito: staat een pagina van ons in het uitgelichte fragment, onder "Mensen vragen ook", of als bron in het AI-overzicht? | elk kwartaal |
| Bing Webmaster Tools, AI Performance | bij welke zoekvragen Copilot ons aanhaalt (GEO fase 6) | maandelijks |

Volgorde van verwachtingen, geen belofte: eerst geïndexeerd (SEO), dan vertoningen op vraag-zoekopdrachten, pas daarna fragmenten en vermeldingen in AI-overzichten.

---

## Wat we bewust niet doen

- Geen pagina per vraag of per variant van een vraag. Google waarschuwt er zelf voor om aparte inhoud te maken voor elke variant waarop mensen kunnen zoeken.
- Geen tekst opknippen of herschrijven voor AI. Google zegt dat het niet nodig is en dat het lange pagina's met meerdere onderwerpen prima begrijpt.
- Geen FAQ die op meerdere pagina's staat, geen FAQ met vragen die niemand stelt.
- Geen korte antwoorden achter tabs, knoppen of `<details>`.
- Geen HowTo of speakable op nieuwe pagina's.
- Geen `nosnippet` of `data-nosnippet` op indexeerbare pagina's.
- Geen tekst ongelezen publiceren, ook niet als Claude Code hem schreef.

## Bronnen (gecontroleerd 26 september 2026)

- Google, Optimizing your website for generative AI features on Google Search (bijgewerkt 10 juli 2026): https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Search Engine Journal, Google's new AI search guide calls AEO and GEO "still SEO" (mei 2026): https://www.searchenginejournal.com/googles-new-ai-search-guide-calls-aeo-and-geo-still-seo/575026/
- Search Engine Roundtable, Google drops FAQ rich results (mei 2026): https://www.seroundtable.com/google-drops-faq-rich-results-41298.html
- Google Search Central Blog, Search Generative AI performance reports in Search Console (3 juni 2026): https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
