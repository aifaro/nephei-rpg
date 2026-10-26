# -*- coding: utf-8 -*-
"""Hoja de personaje de Dungeons & Dragons con las reglas de 2024 (la oficial de Wizards, en inglés:
no hay versión oficial en español) con campos de formulario.

    python generar.py            copia dnd-2024.pdf (la plantilla sin campos) desde la original
    python generar.py prueba     además saca prueba.pdf con datos de ejemplo, para comprobar la geometría

La hoja es vectorial: casi todas las posiciones salen de sus propias rayas y rótulos.
Los nombres de los campos son los de la hoja de 2014 (fichas-dnd) cuando significan lo mismo, para que
el editor del generador calcule igual las dos.

El generador de personajes (herramientas/generador/preparar.py) importa este módulo y llama a
rellenar(doc, 0, None) para sacar la ficha en blanco con campos, y a habilidades().

Necesita PyMuPDF (pip install pymupdf).
"""
import os, sys
import pymupdf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from formulario import Ficha

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGINAL = r'D:\Descargas\DnD_2024_Character-Sheet.pdf'
PLANTILLA = os.path.join(AQUI, 'dnd-2024.pdf')
sys.stdout.reconfigure(encoding='utf-8')

LETRA, METRICA = 'Helv', 'helv'
TINTA = (0.10, 0.15, 0.36)

# ----------------------------------------------------------------- geometría (cara 1)
# Bloques de característica: columna (i = izquierda, d = derecha) y raya inferior de la casilla de puntuación
BLOQUES = {'FUE': ('i', 237.5), 'DES': ('i', 355.3), 'CON': ('i', 501.2), 'INT': ('d', 160.2), 'SAB': ('d', 334.0), 'CAR': ('d', 508.0)}
# Salvaciones y habilidades: columna y raya del valor
FILAS = [
    ('Salvación FUE', 'i', 269.3), ('Atletismo', 'i', 288.9),
    ('Salvación DES', 'i', 387.1), ('Acrobacias', 'i', 406.7), ('Juego de manos', 'i', 420.7), ('Sigilo', 'i', 434.7),
    ('Salvación CON', 'i', 533.0),
    ('Salvación INT', 'd', 192.0), ('Conocimiento arcano', 'd', 211.5), ('Historia', 'd', 225.6), ('Investigación', 'd', 239.6),
    ('Naturaleza', 'd', 253.7), ('Religión', 'd', 267.7),
    ('Salvación SAB', 'd', 365.9), ('Trato con animales', 'd', 385.4), ('Perspicacia', 'd', 399.5), ('Medicina', 'd', 413.5),
    ('Percepción', 'd', 427.5), ('Supervivencia', 'd', 441.6),
    ('Salvación CAR', 'd', 539.8), ('Engaño', 'd', 559.4), ('Intimidación', 'd', 573.4), ('Interpretación', 'd', 587.4), ('Persuasión', 'd', 601.5),
]
CAR_HAB = {'Atletismo': 'FUE', 'Acrobacias': 'DES', 'Juego de manos': 'DES', 'Sigilo': 'DES', 'Conocimiento arcano': 'INT',
           'Historia': 'INT', 'Investigación': 'INT', 'Naturaleza': 'INT', 'Religión': 'INT', 'Trato con animales': 'SAB',
           'Perspicacia': 'SAB', 'Medicina': 'SAB', 'Percepción': 'SAB', 'Supervivencia': 'SAB', 'Engaño': 'CAR',
           'Intimidación': 'CAR', 'Interpretación': 'CAR', 'Persuasión': 'CAR'}
COL = {'i': dict(circulo=21.1, raya=(27.5, 44.6)), 'd': dict(circulo=127.2, raya=(133.7, 150.8))}
ARMAS_RAYAS = [212.6, 232.1, 251.5, 271.0, 290.4, 309.8]
ARMAS_X = {'': (228.2, 332.2), 'bonificador': (336.6, 379.8), 'daño': (384.3, 457.7), 'notas': (462.1, 585.5)}
# Cara 2: filas de conjuros (y del rótulo «C» de cada fila) y espacios de conjuro
CONJUROS_Y = [180.0, 199.5, 218.9, 238.3, 257.8, 277.2, 296.7, 316.1, 335.5, 355.0, 374.4, 393.9, 413.3, 432.7, 452.2,
              471.6, 491.1, 510.5, 530.0, 549.4, 568.8, 588.3, 607.7, 627.1, 646.6, 666.0, 685.5, 704.9, 724.3, 743.8]
