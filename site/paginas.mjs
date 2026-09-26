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
//   secties        { id, vraag, kort, tekst?, stappen?, tabel?, voorbeeld?, punten?, lijst? }
//                  vraag wordt een h2, kort de eerste alinea eronder
//   faq            [vraag, antwoord], alleen vragen die niet al op de voorpagina staan
//   leesOok        [anker op de voorpagina, linktekst]
//
// Getallen over de app (punten, aantal vragen, jokers, meldingen) staan er als
// {naam} in en komen bij het maken uit de app zelf (FEITEN in maak-site.mjs).
// Nooit overtypen: verandert de app, dan verandert de pagina mee.
//
// Schrijfregels uit het zoekplan: het antwoord eerst, geen en-dash of em-dash,
// en Nederlands en Engels elk zelf geschreven, niet de een uit de ander
// vertaald. Danny leest beide voordat ze online gaan.

export const PAGINAS = [
  {
    id: 'organiseren',
    soort: 'gids',
    verwant: [],
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
