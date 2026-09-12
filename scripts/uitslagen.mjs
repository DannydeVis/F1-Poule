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

/**
 * Welke sessie van dit weekend weet als laatste wie er echt rijdt?
 *
 * Dit is de kern van wat er in Madrid misging. Een sessie die nog niet
 * begonnen is vult OpenF1 met de inschrijflijst van het seizoen, en die kan
 * weken oud zijn. Pas als een sessie daadwerkelijk gereden wordt staat er in
 * wie er in de auto zat. Op zaterdagochtend gaf OpenF1 dit:
 *
 *   Practice 1  (11362, vrijdag 11:30)  #22 TSU Racing Bulls   #30 LAW Red Bull
 *   Practice 2  (11363, vrijdag 15:00)  #22 TSU Racing Bulls   #30 LAW Red Bull
 *   Practice 3  (11364, zaterdag 10:30) #22 TSU Racing Bulls   #30 LAW Red Bull
 *   Race        (11369, zondag  13:00)  #6  HAD Red Bull       #30 LAW Racing Bulls
 *
 * De vrije trainingen wisten het al vanaf vrijdagmiddag. Wij keken alleen
 * naar de kwalificatie en de race, en die stonden allebei nog op de oude
 * opgave — dus de app liet Hadjar kiezen die niet meedeed, en Tsunoda niet
 * die wel meedeed. Niet omdat OpenF1 het niet wist, maar omdat wij het aan
 * de verkeerde sessie vroegen.
 *
 * De regel: de laatste sessie die al begonnen is. Nog niet begonnen telt
 * niet mee, want dat is precies de sessie met de oude opgave.
 *
 * Met één uitzondering: de eerste sessie van het weekend slaan we over. Dat
 * is de enige sessie waar het veld met opzet afwijkt van het racveld —
 * teams moeten daar een rookie in de auto zetten, en die rijdt de race niet.
 * Hem meetellen zou een naam in de kiezer zetten die er zondag niet is. De
 * tweede training is nog altijd vrijdagmiddag, ruim een dag voor de eerste
 * deadline, dus dat kost geen enkele echte wissel.
 */
export function weekendBron(sessies, nu = Date.now()) {
  const op = (sessies ?? [])
    .map((s) => ({ key: s.session_key, start: new Date(s.date_start ?? null).getTime() }))
    .filter((s) => s.key !== null && s.key !== undefined && Number.isFinite(s.start))
    .sort((a, b) => a.start - b.start);
  if (!op.length) return null;

  const eerste = op[0].key;
  const bruikbaar = op.filter((s) => s.start <= nu && s.key !== eerste);
  return bruikbaar.length ? bruikbaar[bruikbaar.length - 1].key : null;
}

/**
 * Dekt deze deelnemerslijst de hele uitslag?
 *
 * Wie finisht, stond aan de start. Staat er in de uitslag een nummer dat
 * niet in de lijst voorkomt, dan is die lijst niet compleet.
 *
 * Dezelfde redenering als bij de reparatie van Monza, maar andersom gebruikt:
 * daar bewijst hij dat onze opgeslagen lijst kapot is, hier dat de lijst die
 * OpenF1 ons aanbiedt dat is. Dat is nodig zodra de race gereden is, want dan
 * halen we de lijst uit de rácesessie — en juist die sessie stond het hele
 * weekend nog op de oude opgave. Heeft OpenF1 hem op dat moment nog niet
 * bijgewerkt, dan zou hij de goede lijst die we net uit de kwalificatie
 * hebben gehaald overschrijven met de verkeerde.
 */
export function lijstDekt(drivers, uitslag) {
  if (!(drivers ?? []).length) return false;
  if (!(uitslag ?? []).length) return true;
  const kennen = new Set(drivers.map((d) => String(d.nr)));
  return uitslag.every((nr) => kennen.has(String(nr)));
}

