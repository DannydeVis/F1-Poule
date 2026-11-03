/**
 * Mail als tweede kanaal (Danny, 3 november).
 *
 * "Ik wil dat ze vaker de app openen." Maar 2 van de 16 spelers hebben
 * meldingen aan, en 9 van de 15 accounts hebben een mailadres. Wie het onder
 * Profiel aanzet (mail_abonnementen in schema.sql), krijgt twee mails per
 * weekend:
 *
 *   - op vrijdagavond, zodra de top 10 van de vrije training er is (dezelfde
 *     training en hetzelfde moment als de trainingsmelding,
 *     trainingmeldingen.mjs): die top 10, en per poule of je de eerstvolgende
 *     sessie al invulde en tot wanneer het kan;
 *   - na de race, zodra de uitslag er is (laatsteUitslag() uit
 *     uitslagmeldingen.mjs, alleen de race): per poule je punten van het
 *     weekend, je plek dat weekend en je plek in de stand. De punten komen uit
 *     de rekenkern van de app zelf (knipsel.mjs), geen kopie.
 *
 * Per account hooguit één mail per moment (training_laatst en uitslag_laatst).
 * In elke mail een afmeldlink met het token van dat account.
 *
 * Apart van sync.mjs en zonder netwerk erin, net als trainingmeldingen.mjs:
 * zo is de regel na te rekenen (test/mailmomenten.test.mjs). Het adres komt
 * hier nooit langs: de functie `mail` (supabase/functions/mail) zoekt het op
 * bij het versturen.
 */

import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { rekenkern } from './knipsel.mjs';
import { SESSIES, SESSIEVOLGORDE } from './herinneringen.mjs';
import { trainingNieuws, sleuteltraining, deadlineTekst, achternaam, TRAINING_MARGE_MIN } from './trainingmeldingen.mjs';
import { laatsteUitslag, SESSIEVRAGEN, uitslagZinnen } from './uitslagmeldingen.mjs';
import { VOET } from './mailsjablonen.mjs';

export const TALEN = ['nl', 'en', 'de', 'fr', 'es', 'it', 'pt'];

