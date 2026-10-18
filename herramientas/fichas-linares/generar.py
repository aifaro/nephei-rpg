# -*- coding: utf-8 -*-
"""Rellena la ficha oficial de 7.ª edición (Edge, años 20) con los pregenerados de Linares.

    python generar.py

La ficha original (coc-7ed-1920.pdf, sin campos) se queda intacta debajo; encima van campos de
formulario con los datos ya puestos, de modo que el PDF se puede editar con Adobe Reader, el
navegador o cualquier lector con formularios. Las pistas de Vida, Cordura, Suerte y Magia llevan
una casilla sobre cada número que, marcada, rodea ese número con un círculo (el valor actual).

Salida en public/la-maldicion-de-linares/investigadores/: un PDF por investigador, todos.pdf,
ficha-en-blanco.pdf y una vista previa JPG de cada página para la web.

Necesita PyMuPDF (pip install pymupdf). Los datos están en personajes.py.
"""
import os, re, sys
import pymupdf
from personajes import PERSONAJES

AQUI = os.path.dirname(os.path.abspath(__file__))
PLANTILLA = os.path.join(AQUI, 'coc-7ed-1920.pdf')
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'la-maldicion-de-linares', 'investigadores'))
sys.stdout.reconfigure(encoding='utf-8')

TINTA = (0.10, 0.15, 0.36)  # azul de pluma, para distinguir lo escrito de lo impreso
LETRA = 'TiRo'               # Times, la más cercana a la Minion de la ficha entre las 14 estándar
METRICA = 'tiro'

