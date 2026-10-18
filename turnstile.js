// Cloudflare Turnstile voor het inloggen, in de app en in het beheer. Eén
// bestand, zodat de site key op één plek staat (net als de meet-ID in
// toestemming.js).
//
// Waarom: met captcha aan in Supabase Auth kost elk nieuw account, ook een
// anoniem, een opgeloste Turnstile. Zonder dat kan een script met alleen de
// anon key uit de broncode duizenden accounts maken, en met elk account weer
// tien spelers en vijf poules (zie "Misbruik tegengaan" in schema.sql).
//
// Managed: Turnstile kijkt in de browser of er een mens zit en geeft een
// token, zonder puzzel. Alleen als hij twijfelt, verschijnt er onderin een
// vakje om aan te vinken (appearance: interaction-only). Liever dat dan
// Invisible, waar een echte speler die Cloudflare verdacht vindt alleen een
// foutmelding krijgt.
//
// Gebruik: `await window.ptrCaptcha()` geeft een vers token, of undefined als
// er geen site key is of Turnstile niet laadt. Een token werkt maar één keer,
// dus voor elke aanroep naar Supabase Auth een nieuwe. Zonder token gaat de
// aanroep gewoon door: zolang captcha in Supabase uit staat werkt alles zoals
// het deed, en staat hij aan, dan zegt Supabase dat de controle mislukte en
// legt de app dat uit.
//
// Volgorde (BEDIENING.md §7b): eerst de site key hieronder, pas daarna
// captcha aan in Supabase. Andersom kan niemand meer inloggen.
(() => {
  // De site key van de Turnstile-widget "Predict the Race" (Cloudflare,
  // Turnstile; modus Managed, hostnames predicttherace.com en
  // www.predicttherace.com). Openbaar, net als de anon key. Leeg = uit.
  const SITE_KEY = '0x4AAAAAAFZfPU0x8aMvrBQQ';
  const API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  // Zo lang wachten we op een token. Een vakje aanvinken kost een mens een
  // paar seconden; daarna gaat de aanroep zonder token, en zegt Supabase nee.
  const WACHT = 30000;

  let laden = null;
  function laad() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    laden ??= new Promise((ok, mis) => {
      const s = document.createElement('script');
      s.src = API;
      s.async = true;
      s.onload = () => (window.turnstile ? ok(window.turnstile) : mis(new Error('geen turnstile')));
      s.onerror = () => mis(new Error('turnstile niet geladen'));
      document.head.appendChild(s);
    }).catch((e) => { laden = null; throw e; });
    return laden;
  }

  // Elke keer een eigen widget, en daarna weg: zo is elk token vers, ook als
  // de vorige aanroep halverwege afbrak.
  async function token() {
    if (!SITE_KEY) return undefined;
    const ts = await laad();
    return new Promise((ok, mis) => {
      const doos = document.createElement('div');
      doos.className = 'ptr-turnstile';
      doos.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000';
      document.body.appendChild(doos);
      let id = null;
      const klaar = (fn) => (waarde) => {
        clearTimeout(klok);
        try { if (id !== null) ts.remove(id); } catch { /* al weg */ }
        doos.remove();
        fn(waarde);
      };
      const klok = setTimeout(klaar(() => mis(new Error('turnstile te traag'))), WACHT);
      try {
        id = ts.render(doos, {
          sitekey: SITE_KEY,
          action: 'inloggen',
          appearance: 'interaction-only',
          callback: klaar(ok),
          'error-callback': klaar(() => mis(new Error('turnstile fout'))),
          'timeout-callback': klaar(() => mis(new Error('turnstile verlopen'))),
        });
      } catch (e) { klaar(() => mis(e))(); }
    });
  }

  // Alvast een token halen, op het scherm waar je je naam kiest: dan hoeft
  // meedoen er niet op te wachten. Een token blijft vijf minuten geldig; na
  // vier minuten halen we liever een nieuwe. Loopt het halen nog als de app
  // het token nodig heeft, dan wacht hij op dat ene in plaats van een tweede
  // widget te maken. Elk token wordt maar één keer uitgegeven.
  const HOUDBAAR = 240000;
  let vooraf = null;
  window.ptrCaptchaVooraf = () => {
    if (!SITE_KEY || (vooraf && Date.now() - vooraf.sinds < HOUDBAAR)) return;
    vooraf = { sinds: Date.now(), belofte: token().catch(() => undefined) };
  };
  window.ptrCaptcha = async () => {
    if (vooraf && Date.now() - vooraf.sinds < HOUDBAAR) {
      const { belofte } = vooraf;
      vooraf = null;
      const t = await belofte;
      if (t) return t;
    }
    vooraf = null;
    return token().catch(() => undefined);
  };
})();
