/**
 * Het weekendduel, voor de sync: een seintje en een mail op woensdag met tegen
 * wie je dit weekend speelt (14 november).
 *
 * Danny wil dat spelers vaker dan alleen in het raceweekend de app openen. Het
 * duel zelf staat in de app (duelParen() in app/index.html); dit bestand kent
 * hetzelfde schema, zodat de sync kan zeggen "dit weekend speel je tegen
 * Sanne" zonder dat de app open is.
 *
 *   - Het schema is een kopie van duelParen() uit de app.
 *     test/weekendduel-sync.test.mjs haalt die functie uit index.html en
 *     vergelijkt de twee, zodat ze niet uit elkaar lopen.
 *   - Eén bericht per weekend, een paar dagen voor het weekend begint, en
 *     alleen overdag in de tijdzone van de ontvanger.
 *   - Wie dit weekend vrij is, of alleen in zijn poule zit, krijgt niets.
 *   - Het bericht valt onder dezelfde schakelaar als de vrije training
 *     (meld_training, en voor mail het abonnement zelf) en gebruikt hetzelfde
 *     geheugen (training_laatst): er hoeft geen kolom bij, en de melding van
 *     vrijdag over hetzelfde weekend sluit een late duelmelding uit.
 */

import { maakMail } from './mailmomenten.mjs';

const UUR = 3600e3;
// Tussen drieënhalve dag en één dag voor het weekend begint: voor een weekend
// dat zaterdag begint is dat woensdag tot en met vrijdag, voor een
// sprintweekend dinsdag tot en met donderdag.
export const DUEL_VROEGST = 84 * UUR;
export const DUEL_LAATST = 24 * UUR;
const DEADLINES = ['deadline_sprint', 'deadline_quali', 'deadline_race'];

/** Het schema: iedereen tegen iedereen, op het rondenummer. Een kopie van de app. */
export function duelParen(ids, ronde) {
  const lijst = ids.length % 2 ? [...ids, null] : [...ids];
  const n = lijst.length;
  if (n < 2) return [];
  const rest = lijst.slice(1);
  const k = (((ronde - 1) % (n - 1)) + (n - 1)) % (n - 1);
  const rij = [lijst[0], ...rest.slice(k), ...rest.slice(0, k)];
  return Array.from({ length: n / 2 }, (_, i) => [rij[i], rij[n - 1 - i]]);
}

/** Wanneer het weekend begint: de eerste deadline, in ms, of null. */
export function weekendStart(race) {
  const tijden = DEADLINES.map((k) => Date.parse(race?.[k] ?? '')).filter((t) => Number.isFinite(t));
  return tijden.length ? Math.min(...tijden) : null;
}

/** Het weekend waarvoor er nu een duelbericht kan, of null. */
export function duelNieuws({ races = [], nu = Date.now() } = {}) {
  for (const race of races) {
    if (race.afgelast) continue;
    const start = weekendStart(race);
    if (start === null) continue;
    const nog = start - nu;
    if (nog > DUEL_VROEGST || nog <= DUEL_LAATST) continue;
    return { race, start, tag: `duel:${race.id}` };
  }
  return null;
}

/** Overdag (9 tot 21 uur) in de tijdzone van de ontvanger; zonder tijdzone UTC. */
export function overdag(tijdzone, nu = Date.now()) {
  let uur;
  try {
    uur = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23',
      timeZone: tijdzone || 'UTC' }).format(new Date(nu)));
  } catch {
    uur = new Date(nu).getUTCHours();
  }
  return uur >= 9 && uur < 21;
}

/**
 * Per speler zijn tegenstander in dit weekend: member_id -> { id, naam } of
 * null (vrij). Wie er niet in staat, doet niet mee (alleen in de poule, of
 * erbij gekomen nadat het weekend begon).
 * @param leden pool_members met member_id, pool_id, display_name, created_at
 */