# ----------------------------------------------------------------- reglas
def derivados(p):
    c = p['car']
    ft = c['FUE'] + c['TAM']
    bd, corp = ('-2', -2) if ft <= 64 else ('-1', -1) if ft <= 84 else ('0', 0) if ft <= 124 \
        else ('+1D4', 1) if ft <= 164 else ('+1D6', 2)
    if c['DES'] < c['TAM'] and c['FUE'] < c['TAM']: mov = 7
    elif c['DES'] > c['TAM'] and c['FUE'] > c['TAM']: mov = 9
    else: mov = 8
    mov -= max(0, (p['edad'] - 30) // 10)
    cr = p['hab'].get('Crédito', 0)
    return {'PV': (c['CON'] + c['TAM']) // 10, 'PM': c['POD'] // 5, 'MOV': mov, 'BD': bd,
            'Corpulencia': corp, 'Esquivar': p['hab'].get('Esquivar', c['DES'] // 2),
            # Tabla de Crédito de los años 20 (10-49: gasto 10 $, dinero CR×2 $, bienes CR×50 $),
            # a cinco pesetas por dólar.
            'gasto': 50, 'dinero': cr * 10, 'bienes': cr * 250}


def miles(n):
    return '{:,}'.format(n).replace(',', '.')


# ----------------------------------------------------------------- geometría de la ficha
FILA0, PASO = 313.6, 13.68          # primera fila de habilidades y separación entre filas
COLUMNAS = [  # x de: casilla de mejora, nombre, fin de la línea de puntos, valor, ½, ⅕
    dict(caja=44.9, nombre=58.8, fin=142.2, valor=(153.5, 172.0), mitad=178.1, quinto=192.3),
    dict(caja=216.4, nombre=230.3, fin=313.6, valor=(325.0, 343.5), mitad=349.6, quinto=363.8),
    dict(caja=387.8, nombre=401.7, fin=485.1, valor=(496.4, 515.0), mitad=521.1, quinto=535.2),
]
# Cada columna, fila a fila: (habilidad, base, mejorable). '' = encabezado sin casillas;
# None = línea en blanco para una especialidad de la familia que la precede.
HABILIDADES = [
    [('Antropología', 1, 1), ('Armas de fuego', '', 0), ('Armas de fuego (Arma corta)', 20, 1),
     ('Armas de fuego (Fusil/Escopeta)', 25, 1), ('Armas de fuego', None, 1), ('Arqueología', 1, 1),
     ('Arte/Artesanía', '', 0), ('Arte/Artesanía', None, 1), ('Arte/Artesanía', None, 1),
     ('Arte/Artesanía', None, 1), ('Buscar libros', 20, 1), ('Cerrajería', 1, 1), ('Charlatanería', 5, 1),
     ('Ciencia', '', 0), ('Ciencia', None, 1), ('Ciencia', None, 1), ('Ciencia', None, 1),
     ('Ocultismo', 5, 1), ('Combatir', '', 0), ('Combatir (Pelea)', 25, 1), ('Combatir', None, 1),
     ('Combatir', None, 1), ('Conducir automóvil', 20, 1)],
    [('Conducir maquinaria', 1, 1), ('Contabilidad', 5, 1), ('Crédito', 0, 0), ('Derecho', 5, 1),
     ('Descubrir', 25, 1), ('Disfrazarse', 5, 1), ('Electricidad', 10, 1), ('Encanto', 15, 1),
     ('Equitación', 5, 1), ('Escuchar', 20, 1), ('Esquivar', 'DES', 1), ('Historia', 5, 1),
     ('Intimidar', 15, 1), ('Juego de manos', 10, 1), ('Lanzar', 20, 1), ('Lengua propia', '', 0),
     ('Lengua propia', 'EDU', 1), ('Otras lenguas', '', 0), ('Otras lenguas', None, 1),
     ('Otras lenguas', None, 1), ('Otras lenguas', None, 1), ('Mecánica', 10, 1), ('Medicina', 1, 1)],
    [('Mitos de Cthulhu', 0, 0), ('Nadar', 20, 1), ('Naturaleza', 10, 1), ('Orientarse', 10, 1),
     ('Persuasión', 10, 1), ('Pilotar', '', 0), ('Pilotar', None, 1), ('Primeros auxilios', 30, 1),
     ('Psicoanálisis', 1, 1), ('Psicología', 10, 1), ('Saltar', 20, 1), ('Seguir rastros', 10, 1),
     ('Sigilo', 20, 1), ('Supervivencia', '', 0), ('Supervivencia', None, 1), ('Tasación', 5, 1),
     ('Trepar', 20, 1)] + [('', None, 1)] * 6,
]
CARACTERISTICAS = {  # esquina superior izquierda de la casilla grande
    'FUE': (223.1, 50.7), 'DES': (291.6, 50.7), 'POD': (360.0, 50.7),
    'CON': (223.1, 76.5), 'APA': (291.6, 76.5), 'EDU': (360.0, 76.5),
    'TAM': (223.1, 102.3), 'INT': (291.6, 102.3),
}
ARMAS_X = {'arma': (44.5, 135), 'normal': (141, 165.5), 'dificil': (178, 202.5), 'extremo': (215, 239.5),
           'dano': (246, 287), 'alcance': (289, 329), 'ataques': (337, 361), 'municion': (376, 400),
           'averia': (415, 439)}
ARMAS_Y = [676.3, 688.2, 700.0, 711.9, 723.9]
TRASFONDO = [  # (clave, etiqueta impresa, x0, x1, y de la primera línea)
    ('descripcion', 'Descripción personal', 43.7, 287.8, 50.5), ('ideologia', 'Ideología/Creencias', 43.7, 287.8, 91.5),
    ('allegados', 'Allegados', 43.7, 287.8, 132.5), ('lugares', 'Lugares significativos', 43.7, 287.8, 173.5),
    ('posesiones', 'Posesiones preciadas', 43.7, 287.8, 214.5), ('rasgos', 'Rasgos', 306.1, 550.3, 50.5),
    ('lesiones', 'Lesiones y cicatrices', 306.1, 550.3, 91.5), ('fobias', 'Fobias y manías', 306.1, 550.3, 132.5),
    ('tomos', 'Tomos arcanos, hechizos y artefactos', 306.1, 550.3, 173.5),
    ('encuentros', 'Encuentros con entidades extrañas', 306.1, 550.3, 214.5),
]
COMPANEROS = [(43.0, 433.2), (154.6, 433.2), (266.1, 433.2), (43.0, 486.4),
              (266.1, 486.4), (43.0, 539.5), (154.6, 539.5), (266.1, 539.5)]


# ----------------------------------------------------------------- campos
class Ficha:
    def __init__(self, doc, n_pag, prefijo):
        self.doc, self.p1, self.p2, self.pre = doc, doc[n_pag], doc[n_pag + 1], prefijo
        self.etiquetas = {}
        self.anillos = []

    def etiqueta(self, pagina, texto, cerca=None):
        """Rectángulo de una etiqueta impresa (la más cercana a `cerca` si hay varias)."""
        rs = pagina.search_for(texto)
        if cerca:
            rs.sort(key=lambda r: abs(r.x0 - cerca[0]) + abs(r.y0 - cerca[1]))
        return rs[0]

    def texto(self, pagina, nombre, rect, valor='', tam=9, alin=0, multilinea=False, minimo=6):
        rect = pymupdf.Rect(rect)
        valor = str(valor)
        if not multilinea:
            while tam > minimo and pymupdf.get_text_length(valor, METRICA, tam) > rect.width - 3:
                tam -= 0.25
        w = pymupdf.Widget()
        w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
        w.field_name = self.pre + nombre
        w.rect = rect
        w.text_font, w.text_fontsize, w.text_color = LETRA, tam, TINTA
        w.border_width, w.border_color, w.fill_color = 0, None, None
        w.field_value = valor
        if multilinea:
            w.field_flags = pymupdf.PDF_TX_FIELD_IS_MULTILINE
        a = pagina.add_widget(w)
        if alin:  # /Q: 1 centrado, 2 a la derecha; se fija y se regenera la apariencia
            self.doc.xref_set_key(a.xref, 'Q', str(alin))
            w.update()

    def casilla(self, pagina, nombre, rect, marcada=False, anillo=False):
        w = pymupdf.Widget()
        w.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
        w.field_name = self.pre + nombre
        w.rect = pymupdf.Rect(rect)
        w.border_width, w.border_color, w.fill_color = 0, None, None
        w.text_color = TINTA
        w.field_value = marcada
        a = pagina.add_widget(w)
        if anillo:
            self.anillos.append((a.xref, marcada, a.rect))

    def linea(self, pagina, nombre, x0, x1, y, valor='', **kw):
        """Campo sobre una línea de puntos cuya caja de texto empieza en `y`."""
        self.texto(pagina, nombre, (x0, y + 0.5, x1, y + 11.2), valor, **kw)


def partir(texto, anchos, tam):
    """Reparte el texto en líneas de los anchos dados; devuelve None si no cabe."""
    palabras, lineas, actual = texto.split(), [], ''
    for pal in palabras:
        prueba = (actual + ' ' + pal).strip()
        if pymupdf.get_text_length(prueba, METRICA, tam) <= anchos[min(len(lineas), len(anchos) - 1)] - 3:
            actual = prueba
        else:
            lineas.append(actual)
            actual = pal
    lineas.append(actual)
    return lineas if len(lineas) <= len(anchos) else None


def anillos(doc, lista):
    """Casillas de las pistas: marcadas, un círculo de tinta alrededor del número; si no, nada."""
    for xref, marcada, r in lista:
        w, h = r.width, r.height
        k = 0.5523
        rx, ry, cx, cy = w / 2 - 0.6, h / 2 - 0.6, w / 2, h / 2
        circulo = (f'q {TINTA[0]} {TINTA[1]} {TINTA[2]} RG 0.9 w '
                   f'{cx + rx:.2f} {cy:.2f} m '
                   f'{cx + rx:.2f} {cy + k * ry:.2f} {cx + k * rx:.2f} {cy + ry:.2f} {cx:.2f} {cy + ry:.2f} c '
                   f'{cx - k * rx:.2f} {cy + ry:.2f} {cx - rx:.2f} {cy + k * ry:.2f} {cx - rx:.2f} {cy:.2f} c '
                   f'{cx - rx:.2f} {cy - k * ry:.2f} {cx - k * rx:.2f} {cy - ry:.2f} {cx:.2f} {cy - ry:.2f} c '
                   f'{cx + k * rx:.2f} {cy - ry:.2f} {cx + rx:.2f} {cy - k * ry:.2f} {cx + rx:.2f} {cy:.2f} c S Q')
        on, off = doc.get_new_xref(), doc.get_new_xref()
        for x, contenido in ((on, circulo), (off, '')):
            doc.update_object(x, f'<< /Type /XObject /Subtype /Form /BBox [0 0 {w:.2f} {h:.2f}] >>')
            doc.update_stream(x, contenido.encode())
        doc.xref_set_key(xref, 'AP', f'<< /N << /Yes {on} 0 R /Off {off} 0 R >> >>')
        doc.xref_set_key(xref, 'MK', '<< >>')
        doc.xref_set_key(xref, 'AS', '/Yes' if marcada else '/Off')


def pistas(pagina):
    """Posición de cada número de las cuatro pistas: {pista: {valor: (x, y) de la caja de texto}}."""
    res = {'PV': {}, 'Cordura': {}, 'PM': {}, 'Suerte': {}}
    for b in pagina.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                m = re.fullmatch(r'(\d\d)\t?', s['text'])
                if not m:
                    continue
                x, y = s['bbox'][:2]
                if 150 < y < 212: pista = 'PV' if x < 185 else 'Cordura'
                elif 222 < y < 285: pista = 'PM' if x < 185 else 'Suerte'
                else: continue
                res[pista][int(m.group(1))] = (x, y)
    return res


# ----------------------------------------------------------------- relleno
def rellenar(doc, n_pag, p, prefijo='', todos=()):
    f = Ficha(doc, n_pag, prefijo)
    p1, p2 = f.p1, f.p2
    numeros_pistas = pistas(p1)  # antes de añadir campos, que también tienen texto
    vacio = p is None
    p = p or {'car': {}, 'hab': {}, 'armas': [], 'equipo': [], 'edad': 30}
    d = derivados(p) if not vacio else None
    v = lambda clave, defecto='': p.get(clave, defecto) if not vacio else ''

    # Cabecera
    for nombre, etiqueta, valor in (('Nombre', 'Nombre', v('nombre')), ('Jugador', 'Jugador', ''),
                                    ('Ocupación', 'Ocupación', v('ocupacion')),
                                    ('Residencia', 'Lugar de residencia', v('residencia')),
                                    ('Nacimiento', 'Lugar de nacimiento', v('nacimiento'))):
        r = f.etiqueta(p1, etiqueta, (41, 40))
        f.linea(p1, nombre, r.x1 + 2.5, 181, r.y0 - 1.5, valor)
    g, e = f.etiqueta(p1, 'Género'), f.etiqueta(p1, 'Edad', (140, 87))
    f.linea(p1, 'Género', g.x1 + 2.5, e.x0 - 2, g.y0 - 1.5, v('genero'))
    f.linea(p1, 'Edad', e.x1 + 2.5, 181, e.y0 - 1.5, v('edad'))

    # Características
    for k, (x, y) in CARACTERISTICAS.items():
        val = p['car'].get(k)
        f.texto(p1, k, (x, y, x + 21.7, y + 21.7), val or '', tam=13, alin=1)
        f.texto(p1, k + ' (mitad)', (x + 21.5, y, x + 38.1, y + 10.6), val // 2 if val else '', tam=7.5, alin=1)
        f.texto(p1, k + ' (quinto)', (x + 21.5, y + 11.1, x + 38.1, y + 21.7), val // 5 if val else '', tam=7.5, alin=1)
    f.texto(p1, 'MOV', (360.0, 102.3, 381.7, 123.9), d['MOV'] if d else '', tam=13, alin=1)

    # Vida, Cordura, Magia, Suerte
    f.texto(p1, 'PV máximo', (74.9, 197.3, 91.4, 208.0), d['PV'] if d else '', tam=8, alin=1)
    f.texto(p1, 'PM máximo', (74.9, 270.0, 91.4, 280.6), d['PM'] if d else '', tam=8, alin=1)
    f.texto(p1, 'Cordura inicial', (480.2, 140.6, 496.7, 151.2), p['car'].get('POD', ''), tam=8, alin=1)
    f.texto(p1, 'Cordura máxima', (536.5, 140.6, 553.0, 151.2), '' if vacio else 99 - p['hab'].get('Mitos de Cthulhu', 0), tam=8, alin=1)
    f.casilla(p1, 'Herida grave', (74.9, 183.4, 82.9, 191.4))
    f.casilla(p1, 'Locura temporal', (226.5, 141.7, 234.5, 149.7))
    f.casilla(p1, 'Locura indefinida', (284.3, 141.7, 292.3, 149.7))
    actuales = {} if vacio else {'PV': d['PV'], 'Cordura': p['car']['POD'], 'PM': d['PM'], 'Suerte': p['suerte']}
    for pista, numeros in numeros_pistas.items():
        for n, (x, y) in sorted(numeros.items()):
            cx, cy = x + 4.9, y + 8.6
            f.casilla(p1, f'{pista} {n:02d}', (cx - 6.6, cy - 5.2, cx + 6.6, cy + 5.2),
                      marcada=actuales.get(pista) == n, anillo=True)

    # Habilidades
    hab = dict(p['hab'])
    especiales = {fam: sorted(k for k in hab if k.startswith(fam + ' (') and k not in
                              ('Armas de fuego (Arma corta)', 'Armas de fuego (Fusil/Escopeta)', 'Combatir (Pelea)'))
                  for fam in ('Armas de fuego', 'Arte/Artesanía', 'Ciencia', 'Combatir', 'Otras lenguas', 'Pilotar', 'Supervivencia')}
    usadas = set()
    for c, (col, filas) in enumerate(zip(COLUMNAS, HABILIDADES)):
        for i, (nombre, base, mejora) in enumerate(filas):
            y = FILA0 + i * PASO
            if base == '':
                continue
            clave = nombre
            if base is None:  # línea en blanco: especialidad del personaje, o libre
                pendientes = especiales.get(nombre, [])
                clave = pendientes.pop(0) if pendientes else None
                etiqueta = clave[len(nombre) + 2:-1] if clave else ''
                f.linea(p1, f'Habilidad {c + 1}-{i + 1}', col['nombre'], col['fin'], y - 0.4, etiqueta)
                valor = hab.get(clave, '') if clave else ''
            elif base == 'DES':
                valor = '' if vacio else d['Esquivar']
            elif base == 'EDU':
                f.linea(p1, 'Lengua propia', col['nombre'], col['fin'], y - 0.4, '' if vacio else 'Español')
                valor = p['car'].get('EDU', '')
            else:
                valor = '' if vacio else hab.get(nombre, base)
            usadas.add(clave)
            n = f'{clave or nombre or "Habilidad"} [{c + 1}-{i + 1}]' if base is None else clave
            x0, x1 = col['valor']
            f.texto(p1, n, (x0, y - 0.2, x1, y + 11.2), '' if valor == '' else f'{valor:02d}', tam=8.5, alin=1)
            mitad = '' if valor == '' else valor // 2
            quinto = '' if valor == '' else valor // 5
            f.texto(p1, n + ' (mitad)', (col['mitad'], y + 0.6, col['mitad'] + 13.7, y + 11.4), mitad, tam=7, alin=1)
            f.texto(p1, n + ' (quinto)', (col['quinto'], y + 0.6, col['quinto'] + 13.7, y + 11.4), quinto, tam=7, alin=1)
            if mejora:
                f.casilla(p1, n + ' (mejora)', (col['caja'], y + 1.8, col['caja'] + 8, y + 9.8))
    sobran = set(hab) - usadas
    if sobran:
        raise SystemExit(f'No caben en la ficha de {p["nombre"]}: {", ".join(sobran)}')

    # Armas
    pelea = p['hab'].get('Combatir (Pelea)', 25)
    filas = [] if vacio else [('Desarmado', pelea)] + [a for a in p['armas']]
    for i, y in enumerate(ARMAS_Y):
        a = filas[i] if i < len(filas) else None
        for col, (x0, x1) in ARMAS_X.items():
            if i == 0 and col in ('arma', 'dano', 'alcance', 'ataques', 'municion', 'averia'):
                continue  # la fila de Desarmado ya viene impresa
            if a is None: val = ''
            elif col == 'arma': val = a[0]
            elif col == 'normal': val = a[1]
            elif col == 'dificil': val = a[1] // 2
            elif col == 'extremo': val = a[1] // 5
            else: val = a[['dano', 'alcance', 'ataques', 'municion', 'averia'].index(col) + 2]
            f.linea(p1, f'Arma {i + 1} {col}', x0, x1, y - 0.6, val, tam=8.5, alin=0 if col == 'arma' else 1)

    # Combate
    f.texto(p1, 'Bonificación al daño', (521.4, 669.7, 543.1, 684.8), d['BD'] if d else '', tam=8, alin=1)
    f.texto(p1, 'Corpulencia', (521.4, 691.1, 543.1, 706.2), d['Corpulencia'] if d else '', tam=8, alin=1)
    esq = d['Esquivar'] if d else None
    f.texto(p1, 'Esquivar (combate)', (505.0, 712.4, 526.7, 734.1), esq or '', tam=11, alin=1)
    f.texto(p1, 'Esquivar (combate) (mitad)', (526.6, 712.4, 543.1, 723.1), esq // 2 if esq else '', tam=7, alin=1)
    f.texto(p1, 'Esquivar (combate) (quinto)', (526.6, 723.5, 543.1, 734.1), esq // 5 if esq else '', tam=7, alin=1)

    # Trasfondo (tres líneas de puntos por apartado)
    for clave, etiqueta, x0, x1, y in TRASFONDO:
        r = f.etiqueta(p2, etiqueta, (x0, y))
        anchos = [x1 - r.x1 - 3.5, x1 - x0, x1 - x0]
        tam, lineas = 9, None
        while lineas is None:
            lineas = partir(v(clave), anchos, tam)
            tam -= 0.25 if lineas is None else 0
        lineas += [''] * (3 - len(lineas))
        for j, txt in enumerate(lineas):
            f.linea(p2, f'{etiqueta} {j + 1}', (r.x1 + 2.5) if j == 0 else x0, x1, y + j * PASO - 1, txt, tam=tam)

    # Equipo y posesiones (dos columnas de siete líneas)
    equipo = p['equipo']
    for j in range(14):
        x0, x1 = (43.7, 159.9) if j < 7 else (172.4, 288.7)
        f.linea(p2, f'Equipo {j + 1}', x0, x1, 293.9 + (j % 7) * PASO - 1, equipo[j] if j < len(equipo) else '')

    # Dinero y bienes
    for nombre, etiqueta, valor in (('Nivel de gasto', 'Nivel de gasto', f'{d["gasto"]} pesetas' if d else ''),
                                    ('Dinero', 'Dinero', f'{miles(d["dinero"])} pesetas' if d else ''),
                                    ('Bienes', 'Bienes', f'{miles(d["bienes"])} pesetas' if d else '')):
        r = f.etiqueta(p2, etiqueta, (306, 290))
        f.linea(p2, nombre, r.x1 + 2.5, 550.3, r.y0 - 1.5, valor)
    for j in range(4):
        f.linea(p2, f'Bienes {j + 2}', 306.1, 550.3, 334.9 + j * PASO - 1)

    # Compañeros investigadores: los demás pregenerados
    otros = [o for o in todos if not vacio and o['slug'] != p['slug']]
    for j, (x, y) in enumerate(COMPANEROS):
        o = otros[j] if j < len(otros) else None
        r = f.etiqueta(p2, 'Personaje', (x + 3, y + 1))
        f.texto(p2, f'Compañero {j + 1}', (r.x1 + 1.5, y + 1.6, x + 99, y + 10.6), o['nombre'] if o else '', tam=7)
        f.texto(p2, f'Compañero {j + 1} (ocupación)', (x + 3, y + 12.4, x + 99, y + 21.4), o['ocupacion'] if o else '', tam=7, minimo=4.5)
        r = f.etiqueta(p2, 'Jugador', (x + 3, y + 22))
        f.texto(p2, f'Compañero {j + 1} (jugador)', (r.x1 + 1.5, y + 23.2, x + 99, y + 32.2), '', tam=7)

    # Notas: quién es y por qué está aquí
    notas = '' if vacio else f'{p["trasfondo"]}\n\nPor qué está aquí: {p["motivo"]}'
    f.texto(p2, 'Notas', (387, 430, 553, 588), notas, tam=8.5, multilinea=True)

    anillos(doc, f.anillos)


def nuevo():
    doc = pymupdf.open()
    doc.insert_pdf(pymupdf.open(PLANTILLA))
    return doc


def guardar(doc, ruta, titulo):
    doc.set_metadata({'title': titulo, 'author': 'rpg.nephei.org',
                      'subject': 'La maldición del Palacio de Linares · La llamada de Cthulhu 7.ª edición',
                      'creator': 'herramientas/fichas-linares/generar.py'})
    doc.save(ruta, garbage=4, deflate=True)
    print('  ', os.path.relpath(ruta, os.path.join(AQUI, '..', '..')))


def main():
    os.makedirs(SALIDA, exist_ok=True)
    todos = pymupdf.open()
    for i, p in enumerate(PERSONAJES):
        doc = nuevo()
        rellenar(doc, 0, p, todos=PERSONAJES)
        guardar(doc, os.path.join(SALIDA, p['slug'] + '.pdf'), f'{p["nombre"]} · Ficha de investigador')
        for n in range(2):
            pix = doc[n].get_pixmap(dpi=100)
            pix.save(os.path.join(SALIDA, f'{p["slug"]}-{n + 1}.jpg'), jpg_quality=82)
        todos.insert_pdf(pymupdf.open(PLANTILLA))
        rellenar(todos, 2 * i, p, prefijo=p['slug'] + ' / ', todos=PERSONAJES)
    guardar(todos, os.path.join(SALIDA, 'todos.pdf'), 'Investigadores pregenerados · La maldición del Palacio de Linares')
    blanco = nuevo()
    rellenar(blanco, 0, None)
    guardar(blanco, os.path.join(SALIDA, 'ficha-en-blanco.pdf'), 'Ficha de investigador · Años 20')


if __name__ == '__main__':
    main()
