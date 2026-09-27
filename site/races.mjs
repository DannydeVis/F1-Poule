// De racepagina's: een pilot met de laatste zeven races van 2026 (zoekplan SEO
// fase 4, docs/zoekplan/1-seo.md). Alleen NL en EN.
//
// Per race het circuit (circuit_key van OpenF1, dezelfde als in
// site/data/circuits.json) en het stuk van de url: /races/2026/<slug>/ en
// /en/races/2026/<slug>/. scripts/racedata.mjs haalt voor precies deze races
// de tijden, de uitslag van vorig jaar en straks de uitslag van dit jaar op, en
// schrijft site/data/races-<jaar>.json. De generator leest alleen dat bestand.
//
// Kuala Lumpur (2 tot 4 oktober) doet niet mee: daar is geen vorige editie in
// OpenF1, en het plan zegt geen pagina zonder vorige editie.
//
// Dit bestand komt niet online (_config.yml sluit site/*.mjs uit).

export const RACE_JAAR = 2026;

// Per race ook de namen die niet uit OpenF1 komen: de Nederlandse naam en
// korte naam, de plaats zoals je hem zegt, en de naam van de baan. De Engelse
// naam komt uit OpenF1 (meeting_name).
export const RACES = [
  { circuit: 61, slug: 'singapore', baan: 'Marina Bay Street Circuit',
    nl: { naam: 'Grand Prix van Singapore', kort: 'GP van Singapore', plaats: 'Singapore' },
    en: { kort: 'Singapore GP', plaats: 'Singapore' } },
  { circuit: 9, slug: 'austin', baan: 'Circuit of the Americas',
    nl: { naam: 'Grand Prix van de Verenigde Staten', kort: 'GP van de VS', plaats: 'Austin' },
    en: { kort: 'United States GP', plaats: 'Austin' } },
  { circuit: 65, slug: 'mexico-city', baan: 'Autódromo Hermanos Rodríguez',
    nl: { naam: 'Grand Prix van Mexico-Stad', kort: 'GP van Mexico-Stad', plaats: 'Mexico-Stad' },
    en: { kort: 'Mexico City GP', plaats: 'Mexico City' } },
  { circuit: 14, slug: 'sao-paulo', baan: 'Interlagos',
    nl: { naam: 'Grand Prix van São Paulo', kort: 'GP van São Paulo', plaats: 'São Paulo' },
    en: { kort: 'São Paulo GP', plaats: 'São Paulo' } },
  { circuit: 152, slug: 'las-vegas', baan: 'Las Vegas Strip Circuit',
    nl: { naam: 'Grand Prix van Las Vegas', kort: 'GP van Las Vegas', plaats: 'Las Vegas' },
    en: { kort: 'Las Vegas GP', plaats: 'Las Vegas' } },
  { circuit: 150, slug: 'qatar', baan: 'Lusail International Circuit',
    nl: { naam: 'Grand Prix van Qatar', kort: 'GP van Qatar', plaats: 'Lusail' },
    en: { kort: 'Qatar GP', plaats: 'Lusail' } },
  { circuit: 70, slug: 'abu-dhabi', baan: 'Yas Marina Circuit',
    nl: { naam: 'Grand Prix van Abu Dhabi', kort: 'GP van Abu Dhabi', plaats: 'Abu Dhabi' },
    en: { kort: 'Abu Dhabi GP', plaats: 'Abu Dhabi' } },
];