/**
 * Wanneer kijken we een uitslag die we al hebben nóg een keer na?
 *
 * "Belangrijk dat hij een dag na de race ook nog gesynchroniseerd wordt, omdat
 * er wel eens achteraf wat veranderd."
 *
 * Dat klopt, en de sync deed het niet. De voorwaarde was `if (!race.race_result
 * ...)`: één keer opgehaald, daarna nooit meer gekeken. Een tijdstraf die na
 * afloop wordt uitgedeeld verandert de klassering, een diskwalificatie haalt
 * iemand er helemaal uit, en een geschrapte kwalificatietijd schuift de grid
 * op. Niets daarvan kwam ooit in de app terecht, terwijl het wel de punten van
 * iedereen in de poule verandert.
 *
 * Waarom vensters en niet gewoon "de eerste twee dagen elk kwartier": dat zijn
 * bijna twaalfhonderd verzoeken aan OpenF1 per raceweekend voor iets wat
 * hooguit twee keer verandert. De vensters staan waar de beslissingen vallen:
 *
 *   2 tot 8 uur na de start   de race is net afgelopen en de wedstrijdleiding
 *                             doet zijn onderzoeken — hier valt het meeste
 *   20 tot 32 uur na de start "een dag later", waar een enkele beslissing en
 *                             de meeste correcties in de gegevens landen
 *
 * Ze zijn met opzet uren breed en niet minuten. GitHub levert een geplande run
 * niet betrouwbaar af (zie controle-sync.mjs), dus een venster van een kwartier
 * zouden we regelmatig helemaal missen.
 */
export const HERCONTROLE_VENSTERS = [[2, 8], [20, 32]];

export function opnieuwNakijken(race, nu = Date.now()) {
  if (!race?.race_key || race.afgelast) return false;

  // Zelfde valkuil als overal hier: new Date(null) is 1 januari 1970, en dat
  // valt in geen enkel venster maar levert wel een keurig getal op.
  const wanneer = race.deadline_race ?? null;
  if (wanneer === null || wanneer === undefined || wanneer === '') return false;
  const start = new Date(wanneer).getTime();
  if (!Number.isFinite(start)) return false;

  const uren = (nu - start) / 3600e3;
  return HERCONTROLE_VENSTERS.some(([van, tot]) => uren >= van && uren < tot);
}

/**
 * Is dit werkelijk iets anders dan wat er al staat?
 *
 * Nodig zodra we uitslagen opnieuw ophalen: zonder deze controle schrijft elke
 * herkeuring dezelfde uitslag terug, en dan is elke sync-ronde een schrijfactie
 * en meldt de log "bijgewerkt" terwijl er niets gebeurd is.
 */
export function zelfdeWaarde(a, b) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Mag deze nieuwe uitslag de oude vervangen?
 *
 * Nodig zodra we uitslagen die er al staan opnieuw ophalen. Een half antwoord
 * van OpenF1 — een tijdelijke storing, een sessie die opnieuw verwerkt wordt —
 * zou anders een complete klassering vervangen door vijf namen, en dan klopt
 * de stand van de hele poule niet meer terwijl er niets aan de hand was.
 *
 * Korter mag wel een beetje: een diskwalificatie haalt er iemand uit, en bij
 * hoge uitzondering twee. Veel korter is geen uitslag maar een storing.
 */
export function veiligeVervanging(oud, nieuw, { marge = 2 } = {}) {
  if (!Array.isArray(nieuw) || !nieuw.length) return false;
  if (!Array.isArray(oud) || !oud.length) return true;
  return nieuw.length >= oud.length - marge;
}

