// De losse pagina's naast de voorpagina: gidsen, en later een about- en een
// vergelijkingspagina. Alles wat scripts/maak-site.mjs nodig heeft om er een
// pagina van te maken staat hier; een nieuwe pagina toevoegen is data invullen,
// geen HTML kopiëren.
//
// Eén item per onderwerp. Het id is gelijk over alle talen: dat is het
// hreflang-cluster. Een taal die er niet is, staat er niet in, en krijgt dus
// ook geen link in het taalmenu of in de hreflang.
//
// Per taal:
//   pad            de map, zonder slash aan het begin of eind
//   titel          30 tot 65 tekens, de zoekterm vooraan (test/site.test.mjs)
//   omschrijving   110 tot 165 tekens
//   kop            de h1
//   kort           het korte antwoord bovenaan: eerst het antwoord, geen inleiding
//   teaser         de linktekst op de voorpagina van die taal
//   secties        { id, vraag, kort, tekst?, stappen?, tabel?, rekenvoorbeeld?,
//                    voorbeeld?, vragentabel?, formules?, punten?, lijst? }
//                  vraag wordt een h2, kort de eerste alinea eronder
//   faq            [vraag, antwoord], alleen vragen die niet al op de voorpagina staan
//   leesOok        [anker op de voorpagina, linktekst]
//
// Per pagina, voor alle talen samen:
//   verwant        de ids van de gidsen die onder "Lees ook" komen
//   teaserPlek     onder welk blok van de voorpagina de link staat: 'hoe'
//                  (standaard, onder de stappen) of 'punten' (onder de puntentabel)
//   rekenvoorbeeld { voorspeld: tien coureurs, uitslag: de uitslag op volgorde }.
//                  Een sectie met rekenvoorbeeld: { kop, geenPlek, totaal } toont
//                  het als tabel, uitgerekend door scoreLijst() uit de app, en
//                  {voorbeeldTotaal}, {voorbeeldExact} en {voorbeeldDichtbij}
//                  komen daar ook uit. Wie niet in de uitslag staat, kreeg geen plek.
//
// In een sectie:
//   vragentabel    true: de losse vragen en de seizoensvragen met hun punten,
//                  zoals op de voorpagina (namen uit site/teksten.mjs)
//   formules       [wat, formule]: formules voor een spreadsheet, als code
//
// Getallen over de app (punten, aantal vragen, jokers, meldingen) staan er als
// {naam} in en komen bij het maken uit de app zelf (feitenVoor() in
// maak-site.mjs). Nooit overtypen: verandert de app, dan verandert de pagina mee.
//
// Schrijfregels uit het zoekplan: het antwoord eerst, geen en-dash of em-dash,
// en Nederlands en Engels elk zelf geschreven, niet de een uit de ander
// vertaald. Danny leest beide voordat ze online gaan.

