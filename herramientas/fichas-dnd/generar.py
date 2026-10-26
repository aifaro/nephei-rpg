# -*- coding: utf-8 -*-
"""Hoja de personaje de Dungeons & Dragons 5.ª edición (la de 2014, en español) con campos de formulario.

    python generar.py            copia dnd-5e.pdf (la plantilla sin campos) desde la original
    python generar.py prueba     además saca prueba.pdf con datos de ejemplo, para comprobar la geometría

La ficha original (DyD5eficha.pdf) son tres hojas de imagen escaneada: personaje, detalles y conjuros.
Como no tiene vectores, las posiciones se han medido sobre la imagen con una rejilla en puntos PDF.

El generador de personajes (herramientas/generador/preparar.py) importa este módulo y llama a
rellenar(doc, 0, None) para sacar la ficha en blanco con campos.

Necesita PyMuPDF (pip install pymupdf).
"""
import os, shutil, sys
import pymupdf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from formulario import Ficha

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGINAL = r'D:\Descargas\DyD5eficha.pdf'
PLANTILLA = os.path.join(AQUI, 'dnd-5e.pdf')
sys.stdout.reconfigure(encoding='utf-8')

LETRA, METRICA = 'Helv', 'helv'
TINTA = (0.10, 0.15, 0.36)

# ----------------------------------------------------------------- geometría
# Características: y del rótulo impreso (FUERZA, DESTREZA…); debajo, el modificador grande y el óvalo.
CARACTERISTICAS = [('FUE', 155.4), ('DES', 227.1), ('CON', 298.6), ('INT', 370.4), ('SAB', 441.7), ('CAR', 513.3)]
# Tiradas de salvación y habilidades: y del rótulo impreso, nombre del campo y característica.
SALVACIONES = [('FUE', 217.9), ('DES', 231.5), ('CON', 244.9), ('INT', 258.7), ('SAB', 272.1), ('CAR', 287.1)]
HABILIDADES = [
    ('Acrobacias', 'DES', 333.1), ('Atletismo', 'FUE', 347.0), ('Conocimiento arcano', 'INT', 360.3),
    ('Engaño', 'CAR', 373.8), ('Historia', 'INT', 387.3), ('Interpretación', 'CAR', 400.8),
    ('Intimidación', 'CAR', 414.4), ('Investigación', 'INT', 427.7), ('Juego de manos', 'DES', 441.3),
    ('Medicina', 'SAB', 454.9), ('Naturaleza', 'INT', 468.2), ('Percepción', 'SAB', 481.9),
    ('Perspicacia', 'SAB', 495.2), ('Persuasión', 'CAR', 508.7), ('Religión', 'INT', 522.4),
    ('Sigilo', 'DES', 535.7), ('Supervivencia', 'SAB', 549.3), ('Trato con animales', 'SAB', 562.9),
]
ATAQUES_Y = [(401.0, 416.7), (421.7, 437.3), (442.3, 457.7)]
MONEDAS = [('PC', 615.9), ('PP', 642.3), ('PE', 668.6), ('PO', 694.5), ('PPT', 720.5)]
# Hoja de conjuros: desplazamiento de cada columna y, por nivel, columna, borde superior de su
# cabecera y la raya de cada línea (medidas sobre la imagen).
COL_X = [0, 189.3, 376.6]
def _rayas(y0, n):
    return [round(y0 + 14.0 * i, 1) for i in range(n)]
NIVELES = {
    0: (0, 150.9, _rayas(192.1, 8)), 1: (0, 318.6, _rayas(363.2, 13)), 2: (0, 547.1, _rayas(589.9, 13)),
    3: (1, 150.9, _rayas(193.4, 13)), 4: (1, 376.6, _rayas(419.2, 13)), 5: (1, 603.1, _rayas(645.8, 9)),
    6: (2, 150.9, _rayas(193.4, 9)), 7: (2, 320.6, _rayas(363.2, 9)), 8: (2, 490.6, _rayas(533.0, 7)),
    9: (2, 631.1, _rayas(673.8, 7)),
}
FOTO = (36, 134, 209, 352)   # «Aspecto del personaje», en la segunda hoja


def habilidades():
    """Para fichas.json: cada habilidad, su característica y sus dos campos (valor y competencia)."""
    return [{'habilidad': n, 'car': k, 'valor': n, 'competencia': n + ' (competente)'} for n, k, y in HABILIDADES]


def plantilla():
    shutil.copyfile(ORIGINAL, PLANTILLA)
    print('  ', os.path.relpath(PLANTILLA, os.path.join(AQUI, '..', '..')))


