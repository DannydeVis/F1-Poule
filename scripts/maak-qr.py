# De QR-code naar de app (site/beeld/app-qr.svg), op de kaart "Computer" in
# het blok "De app" op de voorpagina. Eén keer gemaakt; alleen opnieuw nodig als
# het domein verandert (BASIS in site/teksten.mjs). test/appblok.test.mjs zakt
# dan, als geheugensteun.
#
#   python3 -m venv /tmp/qr && /tmp/qr/bin/pip install segno
#   /tmp/qr/bin/python scripts/maak-qr.py https://predicttherace.com/app/ site/beeld/app-qr.svg
#
# Daarna nalopen met de camera van een telefoon, of met OpenCV
# (cv2.QRCodeDetector().detectAndDecode). Vaste kleuren op wit: een QR-code
# moet donker op licht staan, ook in het donkere thema.
import sys

import segno

url, uit = sys.argv[1], sys.argv[2]
qr = segno.make(url, error='m', micro=False)
qr.save(uit, kind='svg', scale=1, border=2, xmldecl=False, svgns=True, nl=False,
        dark='#14151a', light='#ffffff', omitsize=True, svgclass=None, lineclass=None)
print('versie', qr.version, 'foutcorrectie', qr.error)
