# -*- coding: utf-8 -*-
"""Ficha de agente de Delta Green (Devir, en español) con campos de formulario.

    python generar.py            rehace delta-green.pdf (la plantilla sin campos) desde la original
    python generar.py prueba     además saca prueba.pdf, con un agente de ejemplo, para comprobar la geometría

La original (Delta_Green_Hoja_de_personaje.pdf, tres hojas) trae delante una cara apaisada que sobra:
las dos hojas siguientes ya tienen todo. plantilla() se queda con esas dos y dibuja una casilla de mejora
en la segunda línea de las habilidades con especialidad (Arte, Ciencia, Ciencia militar, Oficio y
Pilotaje), que en la ficha impresa solo tienen la de la primera.

El generador de personajes (herramientas/generador/preparar.py) importa este módulo y llama a
rellenar(doc, 0, None) para sacar la ficha en blanco con campos, y a habilidades() para saber qué campo
es cada habilidad.

Necesita PyMuPDF (pip install pymupdf).
"""
import os, sys
import pymupdf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from formulario import Ficha

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGINAL = r'D:\Descargas\Delta_Green_Hoja_de_personaje.pdf'
PLANTILLA = os.path.join(AQUI, 'delta-green.pdf')
sys.stdout.reconfigure(encoding='utf-8')

LETRA, METRICA = 'Cour', 'cour'      # máquina de escribir, como un formulario federal
TINTA = (0.08, 0.10, 0.24)          # cinta azul casi negra
NEGRO = (0.137, 0.122, 0.125)       # el negro de la ficha

# ----------------------------------------------------------------- geometría (cara 1)
FILA0, PASO = 416.8, 18.0           # primera fila de habilidades y alto de cada fila
COLUMNAS = [  # x de la casilla de mejora, del nombre impreso, fin de la celda del nombre y celda del valor
    dict(caja=98.0, nombre=114.5, fin=218.8, valor=(218.8, 253.4)),
    dict(caja=258.9, nombre=275.4, fin=379.7, valor=(379.7, 414.3)),
    dict(caja=419.8, nombre=436.3, fin=540.7, valor=(540.7, 575.8)),
]
# Cada columna, fila a fila: (habilidad, base, filas que ocupa). Una habilidad con dos filas tiene
# especialidades: se escribe una en cada línea. 'Antinatural' no tiene casilla de mejora; '' es el
# rótulo «Idiomas extranjeros y otras habilidades» y None, una línea libre.
HABILIDADES = [
    [('Alerta', 20, 1), ('Antinatural', 0, 1), ('Antropología', 0, 1), ('Armas cuerpo a cuerpo', 30, 1),
     ('Armas de fuego', 20, 1), ('Armas pesadas', 0, 1), ('Arqueología', 0, 1), ('Arte', 0, 2),
     ('Artillería', 0, 1), ('Atletismo', 30, 1), ('Burocracia', 10, 1), ('Búsqueda', 20, 1),
     ('Ciencia', 0, 2), ('Ciencia forense', 0, 1), ('Ciencia militar', 0, 2)],
    [('Cirugía', 0, 1), ('Combate sin armas', 40, 1), ('Conducción', 20, 1), ('Contabilidad', 10, 1),
     ('Criminología', 10, 1), ('Demoliciones', 0, 1), ('Derecho', 0, 1), ('Disfraz', 10, 1),
     ('Esquiva', 30, 1), ('Farmacia', 0, 1), ('Historia', 10, 1), ('HUMINT', 10, 1),
     ('Informática', 0, 1), ('Maquinaria pesada', 10, 1), ('Medicina', 0, 1), ('Montar', 10, 1),
     ('Natación', 20, 1), ('Ocultismo', 10, 1)],
    [('Oficio', 0, 2), ('Orientación', 10, 1), ('Persuasión', 20, 1), ('Pilotaje', 0, 2),
     ('Primeros auxilios', 10, 1), ('Psicoterapia', 10, 1), ('Sigilo', 10, 1), ('SIGINT', 0, 1),
     ('Supervivencia', 10, 1), ('', '', 1)] + [(None, 0, 1)] * 6,
]
CARACTERISTICAS = ['FUE', 'CON', 'DES', 'INT', 'POD', 'CAR']
DERIVADOS = ['PS', 'PV', 'COR', 'PR']
LETRAS_ARMAS = 'abcdefg'
ARMAS_X = {'': (73, 162), 'hab': (165, 194), 'alcance': (197, 262), 'daño': (266, 322),
           'perforante': (326, 380), 'letalidad': (383, 431), 'radio': (434, 491), 'munición': (494, 538)}
FORMACION_Y = [564.6, 581.5, 598.3, 615.2, 632.1, 648.9]


def filas_habilidad():
    """(columna, fila, habilidad, base, filas) de cada celda de habilidad de la ficha."""
    for c, col in enumerate(HABILIDADES):
        i = 0
        for nombre, base, n in col:
            yield c, i, nombre, base, n
            i += n