def rellenar(doc, n_pag, p=None, prefijo=''):
    """Pone los campos en las tres hojas a partir de n_pag; p, si se da, es {campo: valor} para probar."""
    f = Ficha(doc, n_pag, prefijo, letra=LETRA, metrica=METRICA, tinta=TINTA)
    p1, p2, p3 = doc[n_pag], doc[n_pag + 1], doc[n_pag + 2]
    v = (p or {}).get
    t = lambda pag, n, r, tam=9, **kw: f.texto(pag, n, r, v(n, ''), tam=tam, **kw)
    ml = lambda pag, n, r, tam=8: f.texto(pag, n, r, v(n, ''), tam=tam, multilinea=True)
    circulo = lambda pag, n, cx, cy, r=3.3: f.casilla(pag, n, (cx - r, cy - r, cx + r, cy + r), marcada=bool(v(n)))

    # --- Hoja 1: cabecera
    t(p1, 'Nombre', (55, 72, 248, 93), 14)
    for n, x0, x1, y in (('Clase y nivel', 276, 383, 60), ('Trasfondo', 389, 480, 60), ('Jugador', 486, 576, 60),
                         ('Raza', 276, 383, 86.5), ('Alineamiento', 389, 480, 86.5), ('Experiencia', 486, 576, 86.5)):
        t(p1, n, (x0, y, x1, y + 12), 9, minimo=5)

    # Características, inspiración y competencia
    for k, y in CARACTERISTICAS:
        t(p1, k + ' mod', (42, y + 11, 84, y + 35), 18, alin=1)
        t(p1, k, (50, y + 38.5, 76, y + 49), 10, alin=1)
    t(p1, 'Inspiración', (103, 141, 122, 156), 11, alin=1)
    t(p1, 'Competencia', (102, 179, 125, 195), 12, alin=1)

    # Salvaciones y habilidades: el círculo marca la competencia, la raya lleva el bonificador
    for k, y in SALVACIONES:
        circulo(p1, f'Salvación {k} (competente)', 110.7, y + 2.6)
        t(p1, f'Salvación {k}', (118.5, y - 0.5, 134.5, y + 8.5), 8, alin=1)
    for n, k, y in HABILIDADES:
        circulo(p1, n + ' (competente)', 110.7, y + 2.6)
        t(p1, n, (118.5, y - 0.5, 134.5, y + 8.5), 8, alin=1)
    t(p1, 'Percepción pasiva', (37, 603.5, 60, 617.5), 11, alin=1)

    # Combate
    t(p1, 'CA', (240, 166, 268, 187), 16, alin=1)
    t(p1, 'Iniciativa', (290, 166, 330, 189), 16, alin=1)
    t(p1, 'Velocidad', (349, 166, 389, 189), 13, alin=1)
    t(p1, 'PG máximos', (313, 208.5, 388, 218.5), 9)
    t(p1, 'PG actuales', (238, 222, 389, 251), 18, alin=1)
    t(p1, 'PG temporales', (238, 272, 389, 304), 18, alin=1)
    t(p1, 'Dados de golpe total', (252, 329, 302, 338.5), 8)
    t(p1, 'Dados de golpe', (237, 341, 305, 362), 13, alin=1)
    for i, x in enumerate((357.7, 370.3, 383.3)):
        circulo(p1, f'Éxito {i + 1}', x, 336.0, 3.8)
        circulo(p1, f'Fallo {i + 1}', x, 351.0, 3.8)
    for i, (y0, y1) in enumerate(ATAQUES_Y):
        t(p1, f'Ataque {i + 1}', (231, y0 + 2, 293, y1 - 2), 8.5, minimo=5)
        t(p1, f'Ataque {i + 1} bonificador', (299, y0 + 2, 329, y1 - 2), 9, alin=1)
        t(p1, f'Ataque {i + 1} daño', (335, y0 + 2, 395, y1 - 2), 8, minimo=5)
    ml(p1, 'Ataques y conjuros', (229, 461, 397, 574))

    # Dinero, equipo, competencias
    for n, cy in MONEDAS:
        t(p1, n, (234, cy - 6.5, 267, cy + 6.5), 10, alin=1)
    ml(p1, 'Equipo', (276, 606, 399, 762))
    ml(p1, 'Otras competencias', (38, 634, 209, 763))

    # Personalidad y rasgos
    ml(p1, 'Rasgos de personalidad', (423, 148, 580, 197))
    ml(p1, 'Ideales', (423, 216, 580, 253))
    ml(p1, 'Vínculos', (423, 271, 580, 309))
    ml(p1, 'Defectos', (423, 327, 580, 364))
    ml(p1, 'Rasgos y atributos', (416, 394, 586, 765))

    # --- Hoja 2: detalles
    t(p2, 'Nombre (2)', (55, 69, 248, 90), 14)
    for n, x0, x1, y in (('Edad', 270, 378, 58), ('Altura', 384, 474, 58), ('Peso', 480, 576, 58),
                         ('Ojos', 270, 378, 84.5), ('Piel', 384, 474, 84.5), ('Pelo', 480, 576, 84.5)):
        t(p2, n, (x0, y, x1, y + 11.5), 9, minimo=5)
    ml(p2, 'Aliados', (226, 134, 412, 352))
    t(p2, 'Símbolo (nombre)', (427, 156, 568, 172), 9)
    ml(p2, 'Símbolo', (427, 176, 568, 292))
    ml(p2, 'Aliados 2', (420, 309, 586, 352))
    ml(p2, 'Historia del personaje', (36, 386, 208, 758))
    ml(p2, 'Rasgos adicionales', (226, 376, 586, 583))
    ml(p2, 'Tesoro', (226, 606, 586, 758))

    # --- Hoja 3: conjuros
    t(p3, 'Clase lanzadora', (55, 74, 248, 95), 13)
    t(p3, 'Aptitud mágica', (290, 64, 352, 86), 12, alin=1)
    t(p3, 'CD de conjuros', (392, 64, 455, 86), 14, alin=1)
    t(p3, 'Ataque de conjuros', (495, 64, 558, 86), 14, alin=1)
    for nivel, (c, cab, rayas) in NIVELES.items():
        dx = COL_X[c]
        if nivel:
            t(p3, f'Nivel {nivel} espacios', (57 + dx, cab + 5, 95 + dx, cab + 21), 11, alin=1)
            t(p3, f'Nivel {nivel} gastados', (110 + dx, cab + 5, 195 + dx, cab + 21), 11, alin=1)
        for i, y in enumerate(rayas):
            if nivel == 0:
                t(p3, f'Truco {i + 1}', (38, y - 10, 207, y - 0.5), 8.5, minimo=5)
            else:
                f.casilla(p3, f'Conjuro {nivel}-{i + 1} (preparado)', (37.4 + dx, y - 6.5, 43.8 + dx, y - 0.1),
                          marcada=bool(v(f'Conjuro {nivel}-{i + 1} (preparado)')))
                t(p3, f'Conjuro {nivel}-{i + 1}', (46 + dx, y - 10, 207 + dx, y - 0.5), 8.5, minimo=5)
    f.cerrar()


