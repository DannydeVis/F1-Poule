# Predict the Race: bediening en schermindeling

Ontwerp voor de navigatie en het aanmaakproces. Hoort bij `ROUTEKAART.md`.

> **Sinds 24 september 2026 staat de app in `app/index.html`.** In de hoofdmap
> staat nu de landingspagina (zie `OVERDRACHT.md`, "Een landingspagina in zeven
> talen"). Waar hieronder `index.html` staat, is de app bedoeld.

---

## 1. Wat er eerst moet gebeuren

Vinkjes bij het aanmaken vragen om een `questions`-tabel met een rij per
vraag, in plaats van vaste kolommen `quali_top10` en `race_top10`.

**Doe die migratie nu.** Er is nog geen seizoen aan echte voorspellingen om
over te zetten. Over tien races is dezelfde wijziging een stuk vervelender.

Bundel het met minstens vier extra vragen, anders toont het keuzescherm twee
vinkjes en heeft het geen zin:

- Winnaar (25 punten)
- Pole (10 punten)
- Aantal safety cars (12 punten, tolerantie)
- Rode vlag ja/nee (20 als het gebeurt, 3 als het niet gebeurt)

---

## 2. Navigatie: vaste balk onderin

De huidige opzet stapelt schermen met een Terug-knop. Dat houdt op zodra
weekendwinnaars, duels en handmatige invoer erbij komen.

Vier tabs, vast onderin beeld:

```
┌─────────────────────────────────────┐
│                                     │
│           schermruimte              │
│                                     │
├─────────────────────────────────────┤
│ Races    Stand    Poule   Profiel   │
└─────────────────────────────────────┘
```

### Races

**Bovenaan: de weekendkaart.** Die beantwoordt in deze volgorde de drie vragen
waarmee iemand de app opent:

1. **welke race komt eraan** — het rondenummer klein, het circuit groot, met de
   afteller tot de eerstvolgende deadline en de vijf startlampjes;
2. **moet ik nog iets doen** — per sessie van dít weekend een vinkje:
   `✓ klaar`, `· deels`, `! open`, of `~ automatisch` voor een lijst die de app
   zelf invulde. Op een sprintweekend staan er drie in plaats van twee. Daarna
   één knop, en die wijst naar de sessie die nog ópen is en nog niet af — niet
   naar de eerstvolgende deadline. Wie de kwalificatie al deed terwijl de race
   nog open staat kreeg anders "bekijken" te lezen terwijl er juist werk lag;
3. **hoe sta ik ervoor** — je plek, je punten en wat het vorige weekend
   opleverde, als drie grote getallen onder een streep. Speel je in je eentje,
   dan valt die regel weg: "1e van 1" is geen informatie.

Daaronder de kalender, in twee lijsten: eerst wat er nog komt, daarna wat er
gereden is (nieuwste eerst), met per gereden race je punten en wie dat weekend
won.

Een race opent over het hele scherm, ook op een computer: de lijst gaat
opzij, de race staat in het midden (hooguit 880 pixels breed) en linksboven
staat de pijl terug. Escape doet hetzelfde.

Onder een uitslag staat **Deel de uitslag**. Dat maakt een plaatje van 1080
bij 1350 met de weekenduitslag van de hele poule, de weekendwinnaar en de top
3 van het seizoen, in de letters en kleuren van de app en altijd donker. Je
ziet het eerst in een venster, met daaronder:

- **Delen** op een telefoon: het deelmenu van het toestel, dus rechtstreeks
  naar WhatsApp, Instagram of Berichten. Op een computer die geen bestanden
  kan delen heet die knop **Opslaan** en wordt het een download.
- **Kopieer plaatje**, om het in WhatsApp Web te plakken.
- **Kopieer als tekst**: de oude tekstversie, voor wie die liever heeft.

Past niet iedereen op het plaatje, dan staat er "en nog 4", en sta jij er
toch op, onderaan. Het adres onderaan komt uit de adresbalk, niet uit de code.

**Het weekend als verhaal.** Is de uitslag van de race binnen, dan speelt de
app het weekend één keer af, zoals een story op Instagram: de startlichten en
de race, je punten per sessie (je top 10 als tijdenbord: paars exact, groen
één ernaast, amber twee), je weekend bij elkaar, wie er won, en wat het met
de stand deed. Rechts tikken is verder, links terug, vasthouden pauzeert, en na
een paar seconden gaat hij vanzelf door. **Overslaan** (of Escape) gaat meteen
naar de uitslag; aan het eind staan **Bekijk de uitslag** en **Deel de
uitslag**.

Wanneer hij vanzelf komt:

- alleen voor de laatste race met een uitslag, tot tien dagen na de start;
- alleen als je dat weekend zelf iets had ingeleverd;
- één keer per toestel;
- alleen op het overzicht. Wie een race aan het invullen is of in de stand
  zit, krijgt hem pas als hij terug is op het overzicht.

Onder elke uitslag staat **Speel het weekend af** om hem opnieuw te zien. In
Profiel zet je het vanzelf afspelen uit.

### Stand
Op één scherm, gescheiden door koppen:
- **Seizoensstand.** Per speler de plek, de punten, en het verschil met de
  volgende. Bij gelijke punten gelijke plek (1, 1, 3): wie op alfabet boven
  de ander staat, staat daarmee niet hoger. Daarbij `↑1` / `↓2` sinds de
  vorige race, ook in gedeelde plekken — geen pijltje als er niets
  veranderde, en geen pijltjes na één race, want dan is iedereen nieuw.
  En een reeks (`5×`) vanaf drie weekenden op rij ingeleverd; automatisch
  aangevulde weekenden tellen daar niet voor mee.
- **Jouw seizoen.** Je positie per race als lijn, met eronder waar je begon,
  je beste en slechtste plek, en waar je nu staat. Vanaf drie gereden races en
  alleen in een poule van twee of meer. Met de hand getekende SVG, geen
  bibliotheek.
- **Weekendoverwinningen** (wie won de meeste losse weekenden)
- **Onderlinge duels** (jij tegen elke andere speler)

Onder de stand staat **Deel de stand**: hetzelfde venster als bij een
uitslag, met een plaatje van de hele seizoensstand. Daarop staan de naam van
de poule, na hoeveel races, de koploper, en iedereen met zijn punten en wie er
sinds de vorige race geklommen of gezakt is. Ook hier kan de stand als tekst.

### Poule
Leden, poulecode, uitnodiglink met deelknop, en de instellingen. Voor de
poulebaas staat hier ook het beheergedeelte: welke vragen meedoen, de
omschrijving van de poule. Onderaan je andere poules om naar over te stappen.

### Profiel
Alles wat over jou gaat, niet over de poule: als wie je hier speelt, je
account koppelen aan een mailadres of Google (zie §7), je eigen link om
jezelf naar een ander toestel mee te nemen (zie §4), wat de app van je weet
en hoe je dat weghaalt (zie §12), en — alleen als er een weg terug is —
uitloggen. Ook: of de app het weekend vanzelf afspeelt als de uitslag binnen
is (zie Races).

Helemaal onderaan: **Naar de voorpagina**. Wie een poule op zijn toestel heeft,
gaat vanaf predicttherace.com meteen de app in. Deze knop is de weg terug naar
de voorpagina, in de taal van de app, en daar blijf je dan ook, ook in een app
op het beginscherm van een iPhone.

---

## 3. Poule aanmaken: vier stappen

Eén vraag per scherm. Werkt beter op een telefoon dan een lang formulier.

### Stap 1: Hoe heet de poule
Twee velden: de naam, met "Vrijdagmiddagpoule" als voorbeeld eronder, en een
omschrijving die leeg mag blijven ("Met de collega's, om de eer"). Die
omschrijving is er voor wie in meer dan één poule zit: twee poules die allebei
"Poule 2026" heten zijn uit elkaar te houden aan waar ze over gaan. Hij staat
onder de naam en in het lijstje waarmee je tussen poules wisselt, en de
poulebaas kan hem later aanpassen onder Poule.

### Stap 2: Hoe heet jij
Je wordt meteen het eerste lid, en de eigenaar van de poule.

### Stap 3: Wat gaan jullie voorspellen

Drie knoppen, groot en tikbaar:

| Preset | Bevat | Punten per weekend |
|---|---|---|
| **Simpel** | Top 10 kwalificatie, top 10 race | 100 |
| **Klassiek** | + winnaar, pole, snelste ronde | 145 |
| **Gevorderd** | + safety cars, rode vlag, snelste pitstop, teamgenoot-duels, top 10 sprint, de vier seizoensvragen | 202 |

Daaronder een regel **Zelf samenstellen**, die pas een lijst met vinkjes
openklapt als je erop tikt. Bij elk vinkje staat het aantal punten, en
onderaan telt hij live op: "Maximaal 178 punten per weekend."

Die 202 is **per weekend**. De top 10 van de sprint (25) en de vier
seizoensvragen (samen 150) staan er los van, want die komen niet elk weekend
langs — zie hieronder. Draai je `schema.sql` en zie je onderaan de regel
"punten per weekend", dan horen daar dezelfde drie getallen te staan.

**De sprint telt niet mee in dat maximum.** Hij bestaat op zes van de
vierentwintig weekenden; hem meetellen zou het maximum achttien keer per
seizoen te hoog zetten. Staat de vraag aan, dan komt er een regel onder:
"Op een sprintweekend komt daar 25 bij, voor de top 10 van de sprint."

Standaard staat **Klassiek** geselecteerd. Wie doorklikt zonder na te denken
krijgt daarmee iets dat leuker is dan alleen twee top-tienen, zonder overweldigd
te worden.

### Stap 4: Klaar, nodig je vrienden uit

Toont de poulecode groot, plus een deelknop met de uitnodiglink erin:

```
https://predicttherace.com/app/?code=10D4FD
```

Wie die link opent slaat het codescherm over en komt direct bij "hoe heet jij".

---

## 4. Meedoen met een poule

Drie routes:

**Via de uitnodiglink** (`?code=...`): direct naar "hoe heet jij", geen code
intypen. Dit wordt de standaardroute, want zo deel je hem in de groepsapp.

**Via de code**: invoerveld op het startscherm voor wie de link kwijt is.

**Via de lijst met openbare poules**: voor wie geen code én geen link heeft.
Alleen poules die de poulebaas bewust openbaar heeft gezet staan hierin; zie
§5a. Een klik werkt verder identiek aan de code invullen.

Daarna in alle gevallen: kies jezelf uit de lijst als je er al in staat, of
maak jezelf aan als nieuwe speler.

**Via je eigen link** (`?code=...&speler=...`): voor jezelf, niet om te delen.
De app weet alleen per toestel wie je bent, dus wie op zijn telefoon én op zijn
laptop meedoet maakt zichzelf twee keer aan en ziet zijn punten over twee
spelers verdeeld. Deze link zet je op het tweede toestel meteen als dezelfde
speler neer. Hij staat onder Profiel, met de waarschuwing erbij: wie hem heeft
speelt onder jouw naam.

Staat de speler uit de link niet (meer) in de poule, dan gedraagt hij zich als
een gewone uitnodiging en kom je op "wie ben jij?" uit. Een foutmelding over
een id dat niemand herkent helpt niemand.

---

## 5. Startscherm bij binnenkomst

De app onthoudt in `localStorage` in welke poules je zit. Bij binnenkomst:

- **Nul poules bekend**: keuze tussen meedoen en aanmaken, met meedoen bovenaan
  (dat is verreweg het vaakste geval)
- **Eén of meer poules bekend**: direct terug naar precies het scherm waar je
  was — de kwalificatie of race die je open had staan, met het juiste
  tabblad, of de Stand- of Poule-tab. Een verdwenen race (bijvoorbeeld eentje
  die inmiddels is doorgestreept) wordt overgeslagen; dan land je op de
  Races-tab

Dat laatste wijkt af van het oorspronkelijke plan, waarin je bij meer dan één
poule eerst een lijstje kreeg. In de praktijk speel je vrijwel altijd in
dezelfde poule verder, en dan is een keuzescherm ertussen een extra tik. Het
lijstje staat er wel, op de twee plekken waar je het nodig hebt: onderaan de
Poule-tab ("jouw andere poules"), en op het startscherm zodra je op **Wissel**
hebt gedrukt — die knop staat in de zijbalk, naast de poulenaam, en is dus op
elk tabblad en in elk racescherm bereikbaar in plaats van ergens onderaan een
tabblad.

Wisselen haalt de poule opnieuw uit de database op in plaats van uit het
lijstje: de naam of de omschrijving kan veranderd zijn, en een poule die
verwijderd is hoort uit het lijstje te verdwijnen in plaats van je op een leeg
scherm te zetten.

### 5a. Openbare poules

Standaard blijft een poule alleen bereikbaar met de code — dat is en blijft
de snelste weg voor verreweg de meeste mensen, en verandert hier niet.
Openbaar voegt alleen een tweede weg toe: onder **Poule** kan de poulebaas
(`magBeheren()`) de poule "openbaar" zetten, en dan verschijnt hij op het
beginscherm in een dichtgeklapte lijst "Blader door openbare poules" —
bewust achter een knop, niet meteen zichtbaar, want dit is de uitzondering,
niet de voordeur.

Dit is geen nieuwe blootstelling: `pools_lezen` in `schema.sql` stond al open
voor iedereen met de anon key, dus wie de poule kon *raden* kon hem al lezen.
`is_public` verandert alleen of hij in een lijst staat, niet wie hem mag
lezen — "privé" betekent nog steeds precies wat het al betekende.

Let op wat dit lijstje **niet** is: het staat in `localStorage`, dus het is per
toestel. Wie op zijn telefoon én op zijn laptop speelt heeft twee lijstjes. Eén
lijst over al je toestellen vraagt om een login; zie OVERDRACHT.md.

### 5b. De inlog op het beginscherm

Onder het codeveld staat een blok **inloggen**: een Google-knop met het
officiële logo en gewone schrijfwijze, en daaronder "Inloggen met je
mailadres" (een inloglink, geen wachtwoord). Beide zijn er alleen voor wie
zijn account al gekoppeld heeft; wie dat niet heeft, tikt gewoon zijn
poulecode in.

Twee dingen liggen hier vast, en ze werken tegen elkaar in:

- **De poulecode blijft de voordeur.** Hij staat erboven en houdt als enige
  de primaire (rode) knop. De inlog is de tweede optie, niet de eerste.
- **Maar hij moet er wel uitzien als een inlog.** Hij stond eerst helemaal
  onderaan — ónder het aanmaken, de openbare poules én de uitleg — in de
  lichtste knopstijl die de app kent, met een voorwaardelijke zin ervoor.
  Daardoor herkende niemand het als inloggen. `test/eerste-indruk.test.mjs`
  bewaakt nu allebei: de inlog staat boven "Nieuwe poule maken", en de
  Google-knop draagt het echte logo.

Het logo zit **inline als SVG** in `index.html`, niet als `<img>` van een
vreemde host: de privacyverklaring belooft dat deze pagina niets elders
ophaalt, en `test/privacy.test.mjs` rekent daarop af.

Geen wachtwoord, met opzet — zie §12. De inloglink bewijst hetzelfde (dat het
adres van jou is) zonder dat iemand iets kan vergeten, en Google doet het in
één tik.

---


### Wie hier voor het eerst komt

Onder het codeveld staat een blok **wat is dit?**: kort wat je voorspelt, hoe
het scoren werkt, dat de uitslagen vanzelf binnenkomen, en dat het gratis is,
zonder wachtwoord en zonder geld erin.

Twee regels die tegen elkaar in werken, en allebei gelden:

- **Alleen voor een leeg toestel.** Staan er al poules in `mijnPoules()`, dan
  verdwijnt het blok. Wie het spel kent wil doorklikken, niet opnieuw uitgelegd
  krijgen wat hij al weet.
- **Onder het codeveld, nooit erboven.** Wie een uitnodiging heeft moet zijn
  code meteen kunnen intikken zonder eerst langs een uitleg te scrollen.

`test/eerste-indruk.test.mjs` houdt allebei vast, inclusief de volgorde op het
scherm.

### Op het beginscherm zetten

Er is een `manifest.webmanifest`, dus "zet op beginscherm" geeft een echte
app-tegel in een eigen venster in plaats van een browsersnelkoppeling. Een
poule-app leeft op een telefoon, dus dat is geen franje.

De pictogrammen staan in `pictogrammen/` en zijn `maskable`: Android snijdt ze
in de vorm van het toestel, en alles wat telt blijft binnen de veilige zone.
Het motief is het startgrid met één vak in het accent — de pole. Dat ene vak
ís waar de app over gaat: één keuze die eruit springt op een grid. Eerder
wisselden alle vakken om en om van kleur, en dan is het een streepjespatroon;
op een tegel van 48 pixels leest dat als ruis in plaats van als één ding.
Ze worden gemaakt door `scripts/maak-pictogrammen.py` — met de hand, want er is
geen beeldbibliotheek en er hoeft er ook geen te komen: het motief is het
startgrid uit het ontwerp, en dat bestaat uit rechthoeken.

iOS krijgt een eigen pictogram, `predicttherace-apple-180.png`. Apple snijdt namelijk
niet, het legt er alleen ronde hoeken omheen — de veilige zone van een maskable
icoon is daar dus verspilde ruimte en het motief zou klein uitkomen met een
brede rand. Vandaar een vullende variant, uit hetzelfde script.

**Het blok "op je beginscherm".** Installeerbaar zijn is niet hetzelfde als
gevonden worden: onderaan het beginscherm staat sinds kort een blok dat het
aanbiedt. Er zijn twee wegen, want de browsers zijn het oneens:

| | wat de speler ziet |
|---|---|
| Android / Chrome | een echte knop **Zet op beginscherm** die de installatie start |
| iPhone / iPad | de instructie *Tik onderin op ⤴ Deel en kies Zet op beginscherm* |

Op Android vangen we `beforeinstallprompt` op, roepen `preventDefault()` (anders
zet Chrome zijn eigen balk onderin) en bewaren het event, zodat onze eigen knop
hem later kan afvuren. Zo'n event is eenmalig: na één keer prompten is hij op en
verdwijnt de knop, tot de browser hem opnieuw aanbiedt.

Safari kent die API niet, dus daar hangt alles aan de user agent. Let op dat een
iPad zich sinds iPadOS 13 als een Mac meldt — het aanraakscherm
(`navigator.maxTouchPoints`) is wat hem verraadt.

Het blok verdwijnt in drie gevallen: de app draait al als app
(`display-mode: standalone` of `navigator.standalone`), de speler tikte op
**Nu niet** (`poule:installweg` in localStorage, definitief), of de browser kan
het niet en het is geen Apple-toestel — dan beloven we niets.

`test/beginscherm.test.mjs` legt allebei de wegen vast, plus het wegklikken en
het manifest zelf.
## 6. De vragenset op slot

Zodra de eerste race van het seizoen gescoord is, worden de vinkjes in
Poule → beheer alleen-lezen, met een regel eronder:

> De vragenset ligt vast sinds Melbourne. Zo blijven alle races vergelijkbaar.

Technisch: een veld `questions_locked` op de poule, gezet door de scoringslogica
zodra de eerste race een uitslag krijgt.

### 6a. Automatisch invullen bij vergeten

Staat uit. De poulebaas zet hem aan in Poule → beheer, en vanaf dat moment
krijgt wie een top 10 vergeet de WK-stand van dat moment als lijst, zichtbaar
gemarkeerd als automatisch. Dat levert ongeveer de helft op van wat een goede
lijst doet: genoeg om aangehaakt te blijven, te weinig om vergeten lonend te
maken.

Vier dingen die daarbij vastliggen:

- **Geen terugwerkende kracht.** `pools.autofill_vanaf` bewaart *wanneer* het
  aanging, niet dát het aanstaat. Alleen deadlines na dat moment tellen mee, dus
  aanzetten verandert nooit een stand die er al was. Uitzetten wist het moment;
  opnieuw aanzetten begint dus ook opnieuw en vult de tussenliggende races niet
  alsnog in.
- **Er wordt niets weggeschreven.** De lijst bestaat alleen in het geheugen van
  de app en wordt bij elke keer laden opnieuw uitgerekend. Uitzetten haalt hem
  daarmee ook echt weg, en niemands inzending raakt vervuild met een keuze die
  hij niet zelf maakte.
- **Je wint er geen weekend mee.** De seizoensstand telt de punten gewoon mee —
  dat is het hele doel — maar `weekendWinnaars()` slaat automatisch ingevulde
  inzendingen over. Ook het Q/R-vinkje op de racelijst blijft leeg, en het
  onderlinge duel telt het weekend niet als gespeeld.
- **Per lijst, niet per weekend.** Wie de kwalificatie invulde en de race vergat
  krijgt alleen die tweede aangevuld.

Voor de eerste race van een seizoen gebeurt er niets: er is dan nog geen
uitslag om een WK-stand uit te maken. De stand wordt trouwens berekend uit de
races *vóór* dat weekend, niet uit de huidige — anders zou de score van een
race in mei nog veranderen door wat er in september gebeurt.

### 6b. Jokers

Staat ook uit. De poulebaas zet hem aan in Poule → beheer, en kiest daar ook
**hoeveel jokers iedereen krijgt: één tot vijf** (standaard vijf). Je legt er een op een weekend en dat
hele weekend telt dubbel: de kwalificatie, de race, de sprint en alle losse
vragen erbij.

De joker staat op het racescherm, boven de tabbladen — hij geldt voor het hele
weekend en niet voor één sessie. In de kalender zie je er een `2×` bij staan.

Het paneel zegt in één oogopslag waar je aan toe bent: een gevulde groene
schijf met een ster op een groen vlak als er een joker ligt, een lege grijze
schijf op een gewoon paneel als er nog een te vergeven is. Daaronder staat één
zin die zegt wat het doet. (Tot het derde ontwerp had het lege paneel een
stippelrand; die is weg, want een stippelrand leest als een vak dat je nog
moet invullen, en geen enkele andere banner heeft er nog een.)

In de kalender is het `2×` een gevuld groen pilletje. Dat is met opzet anders
dan de Q/R/S-vinkjes ernaast, die ook groen worden zodra je die sessie hebt
ingevuld: gevuld betekent "hier ligt je joker", omlijnd betekent "dit heb je
ingevuld".

Vijf dingen die daarbij vastliggen:

- **Je moet hem neerleggen voordat er iets gereden is.** Zodra de eerste sessie
  van dat weekend begint ligt hij vast. Dat is dus een gok op welk weekend jou
  het beste ligt, en niet een knop om achteraf je beste weekend te verdubbelen.
- **Weghalen kan ook niet meer** zodra dat weekend begonnen is. Anders zou je
  na de kwalificatie nog kunnen besluiten dat het toch geen goed weekend was.
- **Geen terugwerkende kracht.** Net als bij het punt hierboven bewaart
  `pools.jokers_vanaf` *wanneer* het aanging. Een weekend dat toen al liep kan
  geen joker meer krijgen.
- **Het aantal kun je bijstellen**, ook terwijl de jokers al aanstaan. Omhoog
  mag altijd — iedereen krijgt er evenveel bij. Omlaag mag niet ónder wat
  iemand al heeft liggen; anders zou je iemand jokers afpakken die hij al
  ingezet heeft. De database weigert dat, en het scherm zegt waarom.
- **Uitzetten laat de gezette jokers staan**, ze tellen alleen niet meer mee.
  Per ongeluk uitzetten en weer aanzetten kost dus niemand zijn keuzes.
- **De regels staan in de database**, niet alleen in het scherm — trigger
  `jokers_bewaken` in `schema.sql`. Een joker die je achteraf mag verzetten is
  geen keuze maar een knop om de uitslag mee te herschrijven, en dat is te
  belangrijk om aan de knoppen in de app over te laten. Zie ook §7.

### 6c. Een nieuw seizoen, en terug naar het vorige

Een poule hoort bij een seizoen. Zodra alle races van dat seizoen gereden zijn
verschijnt de knop **Begin aan 2027** (of welk jaar er volgt) op twee plekken:
op het racesoverzicht, op de plek waar anders de volgende race staat, en onder
Poule → beheer. Zolang er nog iets te rijden valt is hij er niet — doorschuiven
zou die race dan uit beeld halen.

Op het racesoverzicht ziet alleen de poulebaas de knop. De rest leest daar
"Zodra de poulebaas doorschuift naar 2027 staat hier de nieuwe kalender", zodat
een scherm met alleen gereden races niet lijkt op een app die stilstaat.

**De kalender van het volgende jaar komt vanzelf.** De sync gaat hem vanaf twee
maanden voor de finale zoeken bij OpenF1 en zet hem erin zodra hij er is; tot
de eerste race wordt hij elke dag opnieuw nagekeken. Er hoeft niemand iets
voor te doen, en er staat nergens meer een jaartal dat met de hand bijgewerkt
moet worden. Schuif je door vóórdat OpenF1 hem heeft, dan staat er "nog geen
races — de kalender wordt automatisch opgehaald", en dat klopt dan ook.

Een poule die in november begint, speelt de laatste races van dit jaar mee; een
poule die na de finale begint, begint in het nieuwe jaar (als die kalender er
al is).

Doorschuiven gooit niets weg. Boven de kalender en boven de stand komt een
keuzelijst te staan waarmee je terug kunt naar het vorige seizoen: dezelfde
kalender, dezelfde stand, dezelfde grafiek, precies zoals ze waren. De
spelers en de vragenset gaan mee naar het nieuwe jaar.

Die keuzelijst is er alleen als er iets te kiezen valt. Een poule die één
seizoen speelt ziet hem niet.

**De vragenset blijft op slot.** Een nieuw seizoen lijkt een logisch moment om
de vragen te herzien, maar de gekozen vragen hangen aan de poule en niet aan
het seizoen — een andere set zou de stand van vorig jaar met terugwerkende
kracht veranderen. Wie echt andere vragen wil, maakt een nieuwe poule aan.

### 6d. De seizoenslaag

Vier vragen die je één keer per jaar invult, vóórdat er iets gereden is, en die
pas aan het eind van het seizoen gescoord worden:

| Vraag | Punten |
|---|---|
| Wereldkampioen | 50 |
| Constructeurstitel | 40 |
| Aantal verschillende racewinnaars | 30 |
| Welk team wordt vierde | 30 |

Samen 150 punten, ongeveer zes races aan gewicht. Ze staan als gewone vragen in
de lijst bij het aanmaken, dus een poule kiest zelf of ze meedoen — ze zitten in
**Gevorderd** en zijn los aan te vinken.

Het blok staat op de standpagina. Zolang de eerste race nog niet begonnen is is
het een formulier; daarna zie je wat je hebt ingevuld, met een streepje in
plaats van punten. Zodra alle races gereden zijn komt erbij te staan wat het
werkelijk werd en wat het opleverde, en tellen die punten mee in de stand.

#### Wanneer ze vastliggen

De streep geldt **per antwoord** en niet per seizoen:

- **Vóór de eerste race** mag alles: invullen, veranderen, weghalen. Wie op
  tijd is kan zich nog bedenken.
- **Daarna** mag je nog invullen wat je nog niet had, maar niet meer
  veranderen wat er al staat. Eén schot, wanneer je ook binnenkomt.
- **Als het seizoen erop zit** komt er niets meer bij; dan is het antwoord
  bekend.

Dat tweede punt is er voor wie halverwege instapt. Die heeft de gemiste races
al als achterstand, en honderdvijftig punten die hij onmogelijk kon halen is
een tweede straf voor hetzelfde. Staat er iets open, dan zegt het blok "nog 2
in te vullen · het seizoen loopt al" en waarschuwt het erbij dat wat je nu
kiest meteen vastligt.

**Wat dit niet oplost:** wie in ronde 20 de kampioen aanwijst weet meer dan wie
dat in ronde 1 deed. Dat is een echte scheefheid en geen bijwerking — voor een
vriendenpoule weegt "mag ik wel meedoen" zwaarder. Wil je dat anders, dan is de
plek `seizoenVraagOpen()` in `index.html` en de tak voor `'seizoen'` in
`poule_antwoord_deadline()` in `schema.sql`; die twee horen hetzelfde te zeggen.

De database bewaakt dit zelf, en ook tegen weghalen — anders zou je een
antwoord kunnen wissen en opnieuw invoeren om er omheen te werken.

Twee dingen om te weten:

- **Ze tellen niet mee in "maximaal per weekend".** Dat getal gaat over één
  weekend en deze vragen komen één keer per jaar langs. Het aanmaakscherm noemt
  ze er apart bij.
- **De uitslag komt uit de races zelf.** De app telt het echte WK-puntenschema
  op over alle races van het seizoen, inclusief de sprintpunten, en leest
  daaruit de kampioen, de constructeurstitel en het vierde team af. Het aantal
  verschillende winnaars is het aantal verschillende namen dat een race won.
  Niemand hoeft iets in te voeren.

### 6e. Contrair voorspellen

Ook uit. Als iedereen bij "wie wint" dezelfde naam invult maakt die vraag geen
verschil in de stand: iedereen krijgt hetzelfde, of iedereen krijgt niets. Zet
de poulebaas dit aan, dan tellen de losse vragen zwaarder naarmate minder
mensen hetzelfde zeiden.

De formule: `1 + (1 − aandeel)`, afgerond op één decimaal en nooit hoger dan 2.
In een poule van vier betekent dat:

| Wie zei hetzelfde als jij | Vermenigvuldiger | Een winnaar van 25 wordt |
|---|---|---|
| iedereen (4 van de 4) | ×1,0 | 25 |
| de helft (2 van de 4) | ×1,5 | 38 |
| alleen jij (1 van de 4) | ×1,8 | 45 |

Vier dingen die daarbij vastliggen:

- **Alleen de losse vragen.** De top 10 en de teamgenoot-duels blijven zoals ze
  zijn. Bij een top 10 zou je per plek moeten uitrekenen hoe zeldzaam je was,
  en dan is niet meer na te vertellen waar een getal vandaan komt.
- **Het staat er altijd bij.** Op het uitslagscherm zie je "×1,5 (2 van de 4
  zeiden dit)" naast de vraag. Een vraag die ineens 38 punten oplevert in
  plaats van 25 zonder uitleg is gewoon een fout.
