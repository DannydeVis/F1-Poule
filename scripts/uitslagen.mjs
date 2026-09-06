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

/**
 * Uit welke sessie moet de deelnemerslijst komen, en moet dat nú?
 * null betekent: laat staan wat er staat.
 *
 * Aanleiding: "Soms valt er wel eens een coureur uit. Dan komt er een reserve
 * coureur of ze gaan wisselen van team. Dat zag ik niet gebeuren."
 *
 * De sync haalde de lijst één keer op — `if (!race.drivers && race.quali_key)`
 * — en keek daarna nooit meer. Wat er die ene keer in stond, stond er de rest
 * van het seizoen in. Een wissel na dat moment was dus per definitie
 * onzichtbaar, en dat is meer dan een verkeerde naam op het scherm: de
 * teamgenoot-duels worden gescoord op teamParen(race.drivers), dus een
 * verouderde lijst scoort de duels op de verkeerde paren.
 *
 * De regel is nu: zolang het weekend nog niet gereden is mag de lijst nog
 * schuiven, dus dan verversen we hem. Is de race wel gereden, dan is de
 * lijst wat hij is — sync.mjs haalt hem op dat moment één keer uit de
 * rácesessie, want dat is de enige die zegt wie er echt gereden heeft.
 *
 * Het venster voorkomt dat we elk uur de deelnemers van een race in december
 * ophalen. Buiten het venster halen we hem alleen op als hij er nog niet is,
 * zodat er wel iets te kiezen valt zodra OpenF1 hem publiceert.
 *
 * Op één plek kijken we ook naar een race die al gereden is, en dat is de
 * reparatie van wat er in Monza misging: staat er in de uitslag een coureur
 * die niet in onze lijst voorkomt, dan is die lijst aantoonbaar verouderd.
 * Daar is geen verzoek aan OpenF1 voor nodig om dat vast te stellen — het
 * volgt uit gegevens die we al hebben — en niemand kan een race finishen
 * zonder aan de start te staan.
 */
export const VERVERS_VENSTER_DAGEN = 14;

export function deelnemersUit(race, nu = Date.now()) {
  if (race.race_result) {
    // Gereden en gescoord: normaal gesproken klaar. sync.mjs ververst op het
    // moment dat de uitslag binnenkomt uit de racesessie.
    //
    // Behalve als de lijst aantoonbaar niet klopt. In Monza stond in de
    // database Hadjar (#6, die dit seizoen bij OpenF1 helemaal niet voorkomt),
    // Lawson bij het verkeerde team, en Tsunoda (#22) helemaal niet — terwijl
    // die de race gewoon uitreed. Zo'n lijst repareert zichzelf niet, en hij
    // scoort ondertussen de teamgenoot-duels op de verkeerde paren.
    if (!race.race_key) return null;
    const kennen = new Set((race.drivers ?? []).map((d) => String(d.nr)));
    const onbekend = race.race_result.some((nr) => !kennen.has(String(nr)));
    return onbekend ? race.race_key : null;
  }

  const sessie = race.quali_key ?? race.race_key ?? null;
  if (!sessie) return null;
  if (!(race.drivers ?? []).length) return sessie;

  // Zelfde valkuil als bij lijktAfgelast(): eerst op leegte controleren, want
  // new Date(null) is 1 januari 1970 en dat is een keurig eindig getal.
  const wanneer = race.deadline_quali ?? race.deadline_race ?? null;
  if (wanneer === null || wanneer === undefined || wanneer === '') return null;
  const start = new Date(wanneer).getTime();
  if (!Number.isFinite(start)) return null;

  return start - nu < VERVERS_VENSTER_DAGEN * 24 * 3600 * 1000 ? sessie : null;
}

/**
 * Welke races uit OpenF1 horen niet bij dit seizoen?
 *
 * Aanleiding: "Ik weet niet hoe je aan Kuala Lumpur komt maar volgens mij is
 * dat geen race." Klopt. sync.mjs nam letterlijk over wat OpenF1 op
 * `sessions?year=2026&session_name=Race` teruggeeft, zonder één controle, en
 * daar zit een testrecord tussen:
 *
 *     2026-09-26  meeting 1295  Baku          ... AZERBAIJAN GRAND PRIX 2026
 *     2026-10-04  meeting 1308  Kuala Lumpur  ... BAHRAIN GRAND PRIX IN MALAYSIA 2026
 *     2026-10-11  meeting 1296  Marina Bay    ... SINGAPORE GRAND PRIX 2026
 *
 * "Bahrain Grand Prix in Malaysia" bestaat niet, en de meeting_key valt
 * buiten de hele reeks van het seizoen (1279 t/m 1302). Dat tweede is het
 * bruikbare signaal, want daar hoef je geen namen voor te lezen: OpenF1 deelt
 * meeting_key op kalendervolgorde uit, dus bij de echte races loopt hij
 * gelijk op met de datum. Precies één record breekt dat.
 *
 * Bewust niet op de naam gefilterd. Een lijst van "echte" circuits zou elk
 * jaar bijgewerkt moeten worden en zou een nieuwe Grand Prix weggooien —
 * en juist een nieuwe race is er een die niemand verwacht.
 */
export function hoortNietInDeKalender(races) {
  if (races.length < 6) return [];   // te weinig om een volgorde uit te lezen
  const op = [...races].sort((a, b) => new Date(a.date_start) - new Date(b.date_start));

  // Voor elke race: welk deel van de races vóór hem heeft een hógere
  // meeting_key, en welk deel van de races ná hem een lágere? Bij een
  // kalender die netjes oploopt is dat allebei nul.
  //
  // Bewust een aandeel en geen aantal. Kuala Lumpur staat op vier na
  // achteraan, dus er kunnen maar zeven races na hem misstaan — met een
  // vaste drempel verdwijnt zo'n record precies daar waar het staat, en
  // niemand zet een testrecord bij voorkeur in het midden. Als aandeel is
  // het glashelder: van de zeven races die erna komen, staan er zeven fout.
  const scheef = op.map((r, i) => {
    const voor = op.slice(0, i).filter((x) => x.meeting_key > r.meeting_key).length;
    const na = op.slice(i + 1).filter((x) => x.meeting_key < r.meeting_key).length;
    return Math.max(i ? voor / i : 0, i < op.length - 1 ? na / (op.length - 1 - i) : 0);
  });

  // De helft is ruim: bij de echte kalender van 2026 komt geen enkele race
  // boven 0,06 uit en Kuala Lumpur zit op 1,00.
  const verdacht = op.filter((_, i) => scheef[i] > 0.5);

  // En dan de rem. Deze uitkomst leidt tot het doorstrepen van races, dus
  // hij mag nooit een heel seizoen meenemen. Wijst hij meer dan een kwart
  // van de kalender aan, dan is niet de kalender raar maar deze regel niet
  // van toepassing — bijvoorbeeld als OpenF1 ooit aflopend gaat nummeren.
  // Dan liever niets doen dan alles weggooien.
  return verdacht.length > op.length / 4 ? [] : verdacht;
}