def habilidades():
    """Para fichas.json: qué campos lleva cada habilidad. Las especialidades y las libres van numeradas."""
    res, libres = [], 0
    for c, i, nombre, base, n in filas_habilidad():
        if nombre == '':
            continue
        if nombre is None:
            libres += 1
            res.append({'familia': '', 'nombre': f'Otra {libres} (nombre)', 'valor': f'Otra {libres}', 'mejora': True})
        elif n == 2:
            for j in (1, 2):
                res.append({'familia': nombre, 'base': base, 'nombre': f'{nombre} {j} (nombre)',
                            'valor': f'{nombre} {j}', 'mejora': True})
        else:
            res.append({'habilidad': nombre, 'base': base, 'valor': nombre, 'mejora': nombre != 'Antinatural'})
    return res


# ----------------------------------------------------------------- plantilla
def plantilla():
    """Quita la cara apaisada y añade las casillas de mejora de las segundas líneas de especialidad."""
    doc = pymupdf.open(ORIGINAL)
    doc.delete_page(0)
    p = doc[0]
    for c, i, nombre, base, n in filas_habilidad():
        if n == 2:
            x, y = COLUMNAS[c]['caja'], FILA0 + (i + 1) * PASO + 6.3
            p.draw_rect(pymupdf.Rect(x + 0.3, y + 0.3, x + 6.7, y + 6.7), color=NEGRO, width=0.55)
    doc.set_metadata({'title': 'Delta Green · Hoja de documentación de agente', 'author': 'Arc Dream / Devir',
                      'creator': 'herramientas/fichas-dg/generar.py'})
    doc.save(PLANTILLA, garbage=4, deflate=True)
    print('  ', os.path.relpath(PLANTILLA, os.path.join(AQUI, '..', '..')))


# ----------------------------------------------------------------- campos
def rellenar(doc, n_pag, p=None, prefijo=''):
    """Pone los campos en las páginas n_pag y n_pag+1; p, si se da, es {campo: valor} para probar."""
    f = Ficha(doc, n_pag, prefijo, letra=LETRA, metrica=METRICA, tinta=TINTA)
    p1, p2 = f.p1, f.p2
    v = (p or {}).get
    t = lambda pag, n, r, tam=9, **kw: f.texto(pag, n, r, v(n, ''), tam=tam, **kw)
    caja = lambda pag, n, x, y: f.casilla(pag, n, (x, y, x + 7, y + 7), marcada=bool(v(n)))

    # Datos personales
    t(p1, 'Nombre', (96, 87, 358, 100.5), 10)
    t(p1, 'Profesión', (366, 87, 572, 100.5), 10)
    t(p1, 'Agencia', (96, 114, 358, 127.5), 10)
    t(p1, 'Nacionalidad', (366, 114, 572, 127.5), 10)
    for n, x in (('Género F', 97.5), ('Género M', 119.9), ('Género otro', 145.3)):
        caja(p1, n, x, 144.5)
    t(p1, 'Género', (155.5, 141.5, 198, 150.5), 7, minimo=4.5)
    t(p1, 'Edad', (204, 141.5, 280, 154), 9)
    t(p1, 'Educación', (288, 141.5, 572, 154), 9, minimo=5)

    # Características y atributos derivados
    for i, k in enumerate(CARACTERISTICAS):
        y = 172.5 + i * 18
        t(p1, k, (157, y + 3, 190, y + 15.5), 11, alin=1)
        t(p1, k + ' ×5', (193, y + 3, 225, y + 15.5), 10, alin=1)
        t(p1, k + ' rasgo', (229, y + 3, 330, y + 15.5), 8.5, minimo=5)
    for i, k in enumerate(DERIVADOS):
        y = 295 + i * 18
        if k != 'PR':  # el máximo del Punto de Ruptura no existe (N/A impreso)
            t(p1, k + ' máximo', (208, y + 0.8, 272, y + 10), 9, alin=1)
        t(p1, k + ' actual', (276, y + 3, 330, y + 15.5), 11, alin=1)
    t(p1, 'Descripción física', (96, 379.5, 330, 412.5), 8.5, multilinea=True)

    # Datos psicológicos
    for i in range(5):
        y = 172.5 + i * 18
        caja(p1, f'Lazo {i + 1} dañado', 359.2, y + 6.2)
        t(p1, f'Lazo {i + 1}', (369, y + 3, 529, y + 15.5), 9, minimo=5)
        t(p1, f'Lazo {i + 1} valor', (533, y + 3, 574, y + 15.5), 10, alin=1)
    t(p1, 'Motivaciones', (358, 292.5, 573, 376.5), 8.5, multilinea=True)
    for j, x in enumerate((393.9, 404.7, 415.6)):
        caja(p1, f'Violencia {j + 1}', x, 399.4)
    for j, x in enumerate((503.5, 514.3, 525.2)):
        caja(p1, f'Indefensión {j + 1}', x, 399.4)

    # Habilidades
    libres = 0
    for c, i, nombre, base, n in filas_habilidad():
        col = COLUMNAS[c]
        y = FILA0 + i * PASO
        x0, x1 = col['valor']
        if nombre == '':
            continue
        if nombre is None:
            libres += 1
            caja(p1, f'Otra {libres} (mejora)', col['caja'], y + 6.3)
            t(p1, f'Otra {libres} (nombre)', (col['nombre'] - 4, y + 3, col['fin'] - 1.5, y + 15.5), 8, minimo=5)
            t(p1, f'Otra {libres}', (x0 + 1, y + 3, x1 - 1, y + 15.5), 10, alin=1)
            continue
        if n == 1:
            if nombre != 'Antinatural':
                caja(p1, nombre + ' (mejora)', col['caja'], y + 6.3)
            t(p1, nombre, (x0 + 1, y + 3, x1 - 1, y + 15.5), 10, alin=1)
            continue
        # Especialidades: la primera tras el rótulo impreso, la segunda en la línea de abajo
        r = p1.search_for(f'{nombre} (0%)', clip=(col['nombre'] - 2, y, col['fin'], y + PASO))[0]
        for j in (1, 2):
            yj = y + (j - 1) * PASO
            if j == 2:
                caja(p1, f'{nombre} 2 (mejora)', col['caja'], yj + 6.3)
            else:
                caja(p1, f'{nombre} 1 (mejora)', col['caja'], yj + 6.3)
            xn = r.x1 + 2 if j == 1 else col['nombre']
            t(p1, f'{nombre} {j} (nombre)', (xn, yj + 3, col['fin'] - 1.5, yj + 15.5), 8, minimo=4.5)
            t(p1, f'{nombre} {j}', (x0 + 1, yj + 3, x1 - 1, yj + 15.5), 10, alin=1)

    # Cara 2: lesiones, equipo, armas, comentarios
    t(p2, 'Heridas', (62, 49, 536, 124.5), 9, multilinea=True)
    caja(p2, 'Primeros auxilios intentados', 277.8, 129.9)
    t(p2, 'Equipo', (62, 155, 536, 268.5), 9, multilinea=True)
    for i, letra in enumerate(LETRAS_ARMAS):
        y = 297.8 + i * 19
        for col, (x0, x1) in ARMAS_X.items():
            n = f'Arma {letra}' + (f' {col}' if col else '')
            t(p2, n, (x0, y + 4, x1, y + 16), 8.5, alin=0 if not col else 1, minimo=5)
    t(p2, 'Detalles', (62, 446, 285, 664.5), 9, multilinea=True)
    t(p2, 'Hogar', (292, 446, 536, 549), 9, multilinea=True)
    for i, y in enumerate(FORMACION_Y):
        t(p2, f'Formación {i + 1}', (291, y + 3, 411, y + 14.5), 8.5, minimo=5)
        t(p2, f'Formación {i + 1} habilidad', (416, y + 3, 537, y + 14.5), 8.5, minimo=5)
    t(p2, 'Oficial', (42, 695, 285, 708), 9)
    t(p2, 'Firma', (292, 695, 536, 708), 9)
    f.cerrar()