- **Afgerond op één decimaal**, zodat het getal op het scherm hetzelfde is als
  het getal waarmee gerekend is.
- **Geen terugwerkende kracht**, net als bij de twee punten hierboven.

---

## 7. Wie mag wat

De poulebaas staat als `owner_member_id` bij de poule, en het beheergedeelte
staat alleen bij die speler op het scherm. Dat geldt voor de vragenset én voor
de omschrijving.

Heeft een poule nog geen `owner_member_id` — poules van vóór dit scherm
bestond, zoals de echte Vrijdagmiddagpoule — dan mag voorlopig iedereen erbij,
en staat er onder Poule een knop "Ik word poulebaas" om dat op te lossen. Wie
'm als eerste indrukt, is 'm; de update gebeurt met `.is('owner_member_id',
null)` erbij zodat een gelijktijdige tweede poging nul rijen raakt in plaats
van de eerste te overschrijven.

Wees eerlijk over wat dat op dit moment is: het voorkomt ongelukken, geen
kwaadwilligheid. Iemand die de anon key uit de broncode plukt kan er alsnog
omheen. Voor een vriendenpoule is dat prima, maar bouw er geen dingen op die
echt beschermd moeten zijn.

### Elke speler hoort bij een account

Sinds kort krijgt iedereen die meedoet een **anoniem account** bij Supabase.
Geen inlogscherm, geen wachtwoord, geen mailadres: je merkt er niets van. Het
staat er zodat de database straks iets heeft om op te controleren — nu is de
anon key uit `index.html` het enige wat er nodig is om andermans voorspelling
te overschrijven.