const meervoud = (een, veel) => (n) => `${n} ${n === 1 ? een : veel}`;
const engels = (n) => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] ?? 'th'}`;
};
const frans = (n) => (n === 1 ? '1er' : `${n}e`);

// Alles wat in een mail staat, per taal. De punten in het Frans: 0 en 1 enkelvoud.
const ZINNEN = {
  nl: {
    vt: { 'Practice 1': 'VT1', 'Practice 2': 'VT2' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie} snelst in ${vt}`,
    kopVrijdag: (vt) => `${vt} is binnen`,
    lijstkop: (vt) => `De top 10 van ${vt}`,
    sessie: { sprint: 'de sprint', quali: 'de kwalificatie', race: 'de race' },
    open: (p, s, tot) => `${p}: je hebt ${s} nog niet ingevuld. Dat kan nog ${tot}.`,
    staat: (p, s, tot) => `${p}: je top 10 voor ${s} staat. Aanpassen kan nog ${tot}.`,
    totTijd: (w) => `tot ${w}`,
    totStart: { sprint: 'tot de start van de sprint', quali: 'tot de start van de kwalificatie',
      race: 'tot de start van de race' },
    knopInvullen: 'Vul je top 10 in', knopBekijken: 'Bekijk je top 10',
    punten: meervoud('punt', 'punten'),
    onderwerpRace: (race, p) => `${race}: ${p} voor jou`,
    onderwerpRaceMeer: (race) => `${race}: je punten en je plek`,
    kopRace: 'De uitslag is binnen',
    plek: (p, pt, w, n, s) => `${p}: ${pt} dit weekend, plek ${w} van ${n}. In de stand sta je op plek ${s}.`,
    alleen: (p, pt) => `${p}: ${pt} dit weekend.`,
    knopRace: 'Bekijk de uitslag',
    waarom: 'Je krijgt deze mail omdat je hem aanzette onder Profiel in Predict the Race.',
    afmelden: 'Geen mail meer',
  },
  en: {
    vt: { 'Practice 1': 'FP1', 'Practice 2': 'FP2' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie} fastest in ${vt}`,
    kopVrijdag: (vt) => `${vt} is in`,
    lijstkop: (vt) => `The ${vt} top 10`,
    sessie: { sprint: 'the sprint', quali: 'qualifying', race: 'the race' },
    open: (p, s, tot) => `${p}: you haven’t filled in ${s} yet. You have ${tot}.`,
    staat: (p, s, tot) => `${p}: your top 10 for ${s} is in. You can change it ${tot}.`,
    totTijd: (w) => `until ${w}`,
    totStart: { sprint: 'until the sprint starts', quali: 'until qualifying starts', race: 'until the race starts' },
    knopInvullen: 'Fill in your top 10', knopBekijken: 'See your top 10',
    punten: meervoud('point', 'points'),
    onderwerpRace: (race, p) => `${race}: ${p} for you`,
    onderwerpRaceMeer: (race) => `${race}: your points and your place`,
    kopRace: 'The result is in',
    plek: (p, pt, w, n, s) => `${p}: ${pt} this weekend, ${engels(w)} of ${n}. You’re ${engels(s)} in the standings.`,
    alleen: (p, pt) => `${p}: ${pt} this weekend.`,
    knopRace: 'See the result',
    waarom: 'You’re getting this email because you turned it on under Profile in Predict the Race.',
    afmelden: 'Stop these emails',
  },
  de: {
    vt: { 'Practice 1': '1. Training', 'Practice 2': '2. Training' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie} Schnellster im ${vt}`,
    kopVrijdag: (vt) => `${vt} ist vorbei`,
    lijstkop: (vt) => `Die Top 10 im ${vt}`,
    sessie: { sprint: 'den Sprint', quali: 'das Qualifying', race: 'das Rennen' },
    open: (p, s, tot) => `${p}: Deine Top 10 für ${s} fehlt noch. Du hast Zeit ${tot}.`,
    staat: (p, s, tot) => `${p}: Deine Top 10 für ${s} steht. Ändern kannst du sie ${tot}.`,
    totTijd: (w) => `bis ${w}`,
    totStart: { sprint: 'bis zum Start des Sprints', quali: 'bis zum Start des Qualifyings',
      race: 'bis zum Start des Rennens' },
    knopInvullen: 'Top 10 ausfüllen', knopBekijken: 'Deine Top 10 ansehen',
    punten: meervoud('Punkt', 'Punkte'),
    onderwerpRace: (race, p) => `${race}: ${p} für dich`,
    onderwerpRaceMeer: (race) => `${race}: deine Punkte und dein Platz`,
    kopRace: 'Das Ergebnis ist da',
    plek: (p, pt, w, n, s) => `${p}: ${pt} an diesem Wochenende, Platz ${w} von ${n}. In der Tabelle stehst du auf Platz ${s}.`,
    alleen: (p, pt) => `${p}: ${pt} an diesem Wochenende.`,
    knopRace: 'Ergebnis ansehen',
    waarom: 'Du bekommst diese E-Mail, weil du sie unter Profil in Predict the Race eingeschaltet hast.',
    afmelden: 'Keine E-Mails mehr',
  },
  fr: {
    vt: { 'Practice 1': 'EL1', 'Practice 2': 'EL2' },
    onderwerpVrijdag: (race, vt, wie) => `${race} : ${wie} le plus rapide en ${vt}`,
    kopVrijdag: (vt) => `${vt} terminés`,
    lijstkop: (vt) => `Le top 10 des ${vt}`,
    sessie: { sprint: 'le sprint', quali: 'les qualifications', race: 'la course' },
    open: (p, s, tot) => `${p} : vous n’avez pas encore rempli votre top 10 pour ${s}. Vous avez ${tot}.`,
    staat: (p, s, tot) => `${p} : votre top 10 pour ${s} est prêt. Vous pouvez le modifier ${tot}.`,
    totTijd: (w) => `jusqu’à ${w}`,
    totStart: { sprint: 'jusqu’au départ du sprint', quali: 'jusqu’au début des qualifications',
      race: 'jusqu’au départ de la course' },
    knopInvullen: 'Remplir mon top 10', knopBekijken: 'Voir mon top 10',
    punten: (n) => `${n} ${n <= 1 ? 'point' : 'points'}`,
    onderwerpRace: (race, p) => `${race} : ${p} pour vous`,
    onderwerpRaceMeer: (race) => `${race} : vos points et votre place`,
    kopRace: 'Le résultat est là',
    plek: (p, pt, w, n, s) => `${p} : ${pt} ce week-end, ${frans(w)} sur ${n}. Au classement, vous êtes ${frans(s)}.`,
    alleen: (p, pt) => `${p} : ${pt} ce week-end.`,
    knopRace: 'Voir le résultat',
    waarom: 'Vous recevez cet e-mail parce que vous l’avez activé dans Profil sur Predict the Race.',
    afmelden: 'Ne plus recevoir ces e-mails',
  },
  es: {
    vt: { 'Practice 1': 'Libres 1', 'Practice 2': 'Libres 2' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie}, el más rápido en ${vt}`,
    kopVrijdag: (vt) => `${vt} terminados`,
    lijstkop: (vt) => `El top 10 de ${vt}`,
    sessie: { sprint: 'el sprint', quali: 'la clasificación', race: 'la carrera' },
    open: (p, s, tot) => `${p}: todavía no has rellenado tu top 10 para ${s}. Tienes ${tot}.`,
    staat: (p, s, tot) => `${p}: tu top 10 para ${s} ya está. Puedes cambiarlo ${tot}.`,
    totTijd: (w) => `hasta el ${w}`,
    totStart: { sprint: 'hasta que empiece el sprint', quali: 'hasta que empiece la clasificación',
      race: 'hasta que empiece la carrera' },
    knopInvullen: 'Rellenar mi top 10', knopBekijken: 'Ver mi top 10',
    punten: meervoud('punto', 'puntos'),
    onderwerpRace: (race, p) => `${race}: ${p} para ti`,
    onderwerpRaceMeer: (race) => `${race}: tus puntos y tu puesto`,
    kopRace: 'Ya está el resultado',
    plek: (p, pt, w, n, s) => `${p}: ${pt} este fin de semana, puesto ${w} de ${n}. En la clasificación estás en el puesto ${s}.`,
    alleen: (p, pt) => `${p}: ${pt} este fin de semana.`,
    knopRace: 'Ver el resultado',
    waarom: 'Recibes este correo porque lo activaste en Perfil en Predict the Race.',
    afmelden: 'No recibir más correos',
  },
  it: {
    vt: { 'Practice 1': 'PL1', 'Practice 2': 'PL2' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie} il più veloce nelle ${vt}`,
    kopVrijdag: (vt) => `${vt} concluse`,
    lijstkop: (vt) => `La top 10 delle ${vt}`,
    sessie: { sprint: 'la sprint', quali: 'le qualifiche', race: 'la gara' },
    open: (p, s, tot) => `${p}: non hai ancora inserito la tua top 10 per ${s}. Hai tempo ${tot}.`,
    staat: (p, s, tot) => `${p}: la tua top 10 per ${s} è pronta. Puoi cambiarla ${tot}.`,
    totTijd: (w) => `fino a ${w}`,
    totStart: { sprint: 'fino all’inizio della sprint', quali: 'fino all’inizio delle qualifiche',
      race: 'fino all’inizio della gara' },
    knopInvullen: 'Inserisci la tua top 10', knopBekijken: 'Guarda la tua top 10',
    punten: meervoud('punto', 'punti'),
    onderwerpRace: (race, p) => `${race}: ${p} per te`,
    onderwerpRaceMeer: (race) => `${race}: i tuoi punti e la tua posizione`,
    kopRace: 'Il risultato è arrivato',
    plek: (p, pt, w, n, s) => `${p}: ${pt} questo weekend, ${w}° su ${n}. In classifica sei ${s}°.`,
    alleen: (p, pt) => `${p}: ${pt} questo weekend.`,
    knopRace: 'Guarda il risultato',
    waarom: 'Ricevi questa email perché l’hai attivata in Profilo su Predict the Race.',
    afmelden: 'Non ricevere più email',
  },
  pt: {
    vt: { 'Practice 1': 'TL1', 'Practice 2': 'TL2' },
    onderwerpVrijdag: (race, vt, wie) => `${race}: ${wie} o mais rápido no ${vt}`,
    kopVrijdag: (vt) => `${vt} encerrado`,
    lijstkop: (vt) => `O top 10 do ${vt}`,
    sessie: { sprint: 'a sprint', quali: 'a classificação', race: 'a corrida' },
    open: (p, s, tot) => `${p}: você ainda não preencheu seu top 10 para ${s}. Você tem ${tot}.`,
    staat: (p, s, tot) => `${p}: seu top 10 para ${s} está pronto. Você pode mudá-lo ${tot}.`,
    totTijd: (w) => `até ${w}`,
    totStart: { sprint: 'até o início da sprint', quali: 'até o início da classificação',
      race: 'até o início da corrida' },
    knopInvullen: 'Preencher meu top 10', knopBekijken: 'Ver meu top 10',
    punten: meervoud('ponto', 'pontos'),
    onderwerpRace: (race, p) => `${race}: ${p} para você`,
    onderwerpRaceMeer: (race) => `${race}: seus pontos e sua posição`,
    kopRace: 'O resultado chegou',
    plek: (p, pt, w, n, s) => `${p}: ${pt} neste fim de semana, ${w}º de ${n}. Na classificação você está em ${s}º.`,
    alleen: (p, pt) => `${p}: ${pt} neste fim de semana.`,
    knopRace: 'Ver o resultado',
    waarom: 'Você recebe este e-mail porque o ativou em Perfil no Predict the Race.',
    afmelden: 'Não receber mais e-mails',
  },
};
export const mailZinnen = (taal) => ZINNEN[taal] ?? ZINNEN.en;

