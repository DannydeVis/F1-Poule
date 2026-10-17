// Cloudflare Turnstile voor het inloggen, in de app en in het beheer. Eén
// bestand, zodat de site key op één plek staat (net als de meet-ID in
// toestemming.js).
//
// Waarom: met captcha aan in Supabase Auth kost elk nieuw account, ook een
// anoniem, een opgeloste Turnstile. Zonder dat kan een script met alleen de
// anon key uit de broncode duizenden accounts maken, en met elk account weer
// tien spelers en vijf poules (zie "Misbruik tegengaan" in schema.sql).
//
// Onzichtbaar: Turnstile kijkt in de browser of er een mens zit en geeft een
// token, zonder puzzel. Alleen als hij twijfelt, verschijnt er onderin een
// vakje om aan te vinken.
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
  // De site key van de Turnstile-widget voor predicttherace.com (Cloudflare,
  // Turnstile, je widget). Openbaar, net als de anon key. Leeg = uit.
  const SITE_KEY = '';
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

  window.ptrCaptcha = () => token().catch(() => undefined);
})();