def prueba():
    p = {'Nombre': 'Lia Pies Ligeros', 'Clase y nivel': 'Pícara 1', 'Trasfondo': 'Criminal', 'Jugador': 'Ana',
         'Raza': 'Mediana piesligeros', 'Alineamiento': 'Caótica buena', 'Experiencia': '0',
         'DES': '17', 'DES mod': '+3', 'FUE': '8', 'FUE mod': '-1', 'Competencia': '+2', 'Inspiración': '✓',
         'Salvación DES (competente)': True, 'Salvación DES': '+5', 'Sigilo (competente)': True, 'Sigilo': '+7',
         'Trato con animales': '+0', 'Percepción pasiva': '13', 'CA': '14', 'Iniciativa': '+3', 'Velocidad': '7,5 m',
         'PG máximos': '9', 'PG actuales': '9', 'Dados de golpe total': '1d8', 'Dados de golpe': '1d8', 'Éxito 1': True,
         'Ataque 1': 'Espada corta', 'Ataque 1 bonificador': '+5', 'Ataque 1 daño': '1d6+3 perforante',
         'Ataques y conjuros': 'Ataque furtivo: +1d6 una vez por turno.', 'PO': '15', 'PC': '3',
         'Equipo': 'Armadura de cuero\nHerramientas de ladrón\nPalanca\nRopa oscura con capucha', 'Otras competencias': 'Armaduras ligeras.\nIdiomas: común, mediano, jerga de ladrones.',
         'Rasgos de personalidad': 'Siempre tengo un plan para cuando las cosas salen mal.', 'Ideales': 'Libertad.', 'Vínculos': 'Mi hermano pequeño.',
         'Defectos': 'No resisto una bolsa ajena.', 'Rasgos y atributos': 'Afortunada. Valiente. Agilidad mediana. Sigilo natural.\nPericia: Sigilo, herramientas de ladrón.',
         'Nombre (2)': 'Lia Pies Ligeros', 'Edad': '23', 'Altura': '0,90 m', 'Ojos': 'Verdes', 'Historia del personaje': 'Creció en los muelles.',
         'Clase lanzadora': 'Maga', 'Aptitud mágica': 'INT', 'CD de conjuros': '13', 'Ataque de conjuros': '+5',
         'Truco 1': 'Mano de mago', 'Truco 8': 'Luz', 'Nivel 1 espacios': '2', 'Conjuro 1-1': 'Escudo', 'Conjuro 1-1 (preparado)': True,
         'Conjuro 1-13': 'Dormir', 'Conjuro 3-1': 'Bola de fuego', 'Conjuro 5-9': 'Cono de frío', 'Conjuro 9-7': 'Deseo', 'Nivel 9 espacios': '1',
         'Conjuro 8-7': 'Laberinto', 'Conjuro 6-1': 'Desintegrar', 'Conjuro 7-1': 'Teletransporte', 'Nivel 4 gastados': '1'}
    doc = pymupdf.open(PLANTILLA)
    rellenar(doc, 0, p)
    doc.save(os.path.join(AQUI, 'prueba.pdf'))
    for n in range(3):
        doc[n].get_pixmap(dpi=110).save(os.path.join(AQUI, f'prueba-{n + 1}.png'))
    print('   prueba.pdf, prueba-1.png … prueba-3.png')


if __name__ == '__main__':
    if os.path.exists(ORIGINAL):
        plantilla()
    if 'prueba' in sys.argv[1:]:
        prueba()
