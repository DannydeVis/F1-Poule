# Maakt de pictogrammen voor "zet op beginscherm":
#
#     python3 scripts/maak-pictogrammen.py pictogrammen
#
# Waarom met de hand en niet met een beeldbibliotheek: die is er niet, en er
# hoeft er ook geen te komen. Een PNG is een handvol zlib-gecomprimeerde
# scanlijnen met een crc erachter, en het icoon bestaat uit rechthoeken. Dat
# past in dertig regels stdlib en levert een bestand van zeshonderd bytes.
#
# Het motief is het startgrid uit het ontwerp van de app: twee kolommen die om
# en om verspringen, in de kleuren van de app zelf. Alleen rechte hoeken, dus
# overal scherp en geen anti-aliasing nodig — precies wat je wilt bij een
# tegel die op een telefoon soms 48 pixels groot is.

import zlib, struct, sys

def png(pad, breedte, hoogte, tekenen):
    """Minimale PNG-schrijver. Genoeg voor een icoon van rechthoeken."""
    rijen = bytearray()
    for y in range(hoogte):
        rijen.append(0)                      # filter 0: geen
        for x in range(breedte):
            r, g, b = tekenen(x, y)
            rijen += bytes((r, g, b))
    def blok(soort, data):
        return (struct.pack('>I', len(data)) + soort + data
                + struct.pack('>I', zlib.crc32(soort + data) & 0xffffffff))
    uit = b'\x89PNG\r\n\x1a\n'
    uit += blok(b'IHDR', struct.pack('>IIBBBBB', breedte, hoogte, 8, 2, 0, 0, 0))
    uit += blok(b'IDAT', zlib.compress(bytes(rijen), 9))
    uit += blok(b'IEND', b'')
    open(pad, 'wb').write(uit)
    return len(uit)

BG     = (0x0b, 0x0b, 0x0c)
ACCENT = (0xee, 0x4d, 0x33)
INK    = (0xf2, 0xf3, 0xf5)

def startgrid(N):
    """Het startgrid uit het ontwerp: twee kolommen, om en om verspringend.
    Alleen rechte hoeken, dus geen anti-aliasing nodig en overal scherp."""
    # De veilige zone van een maskable icoon is de binnenste 80%; alles wat
    # telt blijft daarbinnen.
    marge = N * 0.17
    breed = N - 2 * marge
    kolom = breed * 0.40
    tussen = breed - 2 * kolom
    hoog = breed * 0.185
    gat = (breed - 4 * hoog) / 3          # vier blokken per kolom
    verspring = (hoog + gat) / 2          # rechterkolom staat een halve stap lager
    def kleur(x, y):
        for i in range(4):
            top = marge + i * (hoog + gat)
            if marge <= x < marge + kolom and top <= y < top + hoog:
                return ACCENT if i % 2 == 0 else INK
        links2 = marge + kolom + tussen
        for i in range(4):
            top = marge + verspring + i * (hoog + gat)
            if links2 <= x < links2 + kolom and top <= y < top + hoog:
                return INK if i % 2 == 0 else ACCENT
        return BG
    return kleur

for N in (192, 512):
    n = png(f"{sys.argv[1]}/poule-{N}.png", N, N, startgrid(N))
    print(f"poule-{N}.png  {n} bytes")
