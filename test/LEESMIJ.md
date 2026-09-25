# Tests

Deze map is er voor de CI op GitHub. **De poule zelf heeft geen npm of
build-stap nodig** — `index.html` blijft een bestand dat je
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
| `uitnodiging.test.mjs` | De link met `?code=`: hij wint van de onthouden poule, verdwijnt daarna uit de adresbalk, en een kapotte code zegt dat. Plus je eigen link met `&speler=`, waarmee je op een tweede toestel dezelfde speler bent |
| `duel.test.mjs` | De onderlinge duels tussen spelers, vooral welke weekenden níét meetellen |
| `winnaar.test.mjs` | De losse winnaar van 25 punten |
| `vraagsoorten.test.mjs` | De puntentelling van de losse vragen: vooral dat alleen invullen wat je weet niet minder oplevert dan alles gokken |
| `pole-en-duels.test.mjs` | Diezelfde twee in de app: kiezen, opslaan, terugzien, en dat één keuze per team blijft staan |
| `invulscherm.test.mjs` | Het keuzeblad: een plek aantikken en dán kiezen, P7 vóór P1 kunnen invullen, en dat een halve top 10 niet bewaard wordt |
| `uitslag-delen.test.mjs` | Een race over het hele scherm op een computer (met Escape terug), en het deelplaatje: wat erop staat, gedeelde plekken, jij onderaan als je buiten de rand valt, Delen of Opslaan, en dat Escape alleen het venster sluit. Plus "Deel de stand" op het scherm Stand |
| `verhaal.test.mjs` | Het weekend als verhaal: wanneer het vanzelf opent (en wanneer niet), de schermen, tikken, vasthouden, vanzelf verder, overslaan naar de uitslag, de instelling in Profiel en minder beweging |
| `breed-scherm.test.mjs` | Een race op een groot scherm: vanaf 1280 pixels twee kolommen (uitslag en invullen), breder tot 1240, en daaronder en op een telefoon alles onder elkaar |
| `beheer.test.mjs` | De beheerpagina: binnenkomen ("nog niet ingericht" met de stappen als schema.sql ontbreekt, Google vanaf een anoniem app-toestel zonder de speler kwijt te raken, een tweede toestel waar Google al aan een ander account hangt, een inloglink als tweede keus, een gewoon account ziet niets), de knop "Naar het beheer" in Profiel alleen voor de beheerder, het overzicht met de status van de sync en wat aandacht nodig heeft, poules en spelers beheren, het logboek en de controle bij OpenF1 (gelijk, anders, overnemen, leegmaken, afgelast, onbereikbaar), de grafieken met tooltip en tabel, dat de app één keer per bezoek telt, en dat het beheer los te installeren is |
| `toestemming.test.mjs` | Google Analytics alleen met toestemming: de meet-ID van Predict the Race staat erin; zonder meet-ID niets (geen vraag, geen knop, niets van Google); met de meet-ID één vraag in de taal van de pagina met ja en nee even groot, niets laden tot je kiest, nee blijft nee, ja laadt nu en later, van gedachten veranderen onderaan de pagina en in Profiel (dan stopt Google Analytics en gaan zijn cookies weg), en één keuze voor site en app samen |
| `gewone-taal.test.mjs` | Teksten zonder techniek: geen OpenF1, Supabase, sync of database in de app (behalve de privacyverklaring), wanneer de uitslag er is op een gesloten tabblad, een race zonder coureurs, en foutmeldingen in gewone woorden met de code erbij |
| `racescherm.test.mjs` | Het racescherm in tegels: de vlag en wat je ziet in de kop, je punten met hoeveel exact, je voorspelling als tabel, de poule (op punten, jij geen knop, naar de poulestand), het voorspelscherm met teller, balkje en wie er al ingeleverd heeft, en de zijbalk (pictogrammen, poulecode kopiëren, je naam naar Profiel) |
| `afgelast.test.mjs` | Een race die niet doorgegaan is: hij zegt dat, is niet in te vullen, en een uitslag wint alsnog van de vlag |
| `uitslagen.test.mjs` | De vier losse uitslagen uit de gegevens van OpenF1: vooral welke berichten van de wedstrijdleiding wél en niet een safety car zijn |
| `duel-weergave.test.mjs` | Dat "jij" vaststaat aan je eigen cijfer in het onderlinge duel, en niet aan dat van de tegenstander |
| `poules-en-omschrijving.test.mjs` | De omschrijving van een poule, en meer dan één poule op hetzelfde toestel: wisselen zonder de code, en een poule die weg is |
| `publiek-profiel.test.mjs` | Je seizoen delen: dat de cijfers kloppen met de stand, en vooral dat er geen poulenaam, poulecode of medespeler op de gedeelde pagina staat |
| `contrair.test.mjs` | Punten schalen met hoe zeldzaam je antwoord was: de formule uit ROUTEKAART.md nagerekend op een poule van vier, en dat de top 10 erbuiten blijft. Ook de enige plek met een decimaal op het scherm, dus hier staat de controle of het scheidingsteken bij de taal hoort |
| `push.test.mjs` | Het rekenwerk van web push, nagerekend tegen de testvectoren uit RFC 8291 en 8292. Draait zonder browser |
| `herinneringen.test.mjs` | Wie er een seintje krijgt voor een deadline en vooral wie niet: hooguit één per toestel, niet twee keer dezelfde, en niet als je al invulde. Plus in welke taal, en dat de taal niets verandert aan wie er een krijgt |
| `meldingen.test.mjs` | Het scherm eromheen en wat aanzetten wegschrijft (de taal incluis, want de sync kan die nergens anders halen), plus dat `sw.js` geen fetch-handler heeft — een service worker die verzoeken onderschept kan een oude stand tonen alsof hij klopt |
| `seizoenslaag.test.mjs` | De vier seizoensvragen: vóór de eerste race mag alles, daarna mag je nog invullen wat je niet had, tijdens het seizoen wordt er niets gescoord, en aan het eind komt de uitslag uit de races zelf. Plus de waarschuwing als een race het seizoen tegenhoudt: pas na een week, niet bij een afgelaste race, en met de naam erin |
| `seizoensarchief.test.mjs` | Terugbladeren naar een vorig seizoen: de keuzelijst verschijnt pas bij twee seizoenen, doorschuiven kan pas als het huidige erop zit, en wat er was blijft precies zoals het was. Plus de waarschuwing als een race het seizoen tegenhoudt: pas na een week, niet bij een afgelaste race, en met de naam erin |
| `jokers.test.mjs` | De vijf jokers: aanzetten geldt vanaf nu, een joker verdubbelt het weekend in de kalender én in de stand, en zodra het weekend begint ligt hij vast |
| `talen.test.mjs` | De app in het Nederlands en het Engels: dat de browser beslist zolang jij niets kiest, dat jouw keuze daarvan wint en blijft staan, en twee controles op de woordenlijst zelf — geen dubbele sleutels, geen scheve {plaatshouders}, geen sleutel die nergens in de code staat, en geen zichtbare tekst die buiten `T()` om op het scherm komt. Plus de klok en de kalender, want die horen net zo goed bij de taal als de zinnen |
| `sprintweekend.test.mjs` | De derde sessie: dat een gewoon weekend er geen tab bij krijgt, dat een sprintweekend er wel een heeft en vóór de kwalificatie, dat hij voor halve punten telt, en dat automatisch invullen hem overslaat |
| `poule-aanmaken.test.mjs` | Het aanmaken in vier stappen: de presets, de losse vragen met hun live puntentotaal, de gokwaarschuwing, en wat er in de database belandt |
| `vragen-beheren.test.mjs` | De vragenset aanpassen onder Poule, en dat er niets meer verandert zodra hij op slot zit |
| `snelste.test.mjs` | De snelste ronde en de snelste pitstop, inclusief zelf invullen als OpenF1 ze niet heeft |
| `safetycar-en-vlag.test.mjs` | De laatste twee vragen, en vooral dat "nul" en "nee" echte antwoorden zijn |
| `scorelijst.test.mjs` | De puntentelling, inclusief het cascade-geval waarvoor die formule is gekozen |
| `terugkijken.test.mjs` | Dat je eigen inzending na de deadline zichtbaar blijft maar niet meer te wijzigen is, en dat andermans keuze pas na sluiting open gaat |
| `wis-alles.test.mjs` | De wis-allesknop: twee tikken, en dat hij alleen het tabblad wist waar je op staat |
| `kalender-en-coureurs.test.mjs` | Het testrecord Kuala Lumpur uit de kalender van OpenF1, wanneer de deelnemerslijst opnieuw opgehaald wordt, en dat een rondenummer nooit van race wisselt |
| `knipsel.test.mjs` | Dat de rekenkern nog uit `index.html` te knippen is en klopt — de audit draait erop |
| `account.test.mjs` | Het anonieme account: dat rondkijken er geen aanmaakt, dat een geclaimde speler nooit overgenomen wordt, en dat een gedeeld toestel gewoon een tweede speler mag inschrijven |
| `terugblik.test.mjs` | Je blinde vlek en het zwaarste weekend — en vooral wannéér de app zijn mond houdt: een gemiddelde over twee weekenden is toeval, geen patroon |
| `bijna-goed.test.mjs` | "Zo dichtbij": welke bijna-treffers wel en niet meetellen (drie plekken ernaast is niet bijna, een uitvaller telt nergens mee), en dat het ook echt op het scherm belandt |
| `agenda.test.mjs` | De agenda met alle deadlines: dat hij aan de standaard voldoet, dat een item na een verzetting vervangen wordt in plaats van verdubbeld, en dat een race zonder tijd geen item in 1970 oplevert |
| `eerste-indruk.test.mjs` | Wat een vreemde ziet die zonder uitnodiging binnenkomt: uitleg voor wie hem nodig heeft, weg voor wie niet, en het codeveld blijft bovenaan. Plus het PWA-manifest en de pictogrammen |
| `privacy.test.mjs` | Het blok "wat de app van je weet": dat het klopt wat erin staat, dat de pagina niets bij een vreemde host ophaalt, en dat de twee knoppen om weg te gaan ook echt verschillen |
| `eigen-inzending.test.mjs` | Wat de app laat zien als de database het schrijven weigert: uitleg in plaats van stilte, en de losmaakknop van de poulebaas |
| `google.test.mjs` | Inloggen met Google: dat het aan je bestaande account hangt in plaats van een tweede te maken, dat de voordeur een poulecode blijft, en dat iemand anders zijn Google-account niet in jouw speler belandt |
| `mailkoppeling.test.mjs` | Je account meenemen met een mailadres: dat "gestuurd" niet "gekoppeld" is, dat een onbekend adres geen leeg account maakt, en vooral dat de sleutel uit de inloglink niet voor een poulecode wordt aangezien |
| `lange-namen.test.mjs` | Dat een naam die niet past zijn volledige tekst als title meekrijgt en een naam die wél past juist niet, dat het "jij"-label uit de stand niet in die tooltip belandt, en dat het de breedte volgt: breder maken haalt de tooltip weer weg |
| `toegankelijk.test.mjs` | Loopt alle zes de schermen af in plaats van losse gevallen te noemen, zodat een scherm dat er later bij komt vanzelf meegekeurd wordt: heeft elke knop een naam, elk invoerveld een échte `<label for=>`, elke afbeelding een alt, en heeft elk scherm een h1 zonder een koppenniveau over te slaan. Plus de bewegingsvoorkeur: met "liever minder beweging" staan alle animaties en overgangen uit, en zonder die voorkeur juist niet — anders meet de eerste helft niets |
| `focus.test.mjs` | Dat de focus een hertekening overleeft: na een schermwissel én na een tabwissel binnen hetzelfde scherm staat hij nog op de knop die je indrukte, mét zichtbare ring. Verdwijnt die knop, dan valt hij op de nieuwe inhoud en niet op de body — anders begint de volgende Tab weer bovenaan. En hij wordt niet gestolen van waar hij al stond |
| `omroep.test.mjs` | De omroep voor schermlezers: dat het vak buiten `#app` staat en over hertekeningen heen hetzelfde element blijft (een live region die tegelijk met zijn inhoud ontstaat wordt niet voorgelezen), dat meldingen én foutregels erin belanden langs welk tekenpad ook, en dat dezelfde fout een tweede keer opnieuw geroepen wordt — met de lege tussenstap die daarvoor nodig is |
| `vangnet.test.mjs` | Het vangnet onder het tekenen: dat een fout midden in een scherm een leesbare uitweg oplevert in plaats van een wit vlak, dat de fout wél gewoon in de console blijft staan (een vangnet dat bugs onzichtbaar maakt is erger dan geen vangnet), en dat "opnieuw proberen" iets anders doet dan dezelfde klap herhalen |
| `site.test.mjs` | De landingspagina in zeven talen: de generator is gedraaid, per taal de juiste taal, titel- en omschrijvingslengte, één h1, canonical en wederkerige hreflang, geldige JSON-LD waarvan de FAQ woord voor woord op het scherm staat, de punten uit de app, contrast in licht en donker, geen horizontale scroll. Plus: niets van andere hosts, geen 404, de app op noindex, en sitemap, robots.txt, llms.txt en 404.html |
| `doorsturen.test.mjs` | Van `/` naar de app: uitnodigingen, je eigen link, profielen, inloglinks (query en hash), een app op het beginscherm van een iPhone en een terugkerende speler komen in `app/` uit met alles erbij; een nieuwe bezoeker, een linkvoorbeeld van een berichtenapp (standalone, niets op het toestel), een campagnelink, een ankerlink en iemand die vanaf een eigen pagina klikt blijven op de landingspagina. Plus het codeveld, de agendalink, en "Naar de voorpagina" onder Profiel: daar blijf je, ook in een iPhone-beginschermapp, en in het Engels op `/en/` |
| `beelden.test.mjs` | Het logo en de deelplaatjes: elk pictogram op zijn maat, een aparte maskable versie in het manifest die de P binnen de veilige cirkel houdt, het iPhone-pictogram zonder doorzichtigheid, de meldingsbadge als witte vorm, het logo in de kop (oranje P op doorzichtig, zonder schaduw) in de app en op elke pagina van de site in plaats van het rode blokje, `favicon.ico` met 16/32/48, en per taal een eigen deelplaatje van 1200×630 onder de 300 kB. Elke pagina wijst naar favicon en iPhone-pictogram |
| `privacypagina.test.mjs` | De privacyverklaring als losse pagina (`/privacy/`, `/en/privacy/`): hetzelfde contactadres als de app, dezelfde diensten (Supabase, OpenF1, esm.sh, GitHub Pages, Google, Apple, Mozilla) en dezelfde beloften als de verklaring in de app, in beide talen. Taal, titel, één h1, canonical, hreflang, geen verzoek naar buiten, geen kapotte link, contrast, geen horizontale scroll. Elke landingspagina en de app linken ernaar, de app in zijn eigen taal |
| `domein.test.mjs` | Eén domein op één plek: `BASIS` in `site/teksten.mjs` is een kaal https-adres, `APP_URL` in de sync wijst naar `<BASIS>/app/` en de workflow zet hem nergens anders heen, `CNAME` (zodra GitHub hem erin zet) noemt precies dat domein, en geen geserveerd bestand noemt nog `dannydevis.github.io`. De app, de service worker en het manifest noemen helemaal geen vast adres |
| `sync-seizoenen.test.mjs` | Welke seizoenen de sync onder handen neemt, van oktober tot januari nagespeeld: het volgende jaar gaan zoeken vanaf twee maanden voor de finale, het oude jaar loslaten tien dagen na de laatste herkeuring, een race die blijft hangen houdt het oude jaar open, en een lege database begint bij het jaar van vandaag. Draait zonder browser |
| `jaarwisseling.test.mjs` | Dezelfde jaarwisseling met de échte `scripts/sync.mjs`, als los proces tegen een nagebootste OpenF1 en Supabase: zolang OpenF1 niets heeft blijft het bij één verzoek per ronde en blijft de agenda staan, zodra het volgende jaar er is komt het erin met de goede deadlines, in januari laat de sync het oude jaar met rust, en de dagelijkse ronde trekt een verschoven race recht. En dat elke run een regel in het logboek schrijft (ook een mislukte), en dat een database zonder logboek de sync niet stopt. Elke controle is nagelopen met een mutant die de verbetering terugdraait |
| `seizoenseinde.test.mjs` | Het racesoverzicht als het seizoen erop zit: de poulebaas krijgt daar de knop om door te schuiven, de rest leest waar het op wacht, en zonder kalender van volgend jaar zegt het overzicht eerlijk dat die nog komt |
| `ontwerp.test.mjs` | Het derde ontwerp in maten in plaats van plaatjes: dat elke banner (melding, lege staat, uitleg, "zo dichtbij") dezelfde vorm heeft, een effen rand en een tekentje ervoor; dat de uitslag en de stand één kaart zijn waarvan de regels tegen elkaar aan liggen; en dat er alleen iets beweegt als het nieuw is — een ander scherm, een nieuwe melding, de ene plek die je net vulde — en niet bij elke keer opnieuw tekenen. Met "minder beweging" beweegt er niets. Elke controle is nagelopen door de verbetering weg te halen en te zien dat hij zakt |
| `beheer.test.sql` | Het beheer: beheerder word je alleen met het bevestigde beheeradres (een onbevestigd adres telt niet, een account van na het draaien van schema.sql wel), of via `site_beheerders`, iedereen anders krijgt een fout (ook een poulebaas), de tabellen erachter zijn dicht, en wat de beheerfuncties laten zien en doen klopt: tellingen, het soort account, poules en spelers bijwerken en weggooien (ook met inzendingen voor een gesloten race), een uitslag overnemen of leegmaken, afgelasten, en de bezoekersteller |
| `seizoenswissel.test.sql` | De jaarwisseling in de database: de controletabel schuift door naar het volgende seizoen zodra het huidige erop zit (behalve als er een race blijft hangen), en een nieuwe poule begint in het seizoen van de eerstvolgende race in plaats van in het laatste jaar dat in de tabel staat |
| `vragen.test.sql` | De vragenlijst: dat de presets uit BEDIENING.md kloppen met de punten in de database, en dat vinkjes en antwoorden meegaan als een poule weggaat |
| `jokers.test.sql` | De jokerregels waar de app niet omheen kan: vijf per seizoen, één per weekend, vast zodra dat weekend begint — en dat een cascade (poule of speler weg) er wél langs mag |
| `seizoenslaag.test.sql` | Wanneer een seizoensantwoord vastligt: vóór de eerste race mag alles, daarna mag je nog invullen wat je niet had maar niets meer veranderen of weghalen, en na de laatste race komt er niets meer bij. Plus dat een cascade er wél langs mag |
| `controle.test.sql` | De controletabel die je onderaan `schema.sql` te zien krijgt: dat een ontbrekende vraag gemeld wordt, dat de presets 100 / 145 / 202 per weekend zijn met sprint en seizoen er apart onder, en dat alle zeven handmatig-vlaggen meetellen. Plus of het seizoen ooit afrondt — blijft er één race hangen, dan worden de seizoensvragen nooit gescoord. Hij was verouderd, en een controle die het verkeerde meldt is erger dan geen controle. Sinds §6 ook de jokergrens: staat de check 1 t/m 5 er, staat de bewaking tegen verlagen er, en wijkt er een poule af — met alle drie de uitkomsten langsgelopen, want een regel die alleen 'ok' kan zeggen controleert niets |
| `schema-gedrag.test.sql` | De deadline-trigger en het upsert-gedrag op `answers`, tegen een echte PostgreSQL. Zet aan het eind een database van vóór de migratie klaar voor `schema-herstel.test.sql` |
| `schema-herstel.test.sql` | Wat een tweede run van `schema.sql` doet op een database van vóór de migratie: de oude `predictions`-tabel wordt eerst leeggehaald naar `answers` — óók voor een race waarvan de deadline al verstreken is — en pas daarna gedropt. Met de drie gevallen die mis kunnen gaan: een rij die nergens anders stond, twee dubbele rijen waarvan de nieuwste moet winnen, en een rij naar een verdwenen race die overgeslagen hoort te worden in plaats van de migratie te laten klappen |
| `verwijderen.test.sql` | "Verwijder mijn account" in twee smaken: alleen het account (de stand van de anderen blijft kloppen) of alles, en dat een poule zijn eigenaar kwijtraakt in plaats van naar een verdwenen speler te wijzen |
| `policies.test.sql` | De belofte waarvoor de login gebouwd is: je eigen inzending is van jou. Plus wat er níét dichtgaat — lezen blijft open, en een speler zonder account blijft beschrijfbaar |
| `lidmaatschap.test.sql` | `is_member()`: je eigen poule wel en die van een ander niet, dat een speler zonder account niemand binnenlaat, en dat je account verwijderen je spelers meeneemt |
| `auth-nabootsing.sql` | Geen test maar gereedschap: bootst `auth.users` en `auth.uid()` na zoals Supabase ze levert, zodat de policies lokaal en in de CI te draaien zijn |
| `races-alleen-lezen.test.sql` | Dat `anon` en `authenticated` de uitslagen wel mogen lezen maar niet schrijven — races wordt door alle poules gedeeld |
| `oude-structuur.sql` + `-controle.sql` | Of `schema.sql` een oudere tabelopzet rechtzet zonder gegevens te raken (fout 42830) |

