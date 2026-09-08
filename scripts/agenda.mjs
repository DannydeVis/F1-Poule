// De deadlines als agenda-abonnement.
//
// Het probleem dat dit oplost: de app weet precies wanneer de kwalificatie
// sluit, maar wie hem niet toevallig opent mist het weekend. En niets
// invullen is in een poule het ergste wat er kan gebeuren — dan doe je
// gewoon niet mee.
//
// Waarom een .ics en geen mail of push: die vragen allebei om infrastructuur
// die er niet is (een mailleverancier met een sleutel, of VAPID-sleutels plus
// een pushdienst) én om een lijst met wie je wanneer bereikt. Dit vraagt om
// niets. De sync draait toch al elk uur en kent de deadlines; die schrijft dit
// bestand, GitHub Pages serveert het, en wie zich erop abonneert krijgt de
// meldingen die hij in zijn eigen agenda al heeft staan. Verschuift een
// sessie, dan past de sync het bestand aan en volgt de agenda vanzelf.
//
// Eerlijk over wat het niet kan: een agenda-item geldt voor iedereen en kan
// dus niet zeggen "jij hebt nog niets ingevuld". Zie OVERDRACHT.md.

// RFC 5545 wil regels van hoogstens 75 octetten, met een spatie aan het begin
// van elke vervolgregel. Tellen in bytes en niet in tekens: een é is er twee,
// en een circuitnaam met een accent zou anders een regel te lang maken.
export function vouw(regel) {
  const bytes = Buffer.from(regel, 'utf8');
  if (bytes.length <= 75) return regel;
  const stukken = [];
  let begin = 0;
  let grens = 75;
  while (begin < bytes.length) {
    let eind = Math.min(begin + grens, bytes.length);
    // Niet middenin een utf8-teken knippen: vervolgbytes beginnen met 10xxxxxx.
    while (eind > begin && eind < bytes.length && (bytes[eind] & 0xc0) === 0x80) eind--;
    stukken.push(bytes.subarray(begin, eind).toString('utf8'));
    begin = eind;
    grens = 74;   // de vervolgregels beginnen met een spatie
  }
  return stukken[0] + stukken.slice(1).map((s) => '\r\n ' + s).join('');
}

// Backslash, puntkomma en komma hebben betekenis in een ics-waarde, en een
// regeleinde zou het bestand breken.
export const ontsnap = (tekst) => String(tekst ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

// 2026-03-15T05:00:00+00:00 -> 20260315T050000Z
//
// De lege controle vooraf is geen overdaad: `new Date(null)` is niet ongeldig
// maar 1 januari 1970, en een race waarvan de kwalificatietijd nog niet bekend
// is zou daarmee een item in ieders agenda zetten in het jaar dat Formule 1
// nog zwart-wit was.
export function stempel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const uur = (iso, n) => stempel(new Date(new Date(iso).getTime() + n * 3600e3).toISOString());

// De twee momenten per raceweekend waarop er iets dichtgaat. Ze vallen samen
// met het begin van de sessie, want dat ís de deadline.
const SESSIES = [
  { sleutel: 'quali', kolom: 'deadline_quali', wat: 'Kwalificatie' },
  { sleutel: 'race',  kolom: 'deadline_race',  wat: 'Race' },
];

/**
 * @param races  rijen uit de races-tabel
 * @param opties  { url } waar de app staat, komt in elk item te staan
 * @returns de complete inhoud van kalender.ics
 */
export function maakAgenda(races = [], { url = '', naam = 'F1 Poule' } = {}) {
  const regels = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Poule//F1 Poule//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${ontsnap(naam)}`,
    'X-WR-TIMEZONE:UTC',
    // Hoe vaak een agenda-app opnieuw mag kijken. Twaalf uur is ruim genoeg
    // voor een kalender die hooguit een paar keer per jaar verschuift.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  // Op ronde, en binnen een weekend de kwalificatie vóór de race.
  const gesorteerd = [...races].sort((a, b) => (a.round ?? 0) - (b.round ?? 0));

  for (const race of gesorteerd) {
    for (const sessie of SESSIES) {
      const start = stempel(race[sessie.kolom]);
      if (!start) continue;

      const naamRace = race.name ?? `Ronde ${race.round}`;
      regels.push(
        'BEGIN:VEVENT',
        // Vast per sessie, zodat een tweede versie van dit bestand het item
        // vervangt in plaats van er eentje bij te zetten.
        `UID:${sessie.sleutel}-${race.race_key ?? race.id ?? race.round}@f1-poule`,
        // Bewust gelijk aan de start en niet "nu": anders verschilt het
        // bestand na elke run van zichzelf, en dan zou de sync elk uur een
        // wijziging vastleggen die er niet is.
        `DTSTAMP:${start}`,
        `DTSTART:${start}`,
        `DTEND:${uur(race[sessie.kolom], 1)}`,
        vouw(`SUMMARY:${ontsnap(`${sessie.wat} ${naamRace} — invullen sluit`)}`),
        vouw(`DESCRIPTION:${ontsnap(
          `Vanaf nu kun je je voorspelling voor de ${sessie.wat.toLowerCase()} niet meer wijzigen.`
          + (url ? `\n\n${url}` : ''))}`),
        vouw(`LOCATION:${ontsnap([naamRace, race.country].filter(Boolean).join(', '))}`),
      );
      if (url) regels.push(vouw(`URL:${url}`));
      // Een afgelaste race blijft in het bestand staan, maar dan als
      // afgezegd. Weglaten zou het item in de agenda van de abonnee laten
      // staan alsof er niets aan de hand is.
      regels.push(race.afgelast ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED');
      // Twee uur van tevoren. Veel agenda-apps negeren dit bij een
      // abonnement en gebruiken de melding die de gebruiker zelf instelt;
      // daarom staat het er wel, maar leunen we er niet op.
      regels.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT2H',
        vouw(`DESCRIPTION:${ontsnap(`${sessie.wat} ${naamRace}: nog twee uur om in te vullen`)}`),
        'END:VALARM',
        'END:VEVENT');
    }
  }

  regels.push('END:VCALENDAR');
  // RFC 5545 schrijft \r\n voor, ook op de laatste regel.
  return regels.join('\r\n') + '\r\n';
}