ESPACIOS = {1: (182.5, 196, 94.3), 2: (182.5, 196, 108.6), 3: (182.5, 196, 122.9), 4: (271, 283.6, 94.3), 5: (271, 283.6, 108.6),
            6: (271, 283.6, 122.9), 7: (349.6, 362, 94.3), 8: (349.6, 362, 108.6), 9: (349.6, 362, 122.9)}
MONEDAS = [('PC', 428), ('PP', 464), ('PE', 499.6), ('PO', 534.8), ('PPT', 569.9)]
FOTO = (521, 32, 587, 97)   # a la derecha de «Appearance», en la segunda cara


def rombos():
    """Para fichas.json: las casillas que son rombos (marcadas, el rombo se rellena)."""
    return ['Escudo', 'Armaduras ligeras', 'Armaduras medias', 'Armaduras pesadas', 'Escudos'] + [f'{t} {i}' for t in ('Éxito', 'Fallo') for i in (1, 2, 3)]         + [f'Conjuro {i + 1} {l}' for i in range(len(CONJUROS_Y)) for l in 'CRM']


def habilidades():
    """Para fichas.json: cada habilidad, su característica y sus dos campos (valor y competencia)."""
    return [{'habilidad': n, 'car': CAR_HAB[n], 'valor': n, 'competencia': n + ' (competente)'} for n, c, y in FILAS if n in CAR_HAB]