export function tegenstanders({ race, leden = [], start = weekendStart(race) } = {}) {
  const perPoule = new Map();
  const opVolgorde = [...leden].sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
  for (const l of opVolgorde) {
    if (l.created_at && start !== null && Date.parse(l.created_at) > start) continue;
    if (!perPoule.has(l.pool_id)) perPoule.set(l.pool_id, []);
    perPoule.get(l.pool_id).push(l);
  }
  const uit = new Map();
  for (const spelers of perPoule.values()) {
    if (spelers.length < 2) continue;
    const naam = new Map(spelers.map((s) => [String(s.member_id), s.display_name]));
    for (const [a, b] of duelParen(spelers.map((s) => String(s.member_id)), Number(race.round) || 1)) {
      if (a !== null) uit.set(a, b === null ? null : { id: b, naam: naam.get(b) });
      if (b !== null) uit.set(b, a === null ? null : { id: a, naam: naam.get(a) });
    }
  }
  return uit;
}

const ZINNEN = {
  nl: { titel: (n) => `Weekendduel: jij tegen ${n}`,
    tekst: (r) => `${r}: wie dit weekend de meeste punten haalt, wint het duel.`,
    kop: 'Je weekendduel', regel: (p, n) => `${p}: je speelt dit weekend tegen ${n}.`,
    uitleg: 'Wie de meeste punten haalt wint het duel. Aan de gewone stand verandert het niets.',
    knop: 'Vul je top 10 in',
    vraag: 'De vraag van de week staat ook open: wie is sneller in de eerste training?' },
  en: { titel: (n) => `Weekend duel: you against ${n}`,
    tekst: (r) => `${r}: whoever scores most this weekend wins the duel.`,
    kop: 'Your weekend duel', regel: (p, n) => `${p}: this weekend you play against ${n}.`,
    uitleg: 'Whoever scores most wins the duel. It does not change the regular standings.',
    knop: 'Fill in your top 10',
    vraag: 'The question of the week is open too: who is faster in first practice?' },
  de: { titel: (n) => `Wochenend-Duell: du gegen ${n}`,
    tekst: (r) => `${r}: Wer an diesem Wochenende die meisten Punkte holt, gewinnt das Duell.`,
    kop: 'Dein Wochenend-Duell', regel: (p, n) => `${p}: An diesem Wochenende spielst du gegen ${n}.`,
    uitleg: 'Wer die meisten Punkte holt, gewinnt das Duell. An der normalen Wertung ändert sich nichts.',
    knop: 'Top 10 ausfüllen',
    vraag: 'Die Frage der Woche ist auch offen: Wer ist im ersten Training schneller?' },
  fr: { titel: (n) => `Duel du week-end : toi contre ${n}`,
    tekst: (r) => `${r} : celui qui marque le plus de points ce week-end gagne le duel.`,
    kop: 'Ton duel du week-end', regel: (p, n) => `${p} : ce week-end tu joues contre ${n}.`,
    uitleg: 'Celui qui marque le plus de points gagne le duel. Le classement habituel ne change pas.',
    knop: 'Remplir mon top 10',
    vraag: 'La question de la semaine est ouverte aussi : qui sera le plus rapide aux premiers essais libres ?' },
  es: { titel: (n) => `Duelo del fin de semana: tú contra ${n}`,
    tekst: (r) => `${r}: quien sume más puntos este fin de semana gana el duelo.`,
    kop: 'Tu duelo del fin de semana', regel: (p, n) => `${p}: este fin de semana juegas contra ${n}.`,
    uitleg: 'Quien sume más puntos gana el duelo. La clasificación habitual no cambia.',
    knop: 'Rellenar mi top 10',
    vraag: 'La pregunta de la semana también está abierta: ¿quién es más rápido en los primeros libres?' },
  it: { titel: (n) => `Duello del weekend: tu contro ${n}`,
    tekst: (r) => `${r}: chi fa più punti questo weekend vince il duello.`,
    kop: 'Il tuo duello del weekend', regel: (p, n) => `${p}: questo weekend giochi contro ${n}.`,
    uitleg: 'Chi fa più punti vince il duello. La classifica normale non cambia.',
    knop: 'Inserisci la tua top 10',
    vraag: 'Anche la domanda della settimana è aperta: chi è più veloce nelle prime libere?' },
  pt: { titel: (n) => `Duelo do fim de semana: você contra ${n}`,
    tekst: (r) => `${r}: quem fizer mais pontos neste fim de semana vence o duelo.`,
    kop: 'Seu duelo do fim de semana', regel: (p, n) => `${p}: neste fim de semana você joga contra ${n}.`,
    uitleg: 'Quem fizer mais pontos vence o duelo. A classificação normal não muda.',
    knop: 'Preencher meu top 10',
    vraag: 'A pergunta da semana também está aberta: quem é mais rápido no primeiro treino livre?' },
};
export const duelZinnen = (taal) => ZINNEN[taal] ?? ZINNEN.en;

