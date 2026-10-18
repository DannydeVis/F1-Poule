/**
 * Wie krijgt er een seintje, en waarover.
 *
 * Apart van sync.mjs en zonder netwerk erin, want dit is de kant die fout kan
 * gaan zonder dat iemand het merkt: een herinnering te veel is vervelend, een
 * herinnering te weinig maakt de hele functie zinloos, en allebei zie je pas
 * op iemands telefoon. Als losse functie is het na te rekenen — zie
 * test/herinneringen.test.mjs.
 *
 * De regel in één zin: hooguit één melding per toestel per ronde, alleen over
 * een sessie die binnen het venster sluit, alleen als die poule die vraag
 * stelt, en alleen als jij er nog niets op hebt ingevuld.
 *
 * En in de taal van dat toestel: `push_abonnementen.taal` zegt welke.
 */

// Dezelfde tabel als in index.html, maar dan alleen wat hier nodig is. Twee
// kopieën van deze namen is niet mooi; één bestand van beide kanten importeren
// kan niet, want index.html heeft geen bouwstap. De testen aan weerszijden
// houden ze gelijk.
export const SESSIES = {
  sprint: { naam: 'sprint',       vraag: 'sprint_top10', deadline: 'deadline_sprint' },
  quali:  { naam: 'kwalificatie', vraag: 'quali_top10',  deadline: 'deadline_quali' },
  race:   { naam: 'race',         vraag: 'race_top10',   deadline: 'deadline_race' },
};
export const SESSIEVOLGORDE = ['sprint', 'quali', 'race'];

