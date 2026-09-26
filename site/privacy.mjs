// De privacyverklaring als losse pagina: predicttherace.com/privacy/ en
// /en/privacy/.
//
// Dezelfde verklaring staat al in de app (Profiel → wat de app van je weet),
// maar daar kan niemand bij die de app niet opent: Google niet als het het
// inlogscherm nakijkt, en een speler niet die wil weten waar hij aan begint.
// Deze pagina zegt hetzelfde, voor wie de app nog niet heeft.
//
// Wat hier staat moet kloppen met de app. test/privacypagina.test.mjs legt de
// twee naast elkaar: wat de app noemt (Supabase, OpenF1, esm.sh, je IP-adres,
// Google, het mailadres dat je alleen zelf koppelt) hoort hier ook te staan,
// en het contactadres is hetzelfde.
//
// Geen HTML in de teksten, net als in teksten.mjs. De sjabloon maakt links van
// {contact}, {ap} en {app}.
//
// Twee talen en niet zeven, net als de app zelf. De Duitse, Franse, Spaanse,
// Italiaanse en Portugese pagina's verwijzen naar de Engelse.

// Waar iemand terecht kan met een vraag over zijn gegevens. Staat ook in de
// app (PRIVACY_CONTACT); de test houdt die twee gelijk.
export const CONTACT = 'devisser.danny@gmail.com';
export const PRIVACY_BIJGEWERKT = '2026-09-24';