/**
 * Staat de vraag van de week open? Hij gaat over de eerste vrije training en
 * sluit bij de start ervan (weekvraag_sluit() in schema.sql). Zonder rooster
 * is er geen vraag, en dan zegt het bericht er niets over.
 */
export function weekvraagOpen(race, nu = Date.now()) {
  const starts = (Array.isArray(race?.vrije_trainingen) ? race.vrije_trainingen : [])
    .map((t) => Date.parse(t?.start)).filter(Number.isFinite);
  return starts.length > 0 && nu < Math.min(...starts);
}

// Is er over dit weekend al iets gestuurd dat het duelbericht overbodig maakt?
const alGestuurd = (laatst, race) => laatst === `duel:${race.id}` || laatst === `training:${race.id}`;

/**
 * De meldingen voor dit moment.
 * @param abonnementen rijen uit push_abonnementen (member_id, pool_id, taal, tijdzone, meld_training, training_laatst)
 * @param leden        pool_members van die poules
 */
export function wieKrijgtEenDuel({ races = [], abonnementen = [], leden = [], nu = Date.now() } = {}) {
  const nieuws = duelNieuws({ races, nu });
  if (!nieuws) return [];
  const { race, start, tag } = nieuws;
  const tegen = tegenstanders({ race, leden, start });
  const uit = [];
  for (const ab of abonnementen) {
    if (ab.meld_training === false) continue;
    if (alGestuurd(ab.training_laatst, race)) continue;
    if (!overdag(ab.tijdzone, nu)) continue;
    const ander = tegen.get(String(ab.member_id));
    if (!ander) continue;                        // vrij, of geen duel
    const z = duelZinnen(ab.taal);
    uit.push({ abonnement: ab, tag, bericht: { titel: z.titel(ander.naam),
      tekst: z.tekst(race.name) + (weekvraagOpen(race, nu) ? ` ${z.vraag}` : ''), tag } });
  }
  return uit;
}

/**
 * De mails voor dit moment: één per account, met een regel per poule waarin
 * dat account dit weekend een tegenstander heeft.
 * @param ontvangers rijen uit mail_ontvangers(): user_id, taal, tijdzone, token, training_laatst
 * @param leden      pool_members van de poules van die accounts (ook de medespelers)
 * @param pools      id en name van die poules
 */
export function duelMails({ races = [], ontvangers = [], leden = [], pools = [], nu = Date.now(), appUrl } = {}) {
  const nieuws = duelNieuws({ races, nu });
  if (!nieuws) return [];
  const { race, start, tag } = nieuws;
  const tegen = tegenstanders({ race, leden, start });
  const poulenaam = new Map((pools ?? []).map((p) => [p.id, p.name]));
  const uit = [];
  for (const o of ontvangers) {
    if (alGestuurd(o.training_laatst, race)) continue;
    if (!overdag(o.tijdzone, nu)) continue;
    const z = duelZinnen(o.taal);
    const mijn = leden.filter((l) => l.user_id === o.user_id && poulenaam.has(l.pool_id))
      .map((l) => ({ poule: poulenaam.get(l.pool_id), ander: tegen.get(String(l.member_id)) }))
      .filter((x) => x.ander)
      .sort((a, b) => String(a.poule).localeCompare(String(b.poule)));
    if (!mijn.length) continue;
    const afmelden = `${appUrl}?afmelden=${encodeURIComponent(o.token)}`;
    uit.push({
      user_id: o.user_id,
      tag,
      afmelden,
      ...maakMail({
        taal: o.taal,
        onderwerp: `${race.name}: ${z.titel(mijn[0].ander.naam)}`,
        kop: z.kop,
        alineas: [...mijn.map((x) => z.regel(x.poule, x.ander.naam)), z.uitleg,
          ...(weekvraagOpen(race, nu) ? [z.vraag] : [])],
        knop: z.knop,
        appUrl,
        afmelden,
      }),
    });
  }
  return uit;
}
