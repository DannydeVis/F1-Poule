# F1 Poule: bediening en schermindeling

Ontwerp voor de navigatie en het aanmaakproces. Hoort bij `ROUTEKAART.md`.

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

Drie tabs, vast onderin beeld:

```
┌─────────────────────────────────────┐
│                                     │
│           schermruimte              │
│                                     │
├─────────────────────────────────────┤
│   Races      Stand       Poule      │
└─────────────────────────────────────┘
```

### Races
De lijst met raceweekenden, dit is het startscherm. Per race zichtbaar of hij
open is, wacht op de uitslag, of gescoord is. Tik erop en je komt in het
invulscherm of het uitslagscherm.

Bovenaan een strook met wat er nu speelt: "Kwalificatie sluit zaterdag 16:00,
Davy heeft nog niks ingevuld."

### Stand
Drie onderdelen op één scherm, gescheiden door koppen:
- Seizoensstand
- Weekendoverwinningen (wie won de meeste losse weekenden)
- Onderlinge duels (jij tegen elke andere speler)

Bovenaan de knop **Kopieer voor WhatsApp**.

### Poule
Leden, poulecode, uitnodiglink met deelknop, en de instellingen. Voor de
poulebaas staat hier ook het beheergedeelte: welke vragen meedoen, de
omschrijving van de poule. Verder je eigen link (zie §4) en, onderaan, je
andere poules om naar over te stappen.

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
| **Gevorderd** | + safety cars, rode vlag, snelste pitstop, teamgenoot-duels | ongeveer 200 |

Daaronder een regel **Zelf samenstellen**, die pas een lijst met vinkjes
openklapt als je erop tikt. Bij elk vinkje staat het aantal punten, en
onderaan telt hij live op: "Maximaal 178 punten per weekend."

Standaard staat **Klassiek** geselecteerd. Wie doorklikt zonder na te denken
krijgt daarmee iets dat leuker is dan alleen twee top-tienen, zonder overweldigd
te worden.

### Stap 4: Klaar, nodig je vrienden uit

Toont de poulecode groot, plus een deelknop met de uitnodiglink erin:

```
https://dannydevis.github.io/F1-Poule/?code=10D4FD
```

Wie die link opent slaat het codescherm over en komt direct bij "hoe heet jij".

---

## 4. Meedoen met een poule

Twee routes:

**Via de uitnodiglink** (`?code=...`): direct naar "hoe heet jij", geen code
intypen. Dit wordt de standaardroute, want zo deel je hem in de groepsapp.

**Via de code**: invoerveld op het startscherm voor wie de link kwijt is.

Daarna in beide gevallen: kies jezelf uit de lijst als je er al in staat, of
maak jezelf aan als nieuwe speler.

**Via je eigen link** (`?code=...&speler=...`): voor jezelf, niet om te delen.
De app weet alleen per toestel wie je bent, dus wie op zijn telefoon én op zijn
laptop meedoet maakt zichzelf twee keer aan en ziet zijn punten over twee
spelers verdeeld. Deze link zet je op het tweede toestel meteen als dezelfde
speler neer. Hij staat onder Poule, met de waarschuwing erbij: wie hem heeft
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
Poule-tab ("jouw andere poules"), en op het startscherm zodra je op **Andere
poule** hebt gedrukt.

Wisselen haalt de poule opnieuw uit de database op in plaats van uit het
lijstje: de naam of de omschrijving kan veranderd zijn, en een poule die
verwijderd is hoort uit het lijstje te verdwijnen in plaats van je op een leeg
scherm te zetten.

Let op wat dit lijstje **niet** is: het staat in `localStorage`, dus het is per
toestel. Wie op zijn telefoon én op zijn laptop speelt heeft twee lijstjes. Eén
lijst over al je toestellen vraagt om een login; zie OVERDRACHT.md.

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
Ze worden gemaakt door `scripts/maak-pictogrammen.py` — met de hand, want er is
geen beeldbibliotheek en er hoeft er ook geen te komen: het motief is het
startgrid uit het ontwerp, en dat bestaat uit rechthoeken.
## 6. De vragenset op slot

Zodra de eerste race van het seizoen gescoord is, worden de vinkjes in
Poule → beheer alleen-lezen, met een regel eronder:

> De vragenset ligt vast sinds Melbourne. Zo blijven alle races vergelijkbaar.

Technisch: een veld `questions_locked` op de poule, gezet door de scoringslogica
zodra de eerste race een uitslag krijgt.

---

## 7. Wie mag wat

De poulebaas staat als `owner_member_id` bij de poule, en het beheergedeelte
staat alleen bij die speler op het scherm. Dat geldt voor de vragenset én voor
de omschrijving.

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
  Een foutmelding zou daar veel erger zijn.

**Eenmalig aanzetten in Supabase.** Anoniem inloggen staat standaard uit.
Dashboard → Authentication → Sign In / Providers → **Anonymous sign-ins** aan.
Doe je dat niet, dan blijft de app gewoon werken — elke aanmeldpoging faalt
stilletjes en er wordt niets geclaimd — maar dan staat het fundament er ook
niet als de policies dichtgaan.

### Je account meenemen (optioneel)

Onder **Poule** staat "je account meenemen". Daar koppel je **Google** of een
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
   URLs*: zet daar de url van de app in (bijvoorbeeld
   `https://dannydevis.github.io/F1-Poule/`). Staat hij er niet, dan negeert
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
- **Lezen blijft voor iedereen open.** Dat moet: je zoekt een poule op zijn
  code voordat je lid bent, en je kiest jezelf uit de spelerslijst voordat je
  meedoet. Wie de anon key uit de broncode plukt kan dus poules en namen
  uitlezen, en zich aanmelden bij een poule die niet van hem is. Vervelend,
  maar niet destructief: hij komt bij niemands antwoord.

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
| Top 10 kwalificatie en race | `session_result` |
| Snelste ronde | `laps`, de kortste `lap_duration` |
| Snelste pitstop | `pit`, de kortste `pit_duration` |
| Safety cars | `race_control` |
| Rode vlag | `race_control` |

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

Waarom dit en geen mail of pushbericht: die vragen allebei om infrastructuur
die er niet is (een mailleverancier met een sleutel, of VAPID-sleutels plus een
pushdienst) én om een lijst met wie je wanneer bereikt. Dit vraagt om niets, en
het bestand is voor iedereen hetzelfde — er gaat dus ook geen enkel gegeven van
een speler naartoe.

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

## 12. Wat de app van je weet

Onder **Poule** staat een dichtgeklapt blok "wat de app van je weet". Daarin
staat kort wat er bewaard wordt en hoe je het weer weg krijgt. Sinds er
mailadressen aan accounts kunnen hangen slaat de app een persoonsgegeven op, en
dan hoort dat er te staan.

Wat de verklaring zegt, en waarom het waar is:

- **De naam die je kiest, je voorspellingen en je punten.** Plus een anoniem
  account: een willekeurig nummer.
- **Je mailadres alleen als je het zelf koppelt.** Zonder koppeling staat er
  geen mailadres.
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

### Twee dingen die jij nog moet invullen

1. **Een contactadres.** Bovenin `index.html` staat `PRIVACY_CONTACT = ''`.
   Zolang dat leeg is, staat er geen contactregel in de verklaring — en een
   privacyverklaring zonder contactadres is niet af. Let op: die pagina is
   publiek, dus zet er een adres in dat je publiek wilt hebben.
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