// De app vertaalt zichzelf in de browser met een woordenlijst van vierhonderd
// zinnen. Een push komt hiervandaan, zonder browser, en gaat over precies
// zeven zinnen -- dus staat die handvol hier, en niet een tweede kopie van de
// hele lijst. `taal` komt uit de kolom op push_abonnementen: de taal van de
// app op dat toestel. Een waarde die hier niet staat (een oud abonnement, een
// kapotte waarde) krijgt Nederlands, de brontaal.
const WOORDEN = {
  nl: {
    sprint: 'sprint', quali: 'kwalificatie', race: 'race',
    meteen: 'zo meteen', half: 'over een halfuur', uur: 'over een uur',
    uren: (n) => `over ${n} uur`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie} sluit ${wanneer}`,
    tekst: 'Je hebt hier nog niets ingevuld.',
  },
  en: {
    sprint: 'sprint', quali: 'qualifying', race: 'race',
    meteen: 'any moment now', half: 'in half an hour', uur: 'in an hour',
    uren: (n) => `in ${n} hours`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie} closes ${wanneer}`,
    tekst: 'You have not filled anything in here yet.',
  },
  de: {
    sprint: 'Sprint', quali: 'Qualifying', race: 'Rennen',
    meteen: 'gleich', half: 'in einer halben Stunde', uur: 'in einer Stunde',
    uren: (n) => `in ${n} Stunden`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie} schließt ${wanneer}`,
    tekst: 'Du hast hier noch nichts getippt.',
  },
  fr: {
    sprint: 'sprint', quali: 'qualifications', race: 'course',
    meteen: 'dans un instant', half: 'dans une demi-heure', uur: 'dans une heure',
    uren: (n) => `dans ${n} heures`,
    titel: (race, sessie, wanneer) => `${race} : ${sessie}, clôture ${wanneer}`,
    tekst: 'Vous n\u2019avez encore rien pronostiqué ici.',
  },
  es: {
    sprint: 'sprint', quali: 'clasificación', race: 'carrera',
    meteen: 'en un momento', half: 'en media hora', uur: 'en una hora',
    uren: (n) => `en ${n} horas`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie} cierra ${wanneer}`,
    tekst: 'Todavía no has hecho tu predicción aquí.',
  },
  it: {
    sprint: 'sprint', quali: 'qualifiche', race: 'gara',
    meteen: 'a momenti', half: 'tra mezz\u2019ora', uur: 'tra un\u2019ora',
    uren: (n) => `tra ${n} ore`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie}, chiusura ${wanneer}`,
    tekst: 'Non hai ancora inserito nulla qui.',
  },
  pt: {
    sprint: 'sprint', quali: 'classificação', race: 'corrida',
    meteen: 'em instantes', half: 'em meia hora', uur: 'em uma hora',
    uren: (n) => `em ${n} horas`,
    titel: (race, sessie, wanneer) => `${race}: ${sessie} fecha ${wanneer}`,
    tekst: 'Você ainda não deu seu palpite aqui.',
  },
};
export const woorden = (taal) => WOORDEN[taal] ?? WOORDEN.nl;

// Drie uur. Lang genoeg om er nog iets aan te doen, kort genoeg dat het over
// vandaag gaat. Dat de sync binnen dit venster langskomt, regelt de wekker
// hieronder: op de cron alleen kun je niet rekenen (zie sync.yml).
export const VENSTER_UREN = 3;

// Wanneer de sync opnieuw moet draaien voor de volgende herinnering.
//
// Nageteld over twee weken in oktober 2026: de cron van sync.yml staat op elk
// kwartier, maar GitHub draaide hem gemiddeld eens per vier uur, met gaten tot
// acht uur. Een venster van drie uur viel daar vaker tussendoor dan niet. Dus
// rekent de sync uit wanneer het volgende venster opengaat, en zet hij een
// wekker (.github/workflows/wekker.yml) die op dat moment de sync start. Een
// run die je zelf start, wacht niet in die trage rij.
//
// Tien minuten na het openen van het venster, zodat de deadline zeker binnen
// de drie uur valt als de sync draait. Alleen vensters die binnen `horizon`
// opengaan: de wekker slaapt hoogstens vijfenhalf uur, en een verder weg
// liggend venster pakt de volgende sync of wekker op.
export const WEKKER_NA_OPENEN_MIN = 10;
export const WEKKER_HORIZON_UREN = 12;

export function volgendeWekker({ races = [], nu = Date.now(), horizon = WEKKER_HORIZON_UREN } = {}) {
  let vroegst = null;
  for (const race of races) {
    if (race.afgelast) continue;
    for (const welk of SESSIEVOLGORDE) {
      const iso = race[SESSIES[welk].deadline];
      if (!iso) continue;
      const om = Date.parse(iso) - VENSTER_UREN * 3600e3 + WEKKER_NA_OPENEN_MIN * 60e3;
      if (!(om > nu) || om - nu > horizon * 3600e3) continue;
      if (vroegst === null || om < vroegst) vroegst = om;
    }
  }
  return vroegst === null ? null : new Date(vroegst).toISOString();
}

const urenTot = (iso, nu) => (Date.parse(iso) - nu) / 3600e3;

// "over 2 uur", "over een halfuur", "zo meteen". Een herinnering die "over
// 2.4 uur" zegt leest als een machine.
export function overTekst(uren, taal = 'nl') {
  const w = woorden(taal);
  if (uren < 0.25) return w.meteen;
  if (uren < 0.75) return w.half;
  if (uren < 1.5) return w.uur;
  return w.uren(Math.round(uren));
}

/**
 * @param races        de races van dit seizoen, met hun deadlines
 * @param abonnementen rijen uit push_abonnementen
 * @param antwoorden   rijen {race_id, member_id, question_id} — alleen de top tienen
 * @param poulevragen  rijen {pool_id, question_id}; een poule zonder rijen doet alles
 * @param nu           tijdstip in ms
 */
export function wieKrijgtEenSeintje({ races = [], abonnementen = [], antwoorden = [],
                                      poulevragen = [], nu = Date.now() } = {}) {
  // Welke poule stelt welke vraag. Geen rijen = alles aan, net als in de app.
  const perPoule = new Map();
  for (const r of poulevragen) {
    if (!perPoule.has(r.pool_id)) perPoule.set(r.pool_id, new Set());
    perPoule.get(r.pool_id).add(r.question_id);
  }
  const stelt = (poolId, vraag) => {
    const set = perPoule.get(poolId);
    return !set || set.has(vraag);
  };

  const ingevuld = new Set(antwoorden.map(
    (a) => `${a.race_id}|${a.member_id}|${a.question_id}`));

  // Alle sessies die binnen het venster sluiten, de vroegste eerst. Zo krijgt
  // een toestel bij twee openstaande sessies een seintje over degene die het
  // eerst dichtgaat, en niet over allebei.
  const bijna = [];
  for (const race of races) {
    if (race.afgelast) continue;
    for (const welk of SESSIEVOLGORDE) {
      const iso = race[SESSIES[welk].deadline];
      if (!iso) continue;
      const uren = urenTot(iso, nu);
      if (uren <= 0 || uren > VENSTER_UREN) continue;
      bijna.push({ race, welk, uren });
    }
  }
  bijna.sort((a, b) => a.uren - b.uren);
  if (!bijna.length) return [];

  const uit = [];
  for (const ab of abonnementen) {
    const treffer = bijna.find(({ race, welk }) => {
      const vraag = SESSIES[welk].vraag;
      return stelt(ab.pool_id, vraag)
        && !ingevuld.has(`${race.id}|${ab.member_id}|${vraag}`);
    });
    if (!treffer) continue;
    // Deze had hij al gehad. Elk uur opnieuw dezelfde melding sturen is de
    // snelste manier om iemand ze uit te laten zetten.
    const tag = `${treffer.race.id}:${treffer.welk}`;
    if (ab.laatst === tag) continue;
    // De racenaam komt van OpenF1 ("Las Vegas") en blijft staan zoals hij is;
    // alleen het zinnetje eromheen kent twee talen.
    const w = woorden(ab.taal);
    uit.push({
      abonnement: ab,
      tag,
      bericht: {
        titel: w.titel(treffer.race.name, w[treffer.welk],
                       overTekst(treffer.uren, ab.taal)),
        tekst: w.tekst,
        tag,
      },
    });
  }
  return uit;
}