def prueba():
    """Un agente de ejemplo (el de Confidencial, pág. 19) para ver que todo cae en su sitio."""
    p = {'Nombre': 'Cornwell, Dana («Agente Ballard»)', 'Profesión': 'Agente especial', 'Agencia': 'FBI, División de Investigación Criminal',
         'Nacionalidad': 'Estadounidense', 'Género F': True, 'Edad': '41 (12/03/1985)', 'Educación': 'Licenciada en Derecho (Georgetown). Policía en Baltimore, FBI desde 2014.',
         'FUE': '11', 'FUE ×5': '55', 'CON': '13', 'CON ×5': '65', 'CAR': '15', 'CAR ×5': '75', 'CAR rasgo': 'Encantadora',
         'PS máximo': '12', 'PS actual': '12', 'PV máximo': '13', 'PV actual': '13', 'COR máximo': '99', 'COR actual': '60', 'PR actual': '47',
         'Lazo 1': 'Su hermano Mike', 'Lazo 1 valor': '15', 'Motivaciones': 'Cree en la ley.\nNo soporta mentir a su hermano.',
         'Alerta': '60', 'Arte 1 (nombre)': 'Fotografía', 'Arte 1': '40', 'Arte 2 (nombre)': 'Pintura', 'Arte 2': '20',
         'Ciencia militar 1 (nombre)': 'Tierra', 'Ciencia militar 1': '40', 'Oficio 2 (nombre)': 'Cerrajería', 'Oficio 2': '40',
         'Otra 1 (nombre)': 'Idioma extranjero (Ruso)', 'Otra 1': '50', 'Esquiva (mejora)': True, 'Violencia 1': True,
         'Equipo': 'Placa, Glock 22, chaleco de kevlar.', 'Arma a': 'Pistola mediana', 'Arma a hab': '50', 'Arma a alcance': '15 m',
         'Arma a daño': '1D10', 'Formación 1': 'Abrir cerraduras', 'Formación 1 habilidad': 'DES', 'Oficial': 'A-Cell'}
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