Drie regels die daarbij horen:

- **Rondkijken maakt geen account aan.** Dat gebeurt pas op het moment dat er
  echt iets aan jou gehangen moet worden. Anders staat er straks een account
  in de database voor elke bot die de pagina opvraagt.
- **Een speler die al van iemand is wordt nooit overgenomen.** Claimen kan
  alleen als `user_id` nog leeg is.
- **Eén account is één speler per poule.** Die sleutel staat in `schema.sql`.
  Op een gedeeld toestel — één telefoon die rondgaat bij het inschrijven —
  betekent dat: de tweede speler wordt zonder account aangemaakt. Hij doet
  gewoon mee en wordt geclaimd zodra hij de app op zijn eigen toestel opent.
  Een foutmelding zou daar veel erger zijn. Deze terugval zit nog gewoon in
  `maakSpeler()`, maar is sinds het verwijderen van "Speler wisselen" niet
  meer via de UI te bereiken — wie zich al heeft aangewezen op dit toestel
  komt niet meer terug bij "Wie ben jij?" om een tweede naam te typen. In de
  praktijk opent iedereen de app nu op zijn eigen toestel, en daar speelt dit
  toch al niet. Zie `OVERDRACHT.md`.

**Eenmalig aanzetten in Supabase.** Anoniem inloggen staat standaard uit.
Dashboard → Authentication → Sign In / Providers → **Anonymous sign-ins** aan.
Doe je dat niet, dan blijft de app gewoon werken — elke aanmeldpoging faalt
stilletjes en er wordt niets geclaimd — maar dan staat het fundament er ook
niet als de policies dichtgaan.