// ---- de mail zelf ---------------------------------------------------------------------------

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const kopletter = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

/**
 * Een mail in de stijl van de inlogmails (scripts/mailsjablonen.mjs), als HTML
 * en als platte tekst. Alles wat van buiten komt (poulenamen, racenamen,
 * coureurs) gaat door esc(): een poulenaam is wat iemand intypte.
 */
export function maakMail({ taal, onderwerp, kop, alineas = [], lijstkop = null, lijst = [], knop, appUrl, afmelden }) {
  const z = mailZinnen(taal);
  const site = new URL('..', appUrl).href.replace(/\/$/, '');
  const voet = VOET[taal] ?? VOET.en;
  const tekst = [
    kop, '',
    ...alineas.flatMap((a) => [a, '']),
    ...(lijst.length ? [lijstkop, ...lijst.map((r, i) => `${i + 1}. ${r}`), ''] : []),
    `${knop}: ${appUrl}`, '',
    '--',
    z.waarom,
    `${z.afmelden}: ${afmelden}`,
    `Predict the Race · ${voet}`,
  ].join('\n');
  const html = `<!doctype html>
<html lang="${esc(taal)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(onderwerp)}</title></head>
<body style="margin:0;padding:0;background:#f2f1ee;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f2f1ee;">${esc(alineas[0] ?? kop)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f1ee;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #dcdad5;border-radius:16px;overflow:hidden;">
        <tr><td style="height:4px;line-height:4px;font-size:0;background:#d93d24;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;"><img src="${esc(site)}/pictogrammen/predicttherace-logo.png" width="32" height="32" alt="" style="display:block;border:0;"></td>
                <td style="vertical-align:middle;${kopletter}font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#14151a;">Predict the Race</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0;">
            <h1 style="margin:0;${kopletter}font-size:34px;line-height:1;font-weight:700;text-transform:uppercase;color:#14151a;">${esc(kop)}</h1>
${alineas.map((a) => `            <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:#3d4047;">${esc(a)}</p>`).join('\n')}
          </td>
        </tr>${lijst.length ? `
        <tr>
          <td style="padding:20px 28px 0;">
            <p style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#696e75;">${esc(lijstkop)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:15px;line-height:1.4;color:#14151a;">
${lijst.map((r, i) => `              <tr><td style="width:28px;padding:3px 0;font-family:'Courier New',Courier,monospace;color:#696e75;">${i + 1}</td><td style="padding:3px 0;">${esc(r)}</td></tr>`).join('\n')}
            </table>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:24px 28px 28px;">
            <a href="${esc(appUrl)}" style="display:block;background:#d93d24;color:#ffffff;text-decoration:none;text-align:center;font-size:17px;font-weight:700;padding:16px 20px;border-radius:10px;">${esc(knop)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#696e75;max-width:480px;">${esc(z.waarom)} <a href="${esc(afmelden)}" style="color:#696e75;">${esc(z.afmelden)}</a></p>
      <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#696e75;">Predict the Race &middot; ${esc(voet)}<br><a href="${esc(site)}" style="color:#696e75;">${esc(new URL(site).host)}</a></p>
    </td>
  </tr>
</table>
</body></html>
`;
  return { onderwerp, tekst, html };
}

const afmeldLink = (appUrl, token) => `${appUrl}?afmelden=${encodeURIComponent(token)}`;

// Welke poules stellen welke vraag. Geen rijen = alles aan, net als in de app.
function vragenPerPoule(poulevragen) {
  const per = new Map();
  for (const r of poulevragen ?? []) {
    if (!per.has(r.pool_id)) per.set(r.pool_id, new Set());
    per.get(r.pool_id).add(r.question_id);
  }
  return per;
}

// De poules van een account, op naam gesorteerd, zodat de mail elke keer
// dezelfde volgorde heeft.
function poulesVan(ontvanger, leden, pools) {
  const naam = new Map((pools ?? []).map((p) => [p.id, p.name]));
  return (leden ?? []).filter((l) => l.user_id === ontvanger.user_id && naam.has(l.pool_id))
    .map((l) => ({ lid: l, naam: naam.get(l.pool_id) }))
    .sort((a, b) => String(a.naam).localeCompare(String(b.naam)) || String(a.lid.member_id).localeCompare(String(b.lid.member_id)));
}

/**
 * De vrijdagmails, of [] als er niets te melden valt.
 *
 * @param races       de races van dit seizoen, met races.vrije_trainingen
 * @param ontvangers  rijen uit mail_ontvangers(): user_id, taal, tijdzone, token, training_laatst
 * @param leden       pool_members van die accounts: member_id, pool_id, user_id
 * @param pools       id en name van die poules
 * @param poulevragen rijen {pool_id, question_id}
 * @param antwoorden  answers van die spelers voor deze race: member_id, pool_id, question_id, waarde
 */
export function vrijdagMails({ races = [], ontvangers = [], leden = [], pools = [], poulevragen = [],
                               antwoorden = [], nu = Date.now(), appUrl } = {}) {
  const nieuws = trainingNieuws({ races, nu });
  if (!nieuws) return [];
  const { race, training, tag } = nieuws;
  const coureurs = new Map((race.drivers ?? []).map((d) => [String(d.nr), d]));
  const top = [...training.top].sort((a, b) => Number(a.plek) - Number(b.plek)).slice(0, 10);
  const snelste = top[0];
  const per = vragenPerPoule(poulevragen);
  const volgende = (poolId) => {
    const set = per.get(poolId);
    for (const welk of SESSIEVOLGORDE) {
      const iso = race[SESSIES[welk].deadline];
      if (!iso || Date.parse(iso) - nu <= TRAINING_MARGE_MIN * 60e3) continue;
      if (!set || set.has(SESSIES[welk].vraag)) return { welk, iso };
    }
    return null;
  };
  const ingevuld = (lid, welk) => antwoorden.some((a) => a.member_id === lid.member_id
    && a.pool_id === lid.pool_id && a.question_id === SESSIES[welk].vraag
    && Array.isArray(a.waarde) && a.waarde.length >= 10);

  const uit = [];
  for (const o of ontvangers) {
    if (o.training_laatst === tag) continue;
    const z = mailZinnen(o.taal);
    const regels = [];
    let open = false;
    for (const { lid, naam } of poulesVan(o, leden, pools)) {
      const deadline = volgende(lid.pool_id);
      if (!deadline) continue;
      const wanneer = deadlineTekst(deadline.iso, o.taal, o.tijdzone);
      const tot = wanneer ? z.totTijd(wanneer) : z.totStart[deadline.welk];
      const klaar = ingevuld(lid, deadline.welk);
      if (!klaar) open = true;
      regels.push((klaar ? z.staat : z.open)(naam, z.sessie[deadline.welk], tot));
    }
    if (!regels.length) continue;
    const vt = z.vt[training.naam] ?? z.vt[sleuteltraining(race)];
    const wie = achternaam(snelste?.naam, snelste?.code);
    const afmelden = afmeldLink(appUrl, o.token);
    uit.push({
      user_id: o.user_id,
      tag,
      afmelden,
      ...maakMail({
        taal: o.taal,
        onderwerp: z.onderwerpVrijdag(race.name, vt, wie),
        kop: z.kopVrijdag(vt),
        alineas: regels,
        lijstkop: z.lijstkop(vt),
        lijst: top.map((x) => {
          const d = coureurs.get(String(x.nr));
          const naam = x.naam ?? d?.naam ?? x.code ?? `#${x.nr}`;
          return d?.team ? `${naam}, ${d.team}` : naam;
        }),
        knop: open ? z.knopInvullen : z.knopBekijken,
        appUrl,
        afmelden,
      }),
    });
  }
  return uit;
}

/**
 * De mails na de race, of [] als er niets te melden valt.
 *
 * @param standen   Map pool_id -> { weekend: rijen, stand: rijen } (weekendUitslag() en
 *                  standRijen() uit de rekenkern), met per rij id en punten
 * @param beterDan  (lid) => "beter dan p% van alle spelers" voor de race, of null
 */
export function raceMails({ races = [], ontvangers = [], leden = [], pools = [], poulevragen = [],
                            standen = new Map(), beterDan = () => null, nu = Date.now(), appUrl } = {}) {
  const nieuws = laatsteUitslag({ races, nu });
  if (!nieuws || nieuws.welk !== 'race') return [];
  const tag = `race:${nieuws.race.id}`;
  const per = vragenPerPoule(poulevragen);
  const speelt = (poolId) => {
    const set = per.get(poolId);
    return !set || SESSIEVRAGEN.race.some((v) => set.has(v));
  };
  const plekIn = (rijen, id) => {
    const i = rijen.findIndex((r) => String(r.id) === String(id));
    return i < 0 ? 0 : rijen.findIndex((r) => r.punten === rijen[i].punten) + 1;
  };

  const uit = [];
  for (const o of ontvangers) {
    if (o.uitslag_laatst === tag) continue;
    const z = mailZinnen(o.taal);
    const regels = [];
    const punten = [];
    let beter = null;
    for (const { lid, naam } of poulesVan(o, leden, pools)) {
      if (!speelt(lid.pool_id)) continue;
      const s = standen.get(lid.pool_id);
      const weekend = s?.weekend ?? [];
      const w = plekIn(weekend, lid.member_id);
      if (!w) continue;
      const pt = weekend.find((r) => String(r.id) === String(lid.member_id)).punten;
      punten.push(pt);
      regels.push(weekend.length > 1
        ? z.plek(naam, z.punten(pt), w, weekend.length, plekIn(s.stand ?? [], lid.member_id) || w)
        : z.alleen(naam, z.punten(pt)));
      const p = beterDan(lid);
      if (beter === null && Number.isInteger(p) && p >= 1 && p <= 100) beter = p;
    }
    if (!regels.length) continue;
    if (beter !== null) regels.push(uitslagZinnen(o.taal).beter(beter));
    const afmelden = afmeldLink(appUrl, o.token);
    uit.push({
      user_id: o.user_id,
      tag,
      afmelden,
      ...maakMail({
        taal: o.taal,
        onderwerp: punten.length === 1 ? z.onderwerpRace(nieuws.race.name, z.punten(punten[0]))
          : z.onderwerpRaceMeer(nieuws.race.name),
        kop: z.kopRace,
        alineas: regels,
        knop: z.knopRace,
        appUrl,
        afmelden,
      }),
    });
  }
  return uit;
}

/**
 * Valt er nu iets te mailen? De race van de vrijdagmail en die van de mail na
 * de race, of null. Zodat de sync pas iets ophaalt als dat zo is.
 */
export function mailNieuws({ races = [], nu = Date.now() } = {}) {
  const uitslag = laatsteUitslag({ races, nu });
  return { training: trainingNieuws({ races, nu })?.race ?? null,
           race: uitslag?.welk === 'race' ? uitslag.race : null };
}

// ---- de rekenkern van de app, voor de stand van één poule ---------------------------------

let appBron = null;
/**
 * De stand van één poule, met de rekenfuncties letterlijk uit app/index.html
 * (knipsel.mjs, zoals scripts/controle-stand.mjs). `toestand` is wat de kern
 * nodig heeft: leden, races, antwoorden, vragen, poule, jokers, poulevragen
 * (ids), en de eigen vragen van die poule.
 */
export function pouleStand(toestand, race) {
  appBron ??= readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');
  const code = rekenkern(appBron, { ik: { id: null }, eigenVragen: [], eigenAntwoorden: [], ingeleverd: [], ...toestand })
    .replace(/^export (?=(?:async )?(?:function|const|let|class)\b)/gm, '');
  const plek = createContext({ console });
  runInContext(`${code}\n;globalThis.__uit = { weekend: weekendUitslag(S.races.find((r) => zelfde(r.id, ${JSON.stringify(race.id)}))) ?? [], stand: standRijen() };`, plek);
  return plek.__uit;
}
