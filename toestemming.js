// Toestemming voor Google Analytics, op de voorpagina, de privacypagina's en
// in de app. Eén bestand, zodat de keuze en de meet-ID op één plek staan.
//
// Zonder meet-ID (GA_ID leeg) gebeurt er niets: geen vraag, geen knop, en er
// wordt niets van Google geladen. Met een meet-ID komt er één keer een vraag,
// met "ja" en "nee" even groot naast elkaar. Pas na "ja" laadt Google
// Analytics; bij "nee", of zolang je niets kiest, blijft alles van Google weg.
// Wie van gedachten verandert: onderaan elke pagina ("Statistieken en
// cookies") en in de app onder Profiel.
//
// De keuze staat in localStorage onder `ptr:analytics` ("ja" of "nee"). De
// site en de app zijn dezelfde herkomst, dus één keuze geldt voor allebei.
// Zie BEDIENING.md §17.
(() => {
  // De meet-ID uit Google Analytics (Beheer → Gegevensstromen → Predict the
  // Race). Leeg = uit.
  const GA_ID = 'G-2ZVT5NSX3Y';
  const SLEUTEL = 'ptr:analytics';

  const TEKST = {
    nl: { titel: 'Mogen we meetellen?', tekst: 'We willen graag zien hoe Predict the Race gebruikt wordt, met Google Analytics. Dat zet cookies en gebeurt alleen als je ja zegt.', ja: 'Ja, prima', nee: 'Nee', meer: 'Meer weten', privacy: 'privacy/' },
    en: { titel: 'Can we count you in?', tekst: "We'd like to see how Predict the Race is used, with Google Analytics. That sets cookies and only happens if you say yes.", ja: 'Yes, fine', nee: 'No', meer: 'Learn more', privacy: 'en/privacy/' },
    de: { titel: 'Dürfen wir mitzählen?', tekst: 'Wir möchten sehen, wie Predict the Race genutzt wird, mit Google Analytics. Dabei werden Cookies gesetzt, und das passiert nur, wenn du zustimmst.', ja: 'Ja, gern', nee: 'Nein', meer: 'Mehr erfahren', privacy: 'en/privacy/' },
    fr: { titel: 'Pouvons-nous vous compter ?', tekst: "Nous aimerions voir comment Predict the Race est utilisé, avec Google Analytics. Cela dépose des cookies et n'a lieu que si vous acceptez.", ja: "Oui, d'accord", nee: 'Non', meer: 'En savoir plus', privacy: 'en/privacy/' },
    es: { titel: '¿Podemos contarte?', tekst: 'Nos gustaría ver cómo se usa Predict the Race, con Google Analytics. Eso guarda cookies y solo ocurre si dices que sí.', ja: 'Sí, vale', nee: 'No', meer: 'Más información', privacy: 'en/privacy/' },
    it: { titel: 'Possiamo contarti?', tekst: 'Vorremmo vedere come viene usato Predict the Race, con Google Analytics. Questo salva dei cookie e succede solo se dici di sì.', ja: 'Sì, va bene', nee: 'No', meer: 'Scopri di più', privacy: 'en/privacy/' },
    pt: { titel: 'Podemos contar você?', tekst: 'Gostaríamos de ver como o Predict the Race é usado, com o Google Analytics. Isso salva cookies e só acontece se você disser que sim.', ja: 'Sim, tudo bem', nee: 'Não', meer: 'Saiba mais', privacy: 'en/privacy/' },
  };
  // Waar dit bestand staat is de hoofdmap van de site; de privacypagina's staan
  // daaronder, waar deze pagina zelf ook staat (/, /en/, /app/, ...).
  const WORTEL = new URL('./', document.currentScript?.src ?? location.href);

  const lees = () => { try { return localStorage.getItem(SLEUTEL); } catch { return null; } };
  const schrijf = (w) => { try { localStorage.setItem(SLEUTEL, w); } catch { /* dan vraagt hij het volgende keer weer */ } };
  const taal = () => {
    const code = (document.documentElement.lang || 'nl').slice(0, 2).toLowerCase();
    return TEKST[code] ? code : 'en';
  };

  function laad() {
    if (!GA_ID || window.__ptrGaGeladen) return;
    window.__ptrGaGeladen = true;
    window[`ga-disable-${GA_ID}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.append(s);
  }

  // Nee na eerder ja: Google Analytics stopt op deze pagina meteen, en zijn
  // cookies gaan weg (op dit domein en op het hoofddomein erboven).
  function stop() {
    if (!GA_ID) return;
    window[`ga-disable-${GA_ID}`] = true;
    const delen = location.hostname.split('.');
    const domeinen = ['', location.hostname, delen.length > 1 ? '.' + delen.slice(-2).join('.') : ''];
    for (const koekje of document.cookie.split(';')) {
      const naam = koekje.split('=')[0].trim();
      if (!/^_ga/.test(naam)) continue;
      for (const d of domeinen) {
        document.cookie = `${naam}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
      }
    }
  }

  function zet(ja) {
    schrijf(ja ? 'ja' : 'nee');
    if (ja) laad(); else stop();
    document.querySelector('#toestemming')?.remove();
  }

  const STIJL = `
    #toestemming{position:fixed;left:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:200;
      max-width:520px;margin:0 auto;padding:16px 18px;border-radius:14px;
      background:#ffffff;color:#14151a;border:1px solid #dcdad5;box-shadow:0 12px 40px -12px rgba(0,0,0,.35);
      font:15px/1.45 Barlow,-apple-system,"Segoe UI",Roboto,sans-serif}
    #toestemming h2{margin:0 0 6px;font:700 20px/1.1 "Barlow Condensed","Arial Narrow",sans-serif}
    #toestemming p{margin:0 0 12px;color:#61656d}
    #toestemming a{color:inherit}
    #toestemming .knoppen{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #toestemming button{min-height:46px;border-radius:10px;border:1px solid #14151a;background:#14151a;
      color:#fff;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer}
    #toestemming button:focus-visible{outline:2px solid #d93d24;outline-offset:2px}
    @media (prefers-color-scheme:dark){
      #toestemming{background:#15161a;color:#f2f3f5;border-color:#2b2e35}
      #toestemming p{color:#9aa0a8}
      #toestemming button{background:#f2f3f5;border-color:#f2f3f5;color:#0b0b0c}
    }`;

  // De vraag. "Ja" en "Nee" zijn bewust dezelfde knop in dezelfde maat: nee
  // zeggen hoort net zo makkelijk te zijn als ja.
  function vraag() {
    if (!GA_ID || document.querySelector('#toestemming')) return;
    if (!document.querySelector('#toestemming-stijl')) {
      const stijl = document.createElement('style');
      stijl.id = 'toestemming-stijl';
      stijl.textContent = STIJL;
      document.head.append(stijl);
    }
    const t = TEKST[taal()];
    const vak = document.createElement('section');
    vak.id = 'toestemming';
    vak.setAttribute('role', 'dialog');
    vak.setAttribute('aria-labelledby', 'toestemming-kop');
    const kop = document.createElement('h2');
    kop.id = 'toestemming-kop';
    kop.textContent = t.titel;
    const uitleg = document.createElement('p');
    uitleg.append(`${t.tekst} `);
    const meer = document.createElement('a');
    meer.href = new URL(t.privacy, WORTEL).href;
    meer.textContent = t.meer;
    uitleg.append(meer);
    const knoppen = document.createElement('div');
    knoppen.className = 'knoppen';
    for (const [soort, tekst] of [['ja', t.ja], ['nee', t.nee]]) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.dataset.keuze = soort;
      knop.textContent = tekst;
      knop.onclick = () => zet(soort === 'ja');
      knoppen.append(knop);
    }
    vak.append(kop, uitleg, knoppen);
    document.body.append(vak);
  }

  // Knoppen en links met data-toestemming openen de vraag opnieuw. Ze staan er
  // met `hidden` en komen pas tevoorschijn als er ook iets te kiezen valt.
  function knopen() {
    for (const el of document.querySelectorAll('[data-toestemming]')) {
      el.hidden = !GA_ID;
      el.onclick = (ev) => { ev.preventDefault(); document.querySelector('#toestemming')?.remove(); vraag(); };
    }
  }

  window.ptrToestemming = { actief: !!GA_ID, keuze: lees, zet, vraag, knopen };
  if (!GA_ID) return;
  const start = () => {
    knopen();
    const keuze = lees();
    if (keuze === 'ja') laad();
    else if (keuze !== 'nee') vraag();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
