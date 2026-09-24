// De service worker van Predict the Race.
//
// Let op wat hier NIET staat: er is geen `fetch`-handler. Dat is met opzet en
// het is de reden dat deze app jarenlang geen service worker had. Zodra een
// worker verzoeken onderschept kan hij een oude versie van de app of een oude
// stand serveren terwijl de speler denkt dat hij kijkt naar hoe het nú staat,
// en een verkeerde stand die eruitziet als de goede is erger dan een
// foutmelding. Zie OVERDRACHT.md bij "zet op beginscherm".
//
// Deze worker doet dus één ding: een melding tonen die binnenkomt, en je naar
// de app brengen als je erop tikt. Hij cachet niets en hij onderschept niets.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  // Een pushbericht zonder inhoud bestaat: sommige diensten sturen er een als
  // wekker. Dan valt er niets te melden en tonen we een algemene regel, want
  // een melding die niets zegt is nog altijd beter dan een stille crash --
  // browsers rekenen een genegeerde push aan en kunnen het abonnement
  // intrekken.
  let bericht = {};
  try { bericht = e.data ? e.data.json() : {}; } catch { bericht = {}; }
  const titel = bericht.titel || 'Predict the Race';
  e.waitUntil(self.registration.showNotification(titel, {
    body: bericht.tekst || 'Er staat iets open in je poule.',
    icon: 'pictogrammen/predicttherace-192.png',
    // Android gebruikt voor de badge alleen de vorm; een vol pictogram wordt
    // daar een wit vierkantje. Deze is de P in wit op doorzichtig.
    badge: 'pictogrammen/predicttherace-badge-96.png',
    // Dezelfde tag voor dezelfde sessie: een tweede herinnering vervangt de
    // eerste in plaats van ernaast te komen staan.
    tag: bericht.tag || 'predicttherace',
    data: { url: bericht.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const doel = new URL(e.notification.data?.url || './', self.location.href).href;
  e.waitUntil((async () => {
    // Staat de app al open, dan die naar voren halen in plaats van een tweede
    // venster openen.
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of open) {
      if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(doel);
  })());
});
