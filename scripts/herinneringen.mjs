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

// Drie uur. Lang genoeg om er nog iets aan te doen, kort genoeg dat het over
// vandaag gaat. De sync draait elk uur, dus binnen dit venster valt elke
// deadline minstens één keer op.
export const VENSTER_UREN = 3;

const urenTot = (iso, nu) => (Date.parse(iso) - nu) / 3600e3;

// "over 2 uur", "over een halfuur", "zo meteen". Een herinnering die "over
// 2.4 uur" zegt leest als een machine.
export function overTekst(uren) {
  if (uren < 0.25) return 'zo meteen';
  if (uren < 0.75) return 'over een halfuur';
  if (uren < 1.5) return 'over een uur';
  return `over ${Math.round(uren)} uur`;
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
    uit.push({
      abonnement: ab,
      tag,
      bericht: {
        titel: `${treffer.race.name}: ${SESSIES[treffer.welk].naam} sluit ${overTekst(treffer.uren)}`,
        tekst: 'Je hebt hier nog niets ingevuld.',
        tag,
      },
    });
  }
  return uit;
}
