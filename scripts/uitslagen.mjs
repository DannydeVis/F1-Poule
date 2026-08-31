/**
 * Van de ruwe gegevens van OpenF1 naar de vier losse uitslagen: snelste
 * ronde, snelste pitstop, aantal safety cars en of er een rode vlag was.
 *
 * Deze functies staan los van sync.mjs en van het netwerk. Ze krijgen een
 * lijst binnen en geven een antwoord terug, meer niet. Dat is met opzet:
 * sync.mjs draait zichzelf uit zodra je hem importeert, en dan zou een test
 * de echte database aanraken. Nu is er iets te testen zonder Supabase, zonder
 * OpenF1, en zonder te wachten.
 *
 * Wat de berichten van de wedstrijdleiding betekenen is uitgezocht met
 * scripts/verkennen.mjs over veertien races van 2026 — niet gegokt.
 */

// Het begin van een safety car. OpenF1 gebruikt hier drie verschillende
// zinnen voor, en welke je krijgt hangt af van de race:
//
//   SafetyCar | SAFETY CAR DEPLOYED     8× in 6 races
//   SafetyCar | VSC DEPLOYED           17× in 8 races
//   Other     | SAFETY CAR LIGHTS ON    3× in 2 races
//
// En dan is er nog een hoop dat er alleen op lijkt: "LAPPED CARS MAY NOW
// OVERTAKE THE SAFETY CAR", "SAFETY CAR WILL USE START/FINISH STRAIGHT", en
// tientallen regels van de stewards over een "SAFETY CAR INFRINGEMENT" of
// een "VSC INFRINGEMENT". Monte Carlo had achttien regels met het woord
// safety car erin en maar één echte safety car.
//
// Daarom staan de zinnen die een begin markeren hier met naam en toenaam,
// verankerd aan het begin van het bericht. Zoeken op het losse woord telt
// de stewards mee.
export const SAFETYCAR_START =
  /^(SAFETY CAR DEPLOYED|SAFETY CAR LIGHTS ON|VSC DEPLOYED|VIRTUAL SAFETY CAR DEPLOYED)\b/;

/**
 * Hoeveel keer de safety car eruit kwam.
 *
 * Een virtual safety car telt mee. Dat is een keuze en geen vanzelfsprekend-
 * heid: acht van de veertien races van 2026 hadden geen énkele echte safety
 * car, en dan is "0" bijna altijd het goede antwoord en valt er niets te
 * voorspellen. Met de VSC erbij zit een race meestal op één tot drie.
 *
 * De app zegt er daarom bij dat de virtual meetelt — een vraag waarvan de
 * spelers de regel niet kennen is geen eerlijke vraag. Wil je het toch
 * alleen over echte safety cars hebben, dan is het VSC-deel van
 * SAFETYCAR_START weghalen genoeg.
 */
export function telSafetyCars(berichten = []) {
  // Op ronde ontdubbelen: twee zinnen over hetzelfde moment ("LIGHTS ON" en
  // "DEPLOYED") tellen als één, en twee echte safety cars in dezelfde ronde
  // bestaat niet. Zonder ronde valt hij terug op het tijdstip.
  const momenten = new Set();
  for (const m of berichten) {
    const tekst = String(m?.message ?? '').trim().toUpperCase();
    if (SAFETYCAR_START.test(tekst)) momenten.add(m.lap_number ?? `t:${m.date}`);
  }
  return momenten.size;
}

/**
 * Is de race stilgelegd met een rode vlag?
 *
 * Let op het verschil tussen "RED FLAG - RACE SUSPENDED" en "INCIDENT
 * INVOLVING CAR 6 (HAD) NOTED - RED FLAG INFRINGEMENT". Die tweede gaat over
 * een straf ná afloop en is geen rode vlag. Vandaar het anker aan het begin
 * van de zin, en de vlagkolom als tweede weg.
 */
export function hadRodeVlag(berichten = []) {
  return berichten.some((m) =>
    String(m?.flag ?? '').toUpperCase() === 'RED'
    || /^RED FLAG\b/.test(String(m?.message ?? '').trim().toUpperCase()));
}

/**
 * Wie reed de snelste ronde? Bij een gelijke tijd wint wie hem het eerst
 * reed — Zandvoort had twee coureurs op 74.321, dus dat is geen theorie.
 */
export function snelsteRonde(rondes = []) {
  const geldig = rondes.filter((l) => typeof l?.lap_duration === 'number' && l.lap_duration > 0);
  if (!geldig.length) return null;
  geldig.sort((a, b) => a.lap_duration - b.lap_duration || a.lap_number - b.lap_number);
  return String(geldig[0].driver_number);
}

/**
 * Wie had de snelste pitstop? `pit_duration` is de tijd in de pitstraat, en
 * die komt soms in hele seconden terug — gelijke tijden zijn hier dus nog
 * waarschijnlijker dan bij de rondes. Zelfde regel: de eerste wint.
 */
export function snelstePitstop(stops = []) {
  const geldig = stops.filter((p) => typeof p?.pit_duration === 'number' && p.pit_duration > 0);
  if (!geldig.length) return null;
  geldig.sort((a, b) => a.pit_duration - b.pit_duration || a.lap_number - b.lap_number);
  return String(geldig[0].driver_number);
}

/**
 * Is deze race niet doorgegaan?
 *
 * OpenF1 heeft geen veld dat dit zegt. Wat je ziet is een sessie die in de
 * kalender staat en waar verder niets van bestaat: 404 op alles. Sakhir en
 * Jeddah 2026 zijn zo — die races zijn afgelast.
 *
 * Alleen een 404 telt als bewijs, en pas een week na de geplande tijd. Een
 * 429 betekent dat wij te snel vroegen, en een uitslag die een uur later
 * komt is normaal; een race die na zeven dagen nog nergens staat is dat niet.
 *
 * Deze functie kijkt bewust naar de ráce en niet naar de kwalificatie. Een
 * afgelaste kwalificatie met een race die wel doorgaat bestaat — dan is het
 * weekend niet afgelast.
 */
export const AFGELAST_NA_DAGEN = 7;

export function lijktAfgelast({ raceGevonden, deadline, nu = Date.now() }) {
  if (raceGevonden) return false;
  // Eerst op leegte controleren en niet alleen op Number.isFinite: new
  // Date(null) is 1 januari 1970, en dat is een keurig eindig getal dat ruim
  // een week geleden ligt. Een race zonder geplande tijd zou zo stilzwijgend
  // als afgelast gemarkeerd worden.
  if (deadline === null || deadline === undefined || deadline === '') return false;
  const gepland = new Date(deadline).getTime();
  if (!Number.isFinite(gepland)) return false;
  return nu - gepland > AFGELAST_NA_DAGEN * 24 * 3600 * 1000;
}