export const PRIVACY = {
  nl: {
    pad: 'privacy', locale: 'nl_NL',
    titel: 'Privacy en je gegevens | Predict the Race',
    omschrijving: 'Wat Predict the Race van je bewaart, waar het staat, wie het ziet en hoe je het weer weg krijgt. Geen advertenties, statistieken alleen met je ja.',
    kop: 'Wat Predict the Race van je weet',
    intro: 'Predict the Race is een gratis F1-voorspelspel voor vriendengroepen. Het bewaart zo weinig mogelijk, en wat het bewaart staat hieronder, in gewone taal.',
    bijgewerkt: 'Bijgewerkt op 25 september 2026',
    secties: [
      ['Wat er bewaard wordt', [
        'De naam die je in een poule kiest, je voorspellingen en je punten. En een anoniem account: een willekeurig nummer, zodat de database weet welke voorspellingen van jou zijn.',
        'Je mailadres alleen als je het zelf koppelt, om op een ander toestel verder te spelen. Doe je dat niet, dan staat er geen mailadres.',
      ]],
      ['Als je met Google inlogt', [
        'Dan weet Google dat je deze app gebruikt, en krijgt de app je naam en mailadres van Google. Dat gebeurt alleen als je er zelf voor kiest. Koppel je niets, of gebruik je een mailadres, dan komt Google er niet aan te pas.',
      ]],
      ['Wie het ziet', [
        'Wie in je poule zit ziet je naam en je punten, en na de deadline ook wat je voorspeld hebt. Daarbuiten niemand. Zet de poulebaas de poule op openbaar, dan kan iedereen hem vinden en meedoen.',
        'Deel je je seizoen, dan komt er een pagina met je naam, je punten, je plek en je beste weekend. Niet je poule, niet je medespelers en niet wat iemand heeft ingevuld. Haal je hem weg, dan zijn die gegevens ook weg.',
      ]],
      ['Als je meldingen aanzet', [
        'Dan komt er één regel bij per toestel: het adres waar je pushdienst (Google, Apple of Mozilla) een melding naartoe kan sturen, plus twee sleutels van dat toestel. Geen naam en geen mailadres. Die regel gaat weg zodra je meldingen uitzet.',
      ]],
      ['Waar het staat', [
        'In een database bij Supabase. De app en deze site staan bij GitHub Pages, dat net als elke webserver je IP-adres ziet als je een pagina opent. De kalender, de coureurs en de uitslagen komen van OpenF1; daar staat niets van jou in.',
      ]],
      ['Op je toestel', [
        'De app onthoudt in je browser in welke poule je zit, wie je bent en welke taal je kiest, zodat je niet elke keer opnieuw hoeft te beginnen. Dat is geen trackingcookie: het blijft op je toestel en niemand anders leest het.',
      ]],
      ['Wat er niet gebeurt', [
        'Geen advertenties, en er wordt niets doorverkocht of gedeeld. Google Analytics alleen als je daar ja op zegt (zie hieronder). De lettertypen staan op de site zelf, dus daar gaat niets naartoe. Eén ding komt nog van buiten: de code waarmee de app met de database praat, van esm.sh. Die ziet daarbij je IP-adres.',
      ]],
      ['Tellen', [
        'Per dag telt de app hoe vaak hij geopend wordt, en welke accounts dat deden. Dat laatste alleen om te kunnen zien hoeveel mensen er meespelen, en het verdwijnt na vijf weken. Er komt geen cookie aan te pas en er wordt geen IP-adres bewaard.',
      ]],
      ['Google Analytics', [
        'Alleen als je daar ja op zegt, meten we met Google Analytics hoe de site en de app gebruikt worden: welke pagina\'s je opent, hoe lang, met wat voor toestel en ongeveer vanuit welk land. Google zet daarvoor cookies, ziet je IP-adres en kan die gegevens buiten de EU verwerken. We gebruiken het alleen om te zien wat er gebeurt, niet voor advertenties.',
        'Zeg je nee, of kies je niets, dan wordt er niets van Google geladen. Je keuze aanpassen kan altijd: onderaan elke pagina bij "Statistieken en cookies", of in de app onder Profiel.',
      ]],
      ['Hoe lang', [
        'Zolang de poule bestaat. Je kunt er zelf een eind aan maken in de app, onder Profiel, bij "wat de app van je weet". Daar staan twee knoppen. "Mijn account verwijderen" haalt je account en je mailadres weg; je spelers blijven met naam en punten in de poule staan, zodat de stand van de anderen blijft kloppen. "Alles verwijderen" haalt ook je spelers en al je voorspellingen weg, in elke poule. Dat is niet terug te draaien.',
      ]],
      ['Inzien, vragen en klagen', [
        'Alles wat de app van je weet staat in de app zelf: je naam, je voorspellingen en je punten. Een vraag, of wil je dat er iets gecorrigeerd of weggehaald wordt? Mail naar {contact}.',
        'Komen we er samen niet uit, dan kun je een klacht indienen bij de {ap}.',
      ]],
      ['Wie hierachter zit', [
        'Predict the Race is gemaakt door Danny de Visser, als fanproject zonder winstoogmerk. Hij is verantwoordelijk voor wat er met je gegevens gebeurt. De broncode staat openbaar op GitHub, dus alles hierboven is na te lezen.',
      ]],
    ],
    ap: 'Autoriteit Persoonsgegevens',
    apUrl: 'https://autoriteitpersoonsgegevens.nl',
    terug: 'Naar de voorpagina', app: 'Open de app', ander: 'Read in English',
  },

  en: {
    pad: 'en/privacy', locale: 'en_GB',
    titel: 'Privacy and your data | Predict the Race',
    omschrijving: 'What Predict the Race keeps about you, where it lives, who sees it and how to get it removed. No ads, statistics only with your yes.',
    kop: 'What Predict the Race knows about you',
    intro: 'Predict the Race is a free F1 prediction game for groups of friends. It keeps as little as possible, and what it keeps is listed below, in plain language.',
    bijgewerkt: 'Updated on 25 September 2026',
    secties: [
      ['What is kept', [
        'The name you pick in a pool, your predictions and your points. And an anonymous account: a random number, so the database knows which predictions are yours.',
        'Your email address only if you link it yourself, to carry on playing on another device. If you do not, there is no email address.',
      ]],
      ['If you sign in with Google', [
        'Then Google knows you use this app, and the app gets your name and email address from Google. That only happens if you choose it yourself. Link nothing, or use an email address, and Google is not involved at all.',
      ]],
      ['Who sees it', [
        'The players in your pool see your name and your points, and after the deadline also what you predicted. Nobody outside it does. If the pool owner makes the pool public, anyone can find it and join.',
        'If you share your season, there is a page with your name, your points, your position and your best weekend. Not your pool, not your fellow players and not what anyone filled in. Take it down and that data is gone too.',
      ]],
      ['If you turn notifications on', [
        'Then one row is added per device: the address your push service (Google, Apple or Mozilla) can send a notification to, plus two keys from that device. No name and no email address. That row goes away as soon as you turn notifications off.',
      ]],
      ['Where it lives', [
        'In a database at Supabase. The app and this site are hosted on GitHub Pages, which, like any web server, sees your IP address when you open a page. The calendar, the drivers and the results come from OpenF1; nothing of yours is in there.',
      ]],
      ['On your device', [
        'The app remembers in your browser which pool you are in, who you are and which language you chose, so you do not have to start over every time. That is not a tracking cookie: it stays on your device and nobody else reads it.',
      ]],
      ['What does not happen', [
        'No ads, and nothing is sold on or shared. Google Analytics only if you say yes to it (see below). The fonts are on the site itself, so nothing goes there. One thing still comes from outside: the code the app uses to talk to the database, from esm.sh. That sees your IP address.',
      ]],
      ['Counting', [
        'Each day the app counts how often it is opened, and which accounts did so. The latter only to see how many people are playing, and it disappears after five weeks. No cookie is involved and no IP address is stored.',
      ]],
      ['Google Analytics', [
        'Only if you say yes to it, we measure with Google Analytics how the site and the app are used: which pages you open, for how long, on what kind of device and roughly from which country. Google sets cookies for this, sees your IP address and may process that data outside the EU. We only use it to see what happens, not for ads.',
        'If you say no, or choose nothing, nothing from Google is loaded. You can always change your choice: at the bottom of every page under "Statistics and cookies", or in the app under Profile.',
      ]],
      ['How long', [
        'As long as the pool exists. You can put an end to it yourself in the app, under Profile, at "what the app knows about you". There are two buttons there. "Delete my account" removes your account and your email address; your players stay in the pool with their name and points, so the standings of the others stay right. "Delete everything" also removes your players and all your predictions, in every pool. That cannot be undone.',
      ]],
      ['Access, questions and complaints', [
        'Everything the app knows about you is in the app itself: your name, your predictions and your points. A question, or want something corrected or removed? Email {contact}.',
        'If we cannot sort it out together, you can lodge a complaint with the {ap}, or with the data protection authority in your own country.',
      ]],
      ['Who is behind this', [
        'Predict the Race is made by Danny de Visser, as a non-profit fan project. He is responsible for what happens to your data. The source code is public on GitHub, so everything above can be checked.',
      ]],
    ],
    ap: 'Dutch Data Protection Authority (Autoriteit Persoonsgegevens)',
    apUrl: 'https://autoriteitpersoonsgegevens.nl/en',
    terug: 'Back to the home page', app: 'Open the app', ander: 'Lees in het Nederlands',
  },
};

// Welke privacypagina hoort bij welke landingspagina. Alleen Nederlands heeft
// een eigen; de rest leest de Engelse.
export const privacyTaal = (code) => (code === 'nl' ? 'nl' : 'en');
