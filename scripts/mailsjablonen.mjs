/**
 * De drie mailsjablonen voor Supabase (docs/mail/), in zeven talen.
 *
 *     node scripts/mailsjablonen.mjs
 *
 * schrijft docs/mail/inloggen.html, mailadres-koppelen.html en
 * account-maken.html opnieuw. Die plakt Danny in Supabase (BEDIENING.md §5b).
 *
 * Supabase heeft één sjabloon per soort mail. De taal komt uit het account:
 * de app zet hem in user_metadata.taal (taalNaarAccount() in app/index.html),
 * en dat heet in het sjabloon {{ .Data.taal }}. Bovenaan elk sjabloon staat
 *
 *     {{ $t := printf "%v" (or .Data.taal "en") }}
 *
 * zodat $t altijd een tekst is: "en" als het account geen taal heeft (een
 * account van vóór 20 oktober, of een Google-account dat de app nog niet
 * gezien heeft), en nooit een getal of nil waar `eq` over struikelt. Elke
 * tekst daarna is een rij {{ if eq $t "nl" }}…{{ else if … }}…{{ else }}Engels{{ end }}.
 *
 * Het onderwerp kan dat niet (BEDIENING.md §5b): dat is Engels, en de eerste
 * regel van de mail (de voorvertoning) staat in de taal van de speler.
 *
 * test/mailsjablonen.test.mjs controleert dat de bestanden precies dit zijn,
 * en rendert ze voor alle zeven talen en zonder taal.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TALEN = ['nl', 'de', 'fr', 'es', 'it', 'pt'];  // en is de rest

// Per tekst alle talen; `en` is wat er staat als de taal onbekend is.
const NEGEER = {
  en: "Didn't ask for this? You can ignore this email. Nothing changes.",
  nl: 'Niet om gevraagd? Dan kun je deze mail negeren. Er verandert niets.',
  de: 'Nicht angefordert? Dann kannst du diese E-Mail ignorieren. Es ändert sich nichts.',
  fr: "Vous n'avez rien demandé ? Ignorez simplement cet e-mail. Rien ne change.",
  es: '¿No lo has pedido? Puedes ignorar este correo. No cambia nada.',
  it: 'Non lo hai chiesto tu? Puoi ignorare questa email. Non cambia nulla.',
  pt: 'Não pediu isto? Pode ignorar este e-mail. Nada muda.',
};
const VOET = {
  en: 'the F1 prediction game for you and your friends',
  nl: 'het F1-voorspelspel voor jou en je vrienden',
  de: 'das F1-Tippspiel für dich und deine Freunde',
  fr: 'le jeu de pronostics F1 pour vous et vos amis',
  es: 'el juego de predicciones de F1 para ti y tus amigos',
  it: 'il gioco di pronostici F1 per te e i tuoi amici',
  pt: 'o jogo de palpites de F1 para você e seus amigos',
};
const CODE = {
  en: 'Or type this code in the app',
  nl: 'Of tik deze code in de app',
  de: 'Oder gib diesen Code in der App ein',
  fr: "Ou saisissez ce code dans l'app",
  es: 'O escribe este código en la app',
  it: "Oppure inserisci questo codice nell'app",
  pt: 'Ou digite este código no app',
};
const EEN_UUR = {
  en: 'The link and the code work once, and expire after an hour.',
  nl: 'De link en de code werken één keer, en verlopen na een uur.',
  de: 'Link und Code funktionieren einmal und laufen nach einer Stunde ab.',
  fr: "Le lien et le code ne fonctionnent qu'une fois et expirent au bout d'une heure.",
  es: 'El enlace y el código funcionan una vez y caducan al cabo de una hora.',
  it: "Il link e il codice funzionano una volta sola e scadono dopo un'ora.",
  pt: 'O link e o código funcionam uma vez e expiram após uma hora.',
};
const met = (a, b) => Object.fromEntries(Object.keys(a).map((t) => [t, `${a[t]} ${b[t]}`]));

export const SJABLONEN = {
  'inloggen.html': {
    soort: 'email',
    code: true,
    onderwerp: 'Sign in to Predict the Race',
    voorvertoning: {
      en: 'Your sign-in link and code for Predict the Race.',
      nl: 'Je inloglink en code voor Predict the Race.',
      de: 'Dein Anmeldelink und Code für Predict the Race.',
      fr: 'Votre lien et votre code de connexion pour Predict the Race.',
      es: 'Tu enlace y tu código para entrar en Predict the Race.',
      it: 'Il tuo link e il tuo codice di accesso a Predict the Race.',
      pt: 'Seu link e seu código de acesso ao Predict the Race.',
    },
    kop: { en: 'Sign in', nl: 'Inloggen', de: 'Anmelden', fr: 'Connexion', es: 'Entrar', it: 'Accedi', pt: 'Entrar' },
    tekst: met({
      en: 'Tap the button to go straight to your pools.',
      nl: 'Tik op de knop en je bent meteen bij je poules.',
      de: 'Tippe auf den Button und du bist direkt bei deinen Tipprunden.',
      fr: 'Touchez le bouton pour aller directement à vos ligues.',
      es: 'Pulsa el botón y vas directo a tus ligas.',
      it: 'Tocca il pulsante e vai subito alle tue leghe.',
      pt: 'Toque no botão e vá direto para seus bolões.',
    }, EEN_UUR),
    knop: {
      en: 'Sign in to Predict the Race', nl: 'Inloggen bij Predict the Race',
      de: 'Bei Predict the Race anmelden', fr: 'Se connecter à Predict the Race',
      es: 'Entrar en Predict the Race', it: 'Accedi a Predict the Race', pt: 'Entrar no Predict the Race',
    },
  },
  'mailadres-koppelen.html': {
    soort: 'email_change',
    code: false,
    onderwerp: 'Confirm your email address for Predict the Race',
    voorvertoning: {
      en: 'One tap to confirm your email address for Predict the Race.',
      nl: 'Eén tik om je mailadres voor Predict the Race te bevestigen.',
      de: 'Ein Tipp, um deine E-Mail-Adresse für Predict the Race zu bestätigen.',
      fr: 'Un geste pour confirmer votre adresse e-mail pour Predict the Race.',
      es: 'Un toque para confirmar tu correo para Predict the Race.',
      it: 'Un tocco per confermare il tuo indirizzo email per Predict the Race.',
      pt: 'Um toque para confirmar seu e-mail para o Predict the Race.',
    },
    kop: {
      en: 'Confirm your email', nl: 'Bevestig je mailadres', de: 'Bestätige deine E-Mail',
      fr: 'Confirmez votre e-mail', es: 'Confirma tu correo', it: 'Conferma la tua email', pt: 'Confirme seu e-mail',
    },
    tekst: {
      en: "Confirm that {{ .NewEmail }} is yours. After that you can sign in with it on any device, and you won't lose your player if this browser is ever cleared.",
      nl: 'Bevestig dat {{ .NewEmail }} van jou is. Daarna log je er op elk toestel mee in, en ben je je speler niet kwijt als deze browser ooit leeggemaakt wordt.',
      de: 'Bestätige, dass {{ .NewEmail }} dir gehört. Danach kannst du dich damit auf jedem Gerät anmelden, und dein Spieler bleibt erhalten, auch wenn dieser Browser einmal geleert wird.',
      fr: "Confirmez que {{ .NewEmail }} est bien à vous. Vous pourrez ensuite vous connecter avec sur n'importe quel appareil, et vous ne perdrez pas votre joueur si ce navigateur est un jour vidé.",
      es: 'Confirma que {{ .NewEmail }} es tuyo. Después podrás entrar con él en cualquier dispositivo, y no perderás tu jugador si algún día se borra este navegador.',
      it: 'Conferma che {{ .NewEmail }} è tuo. Poi potrai accedere con questo indirizzo da qualsiasi dispositivo, e non perderai il tuo giocatore se questo browser viene svuotato.',
      pt: 'Confirme que {{ .NewEmail }} é seu. Depois você pode entrar com ele em qualquer aparelho, e não perde seu jogador se este navegador for limpo.',
    },
    knop: {
      en: 'Confirm email address', nl: 'Mailadres bevestigen', de: 'E-Mail-Adresse bestätigen',
      fr: "Confirmer l'adresse e-mail", es: 'Confirmar correo', it: 'Conferma indirizzo email', pt: 'Confirmar e-mail',
    },
  },
  'account-maken.html': {
    soort: 'email',
    code: true,
    onderwerp: 'Welcome to Predict the Race',
    voorvertoning: {
      en: "Confirm your email and you're in. Your code is inside.",
      nl: 'Bevestig je mailadres en je bent binnen. Je code staat erin.',
      de: 'Bestätige deine E-Mail und du bist dabei. Dein Code steht drin.',
      fr: "Confirmez votre e-mail et c'est parti. Votre code est à l'intérieur.",
      es: 'Confirma tu correo y ya estás dentro. Tu código está dentro.',
      it: 'Conferma la tua email e sei dentro. Il codice è nel messaggio.',
      pt: 'Confirme seu e-mail e pronto. Seu código está aqui dentro.',
    },
    kop: { en: 'Welcome', nl: 'Welkom', de: 'Willkommen', fr: 'Bienvenue', es: 'Bienvenido', it: 'Benvenuto', pt: 'Bem-vindo' },
    tekst: met({
      en: 'Confirm your email to create your Predict the Race account. Then join a pool with its code, or start your own.',
      nl: 'Bevestig je mailadres om je account bij Predict the Race te maken. Doe daarna mee met een poule via de code, of begin er zelf een.',
      de: 'Bestätige deine E-Mail, um dein Konto bei Predict the Race zu erstellen. Tritt dann mit dem Code einer Tipprunde bei oder starte deine eigene.',
      fr: 'Confirmez votre e-mail pour créer votre compte Predict the Race. Rejoignez ensuite une ligue avec son code, ou créez la vôtre.',
      es: 'Confirma tu correo para crear tu cuenta de Predict the Race. Luego únete a una liga con su código o crea la tuya.',
      it: 'Conferma la tua email per creare il tuo account Predict the Race. Poi entra in una lega con il suo codice, o creane una tua.',
      pt: 'Confirme seu e-mail para criar sua conta no Predict the Race. Depois entre em um bolão com o código dele, ou crie o seu.',
    }, EEN_UUR),
    knop: {
      en: 'Confirm and sign in', nl: 'Bevestigen en inloggen', de: 'Bestätigen und anmelden',
      fr: 'Confirmer et se connecter', es: 'Confirmar y entrar', it: 'Conferma e accedi', pt: 'Confirmar e entrar',
    },
  },
};

// Eén tekst in alle talen, als keten van {{ if }}'s. Engels als laatste.
export function perTaal(t) {
  for (const taal of ['en', ...TALEN]) {
    if (typeof t[taal] !== 'string' || !t[taal]) throw new Error(`tekst zonder ${taal}: ${JSON.stringify(t)}`);
  }
  return TALEN.map((taal, i) => `{{ ${i ? 'else if' : 'if'} eq $t "${taal}" }}${t[taal]}`).join('')
    + `{{ else }}${t.en}{{ end }}`;
}

const kop = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;";

export function maak(naam) {
  const s = SJABLONEN[naam];
  const codeblok = s.code ? `
        <tr>
          <td style="padding:24px 28px 0;">
            <p style="margin:0 0 8px;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#696e75;">${perTaal(CODE)}</p>
            <div style="background:#f2f1ee;border:1px solid #dcdad5;border-radius:10px;padding:16px;text-align:center;font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:#14151a;">{{ .Token }}</div>
          </td>
        </tr>` : '';
  return `{{ $t := printf "%v" (or .Data.taal "en") }}
<style>a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important}</style>
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f2f1ee;">${perTaal(s.voorvertoning)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f1ee;font-family:Arial,Helvetica,sans-serif;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #dcdad5;border-radius:16px;overflow:hidden;">
        <tr><td style="height:4px;line-height:4px;font-size:0;background:#d93d24;">&nbsp;</td></tr>
        <tr>
          <td style="padding:24px 28px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;padding-right:10px;"><img src="https://predicttherace.com/pictogrammen/predicttherace-logo.png" width="32" height="32" alt="" style="display:block;border:0;"></td>
                <td style="vertical-align:middle;${kop}font-size:22px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#14151a;">Predict the Race</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 0;">
            <h1 style="margin:0;${kop}font-size:34px;line-height:1;font-weight:700;text-transform:uppercase;color:#14151a;">${perTaal(s.kop)}</h1>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:#61656d;">${perTaal(s.tekst)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 0;">
            <a href="https://predicttherace.com/app/?token_hash={{ .TokenHash }}&amp;type=${s.soort}" style="display:block;background:#d93d24;color:#ffffff;text-decoration:none;text-align:center;font-size:17px;font-weight:700;padding:16px 20px;border-radius:10px;">${perTaal(s.knop)}</a>
          </td>
        </tr>${codeblok}
        <tr>
          <td style="padding:24px 28px 28px;">
            <p style="margin:0;font-size:13px;line-height:1.5;color:#696e75;">${perTaal(NEGEER)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#696e75;">Predict the Race &middot; ${perTaal(VOET)}<br><a href="https://predicttherace.com" style="color:#696e75;">predicttherace.com</a></p>
    </td>
  </tr>
</table>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const map = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'mail');
  for (const naam of Object.keys(SJABLONEN)) {
    writeFileSync(join(map, naam), maak(naam));
    console.log(`docs/mail/${naam}`);
  }
}