export const PAGINAS = [
  {
    id: 'organiseren',
    soort: 'gids',
    verwant: ['puntentelling', 'excel'],
    talen: {
      nl: {
        pad: 'f1-poule-organiseren',
        titel: 'F1-poule organiseren in 5 minuten | Predict the Race',
        omschrijving: 'Zo zet je een F1-poule op met vrienden of collega\'s: de vier stappen, de keuzes die ertoe doen en de drie valkuilen waardoor een poule halverwege stilvalt.',
        kop: 'Een F1-poule organiseren',
        kort: 'Een F1-poule zet je in vijf minuten op: geef hem een naam, kies hoeveel vragen er meetellen en deel de code in de groepsapp. Het seizoen doorkomen is het lastige deel. Een poule valt stil als iemand onbereikbaar achter raakt, als mensen vergeten in te vullen, of als er na de race niets te bespreken is.',
        teaser: 'Alles over een poule opzetten: de keuzes en de valkuilen',
        secties: [
          {
            id: 'opzetten',
            vraag: 'Hoe zet je een F1-poule op?',
            kort: 'In vier stappen. Daarna hoef je als poulebaas niets meer bij te houden.',
            stappen: [
              'Geef de poule een naam. Die staat in de app en in de uitnodiging. Zit iemand in meer dan één poule, dan helpt een korte omschrijving erbij, zoals "met de collega\'s, om de eer".',
              'Vul je eigen naam in. Je bent meteen de eerste speler en de poulebaas: jij kiest de vragen en de spelregels.',
              'Kies hoeveel er te voorspellen valt: Simpel, Klassiek of Gevorderd, of stel zelf samen welke vragen meetellen.',
              'Deel de uitnodigingslink of de code van zes tekens in de groepsapp. Wie hem opent, kiest een naam en doet mee, zonder account en zonder wachtwoord.',
            ],
            tekst: [
              'Daarna gaat het vanzelf. De kalender en de coureurs staan er al, en na elke kwalificatie en race komt de officiële uitslag binnen en rekent de app de punten uit. Niemand hoeft iets over te typen.',
              'Doe het ruim voor de eerste race. Tot die gereden is kun je de vragen nog aanpassen; daarna ligt de set vast, zodat elk weekend met dezelfde regels telt.',
            ],
          },
          {
            id: 'vragen',
            vraag: 'Hoeveel vragen laat je meetellen?',
            kort: 'Zo veel als je groep volhoudt. Twee top 10\'s per weekend is genoeg voor een fanatieke poule; wie alles wil, voorspelt er {nGevorderd}.',
            tabel: {
              kop: ['Niveau', 'Vragen', 'Punten per weekend'],
              rijen: [
                ['Simpel', '{nSimpel}', '{simpel}'],
                ['Klassiek', '{nKlassiek}', '{klassiek}'],
                ['Gevorderd', '{nGevorderd}', '{gevorderd}, plus sprint en seizoen'],
              ],
            },
            tekst: [
              'Simpel is alleen de twee top 10\'s: de kwalificatie en de race. Klassiek voegt de winnaar, de pole position en de snelste ronde toe. Gevorderd zet alles aan, van snelste pitstop en teamgenoot-duels tot het aantal safety cars en een rode vlag.',
              'Meer vragen betekent meer te winnen, maar ook langer invullen. In een groep waar de helft pas op zaterdagochtend aan de kwalificatie denkt, houdt Simpel het langer vol dan Gevorderd.',
            ],
          },
          {
            id: 'punten',
            vraag: 'Hoe werkt de puntentelling?',
            kort: 'Voor elke coureur in je top 10 krijg je {exact} punten als hij precies op die plek eindigt, {bijna} bij één plek ernaast en {twee} bij twee plekken ernaast.',
            voorbeeld: 'Voorbeeld: je zet een coureur op P3 en hij wordt vierde. Dat is één plek ernaast, dus {bijna} punten. Een perfecte top 10 is {top10} punten per sessie, en op een sprintweekend komt de sprint erbij, goed voor maximaal {sprint}.',
            tekst: [
              'Dat bijna goed ook telt, houdt het spannend voor iedereen. Je hoeft de volgorde niet perfect te hebben om punten te pakken, en één verrassing in de race gooit niet je hele weekend weg.',
            ],
          },
          {
            id: 'deadlines',
            vraag: 'Tot wanneer kan iedereen invullen?',
            kort: 'Tot de sessie begint. De top 10 van de kwalificatie sluit bij de start van de kwalificatie, die van de race bij de start van de race.',
            tekst: [
              'Op een sprintweekend sluit de sprint als eerste. Na de deadline ligt je voorspelling vast.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Speel je met jokers?',
            kort: 'Met een joker tellen al je punten van één raceweekend dubbel. Staan jokers aan, dan heeft iedereen er standaard {jokers} per seizoen; als poulebaas kies je er 1 tot {jokersMax}, of je laat ze uit.',
            tekst: [
              'Je zet een joker voordat het weekend begint, daarna ligt hij vast. Jokers geven wie achter staat iets om op te hopen, en ze maken van elk weekend een kleine gok: is dit het circuit waar jij het beter weet dan de rest?',
            ],
          },
          {
            id: 'valkuilen',
            vraag: 'Waar loopt een F1-poule op stuk?',
            kort: 'Zelden op de vragen. Bijna altijd op een van drie dingen: een achterstand die niet meer in te halen is, vergeten in te vullen, of niets om na de race over te praten.',
            punten: [
              ['Een onbereikbare achterstand', 'Wie na acht races ver achter staat, haakt af. Geef daarom meer te winnen dan alleen de eindstand: de weekendwinnaar (wie een weekend de meeste punten pakt, wint dat weekend), de onderlinge duels (per vriend zie je wie er vaker won) en de jokers.'],
              ['Vergeten in te vullen', 'Eén gemiste race zet je op achterstand, na twee haak je af. Daartegen helpen het agenda-abonnement met een melding {agendaUur} voor elke deadline, een pushmelding als je {venster} voor een deadline nog niets hebt ingevuld, en automatisch invullen: wie niets inlevert, krijgt een willekeurige top 10 in plaats van nul punten.'],
              ['Niets om over te praten', 'Na de race moet er iets te zien zijn. De uitslag per coureur, de stand met wie er klom en wie er zakte, en een plaatje van de uitslag voor de groepsapp geven de groep elk weekend iets om over na te praten.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'Checklist voor de poulebaas',
            kort: 'Loop dit na voordat het seizoen begint.',
            lijst: [
              'De poule staat klaar en de code is gedeeld, vóór de eerste kwalificatie.',
              'Het niveau is gekozen: Simpel, Klassiek, Gevorderd of zelf samengesteld.',
              'Jokers: aan of uit, en hoeveel per speler.',
              'Automatisch invullen: samen afgesproken of het aan gaat.',
              'Iedereen heeft zich op de agenda geabonneerd of de meldingen aangezet.',
              'De seizoensvragen zijn ingevuld vóór de eerste race.',
              'Iedereen weet waar je om speelt: om de eer. De app kent geen inleg, pot of prijzen.',
            ],
          },
        ],
        faq: [
          ['Kan iemand halverwege het seizoen nog instappen?', 'Ja. Wie later meedoet, scoort vanaf de eerstvolgende race. De seizoensvragen die hij nog niet had, kan hij alsnog invullen, maar wat eenmaal is ingevuld ligt vast.'],
          ['Kan ik in meer dan één poule zitten?', 'Ja. In de app wissel je tussen je poules, en de omschrijving die de poulebaas erbij zet, staat erbij als je wisselt.'],
          ['Kan een poule openbaar zijn?', 'Ja. Standaard is hij besloten en doe je mee met de code, maar je kunt hem ook vindbaar maken, zodat iedereen kan meedoen.'],
          ['Wat is het verschil tussen een poule en een pronostiek?', 'Er is geen verschil. In Vlaanderen heet een voorspelspel vaak een pronostiek, in Nederland meestal een poule. Je voorspelt de uitslag en speelt om punten tegen elkaar.'],
        ],
        leesOok: [
          ['niveaus', 'Simpel, Klassiek of Gevorderd: de drie niveaus naast elkaar'],
          ['punten', 'De hele puntentelling, met de losse vragen en de seizoensvragen'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/how-to-run-an-f1-prediction-league',
        titel: 'How to run an F1 prediction league | Predict the Race',
        omschrijving: 'Set up an F1 prediction league with friends or colleagues in five minutes: the four steps, the choices that matter and the three things that kill a league.',
        kop: 'How to run an F1 prediction league',
        kort: 'Setting up takes five minutes: name the league, decide how much to predict and drop the code in the group chat. Keeping it alive all season is the hard part. Leagues die when someone falls hopelessly behind, when people forget to enter, or when there is nothing to talk about after the race.',
        teaser: 'Everything about running a league: the choices and the pitfalls',
        secties: [
          {
            id: 'set-up',
            vraag: 'How do you set up an F1 prediction league?',
            kort: 'In four steps. After that, the league admin has nothing left to keep track of.',
            stappen: [
              'Name the league. The name shows in the app and in the invite. A short description helps anyone who plays in more than one league, something like "work league, for the glory".',
              'Enter your own name. You are the first player and the league admin, so you pick the questions and the rules.',
              'Decide how much to predict: Simple, Classic or Advanced, or build your own set of questions.',
              'Share the invite link or the six-character code in your group chat. Anyone who opens it picks a name and is in, with no account and no password.',
            ],
            tekst: [
              'From then on it runs itself. The calendar and the drivers are already there, and after every qualifying session and race the official result comes in and the points are worked out. Nobody types anything in.',
              'Do it well before the first race. Until that race has been run you can still change the questions; after that the set is locked, so every weekend is scored by the same rules.',
            ],
          },
          {
            id: 'questions',
            vraag: 'How many questions should count?',
            kort: 'As many as your group will keep up with. Two top 10s a weekend is plenty for a competitive league; if you want everything, there are {nGevorderd}.',
            tabel: {
              kop: ['Level', 'Questions', 'Points per weekend'],
              rijen: [
                ['Simple', '{nSimpel}', '{simpel}'],
                ['Classic', '{nKlassiek}', '{klassiek}'],
                ['Advanced', '{nGevorderd}', '{gevorderd}, plus sprint and season'],
              ],
            },
            tekst: [
              'Simple is just the two top 10s, qualifying and race. Classic adds the winner, pole position and fastest lap. Advanced switches everything on, from fastest pit stop and teammate battles to the number of safety cars and a red flag.',
              'More questions means more to win, but also more to fill in. In a group where half the players only think about qualifying on Saturday morning, Simple lasts longer than Advanced.',
            ],
          },
          {
            id: 'scoring',
            vraag: 'How does the scoring work?',
            kort: 'For every driver in your top 10 you get {exact} points if he finishes exactly there, {bijna} if he is one place off and {twee} if he is two places off.',
            voorbeeld: 'Example: you put a driver in P3 and he finishes fourth. That is one place off, so {bijna} points. A perfect top 10 is worth {top10} points per session, and on a sprint weekend the sprint adds up to {sprint} more.',
            tekst: [
              'Because nearly right still scores, nobody is out of it after one surprise. You do not need the exact order to pick up points, and one chaotic race does not wipe out your weekend.',
            ],
          },
          {
            id: 'deadlines',
            vraag: 'When do predictions close?',
            kort: 'When the session starts. The qualifying top 10 closes at the start of qualifying, the race top 10 at the start of the race.',
            tekst: [
              'On a sprint weekend the sprint closes first. Once the deadline has passed, your prediction is locked.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Should you play with jokers?',
            kort: 'A joker doubles all your points for one race weekend. With jokers switched on, everyone gets {jokers} per season by default; as the league admin you can set anything from 1 to {jokersMax}, or leave them off.',
            tekst: [
              'You play a joker before the weekend starts, and then it is locked in. Jokers give players who are behind something to hope for, and they turn every weekend into a small bet: is this the circuit where you know better than everyone else?',
            ],
          },
          {
            id: 'pitfalls',
            vraag: 'What kills an F1 prediction league?',
            kort: 'Rarely the questions. It is almost always one of three things: a gap nobody can close, people forgetting to enter, or nothing to talk about after the race.',
            punten: [
              ['A gap nobody can close', 'Someone who is miles behind after eight races stops playing. So give people more to win than the final standings: the weekend winner (whoever scores the most in a weekend wins that weekend), head-to-head records (you see who has won more often against each friend) and jokers.'],
              ['Forgetting to enter', 'Miss one race and you are behind; miss two and you are gone. What helps: the calendar subscription with a reminder {agendaUur} before every deadline, a push notification when you have not entered anything {venster} before a deadline, and auto-fill, which gives anyone who forgets a random top 10 instead of zero.'],
              ['Nothing to talk about', 'After the race there has to be something to look at. The result per driver, the standings showing who climbed and who dropped, and a result image for the group chat give everyone something to argue about every weekend.'],
            ],
          },
          {
            id: 'checklist',
            vraag: 'A checklist for the league admin',
            kort: 'Go through this before the season starts.',
            lijst: [
              'The league exists and the code is shared, before the first qualifying session.',
              'The level is chosen: Simple, Classic, Advanced or your own set.',
              'Jokers: on or off, and how many each.',
              'Auto-fill: agreed together whether it is on.',
              'Everyone has subscribed to the calendar or switched on notifications.',
              'The season questions are filled in before the first race.',
              'Everyone knows what you are playing for: bragging rights. There is no entry fee, pot or prize in the app.',
            ],
          },
        ],
        faq: [
          ['Can someone join halfway through the season?', 'Yes. Late joiners score from the next race on. Any season questions they have not answered yet can still be filled in, but an answer cannot be changed once it is in.'],
          ['Can I be in more than one league?', 'Yes. You switch between leagues in the app, and the description the league admin adds is shown when you switch.'],
          ['Can a league be public?', 'Yes. By default it is private and people join with the code, but you can make it findable so anyone can join.'],
          ['Does it work for an office league?', 'Yes. Nobody needs an account or an app store download: it runs in the browser on any phone or computer. And there is no money involved, which keeps things simple at work.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classic or Advanced: the three levels side by side'],
          ['punten', 'The full scoring, with the extra questions and season questions'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
    },
  },
  {
    id: 'puntentelling',
    soort: 'gids',
    verwant: ['organiseren', 'excel'],
    teaserPlek: 'punten',
    // Een verzonnen race. Sainz staat niet in de uitslag: uitgevallen.
    rekenvoorbeeld: {
      voorspeld: ['Verstappen', 'Norris', 'Leclerc', 'Piastri', 'Hamilton', 'Russell', 'Antonelli', 'Alonso', 'Sainz', 'Albon'],
      uitslag: ['Norris', 'Verstappen', 'Leclerc', 'Russell', 'Piastri', 'Hamilton', 'Alonso', 'Antonelli', 'Gasly', 'Hadjar', 'Albon'],
    },
    talen: {
      nl: {
        pad: 'f1-poule-puntentelling',
        titel: 'Puntentelling voor een F1-poule | Predict the Race',
        omschrijving: 'Vier manieren om punten te geven in een F1-poule, met de voor- en nadelen, een uitgerekend voorbeeld en de telling die Predict the Race gebruikt.',
        kop: 'Puntentelling voor een F1-poule',
        kort: 'In een F1-poule krijg je punten voor elke coureur in je top 10, en hoe dichter hij bij jouw plek eindigt, hoe meer. Predict the Race geeft {exact} punten voor precies goed, {bijna} bij één plek ernaast en {twee} bij twee plekken ernaast. Alleen exact goed laten tellen klinkt streng en eerlijk, maar dan scoort bijna niemand en beslist geluk de stand.',
        teaser: 'De puntentelling uitgelegd, met een rekenvoorbeeld',
        secties: [
          {
            id: 'systemen',
            vraag: 'Welke puntentellingen zijn er?',
            kort: 'Vier gangbare. Het grote verschil is of bijna goed ook punten oplevert.',
            punten: [
              ['Alleen exact goed', 'Punten als een coureur precies eindigt op de plek waar jij hem zette. Makkelijk uit te leggen, maar een top 10 die overal één plek naast zit, levert niets op. Na een paar races staat iedereen rond nul en beslist één gelukstreffer de stand.'],
              ['Punten naar afstand', '{exact} punten voor precies goed, {bijna} voor één plek ernaast, {twee} voor twee plekken ernaast, en daarna niets. Zo telt Predict the Race. Wie het veld goed inschat, scoort ook als de volgorde net anders uitvalt. Het nadeel is het rekenwerk: met de hand zijn dat tien coureurs per sessie per speler.'],
              ['De WK-punten', 'Voor elke coureur op de goede plek krijg je de punten die hij in het echt krijgt: {wkPunten}. Dat voelt als echte Formule 1, maar een goede P10 is {wkLaatste} punt waard en de winnaar {wkEerste}. Wie de winnaar mist, staat meteen ver achter, en de onderkant van je top 10 telt nauwelijks mee.'],
              ['Alleen winnaar en podium', 'Snel ingevuld, maar de meeste mensen kiezen dezelfde favoriet. Dan scoort iedereen ongeveer hetzelfde en valt er weinig te winnen.'],
            ],
            tekst: [
              'Losse vragen, zoals de pole position of de snelste ronde, komen daar bovenop. Die leveren een vast aantal punten op als je ze goed hebt.',
            ],
          },
          {
            id: 'rekenvoorbeeld',
            vraag: 'Hoe reken je een top 10 uit?',
            kort: 'Per coureur tel je hoeveel plekken hij van jouw voorspelling af zit, en zoek je de punten daarbij op. Hieronder een verzonnen race, uitgerekend met dezelfde code die in de app de punten geeft.',
            rekenvoorbeeld: { kop: ['Coureur', 'Jouw plek', 'Uitslag', 'Punten'], geenPlek: 'uitgevallen', totaal: 'Totaal' },
            voorbeeld: 'Totaal {voorbeeldTotaal} van de {top10} punten. Als alleen exact goed telde, was het {voorbeeldExact} geweest, terwijl {voorbeeldDichtbij} van de 10 coureurs hooguit één plek van hun voorspelde plek eindigden.',
            tekst: [
              'Kijk naar Albon: in de voorspelling op P10, in de uitslag elfde. Dat is één plek ernaast en dus {bijna} punten, ook al valt hij buiten de top 10. Sainz viel uit en kreeg geen plek in de uitslag, dus nul.',
            ],
          },
          {
            id: 'bijna-goed',
            vraag: 'Waarom telt bijna goed mee?',
            kort: 'Omdat een F1-uitslag altijd een beetje toeval is. Eén trage pitstop en je P4 wordt P5.',
            tekst: [
              'Als alleen exact goed telt, wint wie geluk heeft. Telt de afstand mee, dan wint wie het veld het best inschat, en daar hoort een poule over te gaan.',
              'Het houdt de poule ook spannend. Wie een slecht weekend heeft, pakt toch punten, en de achterstand op de koploper blijft in te halen.',
            ],
          },
          {
            id: 'losse-vragen',
            vraag: 'Welke vragen kun je nog meer laten meetellen?',
            kort: 'Naast de twee top 10\'s zijn er losse vragen per weekend en {nSeizoen} seizoensvragen, elk met een vast aantal punten voor een goed antwoord.',
            vragentabel: true,
            tekst: [
              'Wat een weekend kan opleveren, hangt af van het niveau dat de poulebaas kiest: {simpel} punten bij Simpel, {klassiek} bij Klassiek en {gevorderd} bij Gevorderd. Op een sprintweekend komt de sprint erbij, en de seizoensvragen tellen aan het eind van het seizoen mee.',
            ],
          },
          {
            id: 'gelijk',
            vraag: 'Wat als twee spelers evenveel punten hebben?',
            kort: 'Dan delen ze de plek. Twee spelers met evenveel punten staan allebei tweede, en wie daarna komt, staat vierde: 1, 2, 2, 4.',
            tekst: [
              'Bij de weekendwinnaar werkt het net zo. Hebben twee spelers dezelfde hoogste score, dan hebben ze dat weekend allebei gewonnen.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'Wat doet een joker met je punten?',
            kort: 'Met een joker tellen al je punten van dat weekend dubbel: de top 10\'s, de sprint en de losse vragen. De seizoensvragen tellen nooit dubbel.',
            tekst: [
              'Staan jokers aan, dan heeft iedereen er standaard {jokers} per seizoen. Een joker zet je voordat het weekend begint.',
            ],
          },
        ],
        faq: [
          ['Kan ik de punten per vraag zelf aanpassen?', 'Nee. De punten per vraag liggen vast, zodat een score in elke poule hetzelfde betekent. Als poulebaas kies je wel welke vragen meetellen en of je met jokers speelt.'],
          ['Telt een coureur buiten de top 10 mee?', 'Ja. Je voorspelt een top 10, maar de hele uitslag telt. Zet je iemand op P10 en wordt hij elfde, dan krijg je {bijna} punten.'],
          ['Wat krijg je voor een coureur die uitvalt?', 'Niets, als hij geen plek in de uitslag krijgt. Dat is pech, maar het is dezelfde pech voor iedereen die hem in zijn top 10 had.'],
          ['Wanneer staan de punten erin?', 'Na elke kwalificatie en race, zodra de officiële uitslag binnen is. Verandert de uitslag kort na de race nog door een straf, dan rekent de app opnieuw.'],
        ],
        leesOok: [
          ['niveaus', 'Simpel, Klassiek of Gevorderd: welke vragen bij elk niveau horen'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/f1-prediction-scoring-system',
        titel: 'F1 prediction scoring systems explained | Predict the Race',
        omschrijving: 'Four ways to score an F1 prediction league, what each gets right and wrong, a fully worked example, and the scoring Predict the Race uses.',
        kop: 'F1 prediction scoring systems',
        kort: 'Most F1 prediction leagues score every driver in your top 10, with more points the closer he finishes to where you put him. Predict the Race gives {exact} points for the exact spot, {bijna} for one place off and {twee} for two places off. Scoring exact hits only sounds strict but fair; in practice almost nobody scores and luck decides the table.',
        teaser: 'Scoring systems explained, with a worked example',
        secties: [
          {
            id: 'systems',
            vraag: 'What scoring systems are there?',
            kort: 'Four common ones. What sets them apart is whether nearly right still scores.',
            punten: [
              ['Exact position only', 'You score when a driver finishes exactly where you put him. Easy to explain, but a top 10 that is one place off everywhere scores nothing. A few races in, everyone is close to zero and one lucky guess decides the league.'],
              ['Points by distance', '{exact} points for the exact spot, {bijna} for one place off, {twee} for two places off, nothing beyond that. This is how Predict the Race scores. If you read the field well, you score even when the order shuffles a little. The catch is the maths: by hand, that is ten drivers per session for every player.'],
              ['Real F1 points', 'For each driver in the right spot you get the points he gets in the championship: {wkPunten}. It feels like the real thing, but a correct P10 is worth {wkLaatste} point and the winner {wkEerste}. Miss the winner and you are miles behind, and the bottom half of your top 10 barely matters.'],
              ['Winner and podium only', 'Quick to fill in, but most people pick the same favourite. Everyone ends up with roughly the same score and there is little to play for.'],
            ],
            tekst: [
              'Extra questions such as pole position or fastest lap come on top, each worth a fixed number of points when you get it right.',
            ],
          },
          {
            id: 'worked-example',
            vraag: 'How do you score a top 10?',
            kort: 'For each driver, count how many places he finished from your prediction and look up the points. Below is a made-up race, scored by the same code that scores the app.',
            rekenvoorbeeld: { kop: ['Driver', 'Your pick', 'Result', 'Points'], geenPlek: 'DNF', totaal: 'Total' },
            voorbeeld: '{voorbeeldTotaal} out of {top10} points. Counting exact hits only, it would have been {voorbeeldExact}, even though {voorbeeldDichtbij} of the 10 drivers finished within one place of the prediction.',
            tekst: [
              'Look at Albon: predicted P10, finished eleventh. That is one place off, so {bijna} points, even though he ended up outside the top 10. Sainz retired and has no classified position, so he scores zero.',
            ],
          },
          {
            id: 'nearly-right',
            vraag: 'Why should nearly right count?',
            kort: 'Because an F1 result always has some luck in it. One slow pit stop and your P4 becomes P5.',
            tekst: [
              'If only exact hits count, the luckiest player wins. If distance counts, the player who reads the field best wins, and that is what a prediction league should reward.',
              'It also keeps the league alive. A bad weekend still earns you something, and the leader stays within reach.',
            ],
          },
          {
            id: 'extra-questions',
            vraag: 'What else can you score?',
            kort: 'Besides the two top 10s there are extra questions every weekend and {nSeizoen} season questions, each worth a fixed number of points for a correct answer.',
            vragentabel: true,
            tekst: [
              'How much a weekend is worth depends on the level the league admin picks: {simpel} points on Simple, {klassiek} on Classic and {gevorderd} on Advanced. On sprint weekends the sprint comes on top, and the season questions are settled at the end of the season.',
            ],
          },
          {
            id: 'ties',
            vraag: 'What happens when two players are level on points?',
            kort: 'They share the position. Two players on the same points are both second, and the next player is fourth: 1, 2, 2, 4.',
            tekst: [
              'The weekend winner works the same way. If two players share the top score, they both win that weekend.',
            ],
          },
          {
            id: 'jokers',
            vraag: 'What does a joker do to your points?',
            kort: 'A joker doubles everything you score that weekend: both top 10s, the sprint and the extra questions. Season questions are never doubled.',
            tekst: [
              'With jokers switched on, everyone gets {jokers} per season by default. You play a joker before the weekend starts.',
            ],
          },
        ],
        faq: [
          ['Can I change the points per question?', 'No. The points per question are fixed, so a score means the same thing in every league. As the league admin you choose which questions count and whether jokers are on.'],
          ['Does a driver outside the top 10 still count?', 'Yes. You predict a top 10, but the whole result counts. Put someone in P10, he finishes eleventh, and you get {bijna} points.'],
          ['What do you get for a driver who retires?', 'Nothing, if he has no classified position. That is bad luck, but it is the same bad luck for everyone who had him in their top 10.'],
          ['When do the points show up?', 'After every qualifying session and race, as soon as the official result is in. If a penalty changes the result shortly after the race, the app scores it again.'],
        ],
        leesOok: [
          ['niveaus', 'Simple, Classic or Advanced: which questions each level includes'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
    },
  },
  {
    id: 'excel',
    soort: 'gids',
    verwant: ['puntentelling', 'organiseren'],
    teaserPlek: 'punten',
    talen: {
      nl: {
        pad: 'f1-poule-excel',
        titel: 'F1-poule bijhouden in Excel | Predict the Race',
        omschrijving: 'Een F1-poule bijhouden in Excel of Google Spreadsheets: welke kolommen je nodig hebt, de formule voor de punten per plek en waar het in een seizoen misgaat.',
        kop: 'Een F1-poule bijhouden in Excel',
        kort: 'Dat kan prima. Je hebt per speler vier kolommen nodig en één formule die de punten per coureur uitrekent. Het werk zit niet in de formule maar in het bijhouden: elk raceweekend de hele uitslag overtypen, straffen achteraf verwerken en zorgen dat iedereen op tijd inlevert.',
        teaser: 'Liever zelf bijhouden in Excel? De kolommen en de formule',
        secties: [
          {
            id: 'kolommen',
            vraag: 'Welke kolommen heb je nodig?',
            kort: 'Per speler en per sessie vier: de coureur, de plek die de speler voorspelde, de plek waar de coureur echt eindigde, en de punten.',
            tabel: {
              kop: ['Kolom', 'Wat erin staat', 'Voorbeeld'],
              rijen: [
                ['A', 'De coureur', 'Verstappen'],
                ['B', 'De voorspelde plek, 1 tot en met 10', '1'],
                ['C', 'De echte plek, leeg als hij geen plek kreeg', '2'],
                ['D', 'De punten, met de formule hieronder', '{bijna}'],
              ],
            },
            tekst: [
              'In rij 1 staan de kopjes, de tien coureurs in rij 2 tot en met 11. Maak per race een tabblad met voor elke speler zo\'n blok van vier kolommen naast elkaar, en een tabblad met de totalen dat alles optelt. Kopieer je het blok voor de volgende speler, dan schuiven de formules vanzelf mee.',
            ],
          },
          {
            id: 'formule',
            vraag: 'Welke formule rekent de punten uit?',
            kort: 'Deze, in D2 en dan doorgetrokken tot D11: {exact} punten voor precies goed, {formStap} minder voor elke plek ernaast, en nooit minder dan nul.',
            formules: [
              ['Nederlandstalig Excel', '=ALS(C2="";0;MAX(0;{formMax}-{formStap}*ABS(B2-C2)))'],
              ['Het totaal van de sessie, in D12', '=SOM(D2:D11)'],
            ],
            tekst: [
              'Dat is dezelfde som als in Predict the Race: {exact} punten voor exact, {bijna} voor één plek ernaast, {twee} voor twee plekken ernaast, en vanaf drie plekken niets.',
              'Het ALS-deel is er voor een lege cel. Zonder dat rekent Excel met plek 0, en kan een speler punten krijgen voor een coureur die geen plek in de uitslag had.',
            ],
          },
          {
            id: 'buiten-top-10',
            vraag: 'Wat doe je met coureurs buiten de top 10?',
            kort: 'Hun echte plek gewoon invullen. Zet een speler iemand op P10 en wordt die elfde, dan is dat één plek ernaast en dus {bijna} punten.',
            tekst: [
              'Daarom heb je de hele uitslag nodig, niet alleen de top 10. Alleen een coureur zonder plek in de officiële uitslag, bijvoorbeeld niet geklasseerd of gediskwalificeerd, laat je leeg. Die levert nul op.',
            ],
          },
          {
            id: 'misgaat',
            vraag: 'Waar gaat het mis met Excel?',
            kort: 'Zelden bij de formule. Het gaat mis bij het bijhouden: na een paar races doet één persoon al het werk, elk weekend opnieuw.',
            punten: [
              ['Elke uitslag overtypen', 'De hele uitslag van kwalificatie en race, elk raceweekend. Eén verwisselde regel en de stand klopt niet meer, zonder dat iemand het merkt.'],
              ['Straffen achteraf', 'Een tijdstraf na de finish schuift de uitslag op. Dan moet je terug naar dat tabblad en alles opnieuw nalopen.'],
              ['Deadlines', 'Wie stuurde zijn top 10 voor de start? In de groepsapp is "ik had hem al getypt" niet te controleren, en een lijst die na de start binnenkomt, geeft discussie.'],
              ['De stand op je telefoon', 'Een gedeeld spreadsheet kan, maar op een telefoon is een tabblad met vier kolommen per speler nauwelijks te lezen.'],
            ],
          },
          {
            id: 'zonder-spreadsheet',
            vraag: 'Kan het ook zonder spreadsheet?',
            kort: 'Ja. Predict the Race rekent op dezelfde manier, maar de uitslag komt vanzelf binnen.',
            tekst: [
              'Na elke kwalificatie en race haalt de app de officiële uitslag op en rekent de punten uit. Voorspellingen sluiten bij de start van de sessie, dus niemand kan achteraf nog iets veranderen. En verandert de uitslag kort na de race door een straf, dan rekent de app opnieuw.',
              'Het is gratis en er is geen account nodig. Je deelt de poule met een code in de groepsapp.',
            ],
          },
        ],
        faq: [
          ['Werkt dit ook in Google Spreadsheets?', 'Ja, met dezelfde kolommen en dezelfde formule. Geeft hij een fout, kijk dan naar de taal: in het Engels heten de functies IF en SUM, en met een Engelse landinstelling scheid je met komma\'s in plaats van puntkomma\'s.'],
          ['Hoe tel ik de winnaar en de pole position mee?', 'Met een eigen regel per vraag: goed is punten, fout is nul. Staat de voorspelde winnaar in B14 en de echte in C14, dan geeft =ALS(B14=C14;{winnaar};0) de punten. In Predict the Race is de winnaar {winnaar} punten waard en de pole position {pole}; die getallen kun je overnemen.'],
          ['Hoe zet ik spelers met evenveel punten op dezelfde plek?', 'Met RANG op het tabblad met de totalen. Staan tien spelers in B2 tot en met B11, dan geeft =RANG(B2;B$2:B$11) spelers met evenveel punten dezelfde plek: 1, 2, 2, 4. Zo telt Predict the Race ook.'],
        ],
        leesOok: [
          ['hoe', 'Zo werkt Predict the Race'],
          ['faq', 'Veelgestelde vragen over de app'],
        ],
      },
      en: {
        pad: 'en/f1-prediction-league-spreadsheet',
        titel: 'F1 prediction league spreadsheet | Predict the Race',
        omschrijving: 'Run an F1 prediction league in Excel or Google Sheets: the columns you need, the formula that scores each position, and where a spreadsheet lets you down.',
        kop: 'Running an F1 prediction league in a spreadsheet',
        kort: 'A spreadsheet works fine. Each player needs four columns and one formula to score every driver. The work is not in the formula but in the upkeep: typing in the full result every race weekend, fixing it after penalties, and making sure everyone submits before the start.',
        teaser: 'Prefer a spreadsheet? The columns and the formula',
        secties: [
          {
            id: 'columns',
            vraag: 'What columns do you need?',
            kort: 'Four per player per session: the driver, where the player predicted him, where he actually finished, and the points.',
            tabel: {
              kop: ['Column', 'What goes in it', 'Example'],
              rijen: [
                ['A', 'The driver', 'Verstappen'],
                ['B', 'Predicted position, 1 to 10', '1'],
                ['C', 'Actual position, blank if not classified', '2'],
                ['D', 'Points, from the formula below', '{bijna}'],
              ],
            },
            tekst: [
              'Row 1 holds the headers and the ten drivers go in rows 2 to 11. Use one tab per race with a block of four columns for each player side by side, and a totals tab that adds everything up. Copy the block for the next player and the formulas move along with it.',
            ],
          },
          {
            id: 'formula',
            vraag: 'Which formula scores the points?',
            kort: 'This one, in D2 and filled down to D11: {exact} points for the exact spot, {formStap} fewer for every place off, never below zero.',
            formules: [
              ['Excel or Google Sheets in English', '=IF(C2="",0,MAX(0,{formMax}-{formStap}*ABS(B2-C2)))'],
              ['The session total, in D12', '=SUM(D2:D11)'],
            ],
            tekst: [
              'That is the same sum Predict the Race uses: {exact} for exact, {bijna} for one place off, {twee} for two places off, and nothing from three places off.',
              'The IF part is there for blank cells. Without it, a blank counts as position 0, and a player can pick up points for a driver who had no classified position.',
              'Where decimals are written with a comma, as in much of Europe, the commas in the formula become semicolons.',
            ],
          },
          {
            id: 'outside-top-10',
            vraag: 'What about drivers outside the top 10?',
            kort: 'Enter their actual position like any other. If a player puts someone in P10 and he finishes eleventh, that is one place off, so {bijna} points.',
            tekst: [
              'That is why you need the full result, not just the top 10. Only leave the cell blank for a driver with no position in the official classification, such as not classified or disqualified. He scores zero.',
            ],
          },
          {
            id: 'problems',
            vraag: 'Where does a spreadsheet let you down?',
            kort: 'Rarely in the formula. It goes wrong in the upkeep: a few races in, one person is doing all the work, every weekend.',
            punten: [
              ['Typing in every result', 'The full qualifying and race result, every race weekend. Swap two rows and the standings are wrong, and nobody notices.'],
              ['Penalties after the flag', 'A time penalty after the finish reshuffles the result. Then you go back to that tab and check everything again.'],
              ['Deadlines', 'Who sent their top 10 before the start? In a group chat, "I had already typed it" is impossible to check, and a list that turns up after lights out starts an argument.'],
              ['Standings on a phone', 'You can share the sheet, but four columns per player is hard to read on a phone.'],
            ],
          },
          {
            id: 'without-a-spreadsheet',
            vraag: 'Can you do it without a spreadsheet?',
            kort: 'Yes. Predict the Race scores the same way, and the results come in on their own.',
            tekst: [
              'After every qualifying session and race the app fetches the official result and works out the points. Predictions close when the session starts, so nobody can change anything afterwards. And if a penalty changes the result shortly after the race, the app scores it again.',
              'It is free and nobody needs an account. You share the league with a code in the group chat.',
            ],
          },
        ],
        faq: [
          ['Does this work in Google Sheets?', 'Yes, with the same columns and the same formula. If it returns an error, check the locale: where the decimal separator is a comma, the formula needs semicolons instead of commas.'],
          ['How do I score the race winner and pole position?', 'With a row per question: right is points, wrong is zero. With the predicted winner in B14 and the actual winner in C14, =IF(B14=C14,{winnaar},0) gives the points. In Predict the Race the winner is worth {winnaar} points and pole position {pole}, so you can borrow those numbers.'],
          ['How do I put players on equal points in the same position?', 'Use RANK on the totals tab. With ten players in B2 to B11, =RANK(B2,B$2:B$11) gives players on the same points the same position: 1, 2, 2, 4. Predict the Race ranks the same way.'],
        ],
        leesOok: [
          ['hoe', 'How Predict the Race works'],
          ['faq', 'Frequently asked questions about the app'],
        ],
      },
    },
  },
];

// De vaste woorden van het sjabloon, alleen voor de talen waarin er pagina's
// zijn. `uren` maakt van een aantal uur een stukje zin ("een uur", "3 uur").
export const PAGINA_UI = {
  nl: {
    kruimel: 'Kruimelpad',
    bijgewerkt: 'Bijgewerkt op {datum}',
    faq: 'Veelgestelde vragen',
    leesOok: 'Lees ook',
    gidsen: 'Gidsen',
    terug: 'Naar de voorpagina',
    app: 'Open de app',
    privacy: 'Privacy',
    taal: 'Taal',
    slot: { kop: 'Klaar om te beginnen?', tekst: 'Maak je poule in een minuut en deel de code met je vrienden.', knop: 'Maak je poule' },
    uren: (n) => (n === 1 ? 'een uur' : `${n} uur`),
  },
  en: {
    kruimel: 'Breadcrumb',
    bijgewerkt: 'Updated {datum}',
    faq: 'Frequently asked questions',
    leesOok: 'Read next',
    gidsen: 'Guides',
    terug: 'Back to the home page',
    app: 'Open the app',
    privacy: 'Privacy',
    taal: 'Language',
    slot: { kop: 'Ready to start?', tekst: 'Start your league in a minute and share the code with your friends.', knop: 'Start your league' },
    uren: (n) => (n === 1 ? 'an hour' : `${n} hours`),
  },
};
