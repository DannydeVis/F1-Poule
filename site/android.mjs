// De Android-app in de Play Store (android/, BEDIENING §21).
//
// pakket: de naam van de app in de Play Store. Ligt vast zodra de eerste
// versie erin staat; dezelfde als packageId in android/twa-manifest.json.
//
// vingerafdrukken: de SHA-256 van de certificaten waarmee de app ondertekend
// is. scripts/maak-site.mjs zet ze in .well-known/assetlinks.json, en alleen
// als de sleutel van de app daarin staat opent hij zonder adresbalk. Er horen
// er twee in:
//   - die van de uploadsleutel: staat in de samenvatting van elke run van de
//     workflow "Android-app" (scripts/android-sleutel.mjs);
//   - die van Google Play zelf: Google ondertekent de app opnieuw voordat hij
//     in de winkel komt. Te vinden in de Play Console onder "Testen en
//     releasen" > "App-integriteit" > "App-ondertekening".
// Openbaar, geen geheim.
//
// winkel: de link naar de app in de Play Store zodra hij er voor iedereen in
// staat. null: nog niet.
export const ANDROID = {
  pakket: 'com.predicttherace.app',
  vingerafdrukken: [
    // De uploadsleutel, gemaakt door de eerste run op main (24 oktober).
    '09:65:9E:75:3B:A3:55:7C:C7:5A:94:9E:C5:27:04:EC:E6:96:62:B9:95:B1:6B:63:D5:AC:0A:8A:D4:3B:10:EC',
  ],
  winkel: null,
};