### Je account meenemen (optioneel)

Onder **Profiel** staat "je account meenemen". Daar koppel je **Google** of een
**mailadres** aan je anonieme account. Op een tweede toestel kies je op het
beginscherm de bijbehorende inlogknop en ben je daar meteen dezelfde speler,
zonder de poulecode.

Google staat als eerste keuze, want dat is één tik tegen "open je mail, zoek
het bericht, klik de link". De mailweg blijft er gewoon naast: wie geen Google
wil of heeft mag niet buiten de boot vallen. Onder water is het hetzelfde —
`linkIdentity()` hangt Google aan het anonieme account dat je al had, precies
zoals `updateUser({ email })` dat met een mailadres doet, dus je spelers en
punten gaan mee.

Het is met opzet optioneel en het staat met opzet onderaan. Verreweg de meeste
mensen typen gewoon hun poulecode; dit is er voor wie ook op zijn laptop
meespeelt of zijn browser weleens leegt.

Drie dingen die daarbij horen:

- **"Gestuurd" is niet "gekoppeld".** Tot iemand op de link in de mail klikt
  staat het adres in `new_email` en is er niets veranderd. Het scherm zegt dat
  ook zo.
- **Een onbekend adres maakt geen account aan** (`shouldCreateUser: false`).
  Anders levert één typfout je een leeg account op waarin al je voorspellingen
  verdwenen lijken.
- **Na het inloggen wint je account** van de speler die dit toestel toevallig
  onthield. Inloggen is een uitspraak: je bedoelt jezelf.

**Google aanzetten** (Authentication → Sign In / Providers → Google): je hebt
een client-ID en -secret nodig uit een Google Cloud-project. Zolang je alleen
het basisprofiel en het mailadres opvraagt blijf je in de categorie waar Google
geen verificatiereview voor eist. Zet daarnaast **Manual linking** aan
(Authentication → Settings), anders werkt het koppelen aan een bestaand
anoniem account niet — alleen het inloggen op een leeg toestel.

**Sign in with Apple** is bewust níét ingebouwd: dat vereist een Apple
Developer-account van ongeveer €99 per jaar. Voor een App Store-app zou je het
moeten aanbieden zodra je Google aanbiedt, maar dit is een webapp, dus die
regel geldt hier niet. iPhone-gebruikers kunnen prima Google of hun mailadres
gebruiken.

**Nog twee dingen in het Supabase-dashboard** voor de mailweg, en deze twee
vergeet je zeker één keer:

1. **Redirect-url toestaan.** Authentication → URL Configuration → *Redirect
   URLs*: zet daar de url van de app in (nu
   `https://predicttherace.com/**`, zie §15). Staat hij er niet, dan negeert
   Supabase de terugkeerlink en komt iedereen op de Site URL uit.
2. **Eigen SMTP instellen** — of niet, nu Google er is. De ingebouwde
   mailservice van Supabase stuurt maar een paar mails per uur en is
   uitdrukkelijk niet voor productie. Zolang Google de hoofdweg is en de mail
   de uitzondering, red je het waarschijnlijk zonder eigen mailleverancier.
   Merk je dat mensen klagen dat de mail niet aankomt, dan hoort er alsnog een
   eigen leverancier (Resend, Postmark, SendGrid) onder.