def plantilla():
    """Copia la original recomprimiendo en JPEG sus tres texturas de papel (de un solo canal, ~5 MB
    cada una en Flate): a la mitad de resolución: el PDF pasa de 16 MB a unos 2 sin que se note."""
    doc = pymupdf.open(ORIGINAL)
    for x in range(1, doc.xref_length()):
        if doc.xref_get_key(x, 'Subtype')[1] != '/Image' or len(doc.xref_stream_raw(x)) < 1_000_000:
            continue
        pix = pymupdf.Pixmap(doc, x)
        if pix.n != 1 or pix.alpha:
            continue
        crudo = pymupdf.Pixmap(pymupdf.csGRAY, pix.width, pix.height, pix.samples, False)  # las muestras tal cual: el espacio de color no cambia
        crudo.shrink(1)  # a la mitad: para una textura de fondo sobra
        doc.update_stream(x, crudo.tobytes('jpg', jpg_quality=70), compress=False)
        doc.xref_set_key(x, 'Width', str(crudo.width))
        doc.xref_set_key(x, 'Height', str(crudo.height))
        doc.xref_set_key(x, 'Filter', '/DCTDecode')
        doc.xref_set_key(x, 'DecodeParms', 'null')
    doc.save(PLANTILLA, garbage=4, deflate=True)
    print('  ', os.path.relpath(PLANTILLA, os.path.join(AQUI, '..', '..')), os.path.getsize(PLANTILLA) // 1024, 'KB')


def rellenar(doc, n_pag, p=None, prefijo=''):
    f = Ficha(doc, n_pag, prefijo, letra=LETRA, metrica=METRICA, tinta=TINTA)
    p1, p2 = f.p1, f.p2
    v = (p or {}).get
    t = lambda pag, n, r, tam=9, **kw: f.texto(pag, n, r, v(n, ''), tam=tam, **kw)
    ml = lambda pag, n, r, tam=8: f.texto(pag, n, r, v(n, ''), tam=tam, multilinea=True)
    marca = lambda pag, n, cx, cy, r=3.6: f.casilla(pag, n, (cx - r, cy - r, cx + r, cy + r), marcada=bool(v(n)))
    rombo = lambda pag, n, cx, cy, r=3.6: f.casilla(pag, n, (cx - r, cy - r, cx + r, cy + r), marcada=bool(v(n)), anillo='rombo')

    # Cabecera
    t(p1, 'Nombre', (25, 13, 251, 29.4), 13)
    t(p1, 'Trasfondo', (25, 40, 143, 51), 9, minimo=5)
    t(p1, 'Clase', (149, 40, 247, 51), 9, minimo=5)
    t(p1, 'Especie', (25, 62, 143, 72.5), 9, minimo=5)
    t(p1, 'Subclase', (149, 62, 256, 72.5), 9, minimo=5)
    t(p1, 'Nivel', (264, 28, 292, 45.4), 14, alin=1)
    t(p1, 'Experiencia', (260, 53, 294, 67.6), 8, alin=1)
    t(p1, 'CA', (320, 33, 357, 56), 18, alin=1)
    rombo(p1, 'Escudo', 340.8, 76.2)
    t(p1, 'PG actuales', (380, 36, 426, 70.5), 16, alin=1)
    t(p1, 'PG temporales', (438, 36, 481, 49.3), 10, alin=1)
    t(p1, 'PG máximos', (438, 58, 481, 70.7), 10, alin=1)
    t(p1, 'Dados de golpe gastados', (492, 36, 530, 49.3), 10, alin=1)
    t(p1, 'Dados de golpe', (492, 58, 530, 70.7), 10, alin=1)
    for i, x in enumerate((545.9, 556.5, 568.0)):
        rombo(p1, f'Éxito {i + 1}', x, 43.8)
        rombo(p1, f'Fallo {i + 1}', x, 67.1)

    # Competencia, características, salvaciones y habilidades
    t(p1, 'Competencia', (42, 135, 73, 168), 18, alin=1)
    for k, (c, y) in BLOQUES.items():
        if c == 'i':
            t(p1, k + ' mod', (28, y - 28, 60, y - 2), 18, alin=1)
            t(p1, k, (66, y - 22, 87, y - 4), 11, alin=1)
        else:
            t(p1, k + ' mod', (134, y - 26, 164, y), 18, alin=1)
            t(p1, k, (170, y - 22, 193, y - 4), 11, alin=1)
    for n, c, y in FILAS:
        col = COL[c]
        marca(p1, n + ' (competente)', col['circulo'], y - 3.6, 3.3)
        t(p1, n, (col['raya'][0], y - 9.5, col['raya'][1], y - 0.3), 8, alin=1)

    # Iniciativa, velocidad, tamaño, Percepción pasiva
    for n, (x0, x1) in (('Iniciativa', (230, 295)), ('Velocidad', (321, 393)), ('Tamaño', (418, 484)), ('Percepción pasiva', (509, 584))):
        t(p1, n, (x0, 130, x1, 150.5), 14, alin=1)
    t(p1, 'Inspiración heroica', (53, 587.5, 61.5, 596), 9, alin=1)

    # Armas y trucos de daño
    arriba = 196.5
    for i, y in enumerate(ARMAS_RAYAS):
        for col, (x0, x1) in ARMAS_X.items():
            n = f'Ataque {i + 1}' + (f' {col}' if col else '')
            t(p1, n, (x0, arriba, x1, y - 0.4), 8.5 if col != 'notas' else 7, alin=1 if col == 'bonificador' else 0, minimo=4.5)
        arriba = y + 0.6

    # Rasgos de clase (dos columnas), de especie, dotes
    ml(p1, 'Rasgos de clase', (231, 349, 403, 555))
    ml(p1, 'Rasgos de clase 2', (409, 349, 588, 555))
    ml(p1, 'Rasgos de especie', (231, 590, 388, 758))
    ml(p1, 'Dotes', (415, 590, 588, 758))

    # Competencias con equipo
    for n, x in (('Armaduras ligeras', 63.3), ('Armaduras medias', 97.2), ('Armaduras pesadas', 141.7), ('Escudos', 179.4)):
        rombo(p1, n, x, 648.3, 4)
    ml(p1, 'Armas', (16, 668, 207, 716))
    ml(p1, 'Herramientas', (16, 728, 207, 760))

    # Cara 2: magia
    t(p2, 'Aptitud mágica', (22, 15, 128, 31), 11)
    t(p2, 'Modificador de conjuros', (17, 46, 44, 70), 14, alin=1)
    t(p2, 'CD de conjuros', (17, 76, 44, 97), 14, alin=1)
    t(p2, 'Ataque de conjuros', (17, 102, 44, 122), 14, alin=1)
    for nivel, (x0, x1, y) in ESPACIOS.items():
        t(p2, f'Nivel {nivel} espacios', (x0, y - 9.5, x1, y - 0.3), 9, alin=1)
    for i, y in enumerate(CONJUROS_Y):
        n = f'Conjuro {i + 1}'
        t(p2, n + ' nivel', (18, y + 1, 38, y + 11), 8.5, alin=1)
        t(p2, n, (42, y + 1, 150, y + 11), 8.5, minimo=5)
        t(p2, n + ' tiempo', (154, y + 1, 183, y + 11), 7, minimo=4.5)
        t(p2, n + ' alcance', (188, y + 1, 230, y + 11), 7, minimo=4.5)
        for letra, x in (('C', 243.6), ('R', 265.3), ('M', 287.0)):
            rombo(p2, f'{n} {letra}', x, y + 4.7, 3.4)
        t(p2, n + ' notas', (305, y + 1, 396, y + 11), 7, minimo=4.5)

    # Cara 2: personaje y equipo
    ml(p2, 'Aspecto', (412, 32, 518, 97))
    ml(p2, 'Historia del personaje', (412, 138, 588, 274))
    t(p2, 'Alineamiento', (448, 278, 588, 290), 9)
    ml(p2, 'Idiomas', (412, 342, 588, 372))
    ml(p2, 'Equipo', (412, 408, 588, 584))
    for i, y in enumerate((600.3, 621.7, 643.0)):
        t(p2, f'Sintonía {i + 1}', (432, y - 1.5, 588, y + 9), 8.5)
    for n, cx in MONEDAS:
        t(p2, n, (cx - 15, 704, cx + 15, 722), 11, alin=1)
    f.cerrar()


def prueba():
    p = {'Nombre': 'Lia Pies Ligeros', 'Trasfondo': 'Criminal', 'Clase': 'Pícara', 'Especie': 'Mediana', 'Subclase': '—', 'Nivel': '1',
         'Experiencia': '0', 'CA': '14', 'Escudo': True, 'PG actuales': '9', 'PG máximos': '9', 'Dados de golpe': '1d8', 'Éxito 1': True, 'Fallo 3': True,
         'Competencia': '+2', 'DES': '17', 'DES mod': '+3', 'INT': '12', 'INT mod': '+1', 'CAR': '10', 'CAR mod': '+0',
         'Salvación DES (competente)': True, 'Salvación DES': '+5', 'Sigilo (competente)': True, 'Sigilo': '+7', 'Persuasión': '+0', 'Religión': '+1',
         'Salvación CON': '+1', 'Iniciativa': '+3', 'Velocidad': '9 m', 'Tamaño': 'Pequeño', 'Percepción pasiva': '13', 'Inspiración heroica': '✓',
         'Ataque 1': 'Espada corta', 'Ataque 1 bonificador': '+5', 'Ataque 1 daño': '1d6+3 perforante', 'Ataque 1 notas': 'Maestría: Molestar. Sutil, ligera',
         'Ataque 6': 'Daga', 'Rasgos de clase': 'Ataque furtivo: +1d6.', 'Rasgos de clase 2': 'Jerga de ladrones.', 'Rasgos de especie': 'Afortunada.',
         'Dotes': 'Alerta.', 'Armaduras ligeras': True, 'Armas': 'Sencillas y marciales sutiles o ligeras.', 'Herramientas': 'Herramientas de ladrón.',
         'Aptitud mágica': 'Inteligencia', 'Modificador de conjuros': '+1', 'CD de conjuros': '11', 'Ataque de conjuros': '+3', 'Nivel 1 espacios': '2', 'Nivel 9 espacios': '1',
         'Conjuro 1 nivel': '0', 'Conjuro 1': 'Mano de mago', 'Conjuro 1 tiempo': '1 acción', 'Conjuro 1 alcance': '9 m', 'Conjuro 1 C': True,
         'Conjuro 30': 'Último', 'Conjuro 30 M': True, 'Aspecto': 'Pelo rizado.', 'Historia del personaje': 'Creció en los muelles.', 'Alineamiento': 'Caótica buena',
         'Idiomas': 'Común, mediano.', 'Equipo': 'Armadura de cuero\n2 dagas', 'Sintonía 1': 'Anillo', 'PO': '16', 'PPT': '1'}
    doc = pymupdf.open(PLANTILLA)
    rellenar(doc, 0, p)
    doc.save(os.path.join(AQUI, 'prueba.pdf'))
    for n in range(2):
        doc[n].get_pixmap(dpi=110).save(os.path.join(AQUI, f'prueba-{n + 1}.png'))
    print('   prueba.pdf, prueba-1.png, prueba-2.png')


if __name__ == '__main__':
    if os.path.exists(ORIGINAL):
        plantilla()
    if 'prueba' in sys.argv[1:]:
        prueba()