export function deelnemersUit(race, nu = Date.now(), sessies = []) {
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

  // Eerst de sessies van dit weekend die al gereden zijn; die weten het het
  // best. Weet sync.mjs ze niet (geen meeting gevonden, of het weekend moet
  // nog helemaal beginnen), dan blijft de oude terugval staan: de opgave die
  // bij de kwalificatie hoort. Beter een oude lijst dan geen lijst.
  const sessie = weekendBron(sessies, nu) ?? race.quali_key ?? race.race_key ?? null;
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

/**
 * Welk rondenummer krijgt elke race?
 *
 * Dit lijkt een formaliteit maar is het niet. De upsert van de kalender gaat
 * op (season, round), dus het rondenummer is in de praktijk de identiteit van
 * een rij — en aan die rij hangen via races.id alle voorspellingen.
 *
 * Dat ging mis op het moment dat er voor het eerst een race uit de kalender
 * viel (het testrecord Kuala Lumpur). De nummering liep gewoon door over de
 * overgebleven races, dus alles ná Kuala Lumpur schoof een plaats op: de rij
 * die Kuala Lumpur was werd Marina Bay, de rij die Marina Bay was werd
 * Austin, en de laatste ronde bleef als wees achter. Had er iemand al voor
 * Marina Bay voorspeld, dan stond die voorspelling ineens bij Austin.
 *
 * De echte identiteit van een race is zijn race_key: dat is de sessie bij
 * OpenF1 en die verandert nooit. Dus een race die we al kennen houdt het
 * rondenummer dat hij had, wat er ook vóór hem gebeurt. Alleen een race die
 * we nog nooit gezien hebben krijgt een nieuw nummer, en dan één hoger dan
 * het hoogste dat al bestaat.
 *
 * Niet het laagste vrije nummer, en dat is met opzet. Een gat in de nummering
 * is precies de plek waar ooit een race stond die eruit gehaald is; daar een
 * nieuwe race in schuiven maakt van dat gat weer een verwarring. Bovendien
 * levert het rare uitkomsten op: een race die in december wordt toegevoegd
 * zou dan ronde 1 kunnen krijgen. Doortellen is saai en voorspelbaar, en dat
 * is hier de bedoeling.
 *
 * kalenderRaces moet op datum gesorteerd zijn; alleen daaruit volgt de
 * nummering van een database die nog leeg is.
 */
export function rondeToewijzing(kalenderRaces, bestaand = []) {
  const bekend = new Map();
  const gebruikt = new Set();
  for (const r of bestaand) {
    if (Number.isFinite(r.round)) gebruikt.add(r.round);
    if (r.race_key === null || r.race_key === undefined) continue;
    bekend.set(String(r.race_key), r.round);
  }

  const uit = new Map();
  let volgende = Math.max(0, ...gebruikt) + 1;
  for (const race of kalenderRaces) {
    const key = String(race.session_key);
    if (bekend.has(key)) { uit.set(key, bekend.get(key)); continue; }
    uit.set(key, volgende++);
  }
  return uit;
}

/**
 * Rijen die naar dezelfde OpenF1-sessie wijzen: welke houden we, en welke
 * kunnen weg?
 *
 * Zulke dubbelen zijn het spoor van de verschuiving hierboven. Ze zijn niet
 * zomaar te verwijderen: answers.race_id heeft `on delete cascade`, dus een
 * rij weggooien gooit de voorspellingen die eraan hangen mee weg. Vandaar dat
 * deze functie alleen zegt wát er dubbel is en welke rij de oudste is; de
 * beslissing om te verwijderen valt pas nadat is vastgesteld dat er niets aan
 * hangt.
 */
export function dubbeleRaces(rijen) {
  const per = new Map();
  for (const r of rijen) {
    if (r.race_key === null || r.race_key === undefined) continue;
    const k = String(r.race_key);
    if (!per.has(k)) per.set(k, []);
    per.get(k).push(r);
  }
  return [...per.values()]
    .filter((groep) => groep.length > 1)
    // De laagste ronde is de rij die er het langst staat, en dus degene waar
    // eventuele voorspellingen aan hangen.
    .map((groep) => [...groep].sort((a, b) => a.round - b.round))
    .map(([houden, ...weg]) => ({ houden, weg }));
}