En kijk één keer wat er daadwerkelijk in de mailbox belandt: onder Authentication
→ Emails staan de sjablonen, en die zijn Engels en generiek ("Confirm your email
change"). Voor een Nederlandse poule-app is dat op zijn minst verwarrend.

### Wat de database nu wél afdwingt

De policies staan dicht. Wat dat concreet betekent:

- **Je eigen inzending is van jou.** Zodra je speler aan je account hangt kan
  niemand anders hem nog overschrijven of weggooien — ook niet met de anon key
  uit `index.html`, en die staat daar publiek.
- **Een speler die nog aan geen enkel account hangt blijft beschrijfbaar.** Dat
  is met opzet: anders had het dichtzetten iedereen buitengesloten die de app
  nog niet geopend had. De bescherming groeit mee, speler voor speler. Het
  getal `spelers zonder account` onderaan de uitvoer van `schema.sql` laat zien
  hoeveel er nog te gaan zijn.
- **De vragenset en de omschrijving zijn van de poulebaas**, nu ook in de
  database en niet alleen op het scherm.
- **Lezen kan alleen binnen je eigen poule.** Dit stond lang open, en dat was
  het grootste gat in de app: met de anon key uit `index.html` — die staat daar
  met opzet publiek — was élke poule, élke spelersnaam en élk antwoord in de
  hele database uit te lezen. Zie hieronder hoe dat nu werkt.

### Binnenkomen zonder de deur open te laten staan

Dichtzetten naar "alleen leden" kan niet zomaar, en dát is de reden dat het zo
lang open stond: om een poule binnen te komen moet je hem kunnen lezen vóórdat
je lid bent. Je typt een code in, krijgt de spelerslijst te zien, en wijst
jezelf aan. Op dat moment kent de database je nog niet.

Een policy kan niet eisen dát je filtert. "Een poule zoeken op zijn code" en
"de hele tabel leegvissen" waren daardoor dezelfde rechten. Een functie met een
verplichte parameter kan dat verschil wél maken, en daar draait de oplossing
dus om. Vier stuks, allemaal `security definer` in `schema.sql`:

| functie | waarvoor |
|---|---|
| `poule_ophalen(code, id)` | de poule met zijn spelers, inzendingen en vragenset, in één keer |
| `poule_meedoen(pool, naam)` | jezelf inschrijven als nieuwe speler |
| `poule_claim_speler(member)` | jezelf aanwijzen op het "Wie ben jij?"-scherm |
| `poule_aanmaken(...)` | een nieuwe poule, jezelf, het baasschap en de vragenset in één transactie |

Wat je moet weten om binnen te komen is de poulecode of het poule-id, en
allebei zijn ze een geheim op zich: een code is zes tekens uit md5, een id is
een uuid. Dat is dezelfde grens als voorheen — wie de code heeft ziet de poule.
Wat niet meer kan is de tabel leegvissen zónder zo'n sleutel.

De policies eronder staan nu op:

| tabel | wie mag lezen |
|---|---|
| `pools` | leden, plus iedereen voor poules die op openbaar staan |
| `pool_members` | je eigen spelers, plus de medespelers in je eigen poules |
| `answers`, `pool_questions` | leden van die poule |
| `races`, `questions` | iedereen — dit is gedeelde naslag, geen poulegegevens |

Let op bij het aanpassen hiervan: in Postgres heeft `returning` net zo goed
leesrecht nodig. Een `insert(...).select()` of `update(...).select()` op een rij
die je op dat moment nog niet mag zien raakt nul rijen, zónder foutmelding. Dat
is precies waarom meedoen, claimen en aanmaken functies moesten worden en geen
gewone schrijfacties konden blijven.

`test/afscherming.test.sql` en `test/afscherming.test.mjs` leggen allebei de
kanten vast: dat een vreemde niets ziet, en dat binnenkomen met een code nog
gewoon werkt.

### Als een speler aan het verkeerde account hangt

Klikt iemand op het "Wie ben jij?"-scherm op de verkeerde naam, dan claimt hij
die speler. De database laat dat daarna niet meer terugdraaien — precies wat je
wilt tegen een vreemde, precies wat je niet wilt tegen een vergissing.

Daarom staat er onder **Poule** bij zo'n speler een klein knopje **losmaken**,
alleen zichtbaar voor de poulebaas. Twee tikken, en de volgende die zich als
die speler aanmeldt claimt hem opnieuw.

Eén ding kan de poulebaas níét: zichzelf redden. Wie zijn eigen browser
leegmaakt zonder een mailadres gekoppeld te hebben, krijgt een nieuw account en
kan daarna niets meer voor zijn eigen speler opslaan. Het mailadres is de
reservesleutel, en dat is de reden dat het scherm er nadrukkelijk om vraagt.

---

## 8. Waar je op moet letten bij de vrije selectie

Als spelers zelf mogen samenstellen, kiest iemand vroeg of laat alleen de
gokvragen (rode vlag, regen, safety cars) omdat die het hoogst scoren per stuk.
Dan wint de gelukkigste in plaats van degene die de sport volgt.

Ingebouwde rem: toon onder de lijst een waarschuwing zodra de gokvragen samen
boven de 30% van het maximum uitkomen.

> Let op: meer dan een derde van de punten hangt nu van geluk af. Overweeg er
> een paar uit te zetten.

Blokkeer het niet, alleen een melding. Het is hun poule.

---

## 9. Volgorde van bouwen

1. Migratie naar de `questions`-tabel, met de vier extra vragen erbij
2. Tabbalk onderin, bestaande schermen erin hangen
3. Aanmaakproces in vier stappen, met de presets
4. Uitnodiglink met `?code=`
5. Beheergedeelte onder Poule

Stap 1 en 2 zijn los van elkaar te doen en raken elkaar nauwelijks. Stap 3 heeft
stap 1 nodig.

---

## 10. Geen geld in de app

Er zat een inleg met een betaalverzoek in: een bedrag per poule, een
Tikkie-link, en een lijstje van wie betaald had. Dat is er allemaal uit.

Zodra er geld in een poule zit — inleg, pot, prijs — kom je in Nederland in de
buurt van de Wet op de kansspelen. Zolang het je eigen vrienden zijn is dat een
theoretisch verhaal; zodra vreemden meedoen is het dat niet meer. Dit is geen
juridisch advies, en ik ben geen jurist: het is de goedkoopste voorzorg die er
is, want de functie kost niets om weg te laten.

Dus: geen inleg, geen pot, geen betaallink, geen "wie wint krijgt". Wie met
zijn vrienden geld afspreekt doet dat in de groepsapp, buiten deze app om.

Hier hangt nog iets aan vast: **OpenF1 is voor niet-commercieel gebruik**.
Advertenties of een betaalde variant breken die voorwaarde en dwingen je naar
een betaalde databron. Zie §11.

De kolommen `pools.inleg`, `pools.betaallink` en `pool_members.betaald` worden
door `schema.sql` actief verwijderd. Dat is onomkeerbaar en met opzet: je wilt
die gegevens niet laten staan.

---

## 11. Waar de uitslagen vandaan komen

Alles komt uit OpenF1, opgehaald door `scripts/sync.mjs` op een GitHub-runner,
elk uur. Niemand hoeft iets in te voeren.

| Wat | Waar het vandaan komt |
|---|---|
| Kalender en deadlines | `sessions` |
| Deelnemerslijst met teamkleuren | `drivers` |
| Top 10 kwalificatie, sprint en race | `session_result` |
| Snelste ronde | `laps`, de kortste `lap_duration` |
| Snelste pitstop | `pit`, de kortste `pit_duration` |
| Safety cars | `race_control` |
| Rode vlag | `race_control` |

**Sprintweekenden.** Zes weekenden per seizoen hebben een derde sessie. De
sync herkent hem aan `session_name = 'Sprint'` en vult `deadline_sprint` en
`sprint_result`; een weekend zonder sprint houdt die kolommen leeg en krijgt
in de app geen sprint-tab. De sprint gaat vóór de kwalificatie: de
sprintkwalificatie ligt op vrijdag en de sprint zaterdagochtend, de gewone
kwalificatie is zaterdag daarná. In de kalender zie je dat aan de merktekens:
`S Q R` in plaats van `Q R`.

**De sprint telt voor halve punten.** Dezelfde top 10, dezelfde 5/3/1 per
plek, maal 0,5 — een perfecte sprint is dus 25 punten en een perfecte race 50.
Een sprint is een derde van een race lang en hoort niet net zo zwaar te wegen
als het weekend zelf. Automatisch invullen slaat de sprint over: die regel
bestaat om een gemist weekend niet je seizoen te laten kosten, en daar is een
sprint geen onderdeel van.

**Wat telt als safety car.** Een virtual safety car telt mee, en dat staat er
in de app bij de vraag ook bij. Dat is een keuze: acht van de veertien races
van 2026 hadden geen énkele echte safety car, en dan is "0" bijna altijd goed
en valt er niets te voorspellen. Een vraag waarvan de spelers de telregel niet
kennen is geen eerlijke vraag, dus die regel hoort op het scherm te staan en
niet alleen hier.

**Wat telt als rode vlag.** Alleen een race die echt stilgelegd wordt. Een
straf voor een "red flag infringement" is er geen — dat gaat over een
overtreding ná afloop.

**Afgelaste races.** Sakhir en Jeddah 2026 zijn niet doorgegaan. Ze staan wel
in de kalender van OpenF1, maar er bestaat geen enkele rij van, dus er komt
nooit een uitslag. Zonder iets te doen bleven ze eeuwig op "wacht op uitslag"
staan, en dat is voor iemand in de poule niet te onderscheiden van een app die
stuk is.

OpenF1 heeft geen veld dat zegt dat een race is afgelast, dus de sync leidt het
af: een race die zeven dagen na de geplande tijd nog steeds een 404 geeft, is
niet doorgegaan. Alleen een 404 telt als bewijs — een 429 betekent dat wíj te
snel vroegen. Zeven dagen is ruim: een echte uitslag staat er binnen een uur.

Zo'n race blijft in de kalender staan, want er kunnen voorspellingen aan
hangen. Hij is alleen niet meer in te vullen, telt niet mee als iets wat je nog
moet doen, en zegt "niet doorgegaan" in plaats van "de uitslag volgt".

**Handmatig invoeren bestaat niet meer.** Dat was een knop onder Poule waarmee
je een ontbrekende uitslag zelf kon invullen. Hij is eruit, en de reden staat
in de tabel zelf: `races` heeft geen `pool_id`. Er is één rij per race per
seizoen, gedeeld door élke poule in de app. Wie daar iets in typte, veranderde
de uitslag voor iedereen die dat seizoen volgde. De app waarschuwde daar ook
voor — *"geldt voor iedereen die dit seizoen volgt"* — maar een waarschuwing is
onder vrienden genoeg en publiek niet: één iemand kan er elke poule mee slopen.

De tabel staat nu op **alleen-lezen** voor `anon` en `authenticated`, met twee
sloten: een RLS-policy die alleen `select` toestaat, én een `revoke` van
`insert, update, delete` op tabelniveau. Schrijven doet alleen de sync, en die
draait op een GitHub-runner met de `service_role` key — die gaat langs allebei.

Wat er al met de hand ingevoerd was blijft staan en blijft gemarkeerd als
handmatig; de sync corrigeert dat niet, want die vult alleen wat leeg is.

Een uitslag wint nog steeds van de vlag: staat er een uitslag, dan telt een
race die als afgelast gemarkeerd stond gewoon weer mee. Alleen komt die uitslag
nu altijd van de sync.

**Als een uitslag niet binnenkomt**: draai de verkenner (Actions → *OpenF1
verkennen*), eventueel met een `session_key`. Die laat zien of OpenF1 de race
niet heeft (404) of dat we te snel vroegen (429). Dat verschil is belangrijk —
een 429 lost zichzelf op, een 404 niet.

**De app zegt het zelf.** Staat er een race een week na zijn deadline nog
zonder uitslag en zonder streep, dan verschijnt er onder de seizoensvragen op
de standpagina een amberen regel met zijn naam erin:

> Kuala Lumpur heeft geen uitslag en is niet afgelast. Zolang dat zo blijft kan
> het seizoen niet afgerond worden en blijven deze vragen ongescoord.

Iedereen in de poule ziet die, want het gaat om ieders punten. De poulebaas is
degene die hem oplost — zie hieronder.

**Blijft het seizoen ergens op hangen?** De seizoensvragen worden pas gescoord
als élke race een uitslag heeft of afgelast is. Blijft er één race hangen — wel
gereden volgens de kalender, niets binnengekomen, niet afgelast — dan leveren
die 150 punten nooit iets op en blijft "Begin aan het volgende seizoen" grijs.

Onderaan `schema.sql` staan daarom drie regels die dat nu al laten zien. Ze
gaan over het seizoen dat nu speelt: tot de finale dit jaar, daarna het
volgende. Een race die blijft hangen houdt de tabel bij het oude jaar, zodat
hij niet uit beeld verdwijnt zodra de nieuwe kalender er is.

```
afgelaste races                                        | 2
seizoen 2026 rond                                      | nog 8 te gaan
blijven hangen (deadline > week geleden, niets binnen) | 0
```

Die laatste hoort **nul** te zijn. Staat er iets anders, dan noemt hij de races
bij naam:

```
blijven hangen (deadline > week geleden, niets binnen) | 1: Kuala Lumpur (ronde 19)
```

De sync zet een race die OpenF1 een week na de deadline nog steeds niet heeft
zelf op afgelast — maar alleen als OpenF1 er een harde **404** op geeft. Krijgt
hij een lege uitslag terug (dus wél een record, geen resultaten), dan telt dat
niet als bewijs en blijft de race staan. Dat is precies het geval waarin je zelf
moet ingrijpen: draai `scripts/verkennen.mjs` op die race om te zien wat OpenF1
zegt, en zet hem daarna met de hand op afgelast:

```sql
update public.races set afgelast = true where season = 2026 and round = 19;
```

**Races die niet bestaan.** OpenF1 heeft in 2026 een testrecord tussen de races
staan: Kuala Lumpur op 4 oktober, officieel "FORMULA 1 GULF AIR BAHRAIN GRAND
PRIX IN MALAYSIA 2026". De kalender nam dat gewoon over, en dan laat de app
mensen een voorspelling doen voor een race die nooit gereden wordt.

De sync herkent zoiets aan de nummering: OpenF1 deelt `meeting_key` op
kalendervolgorde uit, dus bij echte races loopt die gelijk op met de datum.
Kuala Lumpur heeft 1308 terwijl het hele seizoen tussen 1279 en 1302 zit, en is
daarmee het enige record dat die volgorde breekt. Zo'n race wordt overgeslagen
bij het opnieuw ophalen van de kalender, en als hij er al in stond wordt hij
doorgestreept — niet verwijderd, want er kunnen voorspellingen aan hangen.

Wat daarbij níét gebeurt is opnieuw doornummeren. Het rondenummer is de
sleutel waarmee een rij in de database wordt teruggevonden, en aan die rij
hangen alle voorspellingen. Zou de nummering opschuiven omdat er een race
tussenuit valt, dan stond je voorspelling ineens bij de volgende race. Een
race die we al kennen houdt daarom zijn rondenummer, wat er ook vóór hem
gebeurt.

Er zit een rem op: wijst die regel meer dan een kwart van de kalender aan, dan
gebeurt er niets. Dan is niet de kalender raar maar de regel niet van
toepassing, en dan is niets doen beter dan een seizoen weggooien.

Nakijken kan met Actions → *OpenF1 verkennen* → *De kalender nakijken op races
die er niet in horen*.

**De deelnemerslijst wordt bijgewerkt.** Die werd vroeger één keer opgehaald,
bij de kwalificatie, en daarna nooit meer. Viel er daarna een coureur uit en
kwam er een reserve, dan zag je dat nergens — en de teamgenoot-duels werden dan
ook nog op de verkeerde paren gescoord. Nu geldt: zolang het weekend nog niet
gereden is wordt de lijst ververst, en op het moment dat de race-uitslag
binnenkomt wordt hij één keer uit de rácesessie gehaald. Dat is de enige lijst
die zegt wie er echt gereden heeft.

En er zit een reparatie in: staat er in een race-uitslag een coureur die niet
in onze deelnemerslijst voorkomt, dan is die lijst aantoonbaar verouderd —
niemand finisht een race zonder aan de start te staan — en wordt hij alsnog
opgehaald. Zo herstelde Monza zich: daar stond Hadjar in de lijst terwijl hij
dit seizoen bij OpenF1 nergens voorkomt, Lawson bij het verkeerde team, en
Tsunoda helemaal niet, terwijl die de race uitreed. Van alle 25 races was dat
de enige met een afwijking.

Let op wat dit niet kan: **een wissel die OpenF1 zelf niet registreert, kan de
app ook niet laten zien.** Voor Monza 2026 geeft OpenF1 voor de kwalificatie en
de race exact dezelfde 22 coureurs met dezelfde teams — daar zat het probleem
dus niet, de opgeslagen lijst was al verouderd voordat het weekend begon. Of dat klopt is met
Actions → *Klopt de stand?* na te kijken; die draait ook
`scripts/controle-coureurs.mjs`, dat per race naast elkaar zet wat er in de
database staat en wat OpenF1 er nu over zegt.

---

## 11b. De deadlines in je agenda

Onder **Poule** staat "deadlines in je agenda": één keer abonneren, en elke
kwalificatie en race staat in je eigen agenda met de melding die je daar zelf
instelt.

Het bestand is `kalender.ics` naast `index.html`, en de sync schrijft het bij
elke run — maar alleen als er echt iets veranderd is. Verschuift een sessie,
dan past de sync het aan en volgt de agenda van iedere abonnee vanzelf.

Waarom dit en geen mail: een mailleverancier met een sleutel is er niet, en er
komt van alles bij kijken dat niets met een poule te maken heeft — afmelden,
bounces, niet in de spammap belanden. Dit vraagt om niets, en het bestand is
voor iedereen hetzelfde — er gaat dus ook geen enkel gegeven van een speler
naartoe.

Sinds §11c kan het ook met een pushmelding, en die kan wél zeggen "jij hebt nog
niets ingevuld". Dit blijft ernaast staan: het werkt zonder meldingsrecht,
zonder sleutels en zonder dat er ergens een lijst met toestellen ligt.

Wees eerlijk over wat het niet kan: een agenda-item geldt voor iedereen en kan
dus niet zeggen "jij hebt nog niets ingevuld". Het bereikt je wél, en dat is
precies wat de app tot nu toe niet deed.

Twee dingen om te weten:

- **De `VALARM` van twee uur van tevoren is een suggestie.** Veel agenda-apps
  negeren die bij een abonnement en gebruiken de melding die de gebruiker zelf
  per agenda instelt. Daarom staat hij er wel, maar leunt niets erop.
- **Het bestand in de repo is leeg tot de eerste sync draait.** Dat is een
  geldige agenda; hij vult zichzelf binnen het uur.

---

## 11c. Een seintje op je telefoon

Onder **Profiel** staat "herinneringen": zet je dat aan, dan krijgt dat toestel
een melding als een deadline nadert en jij nog niets hebt ingevuld. Anders dan
de agenda hierboven kan dit wél naar jou persoonlijk kijken.

De regel, en vooral wat hij niet doet:

- Hooguit **één melding per toestel per ronde**, over de sessie die het eerst
  dichtgaat.
- Alleen binnen **drie uur** voor de deadline.
- Alleen als jouw poule die vraag stelt en jij er **nog niets** op hebt
  ingevuld. Wie invult krijgt niets.
- Dezelfde melding komt **niet twee keer**: de sync onthoudt per toestel wat er
  het laatst gestuurd is.
- Op een **iPhone** werkt het alleen als Predict the Race op je beginscherm staat.
  Dat is een regel van iOS, niet van de app.
- De melding komt **in de taal van dat toestel**: dezelfde taal waarin je de
  app gebruikte toen je hem aanzette. Wissel je later van taal, dan gaat de
  melding mee. Zie §11e.

### Dit staat uit tot je het inricht

De app biedt het pas aan als er een VAPID-sleutelpaar is, en de sync stuurt
pas iets als de privésleutel als secret klaarstaat. Zonder die twee verandert
er niets en klaagt er niets.

```
node scripts/push-sleutels.mjs
```

Dat script drukt een vers paar af en zegt waar de twee helften heen moeten:

1. De **publieke** helft in `index.html`, bij `VAPID_PUBLIEK` bovenaan. Die is
   met opzet openbaar, net als de anon key.
2. De **privé**-helft als repository-secret `VAPID_PRIVE` in GitHub →
   Settings → Secrets and variables → Actions. Nergens anders: wie hem heeft
   kan meldingen namens deze app sturen.
3. En een secret `PUSH_CONTACT` met een mailadres dat je leest, bijvoorbeeld
   `mailto:jij@voorbeeld.nl`. Pushdiensten willen weten wie de afzender is, en
   gebruiken dat adres als er iets mis is met je verkeer.

Sleutel kwijt? Maak een nieuw paar. Alle bestaande abonnementen vervallen dan —
iedereen moet opnieuw op "Zet meldingen aan" tikken — maar er gaat niets anders
verloren.

### Wat er van je opgeslagen wordt

Eén rij per toestel in `push_abonnementen`: het adres dat de pushdienst uitdeelt
en twee sleutels van dat toestel, plus in welke taal de melding moet. Geen
mailadres, geen naam. Die rij is alleen voor jou leesbaar (en voor de sync), en
verdwijnt zodra je meldingen uitzet, je speler weggaat of de pushdienst zegt
dat het abonnement niet meer bestaat.

Die taal staat er omdat een melding niet uit je browser komt maar uit de sync,
en die draait in een GitHub-runner zonder browser. Hij kan dus nergens anders
kijken. Per toestel en niet per speler: je telefoon op Engels en je laptop op
Nederlands is een gewoon geval.

### De service worker

Meldingen ontvangen kan alleen met een service worker, en dat is precies de
reden dat de app er lang geen had: een worker die verzoeken onderschept kan een
oude versie of een oude stand tonen terwijl je denkt dat het klopt. `sw.js`
heeft daarom **geen `fetch`-handler en cachet niets**. Hij toont een melding en
brengt je naar de app als je erop tikt, meer niet. `test/meldingen.test.mjs`
controleert dat ook echt: staat er ooit een fetch-handler in, dan zakt de test.

---

## 11d. Je seizoen delen buiten de poule

Onder **Profiel** staat "je seizoen delen". Zet je dat aan, dan krijg je een
link naar een pagina met jouw cijfers: je punten, je plek, hoeveel races er
gereden zijn, je beste weekend, en hoe vaak je een coureur precies goed zette.

**Wat er níét op staat:** de naam van je poule, wie er meedoen, wat iemand
heeft ingevuld, of de poulecode. Er staat "1e van 6" — niet wie die vijf
anderen zijn. Wie de link opent kan van daaruit ook nergens je poule in; de
enige knop is "Zelf een poule beginnen".

Drie dingen om te weten:

- **De link is van jou.** Ook je medespelers kunnen hem niet opzoeken; de
  database geeft die kolom niet vrij. Deel je hem, dan kan iedereen met die
  link de pagina zien, dus deel hem zoals je een foto deelt.
- **De pagina is zo vers als jouw laatste bezoek.** Hij wordt bijgewerkt als jij
  de app opent en er iets veranderd is. De datum staat er onderaan bij.
- **Weghalen is echt weghalen.** "Haal de pagina weg" wist de code en de
  cijfers; de link geeft daarna "deze pagina bestaat niet". Een nieuwe pagina
  krijgt een nieuwe code, dus de oude link komt nooit meer ergens uit.

---

## 11e. Nederlands of Engels

De app spreekt twee talen. Welke je krijgt bepaalt de app zelf zolang jij niets
kiest: staat je telefoon of browser op Nederlands, dan krijg je Nederlands; al
het andere krijgt Engels.

Wil je iets anders, dan zijn er twee plekken:

- **Op het beginscherm** staat rechtsboven een klein knopje, `EN` of `NL`.
- **In de app** staat het onder **Profiel**, bij "taal". Dat is de plek die je
  nodig hebt zodra je eenmaal in een poule zit, want dat beginscherm zie je dan
  niet meer.

Je keuze staat op dít toestel. Op je telefoon en je laptop kies je dus apart,
net als bij het lijstje met je andere poules.

Wat wél meeverandert naast de tekst: de datums ("za 14:00" wordt "Sat 14:00"),
de aftelklok ("3d 4u" wordt "3d 4h") en het decimaalteken (×1,8 wordt ×1.8). De
Engelse notatie is de Britse, dus de klok blijft op 24 uur — dit is een
Europese sport.

Wat niet meevertaalt: de namen die uit de database komen. De poulenaam die
iemand zelf heeft ingetypt blijft staan zoals hij is, en de racenamen komen van
OpenF1 ("Las Vegas" heet in het Nederlands ook Las Vegas).

Wat wél meegaat: de herinneringen op je telefoon. Die worden verstuurd door de
sync en niet door je browser, dus de taal staat bij je abonnement in de
database. Wissel je van taal terwijl de meldingen aanstaan, dan wordt dat
meteen bijgewerkt.

Mist er een vertaling, dan staat die ene zin in het Nederlands tussen het
Engels. Dat is met opzet: de Nederlandse zin is in de code de sleutel waarmee
de Engelse opgezocht wordt, dus een gat levert nooit een lege knop op. Meld het
of vul het aan in `ENGELS` bovenin `index.html`; het is één regel met de
Nederlandse zin en de Engelse ernaast.

---

## 12. Wat de app van je weet

Onder **Profiel** staat een dichtgeklapt blok "wat de app van je weet". Daarin
staat kort wat er bewaard wordt en hoe je het weer weg krijgt. Sinds er
mailadressen aan accounts kunnen hangen slaat de app een persoonsgegeven op, en
dan hoort dat er te staan.

Wat de verklaring zegt, en waarom het waar is:

- **De naam die je kiest, je voorspellingen en je punten.** Plus een anoniem
  account: een willekeurig nummer.
- **Je mailadres alleen als je het zelf koppelt.** Zonder koppeling staat er
  geen mailadres.
- **Een momentopname van je cijfers als je je seizoen deelt** (§11d): je naam,
  je punten, je plek en je beste weekend. Alleen als je het zelf aanzet, en weg
  zodra je het weer uitzet.
- **Eén regel per toestel als je meldingen aanzet** (§11c): het adres waar de
  pushdienst een melding naartoe kan sturen plus twee sleutels van dat toestel.
  Geen naam, geen mailadres, en weg zodra je ze weer uitzet. Die regel staat
  alleen in de verklaring als de app meldingen ook echt kan aanbieden.
- **Geen advertenties, analytics of trackers.** Er zit niets van dien aard in
  `index.html`; dat is te controleren.
- **De lettertypen komen uit de app zelf.** Die stonden eerst bij Google Fonts;
  nu in `lettertypen/` in de repo. Een browsertest controleert dat er geen
  `<link>`, `<script src>` of `<img>` naar een vreemde host in `index.html`
  terugsluipt.
- **Eén ding komt nog van buiten**, en dat staat er ook zo: de supabase-client
  wordt van `esm.sh` geladen, en die ziet daarbij het IP-adres van de bezoeker.
  Ook dat zelf hosten is de laatste stap; zie `OVERDRACHT.md`.
- **En Google, maar alleen als je ervoor kiest.** Log je met Google in, dan weet
  Google dat je deze app gebruikt en krijgt de app je naam en mailadres. Dat
  staat zo in de verklaring. Koppel je niets, of gebruik je een mailadres, dan
  komt Google er niet aan te pas — anders dan bij de lettertypen van vroeger,
  waar het IP van elke bezoeker lekte zonder dat iemand iets koos.

### Twee manieren om weg te gaan

Het verschil is niet cosmetisch, dus het staat ook zo op het scherm:

| | Wat er gebeurt |
| --- | --- |
| **Mijn account verwijderen** | Het account en het mailadres gaan weg. Je spelers blijven in de poule staan met hun naam en punten — ze horen alleen bij niemand meer. De stand van je medespelers blijft kloppen. |
| **Alles verwijderen** | Ook je spelers en al je voorspellingen, in elke poule. Je verdwijnt daarmee uit de stand van anderen. Niet terug te draaien. |

Allebei via `verwijder_mijn_account()` in `schema.sql`: een `security definer`
functie die `auth.uid()` gebruikt, zodat je alleen jezelf kunt verwijderen. Dat
is nodig omdat alleen de `service_role` in `auth.users` mag schrijven, en die
sleutel hoort nooit in de frontend.

Was je poulebaas en kies je "alles", dan raakt de poule zijn eigenaar kwijt in
plaats van te blijven wijzen naar een speler die niet meer bestaat. Daarna mag
elk lid hem beheren, net als de poules van vóór het aanmaakscherm.

### Uitloggen: alleen als er een weg terug is

Onder **Profiel** staat, naast de twee manieren om weg te gaan, ook gewoon
**Uitloggen** — maar alleen als `kanTerugkomen()` waar is, dus als er een
mailadres of Google-account aan hangt. Zonder dat zou uitloggen een val zijn:
je speler blijft aan het oude account hangen (anders dan bij "Mijn account
verwijderen", dat `user_id` expliciet leegmaakt), en zonder gekoppeld account
is er geen inloglink die je daar ooit nog bij terugbrengt. Staat de knop er
niet, dan legt de tekst ernaast uit waarom, en wat je eerst moet doen.

Uitloggen zelf is niet-destructief: `auth.signOut()` maakt alleen de sessie in
deze browser ongeldig, en dit toestel vergeet met welke speler het je
associeerde (dezelfde opruiming als bij accountverwijdering, zie
`vergeetMijOpDitToestel()`). De speler, zijn punten en zijn `user_id` in de
database blijven precies zoals ze waren — de weg terug is "Inloggen met
Google" of "Inloggen met je mailadres" op het beginscherm, niet je naam
opnieuw aanklikken in de spelerslijst (dat geeft nu netjes "hoort bij een
ander toestel", precies zoals bij elk ander toestel dat al bij iemand hoort).

### De verklaring op de site

Sinds 24 september 2026 staat dezelfde verklaring ook als losse pagina op de
site: `predicttherace.com/privacy/` en `/en/privacy/`, gemaakt door
`scripts/maak-site.mjs` uit `site/privacy.mjs`. Voor wie de app nog niet
heeft, voor Google (het inlogscherm vraagt om een privacylink), en elke
landingspagina linkt ernaar. De app linkt er ook naar, onderaan de
verklaring, in de taal van de app.

Verander je iets aan wat de app bewaart of naar wie het gaat, pas dan beide
aan: `privacyBlok()` in de app en `site/privacy.mjs`, en draai
`node scripts/maak-site.mjs`. `test/privacypagina.test.mjs` zakt als de twee
een verschillende dienst noemen.

### Nog één ding om in te vullen

1. ~~**Een contactadres.**~~ Ingevuld: `PRIVACY_CONTACT` in `app/index.html`
   en `CONTACT` in `site/privacy.mjs`, en de test houdt die twee gelijk. Het
   adres is publiek: het staat op de site en in deze openbare repo, dus
   spamfilters krijgen er werk aan. Een eigen adres op het domein
   (`privacy@predicttherace.com`, bij TransIP als doorsturing naar je eigen
   mail) kan later: dan verander je die twee regels.
2. **Waar de database staat.** De verklaring zegt "in een database bij
   Supabase". In welke regio dat is, staat in je Supabase-dashboard
   (Settings → General). Voor Nederlandse gebruikers is dat het vermelden
   waard.

### Als het verwijderen niet werkt

`verwijder_mijn_account()` draait met de rechten van wie hem heeft aangemaakt —
de `postgres`-rol in de SQL editor. Krijgt een speler "de database mag dit
account niet verwijderen", dan komt die rol niet aan `auth.users` in jouw
project. De uitweg is dan een Supabase Edge Function met de `service_role` key,
en die sleutel blijft daar — nooit in `index.html`.

---

## 13. De vier SQL-bestanden, en wanneer je welke pakt

Ze lijken op elkaar en doen heel verschillende dingen. Van onschuldig naar
onomkeerbaar:

| bestand | wat het doet | wanneer |
|---|---|---|
| `diagnose.sql` | leest alleen, wijzigt niets | als je wilt weten hoe de database ervoor staat |
| `schema.sql` | maakt en repareert de structuur | na elke wijziging aan het schema; twee keer draaien mag |
| `leegmaken.sql` | gooit poules, spelers en inzendingen weg, laat de rest staan | een schone start met dezelfde kalender |
| `reset.sql` | sloopt alle tabellen | alleen als `schema.sql` de boel niet meer recht krijgt |

### leegmaken.sql: schone start, kalender blijft

Voor "ik wil opnieuw beginnen met de poules". Weg gaan de poules, de spelers,
de antwoorden en de vragenkeuze per poule. Blijven
staan de 24 races met hun deelnemerslijsten en uitslagen, de vragenlijst zelf,
en alle accounts.

Dat laatste is met opzet: een account is niet hetzelfde als een speler. Wie
straks opnieuw inlogt is gewoon weer zichzelf en maakt een nieuwe speler aan.
Wil je ook de accounts weg, dan staat daar onderin het bestand een blok voor
dat je uit het commentaar haalt — inclusief je eigen inlog.

Na afloop hoeft er niets meer: de app werkt meteen, er is niets opnieuw op te
halen, en de eerste die een poule aanmaakt begint met een lege lei. Het bestand
draait in één transactie en eindigt met een controlelijstje waarin links alles
nul hoort te zijn en rechts alles moet staan zoals het stond. Twee keer draaien
is net zo veilig als één keer.

### Waarom dit niet `reset.sql` is

`reset.sql` doet `drop table`. Daarna staat er geen structuur meer, moet
`schema.sql` opnieuw en moet de kalender via de sync opnieuw opgehaald worden —
inclusief alle uitslagen van het seizoen tot nu toe. Dat is een hersteloperatie
voor als er iets stuk is, geen opschoning.


---

## 14. Toegankelijkheid en wat er zonder verbinding gebeurt

**Contrast.** Alle tekstkleuren halen 4.5:1 tegen de achtergrond waar ze echt
op liggen, in allebei de thema's. `test/toegankelijkheid.test.mjs` rekent dat
per element uit en niet per variabele — een kleur kan prima zijn op het paneel
en zakken op een getinte badge. De vlakken en randen (`--groen-vlak`,
`--amber-rand`) zijn achtergronden en hoeven niets te halen.

Let op bij het bijstellen van een kleur: kies de lichtste waarde die de grens
haalt. Donkerder mag, maar dan verdwijnt het verschil tussen `--ink`, `--ink2`
en `--ink3`, en dat verschil is wat de kleine labels laat terugtreden.

**Aanraakvlakken** zijn minstens 44 pixels hoog, de maat die Apple en Google
allebei aanhouden. Het zichtbare vlak mag kleiner zijn dan het aanraakgebied —
zie `.merk .wisselknop`.

**Toetsenbord.** `:focus-visible` geeft een rand van 2 pixels in de
accentkleur. Die slaat aan bij toetsenbordbediening. Eerder stond hier dat een
`.focus()` vanuit script niet meetelt; nagemeten in Chromium klopt dat niet —
een kale `.focus()` geeft de ring wel degelijk. Dat is maar goed ook, want het
focusherstel hieronder leunt erop.

**Niet alles kan even hard schreeuwen.** Groot, condensed en in hoofdletters
is voorbehouden aan wat eruit hoort te springen: de racenaam op de
weekendkaart, de afteller, de puntentotalen, een paginatitel, en de namen op
het podium. Een navigatie-item, een naam in een lijst of een racenaam in de
kalender is géén kop — die staan klein en in gewone schrijfwijze. Zet je iets
nieuws groot, vraag je dan af wat er daardoor stiller moet worden.

**Een afgekapte naam krijgt zijn volledige tekst als tooltip**, en een naam
die past juist niet. Dat wordt gemeten na het tekenen en na een
maatverandering, want of er afgekapt wordt hangt van de breedte af. Geef een
element dat een naam toont dus de klasse `nm` (of `ptitel`), dan gaat dat
vanzelf; een title in het sjabloon zetten werkt niet, want die klopt na het
verslepen van een vensterrand niet meer.

**Labels horen aan hun veld te hangen.** Een `<span class="label">` boven een
invoerveld ziet eruit als een label maar is het niet: gebruik
`<label class="label" for="...">`. Dat kost niets aan opmaak en maakt het woord
ook aanklikbaar. `test/toegankelijk.test.mjs` keurt dit per scherm, dus een
nieuw veld zonder label laat de testen zakken.

**Elk scherm begint bij een h1** en slaat geen koppenniveau over. Dezelfde test
let daarop.

**De focus overleeft een hertekening.** De app vervangt bij elke tik het hele
scherm, dus het element dat de focus had bestaat daarna niet meer. Zonder
ingrijpen valt de focus terug op de body en begint de volgende Tab weer
bovenaan de pagina — na élke handeling. Er wordt daarom een *handvat* onthouden
(het `id` of het eerste gevulde `data-*`-attribuut) en na de hertekening
teruggezocht. Is de knop echt verdwenen, dan gaat de focus naar `.hoofd`, die
daarvoor `tabindex="-1"` heeft. Geef een knop die na een hertekening terug moet
komen dus altijd een `id` of een `data-`attribuut; zonder allebei is hij niet
terug te vinden.

**Schermlezers.** De app vervangt bij elke tik het hele scherm, en daar leest
een schermlezer niets van voor. Meldingen en foutregels gaan daarom óók naar
een onzichtbaar vak buiten `#app` (`#omroep`, `aria-live="polite"`), dat er de
hele tijd staat en alleen van inhoud verandert. Zet dat vak nooit in `#app` en
verberg het nooit met `display:none` of `visibility:hidden` — in beide gevallen
zegt het niets meer. Er is niets aan te roepen vanuit nieuwe code: een
`MutationObserver` kijkt mee met wat er getekend wordt, langs welk pad dan ook.

**Zonder verbinding** krijg je een eigen scherm ("Even geen bereik") en geen
leeg vlak. Dat laatste was wat er gebeurde: de app haalt supabase-js op met een
`await import` op modulenniveau, en als die mislukt stopt het hele script
voordat er ook maar iets getekend is. Er is met opzet geen service worker — een
oude stand tonen alsof hij klopt is erger dan een foutmelding.

**Als een scherm vastloopt** ("Dit scherm liep vast") krijg je te zien wat er
misging, plus twee uitwegen. *Opnieuw proberen* vergeet eerst welk scherm je
open had staan en herlaadt dan — anders komt de app terug op precies het scherm
dat net klapte en gebeurt hetzelfde nog eens. Helpt dat niet, dan vergeet
*Begin op dit toestel opnieuw* alles wat dit toestel van je weet: welke poule,
wie je bent, welke poules je kent. Twee tikken, net als bij "alles wissen".
Je inzendingen staan in de database en niet in dat scherm, dus die raak je niet
kwijt — je wijst na afloop opnieuw je naam aan in de poule. Je taalkeuze blijft
staan.

Gaat er iets mis búíten het tekenen om, dan verschijnt er alleen een balkje
onderaan. Een losse mislukte handeling is geen reden om je uit de app te
gooien; het balkje zegt alleen dat het scherm misschien niet meer klopt, en is
weg te klikken.

---

## 15. Het eigen domein: predicttherace.com

De repo is er klaar voor: de landingspagina, de sitemap en `robots.txt` wijzen
al naar `https://predicttherace.com`, de agenda en de meldingen ook
(`APP_URL` in `scripts/sync.mjs`), en de app zelf noemt geen adres — die leest
het uit de adresbalk. `test/domein.test.mjs` houdt dat zo.

Wat overblijft gebeurt buiten de repo, en **de volgorde telt**: eerst de DNS,
dan GitHub. Zodra je het domein in GitHub opslaat stuurt GitHub elke bezoeker
van `dannydevis.github.io/F1-Poule/` door naar het domein. Wijst de DNS dan nog
nergens heen, dan is de site plat.

### Stap 0: wie straks opnieuw moet inloggen

Voor de browser is een nieuw adres een nieuw toestel. Alles wat de app onthoudt
— welke poule, wie je bent, het anonieme account — staat per adres. Op
`predicttherace.com` begint dus iedereen één keer opnieuw:

- **Wie Google of een mailadres gekoppeld heeft** logt in met dezelfde knop en
  is meteen weer zichzelf.
- **Wie dat niet heeft** kiest zijn naam, maar die hangt nog aan zijn oude,
  anonieme account. Dan moet de poulebaas hem **losmaken** (§7, "Als een
  speler aan het verkeerde account hangt").
- **De poulebaas zelf** moet zeker gekoppeld zijn. Die kan zichzelf niet
  losmaken.

Wie het betreft, in de SQL Editor van Supabase:

```sql
select p.name as poule, m.display_name as speler
from public.pool_members m
join public.pools p on p.id = m.pool_id
join auth.users u on u.id = m.user_id
where u.is_anonymous
order by 1, 2;
```

Vraag die mensen vóór de overstap hun account te koppelen (Profiel → "je
account meenemen"), of spreek af dat de poulebaas ze erna losmaakt.

### Stap 1: de DNS, bij de partij waar je het domein gekocht hebt

Haal eerst weg wat er voor `@` (het kale domein) en `www` al staat aan A-,
AAAA- en CNAME-records: meestal is dat een parkeerpagina van de registrar.
MX- en TXT-records laat je staan. Zet er dan dit neer:

| Type  | Naam  | Waarde                 |
|-------|-------|------------------------|
| A     | `@`   | `185.199.108.153`      |
| A     | `@`   | `185.199.109.153`      |
| A     | `@`   | `185.199.110.153`      |
| A     | `@`   | `185.199.111.153`      |
| AAAA  | `@`   | `2606:50c0:8000::153`  |
| AAAA  | `@`   | `2606:50c0:8001::153`  |
| AAAA  | `@`   | `2606:50c0:8002::153`  |
| AAAA  | `@`   | `2606:50c0:8003::153`  |
| CNAME | `www` | `dannydevis.github.io` |

De vier AAAA-regels (IPv6) mogen ook weg als je registrar moeilijk doet; de A-
regels zijn wat telt. De CNAME is zonder `/F1-Poule` erachter. Zit je domein
bij **Cloudflare**, zet de oranje wolk dan op grijs ("DNS only"), anders kan
GitHub geen certificaat aanvragen.

Of het doorgekomen is zie je op dnschecker.org (zoek `predicttherace.com`, type
A): overal `185.199.108–111.153`. Meestal binnen een uur, soms langer.

### Stap 2: het domein op je naam zetten bij GitHub (aanrader)

github.com → je profielfoto → **Settings** → **Pages** (onder "Code, planning,
and automation") → **Add a domain** → `predicttherace.com`. GitHub geeft je een
TXT-record (naam `_github-pages-challenge-…`, met een code als waarde). Zet dat
bij je registrar neer en klik **Verify**.

Het hoeft niet, maar zonder dit kan iemand anders jouw domein aan zijn eigen
GitHub-site hangen op een moment dat het bij jou even niet gekoppeld is.

### Stap 3: het domein aan de repo koppelen

De repo → **Settings** → **Pages** → **Custom domain**: `predicttherace.com` →
**Save**. Daarna gebeuren er drie dingen:

1. GitHub controleert de DNS. Wacht op het groene "DNS check successful".
2. GitHub zet zelf een bestand `CNAME` in `main`, met het domein erin. Dat is
   het bestand dat `test/domein.test.mjs` naloopt.
3. Vanaf nu gaat `dannydevis.github.io/F1-Poule/…` door naar
   `predicttherace.com/…`, met alles wat erachter stond. Oude uitnodigingen,
   inloglinks en agenda-abonnementen blijven dus werken.

Vink daarna **Enforce HTTPS** aan. Dat vakje blijft grijs tot het certificaat
er is: een paar minuten, uiterlijk een dag.

Komt die `CNAME` niet in `main` (GitHub meldt een fout, of er verschijnt geen
commit), zet hem er dan zelf in via een PR: één regel, `predicttherace.com`.

### Stap 4: Supabase

Authentication → **URL Configuration**:

- **Site URL**: `https://predicttherace.com/app/`
- **Redirect URLs** → Add URL: `https://predicttherace.com/**`

De regels met `dannydevis.github.io` mogen blijven staan tot niemand ze nog
gebruikt; weghalen kan over een paar weken. Zonder de nieuwe regel negeert
Supabase de terugkeerlink die de app meestuurt, en komt iedereen die inlogt
met Google of de mail op de Site URL uit in plaats van in de app.

### Stap 5: Google Cloud

console.cloud.google.com → **Google Auth Platform** → **Clients** → je
webclient:

- **Authorized JavaScript origins**: voeg `https://predicttherace.com` toe.
- **Authorized redirect URIs**: niets aan veranderen. Daar staat
  `https://etifamdwqxjfaeaordlr.supabase.co/auth/v1/callback`, en dat is het
  adres van Supabase, niet van de app.

Onder **Branding**: staat daar een "App home page", zet die op
`https://predicttherace.com` en voeg `predicttherace.com` toe bij
**Authorized domains**.

### Stap 6: nalopen

- `https://predicttherace.com` → de landingspagina, met een slotje.
- `https://www.predicttherace.com` en `http://predicttherace.com` → gaan door
  naar `https://predicttherace.com`.
- `https://dannydevis.github.io/F1-Poule/?code=<poulecode>` → komt uit op
  `https://predicttherace.com/app/?code=<poulecode>` en vraagt wie je bent.
- In de app inloggen met Google → je komt terug in de app, op het nieuwe adres.
- Een inlogmail aanvragen → de link in de mail opent de app op het nieuwe adres.

### Stap 7: de spelers

Eén bericht in de groep is genoeg: de poule staat op predicttherace.com, oude
links werken nog, log één keer opnieuw in met Google of je mail. **Wie de app
op zijn beginscherm heeft** haalt dat pictogram weg en zet hem opnieuw vanaf
`predicttherace.com/app/`: het oude pictogram hoort bij het oude adres en
opent de app voortaan in een browservenster.

### Stap 8: zoekmachines

- **Google Search Console** (search.google.com/search-console) → Add
  property → het linkervak, **Domain** → `predicttherace.com`. Google geeft een
  regel `google-site-verification=…`; die komt bij de registrar als TXT-record
  op `@`, en dan **Verify** (lukt het niet meteen, een kwartier wachten). Daarna
  onder **Sitemaps**: `sitemap.xml`. "Couldn't fetch" in de eerste dagen is
  normaal bij een nieuw domein.
- **Bing Webmaster Tools** (bing.com/webmasters). "Import from Google Search
  Console" vindt een Domain-property **niet** ("we didn't find any sites from
  GSC"): Bing neemt alleen URL-prefix-properties over. Dus handmatig: Add your
  site manually → `https://predicttherace.com/` → **CNAME record**. Bing geeft
  een naam (een code van 32 tekens) met als waarde `verify.bing.com`; die
  CNAME bij de registrar, en dan Verify. Daarna onder **Sitemaps**:
  `https://predicttherace.com/sitemap.xml`. Op Bing leunen ook Copilot en voor
  een deel de zoekfunctie van ChatGPT; onder **AI Performance** zie je
  wanneer de site daar geciteerd wordt.
- **Google Cloud → Branding**: de links naar de privacyverklaring en de
  voorwaarden wezen naar `dannydevis.github.io/F1-Poule/`. Privacy hoort op
  `https://predicttherace.com/privacy/` (de losse pagina, zie §12); het vakje
  voor de voorwaarden is niet verplicht en mag leeg.
- Klein, maar handig: de repo → het tandwieltje bij **About** → Website:
  `https://predicttherace.com`.

### Wat vanzelf gaat

- **De agenda.** `kalender.ics` noemt het adres van de app in elk item. De
  sync schrijft hem bij elke run opnieuw als er iets verschilt, dus de eerste
  run na de koppeling zet het nieuwe adres erin (Actions → Uitslagen
  synchroniseren → Run workflow, als je niet wilt wachten). Wie er al op
  geabonneerd is hoeft niets te doen.
- **Meldingen** staan nog niet aan (§11c). Als ze aangaan is dat op het nieuwe
  adres, en daar wijzen ze ook heen.