De browsertests draaien `index.html` echt in Chromium, met de import van
supabase-js vervangen door `nabootsing-supabase.mjs`: een kleine
nabootsing die net als Postgres een unieke sleutel afdwingt — op `answers`
is dat `(pool_id, race_id, member_id, question_id)`, één rij per ingevulde
vraag.

`uitslagen.test.mjs` en `agenda.test.mjs` zijn de enige die geen browser nodig
hebben. De eerste draait de functies uit `scripts/uitslagen.mjs` op berichten
die letterlijk uit OpenF1 komen; de tweede maakt de agenda uit
`scripts/agenda.mjs` en leest hem na. Allebei die modules staan los van
`sync.mjs` omdat dat bestand zichzelf uitdraait zodra je het importeert — een
test die dat deed zou de echte database aanraken.

Naast deze tests staan er drie gereedschappen met een knop in het
Actions-tabblad, die geen van drieën iets wegschrijven:

- `scripts/verkennen.mjs` — wat heeft OpenF1 voor een race? Ook
  `COUREURS=Monza` (deelnemers van de kwalificatie naast die van de race) en
  `KALENDER=1` (de kalender nakijken op races die er niet in horen).
- `scripts/controle-stand.mjs` — de echte scoreregels, uit `index.html`
  geknipt, tegen een verse kopie van de echte database.
- `scripts/controle-coureurs.mjs` — staat er in de database nog dezelfde
  deelnemerslijst als die OpenF1 nu geeft?

Over dat knippen: `index.html` heeft geen bouwstap, dus de rekenkern is niet te
importeren. `scripts/knipsel.mjs` haalt hem eruit tussen merktekens
(`// <knip primitieven>`). Dat ging eerder op regelnummers en die schoven mee
met elke bewerking erboven, tot het blok midden in een functie begon.
`knipsel.test.mjs` bouwt de kern nu bij elke pull request op en rekent er een
uitkomst mee na, zodat die breuk niet meer pas op een runner zichtbaar wordt.

Over `scripts/verkennen.mjs`: Die schrijft niets weg en laat zien wat OpenF1 voor een
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