// De teksten van een racepagina en van het overzicht, per taal. {namen} vult
// scripts/racepaginas.mjs in met de gegevens van die race; wat er van de app
// in staat ({exact} enzovoort) vult de generator daarna, zoals bij de gidsen.
// Tijden: op de Nederlandse pagina in UTC en in Nederlandse tijd, op de Engelse
// in UTC (het plan). Geen HTML, geen streepjes.
export const RACE_TEKST = {
  nl: {
    tijdzone: 'Europe/Amsterdam',
    pad: 'races',
    // Met een zacht afbreekstreepje (\u00ad): op een telefoon mag het woord breken.
    sessies: { 'Sprint Qualifying': 'Sprint\u00adkwalificatie', Sprint: 'Sprint', Qualifying: 'Kwalificatie', Race: 'Race' },
    ja: 'ja', nee: 'nee',
    titel: '{kort} {jaar}: tijden en cijfers | Predict the Race',
    omschrijving: 'De tijden van de {kort} {jaar} in Nederlandse tijd, de top 10 van {vorigJaar} en hoe vaak de safety car in {plaats} kwam. Voorspel de race gratis met vrienden.',
    kop: '{naam} {jaar}',
    kort: 'De {naam} {jaar} wordt verreden in {plaats} ({baan}), en de race begint op {raceDag} om {raceTijd} Nederlandse tijd. Hieronder de tijden van elke sessie, de top 10 van {vorigJaar} en hoe vaak de safety car hier kwam, als houvast voor je voorspelling in Predict the Race.',
    tijden: {
      vraag: 'Hoe laat begint de {naam}?',
      kort: 'De race begint op {raceDag} om {raceTijd} Nederlandse tijd, {raceUtc} UTC. De kwalificatie is op {kwaliDag} om {kwaliTijd}.{sprint} In Predict the Race kun je elke sessie voorspellen tot hij begint; daarna gaat hij op slot.',
      sprint: ' De sprint is op {sprintDag} om {sprintTijd}.',
      bijschrift: 'Het weekend van de {naam} {jaar}: elke sessie in UTC en in Nederlandse tijd',
      kop: ['Sessie', 'Dag', 'UTC', 'NL-tijd'],
      tekst: 'Elke voorspelling sluit bij de start van de sessie waar hij bij hoort: de pole position bij de kwalificatie, de winnaar en de safety cars bij de race. Tijden kunnen nog verschuiven; deze pagina wordt automatisch bijgewerkt.',
    },
    uitslag: {
      vraag: 'Wie won de {naam} {jaar}?',
      vraagVorig: 'Wie won de {naam} in {jaar}?',
      kort: '{winnaar} ({team}) won de {naam} van {jaar}, voor {tweede} en {derde}.{pole} Hieronder de top 10 van de race en van de kwalificatie.',
      poleWinnaar: '{winnaar} ({team}) won de {naam} van {jaar} vanaf pole position, voor {tweede} en {derde}. Hieronder de top 10 van de race en van de kwalificatie.',
      pole: ' De pole position was van {pole}.',
      race: 'Race {jaar}: de top 10',
      kwali: 'Kwalificatie {jaar}: de top 10',
      kop: ['Plek', 'Coureur', 'Team'],
    },
    safety: {
      vraag: 'Hoe vaak komt de safety car in {plaats}?',
      kort: 'In de {races} races in {plaats} sinds {vanaf} kwam de safety car {aantal} keer de baan op, een virtuele meegeteld: gemiddeld {gemiddeld} per race, tegen {gemiddeldAlles} over alle circuits. {rodeVlag} Zo telt Predict the Race ook bij de vraag hoeveel safety cars er komen.',
      geenRodeVlag: 'Een rode vlag was er in die races niet.',
      rodeVlag: 'In {rodeVlag} van die races werd de race stilgelegd met een rode vlag.',
      bijschrift: 'Safety cars en rode vlaggen in {plaats} per jaar, virtuele meegeteld (bron: OpenF1)',
      kop: ['Jaar', 'Safety cars', 'Rode vlag'],
      link: 'Safety cars op alle circuits',
    },
    slot: {
      kop: 'Voorspel de {kort}',
      tekst: 'Zet je top 10 voor de kwalificatie en de race klaar, met je vrienden in één poule. Gratis en zonder account.',
      knop: 'Voorspel de {kort}',
    },
    leesOok: [['hoe', 'Hoe Predict the Race werkt']],
    overzicht: {
      titel: 'F1-races {jaar}: tijden en cijfers per race | Predict the Race',
      omschrijving: 'Per Formule 1-race van {jaar} de tijden in Nederlandse tijd, de top 10 van vorig jaar en hoe vaak de safety car er kwam. Voor je voorspelling in je F1-poule.',
      kop: 'F1-races {jaar}',
      kort: 'Voor de laatste {aantal} Formule 1-races van {jaar} staat hier per race wanneer hij begint, in Nederlandse tijd, wie er vorig jaar won en hoe vaak de safety car er kwam. Zo bereid je je voorspelling in Predict the Race voor.',
      vraag: 'Wanneer zijn de laatste F1-races van {jaar}?',
      lijstKort: 'De laatste {aantal} Formule 1-races van {jaar} beginnen met de {eerste} op {eersteDag} en eindigen met de {laatste} op {laatsteDag}. Hieronder per race de dag en de baan; per race staan de tijden, de uitslag van vorig jaar en de safety cars op een eigen pagina.',
      bijschrift: 'De laatste races van {jaar}, met de dag van de race in Nederlandse tijd',
      kop2: ['Race', 'Dag', 'Baan'],
      voet: 'Races {jaar}',
    },
  },
  en: {
    tijdzone: 'UTC',
    pad: 'en/races',
    sessies: { 'Sprint Qualifying': 'Sprint qualifying', Sprint: 'Sprint', Qualifying: 'Qualifying', Race: 'Race' },
    ja: 'yes', nee: 'no',
    titel: '{kort} {jaar}: times and stats | Predict the Race',
    omschrijving: 'Session times for the {kort} {jaar} in UTC, the {vorigJaar} top 10 and how often the safety car came out in {plaats}. Predict the race for free with friends.',
    kop: '{naam} {jaar}',
    kort: 'The {naam} {jaar} is held in {plaats} ({baan}), and the race starts on {raceDag} at {raceUtc} UTC. Below are the times of every session, the {vorigJaar} top 10 and how often the safety car came out here, to help with your prediction in Predict the Race.',
    tijden: {
      vraag: 'What time does the {naam} start?',
      kort: 'The race starts on {raceDag} at {raceUtc} UTC. Qualifying is on {kwaliDag} at {kwaliUtc} UTC.{sprint} In Predict the Race you can predict each session until it starts; after that it locks.',
      sprint: ' The sprint is on {sprintDag} at {sprintUtc} UTC.',
      bijschrift: 'The {naam} {jaar} weekend: every session in UTC',
      kop: ['Session', 'Day', 'UTC'],
      tekst: 'Every prediction closes when the session it belongs to starts: pole position with qualifying, the winner and the safety cars with the race. Times can still change; this page updates automatically.',
    },
    uitslag: {
      vraag: 'Who won the {naam} {jaar}?',
      vraagVorig: 'Who won the {naam} in {jaar}?',
      kort: '{winnaar} ({team}) won the {jaar} {naam}, ahead of {tweede} and {derde}.{pole} Below are the top 10 of the race and of qualifying.',
      poleWinnaar: '{winnaar} ({team}) won the {jaar} {naam} from pole position, ahead of {tweede} and {derde}. Below are the top 10 of the race and of qualifying.',
      pole: ' Pole position went to {pole}.',
      race: 'Race {jaar}: the top 10',
      kwali: 'Qualifying {jaar}: the top 10',
      kop: ['Position', 'Driver', 'Team'],
    },
    safety: {
      vraag: 'How often is there a safety car in {plaats}?',
      kort: 'In the {races} races in {plaats} since {vanaf}, the safety car came out {aantal} times, counting the virtual safety car: {gemiddeld} per race on average, against {gemiddeldAlles} across all circuits. {rodeVlag} Predict the Race counts the same way for the question on the number of safety cars.',
      geenRodeVlag: 'None of those races was red-flagged.',
      rodeVlag: 'A red flag stopped {rodeVlag} of those races.',
      bijschrift: 'Safety cars and red flags in {plaats} by year, virtual safety car included (source: OpenF1)',
      kop: ['Year', 'Safety cars', 'Red flag'],
      link: 'Safety cars at every circuit',
    },
    slot: {
      kop: 'Predict the {kort}',
      tekst: 'Line up your top 10 for qualifying and the race, with your friends in one league. Free, no account needed.',
      knop: 'Predict the {kort}',
    },
    leesOok: [['hoe', 'How Predict the Race works']],
    overzicht: {
      titel: 'F1 races {jaar}: times and stats per race | Predict the Race',
      omschrijving: 'For every Formula 1 race of {jaar}: session times in UTC, last year\'s top 10 and how often the safety car came out. For your F1 prediction league.',
      kop: 'F1 races {jaar}',
      kort: 'For the last {aantal} Formula 1 races of {jaar}, this page shows when each race starts in UTC, who won there last year and how often the safety car came out. Use it to prepare your prediction in Predict the Race.',
      vraag: 'When are the last F1 races of {jaar}?',
      lijstKort: 'The last {aantal} Formula 1 races of {jaar} start with the {eerste} on {eersteDag} and end with the {laatste} on {laatsteDag}. Below are the race day and the circuit for each; every race has its own page with the times, last year\'s result and the safety cars.',
      bijschrift: 'The last races of {jaar}, with the race day in UTC',
      kop2: ['Race', 'Day', 'Circuit'],
      voet: 'Races {jaar}',
    },
  },
};
