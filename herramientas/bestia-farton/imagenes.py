# -*- coding: utf-8 -*-
"""Saca del PDF de La Bestia de Farton (D:\\Descargas\\La_Bestia_de_Farton.pdf) las imágenes del cuaderno:

    mapa.png              el mapa de Iñaki Raya, tal cual
    mapa-jugadores.png    el mismo mapa sin lo que no saben (las arañas, el claro de la piedra, los vados)
    subterraneo.png       el plano de los subterráneos, con las salas numeradas
    portada.jpg           la ilustración de portada de Endyamar
    daga.png, sirena.png  los grabados de los dos tesoros (dominio público)

Solo hay que ejecutarlo una vez. Mapas y portada son CC BY-NC-SA 4.0: lo que se les cambia aquí se dice en los créditos.
Necesita PyMuPDF y Pillow.
"""
import io, os
import pymupdf
from PIL import Image, ImageDraw, ImageFont, ImageOps

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'vieja-escuela', 'la-bestia-de-farton', 'img'))
PDF = r'D:\Descargas\La_Bestia_de_Farton.pdf'
TINTA = (27, 26, 24)
os.makedirs(SALIDA, exist_ok=True)
doc = pymupdf.open(PDF)


def imagen(xref):
    return Image.open(io.BytesIO(doc.extract_image(xref)['image']))


def tinta(lineas, ruta, ancho=None):
    """De trazo blanco sobre negro a tinta sobre transparente: se coloca sobre cualquier papel."""
    m = lineas.convert('L')
    if ancho and m.width > ancho:
        m = m.resize((ancho, round(m.height * ancho / m.width)), Image.LANCZOS)
    res = Image.new('RGBA', m.size, TINTA + (0,))
    res.putalpha(m)
    res.save(os.path.join(SALIDA, ruta), optimize=True)
    print('  ', ruta, res.size, os.path.getsize(os.path.join(SALIDA, ruta)) // 1024, 'KB')


# ---------------------------------------------------------------- mapa
mapa = imagen(32).convert('L')
tinta(mapa, 'mapa.png', 1400)

# Para los jugadores: se borra lo que Podrik no ha dibujado (posiciones medidas en una vista de 900 px de ancho)
K = mapa.width / 900
j = mapa.copy()
d = ImageDraw.Draw(j)
for x0, y0, x1, y1 in [(205, 455, 392, 690),    # telarañas y arañas
                       (596, 596, 748, 786),    # el claro y el menhir
                       (356, 343, 402, 366),    # «vado» norte
                       (440, 612, 474, 630)]:   # «vado» sur
    d.rectangle([x0 * K, y0 * K, x1 * K, y1 * K], fill=0)
tinta(j, 'mapa-jugadores.png', 1400)

# ---------------------------------------------------------------- subterráneos, con las salas numeradas
sub = imagen(42).convert('L')
K = sub.width / 800
d = ImageDraw.Draw(sub)
letra = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', int(23 * K))
for n, x, y in [(1, 540, 280), (2, 265, 300), (3, 640, 225), (4, 375, 468), (5, 500, 425), (6, 285, 595), (7, 555, 715), (8, 370, 790), (9, 372, 965)]:
    r = 21 * K
    d.ellipse([x * K - r, y * K - r, x * K + r, y * K + r], fill=255)
    d.ellipse([x * K - r + 5, y * K - r + 5, x * K + r - 5, y * K + r - 5], fill=0)
    d.text((x * K, y * K), str(n), font=letra, fill=255, anchor='mm')
tinta(sub, 'subterraneo.png', 1100)

# ---------------------------------------------------------------- portada y grabados
por = imagen(847).convert('RGB')
por.thumbnail((1100, 1600), Image.LANCZOS)
por.save(os.path.join(SALIDA, 'portada.jpg'), quality=80, optimize=True)
print('   portada.jpg', por.size, os.path.getsize(os.path.join(SALIDA, 'portada.jpg')) // 1024, 'KB')

for xref, smask, nombre in ((46, 45, 'sirena.png'), (50, 49, 'daga.png')):
    alfa = imagen(smask).convert('L')
    base = imagen(xref).convert('RGB')
    base.putalpha(alfa)
    base.save(os.path.join(SALIDA, nombre), optimize=True)
    print('  ', nombre, base.size, os.path.getsize(os.path.join(SALIDA, nombre)) // 1024, 'KB')
