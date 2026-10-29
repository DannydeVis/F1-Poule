# De lettertypen voor de stand als PDF (lettertypen/pdf/), zodat die in de
# letters van de site staat: Barlow Condensed voor de koppen en de namen, Space
# Mono voor de labels en de getallen. Eén keer gemaakt; alleen opnieuw nodig als
# er een lettertype bij komt.
#
#   python3 -m venv /tmp/letters && /tmp/letters/bin/pip install fonttools
#   /tmp/letters/bin/python scripts/maak-pdf-letters.py
#
# Waarom niet de .woff2 uit lettertypen/: een PDF kan alleen TrueType of
# OpenType bevatten, en die bestanden zijn in tweeën geknipt (latin en
# latin-ext), met Š, Ž en Ÿ in het andere stuk. Dus de originelen van Google
# Fonts, teruggebracht tot de tekens van WinAnsi: meer kan de PDF toch niet
# tonen (zie pdfTekst() in app/index.html). Zonder hints en opmaakregels, want
# een PDF-lezer tekent op elke maat en zet geen ligaturen. De licentie (SIL Open
# Font License) staat ernaast en staat inbedden in een document toe.

import io
import os
import sys
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

BRON = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
LETTERS = {
    'barlow-condensed-700.ttf': 'barlowcondensed/BarlowCondensed-Bold.ttf',
    'barlow-condensed-600.ttf': 'barlowcondensed/BarlowCondensed-SemiBold.ttf',
    'space-mono-400.ttf': 'spacemono/SpaceMono-Regular.ttf',
    'space-mono-700.ttf': 'spacemono/SpaceMono-Bold.ttf',
}
LICENTIES = {
    'OFL-barlow-condensed.txt': 'barlowcondensed/OFL.txt',
    'OFL-space-mono.txt': 'spacemono/OFL.txt',
}
# WinAnsiEncoding: 32 tot en met 126, 160 tot en met 255, en daartussen deze.
EXTRA = [0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030,
         0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
         0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178]
TEKENS = list(range(32, 127)) + list(range(160, 256)) + EXTRA


def haal(pad):
    with urllib.request.urlopen(BRON + pad) as antwoord:
        return antwoord.read()


def main(map_uit):
    os.makedirs(map_uit, exist_ok=True)
    opties = subset.Options()
    opties.hinting = False
    opties.layout_features = []
    opties.glyph_names = False
    opties.notdef_outline = True
    opties.name_IDs = ['*']
    opties.name_languages = ['*']
    opties.drop_tables += ['GDEF', 'GPOS', 'GSUB', 'gasp']
    for naam, pad in LETTERS.items():
        letter = TTFont(io.BytesIO(haal(pad)))
        snijder = subset.Subsetter(opties)
        snijder.populate(unicodes=TEKENS)
        snijder.subset(letter)
        missend = [hex(t) for t in TEKENS if t not in letter.getBestCmap()]
        letter.save(os.path.join(map_uit, naam))
        print(f'{naam}: {os.path.getsize(os.path.join(map_uit, naam))} bytes, '
              f'{len(letter.getGlyphOrder())} tekens, ontbreekt: {missend or "niets"}')
    for naam, pad in LICENTIES.items():
        with open(os.path.join(map_uit, naam), 'wb') as f:
            f.write(haal(pad))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'lettertypen', 'pdf'))
