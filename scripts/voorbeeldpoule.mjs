// De voorbeeldpoule op de plaatjes van de app: de schermafdrukken op de
// voorpagina (scripts/maak-beelden.mjs) en in de Play Store
// (scripts/maak-winkel.mjs). In de nabootsing uit de tests, met verzonnen
// namen.

// Een poule halverwege het seizoen: Melbourne gereden, Shanghai staat open.
export const vulPoule = (naam) => (poulenaam) => {
  const db = globalThis.__db;
  const u = (h) => new Date(Date.now() + h * 3600e3).toISOString();
  const uitslag = ['1', '4', '16', '63', '81', '44', '12', '14', '10', '18', '6', '43'];
  Object.assign(db.races[0], { deadline_quali: u(-60), deadline_race: u(-40),
    quali_result: uitslag, race_result: uitslag, winnaar: null });
  Object.assign(db.races[1], { deadline_quali: u(46), deadline_race: u(70) });
  for (const r of db.races.slice(2)) if (!(r.drivers ?? []).length) r.drivers = db.races[0].drivers;
  db.pools[0].name = poulenaam;
  // Alleen de twee top 10's: dan staat er in de uitslag geen rij "komt nog"
  // voor losse vragen, en gaat het plaatje over waar het om draait.
  db.pool_questions = (db.pool_questions ?? []).filter((q) => q.pool_id !== 'pool-1')
    .concat([{ pool_id: 'pool-1', question_id: 'quali_top10' }, { pool_id: 'pool-1', question_id: 'race_top10' }]);
  const spelers = [['lid-2', 'Sophie'], ['lid-3', 'Michael'], ['lid-4', 'Lotte'], ['lid-5', 'Joey']];
  for (const [id, n] of spelers) {
    db.pool_members.push({ member_id: id, pool_id: 'pool-1', display_name: n, user_id: null });
  }
  const tips = {
    'lid-1': ['4', '1', '16', '81', '63', '12', '44', '10', '14', '18'],
    'lid-2': ['1', '4', '16', '63', '81', '44', '14', '12', '18', '10'],
    'lid-3': ['16', '1', '4', '44', '63', '81', '12', '10', '6', '14'],
    'lid-4': ['1', '16', '4', '81', '44', '63', '10', '12', '14', '43'],
    'lid-5': ['4', '16', '1', '63', '44', '12', '81', '18', '6', '10'],
  };
  for (const [lid, v] of Object.entries(tips)) {
    for (const q of ['quali_top10', 'race_top10']) {
      db.answers.push({ pool_id: 'pool-1', race_id: 1, member_id: lid, question_id: q,
        waarde: v, updated_at: u(-70) });
    }
  }
  // Danny heeft de kwalificatie van Shanghai al ingevuld: dan staat er een
  // vinkje bij de sessie op de weekendkaart.
  db.answers.push({ pool_id: 'pool-1', race_id: 2, member_id: 'lid-1', question_id: 'quali_top10',
    waarde: tips['lid-1'], updated_at: u(-1) });
  sessionStorage.setItem('nabootsing:db', JSON.stringify(db));
};

// De app spreekt sinds 12 oktober zeven talen, dus de voorpagina in elke taal
// laat de app in die taal zien, met een poulenaam die daar past.
export const POULENAAM = {
  nl: 'Vrijdagmiddagpoule', en: 'Sunday Grid Club', de: 'Freitagsrunde', fr: 'La ligue du vendredi',
  es: 'La liga del viernes', it: 'La lega del venerdì', pt: 'Bolão da sexta-feira',
};
