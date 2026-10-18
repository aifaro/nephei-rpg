# -*- coding: utf-8 -*-
"""Pone los investigadores pregenerados de La Marca del Estrecho en la ficha oficial de Pulp Cthulhu.

    python generar.py            → fichas.html, los PDF y las vistas previas
    python generar.py --sin-pdf  → solo fichas.html

Cada PDF tiene tres hojas: las dos caras de la ficha oficial (pulp-cthulhu-ficha.pdf, de Edge),
con campos de formulario ya rellenos que se pueden editar con Adobe Reader o el navegador, y una
hoja de trasfondo propia (quién es, por qué le escribía Guerrero, a quién conoce en el barco) que
imprime Google Chrome (variable CHROME si no está en la ruta habitual) y que también lleva campos
en sus líneas en blanco.

Salida en public/la-marca-del-estrecho/: fichas.html e investigadores/ (un PDF por investigador,
todos.pdf, ficha-en-blanco.pdf y una vista previa JPG de cada hoja). Necesita PyMuPDF.
Los datos están en personajes.py.
"""
import html, os, subprocess, sys, tempfile
import pymupdf
from personajes import PERSONAJES, TALENTOS

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from formulario import Ficha, credito, miles, pistas, repartir, guardar, vistas

PLANTILLA = os.path.join(AQUI, 'pulp-cthulhu-ficha.pdf')
PUBLIC = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'la-marca-del-estrecho'))
PDFS = os.path.join(PUBLIC, 'investigadores')
RAIZ = os.path.join(AQUI, '..', '..')
sys.stdout.reconfigure(encoding='utf-8')
e = html.escape

# ----------------------------------------------------------------- reglas
BASE = {  # valor de base de las habilidades que no dependen de una característica
    'Antropología': 1, 'Armas de fuego (Arma corta)': 20, 'Armas de fuego (Fusil/Escopeta)': 25,
    'Armas de fuego (Subfusil)': 15, 'Arqueología': 1, 'Bucear': 1, 'Buscar libros': 20, 'Cerrajería': 1,
    'Charlatanería': 5, 'Ocultismo': 5, 'Combatir (Pelea)': 25, 'Conducir automóvil': 20,
    'Conducir maquinaria': 1, 'Contabilidad': 5, 'Crédito': 0, 'Demolición': 1, 'Derecho': 5, 'Descubrir': 25,
    'Disfrazarse': 5, 'Electricidad': 10, 'Encanto': 15, 'Equitación': 5, 'Escuchar': 20, 'Historia': 5,
    'Informática': 0, 'Intimidar': 15, 'Juego de manos': 10, 'Lanzar': 20, 'Lectura de labios': 1,
    'Mecánica': 10, 'Medicina': 1, 'Mitos de Cthulhu': 0, 'Nadar': 20, 'Naturaleza': 10, 'Orientarse': 10,
    'Persuasión': 10, 'Primeros auxilios': 30, 'Psicoanálisis': 1, 'Psicología': 10, 'Saltar': 20,
    'Seguir rastros': 10, 'Sigilo': 20, 'Tasación': 5, 'Trepar': 20,
}


def derivados(p):
    c = p['car']
    ft = c['FUE'] + c['TAM']
    bd, corp = ('-2', -2) if ft <= 64 else ('-1', -1) if ft <= 84 else ('0', 0) if ft <= 124 \
        else ('+1D4', 1) if ft <= 164 else ('+1D6', 2)
    if c['DES'] < c['TAM'] and c['FUE'] < c['TAM']: mov = 7
    elif c['DES'] > c['TAM'] and c['FUE'] > c['TAM']: mov = 9
    else: mov = 8
    mov -= max(0, (p['edad'] - 30) // 10)
    gasto, _, bienes = credito(p['hab'].get('Crédito', 0))
    return {'PV': (c['CON'] + c['TAM']) // 5,  # Pulp Cthulhu: el doble que en la 7.ª edición
            'PM': c['POD'] // 5, 'MOV': mov, 'BD': bd, 'Corpulencia': corp,
            'Esquivar': p['hab'].get('Esquivar', c['DES'] // 2), 'gasto': gasto, 'bienes': bienes}


def valor(p, habilidad):
    if habilidad == 'Esquivar':
        return p['hab'].get('Esquivar', p['car']['DES'] // 2)
    return p['hab'].get(habilidad, BASE.get(habilidad, 0))


# ----------------------------------------------------------------- geometría de la ficha
FILA0, PASO = 318.0, 13.68          # primera fila de habilidades y separación entre filas
COLUMNAS = [  # x de: casilla de mejora, nombre, fin de la línea de puntos, valor, ½, ⅕
    dict(caja=44.9, nombre=58.8, fin=142.2, valor=(153.5, 172.0), mitad=178.1, quinto=192.3),
    dict(caja=216.4, nombre=230.3, fin=313.6, valor=(325.0, 343.5), mitad=349.6, quinto=363.8),
    dict(caja=387.8, nombre=401.7, fin=485.1, valor=(496.4, 515.0), mitad=521.1, quinto=535.2),
]
# Cada columna, fila a fila: (habilidad, base, mejorable). '' = encabezado sin casillas; None = línea
# en blanco para una especialidad de la familia (o, si la familia es '', para cualquier otra habilidad).
HABILIDADES = [
    [('Armas de fuego', '', 0), ('Armas de fuego (Arma corta)', 20, 1), ('Armas de fuego (Fusil/Escopeta)', 25, 1),
     ('Armas de fuego (Subfusil)', 15, 1), ('Armas de fuego', None, 1), ('Arqueología', 1, 1),
     ('Arte/Artesanía', '', 0), ('Arte/Artesanía', None, 1), ('Arte/Artesanía', None, 1), ('Bucear', 1, 1),
     ('Buscar libros', 20, 1), ('Cerrajería', 1, 1), ('Charlatanería', 5, 1), ('Ciencia', '', 0),
     ('Ciencia', None, 1), ('Ciencia', None, 1), ('Ciencia', None, 1), ('Ocultismo', 5, 1), ('Combatir', '', 0),
     ('Combatir (Pelea)', 25, 1), ('Combatir', None, 1), ('Combatir', None, 1), ('Conducir automóvil', 20, 1)],
    [('Conducir maquinaria', 1, 1), ('Contabilidad', 5, 1), ('Crédito', 0, 0), ('Demolición', 1, 1),
     ('Derecho', 5, 1), ('Descubrir', 25, 1), ('Disfrazarse', 5, 1), ('Electricidad', 10, 1), ('Encanto', 15, 1),
     ('Equitación', 5, 1), ('Escuchar', 20, 1), ('Esquivar', 'DES', 1), ('Historia', 5, 1), ('Informática', 0, 1),
     ('Intimidar', 15, 1), ('Juego de manos', 10, 1), ('Lanzar', 20, 1), ('Lectura de labios', 1, 1),
     ('Lengua propia', '', 0), ('Lengua propia', 'EDU', 1), ('Otras lenguas', '', 0),
     ('Otras lenguas', None, 1), ('Otras lenguas', None, 1)],
    [('Mecánica', 10, 1), ('Medicina', 1, 1), ('Mitos de Cthulhu', 0, 0), ('Nadar', 20, 1), ('Naturaleza', 10, 1),
     ('Orientarse', 10, 1), ('Persuasión', 10, 1), ('Pilotar', '', 0), ('Pilotar', None, 1),
     ('Primeros auxilios', 30, 1), ('Psicoanálisis', 1, 1), ('Psicología', 10, 1), ('Saltar', 20, 1),
     ('Seguir rastros', 10, 1), ('Sigilo', 20, 1), ('Supervivencia', '', 0), ('Supervivencia', None, 1),
     ('Tasación', 5, 1), ('Trepar', 20, 1)] + [('', None, 1)] * 4,
]
CARACTERISTICAS = {  # esquina superior izquierda de la casilla grande
    'FUE': (223.1, 52.1), 'DES': (291.6, 52.1), 'POD': (360.0, 52.1),
    'CON': (223.1, 77.9), 'APA': (291.6, 77.9), 'EDU': (360.0, 77.9),
    'TAM': (223.1, 103.7), 'INT': (291.6, 103.7),
}
CABECERA = [  # (campo, clave, raya: x0, x1, y)
    ('Nombre', 'nombre', 65.9, 175.7, 50.1), ('Jugador', None, 61.8, 175.7, 62.8),
    ('Ocupación', 'ocupacion', 70.9, 175.7, 75.5), ('Género', 'sexo', 61.8, 117.5, 88.2),
    ('Edad', 'edad', 137.8, 175.7, 88.2), ('Arquetipo', 'arquetipo', 68.3, 175.7, 100.9),
    ('Residencia', 'residencia', 101.8, 175.7, 113.6), ('Nacimiento', 'nacimiento', 107.1, 175.7, 126.3),
]
ARMAS_X = {'arma': (44, 135), 'normal': (141.5, 165), 'dificil': (178.5, 201.5), 'extremo': (215.5, 241),
           'dano': (250, 289), 'alcance': (292.5, 329), 'ataques': (337.5, 363), 'municion': (379, 402),
           'averia': (418, 438)}
ARMAS_Y = [676.7, 688.3, 700.2, 711.9, 723.9]
TRASFONDO = [  # (clave en rasgos, raya de la primera línea: x0, x1, y) — tres líneas cada uno
    ('Descripción', 114.8, 289.1, 66.0), ('Ideología y creencias', 112.0, 289.1, 107.1),
    ('Allegados', 78.5, 289.1, 148.1), ('Lugares significativos', 116.2, 289.1, 189.1),
    ('Posesiones preciadas', 114.8, 289.1, 230.1), ('Rasgos', 331.7, 551.6, 66.0),
    ('Lesiones y cicatrices', 374.5, 551.6, 107.1), ('Fobias y manías', 362.0, 551.6, 148.1),
    ('Tomos arcanos, hechizos y artefactos', 430.8, 551.6, 189.1),
    ('Encuentros con entidades extrañas', 424.1, 551.6, 230.1),
]
COMPANEROS = [(43.0, 435.4), (155.1, 435.1), (266.1, 435.1), (43.0, 488.4),
              (266.1, 488.4), (43.0, 541.5), (155.1, 541.5), (266.1, 541.5)]
TALENTOS_Y = [441.4, 455.1, 468.8, 482.5, 496.1]
CORTO = {'Otras lenguas': 'Lengua', 'Armas de fuego': 'Armas', 'Arte/Artesanía': 'Arte'}  # para las que desbordan


# ----------------------------------------------------------------- las dos caras oficiales
def rellenar(doc, n_pag, p, prefijo='', todos=()):
    f = Ficha(doc, n_pag, prefijo)
    p1, p2 = f.p1, f.p2
    numeros_pistas = pistas(p1, 210)  # antes de añadir campos, que también tienen texto
    vacio = p is None
    d = None if vacio else derivados(p)
    hab = {} if vacio else dict(p['hab'])

    # Cabecera
    for campo, clave, x0, x1, y in CABECERA:
        f.subrayado(p1, campo, x0 + 1, x1, y, '' if vacio or not clave else p[clave])

    # Características
    for k, (x, y) in CARACTERISTICAS.items():
        val = '' if vacio else p['car'][k]
        f.texto(p1, k, (x, y, x + 21.7, y + 21.7), val, tam=13, alin=1)
        f.texto(p1, k + ' (mitad)', (x + 21.5, y, x + 38.1, y + 10.6), '' if vacio else val // 2, tam=7.5, alin=1)
        f.texto(p1, k + ' (quinto)', (x + 21.5, y + 11.1, x + 38.1, y + 21.7), '' if vacio else val // 5, tam=7.5, alin=1)
    f.texto(p1, 'MOV', (360.0, 103.7, 381.7, 125.4), '' if vacio else d['MOV'], tam=13, alin=1)

    # Vida, Cordura, Magia, Suerte
    f.texto(p1, 'PV máximo', (71.7, 165.8, 88.2, 176.4), '' if vacio else d['PV'], tam=8, alin=1)
    f.texto(p1, 'PM máximo', (74.9, 270.0, 91.4, 280.6), '' if vacio else d['PM'], tam=8, alin=1)
    f.texto(p1, 'Cordura inicial', (480.2, 140.6, 496.7, 151.2), '' if vacio else p['car']['POD'], tam=8, alin=1)
    f.texto(p1, 'Cordura máxima', (536.5, 140.6, 553.0, 151.2),
            '' if vacio else 99 - hab.get('Mitos de Cthulhu', 0), tam=8, alin=1)
    f.casilla(p1, 'Locura temporal', (255.8, 141.7, 263.8, 149.7))
    f.casilla(p1, 'Locura indefinida', (310.2, 141.7, 318.2, 149.7))
    f.pistas(numeros_pistas, {} if vacio else
             {'PV': d['PV'], 'Cordura': p['car']['POD'], 'PM': d['PM'], 'Suerte': p['suerte']})

    # Habilidades
    familias = ('Armas de fuego', 'Arte/Artesanía', 'Ciencia', 'Combatir', 'Otras lenguas', 'Pilotar', 'Supervivencia')
    impresas = {n for col in HABILIDADES for n, b, _ in col if b not in ('', None)}
    especiales = {fam: sorted((k for k in hab if k.startswith(fam + ' (') and k not in impresas), key=lambda k: -hab[k])
                  for fam in familias}  # las más altas, en las líneas de su familia
    if 'Supervivencia' in hab:  # sin especialidad en los datos
        especiales['Supervivencia'].append('Supervivencia')
    sueltas = sorted(k for k in hab if k not in impresas and k != 'Esquivar'
                     and not any(k == fam or k.startswith(fam + ' (') for fam in familias))
    for c, (col, filas) in enumerate(zip(COLUMNAS, HABILIDADES)):
        for i, (nombre, base, mejora) in enumerate(filas):
            y = FILA0 + i * PASO
            if base == '':
                continue
            if base is None:  # línea en blanco: especialidad del personaje, o lo que no cabe en su sitio
                if nombre:
                    pendientes = especiales.get(nombre, [])
                    clave = pendientes.pop(0) if pendientes else None
                    etiqueta = '' if not clave else ('General' if clave == nombre else clave[len(nombre) + 2:-1])
                else:
                    resto = sueltas + [k for fam in familias for k in especiales[fam]]
                    clave = resto[0] if resto else None
                    for lista in [sueltas] + list(especiales.values()):
                        if clave in lista:
                            lista.remove(clave)
                    fam = next((x for x in familias if clave and clave.startswith(x + ' (')), None)
                    etiqueta = f'{CORTO.get(fam, fam)}: {clave[len(fam) + 2:-1]}' if fam else (clave or '')
                n = f'Habilidad {c + 1}-{i + 1}'
                f.texto(p1, n + ' (nombre)', (col['nombre'], y - 1, col['fin'], y + 9.6), etiqueta, tam=8.5)
                v = '' if not clave else hab[clave]
            elif base == 'DES':
                n, v = nombre, '' if vacio else d['Esquivar']
            elif base == 'EDU':
                n = nombre
                f.texto(p1, 'Lengua propia (nombre)', (col['nombre'], y - 1, col['fin'], y + 9.6),
                        '' if vacio else p['lengua'], tam=8.5)
                v = '' if vacio else p['car']['EDU']
            else:
                n, v = nombre, '' if vacio else hab.get(nombre, base)
            x0, x1 = col['valor']
            f.texto(p1, n, (x0, y - 1, x1, y + 9.6), '' if v == '' else f'{v:02d}', tam=8.5, alin=1)
            f.texto(p1, n + ' (mitad)', (col['mitad'], y - 0.6, col['mitad'] + 13.7, y + 10.3),
                    '' if v == '' else v // 2, tam=7, alin=1)
            f.texto(p1, n + ' (quinto)', (col['quinto'], y - 0.6, col['quinto'] + 13.7, y + 10.3),
                    '' if v == '' else v // 5, tam=7, alin=1)
            if mejora:
                f.casilla(p1, n + ' (mejora)', (col['caja'], y + 0.7, col['caja'] + 8, y + 8.7))
    sobran = sueltas + [k for fam in familias for k in especiales[fam]]
    if sobran:
        raise SystemExit(f'No caben en la ficha de {p["nombre"]}: {", ".join(sobran)}')

    # Armas (la fila de Desarmado ya viene impresa salvo los porcentajes)
    filas = [] if vacio else [('Desarmado', 'Combatir (Pelea)', '', '', '', '', '')] + p['armas']
    for i, y in enumerate(ARMAS_Y):
        a = filas[i] if i < len(filas) else None
        pct = valor(p, a[1]) if a else None
        datos = {} if a is None else {'arma': a[0], 'normal': pct, 'dificil': pct // 2, 'extremo': pct // 5,
                                      'dano': a[2], 'alcance': a[3], 'ataques': a[4], 'municion': a[5], 'averia': a[6]}
        for col, (x0, x1) in ARMAS_X.items():
            if i == 0 and col not in ('normal', 'dificil', 'extremo'):
                continue
            f.texto(p1, f'Arma {i + 1} {col}', (x0, y - 0.3, x1, y + 9.6), datos.get(col, ''),
                    tam=8.5, alin=0 if col == 'arma' else 1)

    # Combate
    esq = None if vacio else d['Esquivar']
    f.texto(p1, 'Bonificación al daño', (521.4, 669.0, 543.1, 684.1), '' if vacio else d['BD'], tam=8, alin=1)
    f.texto(p1, 'Corpulencia', (521.4, 690.3, 543.1, 705.5), '' if vacio else d['Corpulencia'], tam=8, alin=1)
    f.texto(p1, 'Esquivar (combate)', (505.0, 711.7, 526.7, 733.4), esq or '', tam=11, alin=1)
    f.texto(p1, 'Esquivar (combate) (mitad)', (526.6, 711.7, 543.1, 722.4), esq // 2 if esq else '', tam=7, alin=1)
    f.texto(p1, 'Esquivar (combate) (quinto)', (526.6, 722.8, 543.1, 733.4), esq // 5 if esq else '', tam=7, alin=1)

    # Trasfondo (tres rayas por apartado; la primera empieza tras la etiqueta)
    for clave, x0, x1, y in TRASFONDO:
        izq = 43.7 if x1 < 300 else 306.1
        texto = '' if vacio else p['rasgos'].get(clave, '')
        lineas, tam = repartir(texto, [x1 - x0 - 1, x1 - izq, x1 - izq])
        for j, t in enumerate(lineas):
            f.subrayado(p2, f'{clave} {j + 1}', (x0 + 1) if j == 0 else izq, x1, y + j * PASO, t, tam=tam)

    # Equipo y posesiones (dos columnas de siete rayas)
    equipo = [] if vacio else p['equipo']
    for j in range(14):
        x0, x1 = (43.7, 157.9) if j < 7 else (172.7, 287.0)
        f.subrayado(p2, f'Equipo {j + 1}', x0, x1, 307.5 + (j % 7) * PASO, equipo[j] if j < len(equipo) else '')

    # Dinero y bienes: el nivel y lo que lleva encima salen del texto de personajes.py
    if vacio:
        nivel = dinero = bienes = ''
    else:
        nivel, _, lleva = p['dinero'].partition('. ')
        nivel = f'{nivel} ({d["gasto"]} pesetas)'
        dinero = lleva.removeprefix('Lleva ').rstrip('.')
        bienes = f'{miles(d["bienes"])} pesetas'
    f.subrayado(p2, 'Nivel de gasto', 356.7, 551.6, 307.5, nivel)
    f.subrayado(p2, 'Dinero', 331.8, 551.6, 321.2, dinero)
    f.subrayado(p2, 'Bienes', 331.8, 551.6, 334.9, bienes)
    for j in range(4):
        f.subrayado(p2, f'Bienes {j + 2}', 306.1, 551.6, 348.5 + j * PASO)

    # Compañeros héroes: los demás pregenerados
    otros = [] if vacio else [o for o in todos if o['id'] != p['id']]
    for j, (x, y) in enumerate(COMPANEROS):
        o = otros[j] if j < len(otros) else None
        f.subrayado(p2, f'Compañero {j + 1}', x + 34.3, x + 99.2, y + 9.2, o['nombre'] if o else '', tam=7, minimo=4.5)
        f.subrayado(p2, f'Compañero {j + 1} (ocupación)', x + 3.9, x + 99.2, y + 19.2, o['ocupacion'] if o else '', tam=7)
        f.subrayado(p2, f'Compañero {j + 1} (jugador)', x + 28.9, x + 99.2, y + 29.1, '', tam=7)

    # Talentos: nombre y efecto, repartidos en las cinco rayas
    if vacio:
        lineas, tam = [''] * 5, 9
    else:
        tam = 8.5
        while True:
            lineas = []
            for t in p['talentos']:
                trozo = repartir(f'{t}. {TALENTOS[t]}', [161] * 5, tam, minimo=tam)[0]
                lineas += [l for l in trozo if l]
            if len(lineas) <= 5:
                break
            tam -= 0.25
        lineas += [''] * (5 - len(lineas))
    for j, t in enumerate(lineas):
        f.subrayado(p2, f'Talento {j + 1}', 390.1, 551.6, TALENTOS_Y[j], t, tam=tam)

    # Notas
    conocidos = [n[0].lower() + n[1:] if n.split()[0] in ('El', 'La') else n for n, _ in ([] if vacio else p['conoce'])]
    notas = '' if vacio else ('Conoce en el barco a ' + ' y '.join(conocidos) +
                              '. Su historia y la carta de Guerrero, en la hoja de trasfondo.')
    f.texto(p2, 'Notas', (386, 534, 557, 583), notas, tam=8.5, multilinea=True)
    f.cerrar()


# ----------------------------------------------------------------- hoja de trasfondo (Chrome)
def hoja_trasfondo(p):
    cuerpo = ''.join('<p>%s</p>' % e(t) for t in p['quien'])
    conoce = '<ul>' + ''.join('<li><b>%s</b>: %s</li>' % (e(n), e(t)) for n, t in p['conoce']) + '</ul>'
    return '''<section class="hoja">
  <header class="cab"><p class="sello">Pulp Cthulhu &middot; La Marca del Estrecho &middot; Trasfondo</p>
  <h1 class="nombre">%s</h1><p class="sub">%s &middot; %s</p></header>
  <div class="prosa">%s</div>
  <div class="bloque"><h3>Por qué te escribía Paco Guerrero</h3><p>%s</p></div>
  <div class="bloque"><h3>A quién conoces en el barco</h3>%s</div>
  <div class="bloque"><h3>Por qué no le contestaste <small>(se decide en la sesión cero)</small></h3><div class="lineas">%s</div></div>
  <div class="bloque notas"><h3>Notas</h3><div class="lineas">%s</div></div>
</section>''' % (e(p['nombre']), e(p['ocupacion']), e(p['arquetipo']), cuerpo, e(p['guerrero']), conoce,
                 '<i></i>' * 4, '<i></i>' * 14)


CSS_TRASFONDO = r'''
:root{--papel:#f7efdf;--tinta:#1d1812;--tinta2:#4a3f30;--rojo:#c0443a;--azul:#2b2f6b;--regla:#c9b48e}
*{box-sizing:border-box}
@page{size:210mm 273mm;margin:0}
body{margin:0;font-family:'EB Garamond',Georgia,serif;color:var(--tinta)}
.hoja{width:210mm;height:273mm;padding:12mm 14mm 11mm;background:var(--papel);position:relative;display:flex;flex-direction:column;gap:3mm;overflow:hidden}
.hoja::before{content:"";position:absolute;inset:5mm;border:1.6pt solid var(--azul);outline:.6pt solid var(--rojo);outline-offset:1.2mm;pointer-events:none}
.cab{text-align:center;border-bottom:1.2pt solid var(--rojo);padding-bottom:2mm}
.sello{margin:0;font-family:'Alegreya Sans SC',sans-serif;font-weight:700;font-size:7.5pt;letter-spacing:.25em;color:var(--rojo)}
.nombre{margin:.5mm 0 0;font-family:'Bangers','Alegreya Sans',sans-serif;font-weight:400;font-size:26pt;letter-spacing:.03em;color:var(--azul);line-height:1.05}
.sub{margin:.5mm 0 0;font-family:'Alegreya Sans',sans-serif;font-style:italic;font-size:10pt;color:var(--tinta2)}
.prosa{column-count:2;column-gap:7mm;font-size:10.8pt;line-height:1.36;text-align:justify;hyphens:auto}
.prosa p{margin:0 0 2mm}
.bloque h3{margin:0 0 1.2mm;font-family:'Alegreya Sans',sans-serif;font-style:italic;font-weight:800;font-size:9.5pt;color:var(--azul);border-bottom:.6pt solid var(--rojo);padding-bottom:.5mm}
.bloque h3 small{font-weight:400;color:var(--tinta2)}
.bloque p,.bloque li{font-size:10.4pt;line-height:1.35;margin:0}
.bloque ul{margin:0;padding-left:4mm}
.lineas i{display:block;height:7mm;border-bottom:.5pt solid #8d86a8}
.notas{flex:1 1 0;min-height:0;overflow:hidden}
'''
FUENTES_TRASFONDO = ('<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&'
                     'family=Bangers&family=Alegreya+Sans:ital,wght@0,400;0,800;1,400;1,800&'
                     'family=Alegreya+Sans+SC:wght@700&display=swap" rel="stylesheet">')


def chrome():
    ruta = os.environ.get('CHROME') or next((c for c in (
        r'C:/Program Files/Google/Chrome/Application/chrome.exe',
        r'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome') if os.path.exists(c)), None)
    if not ruta:
        raise SystemExit('No encuentro Chrome: indica la ruta con la variable CHROME.')
    return ruta


def trasfondo_pdf(p):
    """La hoja de trasfondo como documento PyMuPDF de una página."""
    doc_html = ('<!doctype html><html lang="es"><head><meta charset="utf-8">%s<style>%s</style></head>'
                '<body>%s</body></html>' % (FUENTES_TRASFONDO, CSS_TRASFONDO, hoja_trasfondo(p)))
    with tempfile.TemporaryDirectory() as tmp:
        f, destino = os.path.join(tmp, 'f.html'), os.path.join(tmp, 'f.pdf')
        open(f, 'w', encoding='utf-8').write(doc_html)
        subprocess.run([chrome(), '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000',
                        '--user-data-dir=' + os.path.join(tmp, 'perfil'), '--print-to-pdf=' + destino,
                        'file:///' + f.replace('\\', '/')], check=True, capture_output=True)
        doc = pymupdf.open(destino)
        doc = pymupdf.open('pdf', doc.tobytes())  # en memoria, para poder borrar el temporal
    if len(doc) != 1:
        raise SystemExit(f'La hoja de trasfondo de {p["nombre"]} ocupa {len(doc)} páginas.')
    return doc


def campos_trasfondo(doc, n_pag, prefijo):
    """Un campo sobre cada raya en blanco de la hoja de trasfondo."""
    pag = doc[n_pag]
    tope = pag.search_for('Por qué no le contestaste')[0].y1
    notas = pag.search_for('Notas')[-1].y1
    rayas = sorted({(round(r.x0, 1), round(r.x1, 1), round(r.y0, 1))
                    for r, color in ((dr['rect'], dr.get('fill') or (0, 0, 0)) for dr in pag.get_drawings())
                    if r.height < 1.2 and r.width > 300 and r.y0 > tope + 5
                    and color[2] > color[0]})  # las rayas son azuladas; los filetes de los títulos, rojos
    f = Ficha(doc, n_pag - 1, prefijo)
    cuenta = {}
    for x0, x1, y in rayas:
        nombre = 'Por qué no le contestaste' if y < notas else 'Notas de la hoja 3'
        cuenta[nombre] = cuenta.get(nombre, 0) + 1
        f.subrayado(pag, f'{nombre} {cuenta[nombre]}', x0, x1, y)


# ----------------------------------------------------------------- documentos
def ficha_completa(doc, p, prefijo=''):
    n = len(doc)
    doc.insert_pdf(pymupdf.open(PLANTILLA))
    rellenar(doc, n, p, prefijo, PERSONAJES)
    doc.insert_pdf(trasfondo_pdf(p))
    campos_trasfondo(doc, n + 2, prefijo)


def generar_pdfs():
    os.makedirs(PDFS, exist_ok=True)
    asunto, creador = 'La Marca del Estrecho · Pulp Cthulhu', 'herramientas/fichas-marca/generar.py'
    todos = pymupdf.open()
    for p in PERSONAJES:
        doc = pymupdf.open()
        ficha_completa(doc, p)
        guardar(doc, os.path.join(PDFS, p['id'] + '.pdf'), f'{p["nombre"]} · Ficha de investigador', asunto, creador, RAIZ)
        vistas(doc, PDFS, p['id'], 3)
        ficha_completa(todos, p, prefijo=p['id'] + ' / ')
    guardar(todos, os.path.join(PDFS, 'todos.pdf'), 'Investigadores pregenerados · La Marca del Estrecho', asunto, creador, RAIZ)
    blanco = pymupdf.open()
    blanco.insert_pdf(pymupdf.open(PLANTILLA))
    rellenar(blanco, 0, None)
    guardar(blanco, os.path.join(PDFS, 'ficha-en-blanco.pdf'), 'Ficha de héroe pulp', asunto, creador, RAIZ)


# ----------------------------------------------------------------- página web
def pagina_web():
    tarjetas = ''
    for p in PERSONAJES:
        caras = ''.join(
            '<a href="investigadores/{id}.pdf"><img src="investigadores/{id}-{n}.jpg" width="827" height="1075" '
            'loading="lazy" alt="{alt}"></a>'.format(id=p['id'], n=n, alt=e(alt % p['nombre']))
            for n, alt in ((1, 'Ficha de %s, anverso: características y habilidades'),
                           (2, 'Ficha de %s, reverso: trasfondo, equipo y talentos'),
                           (3, 'Hoja de trasfondo de %s')))
        resumen = p['quien'][0].split('. ')[0].rstrip('.') + '.'
        tarjetas += '''
  <article class="pj">
    <div class="caras">%s</div>
    <h2>%s</h2>
    <p class="ocupa">%s &middot; %s &middot; %d años</p>
    <p>%s</p>
    <a class="boton" href="investigadores/%s.pdf" download>Descargar la ficha (PDF)</a>
  </article>''' % (caras, e(p['nombre']), e(p['ocupacion']), e(p['arquetipo']), p['edad'], e(resumen), p['id'])
    return '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Los investigadores · La Marca del Estrecho</title>
<meta name="description" content="Los seis investigadores pregenerados de La Marca del Estrecho, una aventura de Pulp Cthulhu en Ceuta en 1921, en la ficha oficial y en PDF rellenable.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=IM+Fell+English&family=Alegreya+Sans:wght@400;700&family=Alegreya+Sans+SC:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--papel:#fbf7ec;--tinta:#1d1812;--tinta2:#4a3f30;--ocre:#a8780f;--sangre:#7b2019;--regla:#cdbd97}
*{box-sizing:border-box}
body{margin:0;background:#2a241c;color:var(--tinta);font-family:'EB Garamond',Georgia,serif;font-size:1.08rem;line-height:1.45}
a{color:var(--sangre);text-decoration:none}
.barra{max-width:62rem;margin:0 auto;padding:1rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:'Alegreya Sans',sans-serif;color:#d8c9a4}
.barra a{color:#e8c86a}
main{max-width:62rem;margin:.4rem auto 2.4rem;padding:2.6rem 2.6rem 2rem;background:var(--papel);box-shadow:0 10px 30px rgba(0,0,0,.45);position:relative}
main::before{content:"";position:absolute;inset:.7rem;border:.6pt solid var(--regla);outline:.3pt solid var(--regla);outline-offset:3px;pointer-events:none}
h1{font-family:'IM Fell English',Georgia,serif;font-weight:400;font-size:2.4rem;line-height:1.1;margin:0 0 .5rem;text-align:center}
.sello{margin:0;text-align:center;font-family:'Alegreya Sans SC',sans-serif;font-size:.8rem;letter-spacing:.25em;text-transform:uppercase;color:var(--ocre)}
.entrada{max-width:42rem;margin:0 auto 1.4rem;text-align:center}
.descargas{display:flex;gap:.8rem;justify-content:center;flex-wrap:wrap;margin:1rem 0 .4rem}
.boton{display:inline-block;padding:.5rem 1.1rem;border:2px solid var(--tinta);font-family:'Alegreya Sans',sans-serif;font-weight:700;font-size:.95rem;background:#fff;color:var(--tinta)}
.boton:hover{background:var(--tinta);color:var(--papel)}
.boton.sec{border-width:1px;font-weight:400}
.ayuda{font-family:'Alegreya Sans',sans-serif;font-size:.93rem;color:var(--tinta2);border-top:1px solid var(--regla);border-bottom:1px solid var(--regla);padding:.8rem 0;margin:1.2rem 0 2rem}
.ayuda p{margin:0 0 .5em}.ayuda p:last-child{margin:0}
.pjs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,17.5rem),1fr));gap:2.4rem 2rem}
.pj h2{font-family:'IM Fell English',Georgia,serif;font-weight:400;font-size:1.55rem;margin:.7rem 0 0}
.pj .ocupa{font-family:'Alegreya Sans SC',sans-serif;font-weight:700;font-size:.85rem;letter-spacing:.04em;color:var(--sangre);margin:0 0 .4rem}
.pj p{margin:0 0 .8rem}
.caras{display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem}
.caras a{display:block}
.caras img{display:block;width:100%;height:auto;box-shadow:0 4px 12px -4px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.15);transition:transform .15s}
.caras a:hover img{transform:translateY(-2px)}
.aviso{font-size:.85rem;color:#7a6f5c;margin:2.4rem 0 0;text-align:center}
@media (max-width:640px){main{padding:2rem 1.1rem 1.6rem;margin:.2rem 0 1.4rem}h1{font-size:1.9rem}}
</style>
</head>
<body>
<nav class="barra"><a href="/la-marca-del-estrecho/players">&laquo; La Marca del Estrecho &middot; Jugadores</a><a href="/">rpg&middot;nephei</a></nav>
<main>
  <p class="sello">Pulp Cthulhu &middot; Ceuta, septiembre de 1921</p>
  <h1>Los investigadores</h1>
  <div class="entrada">
    <p>Seis personas a las que Paco Guerrero tenía en su agenda bajo «los que saben de estas cosas», en la ficha oficial de <i>Pulp Cthulhu</i>. Cada PDF trae las dos caras de la ficha y una tercera hoja con su historia, el motivo por el que le escribía Guerrero y a quién conoce ya en el barco.</p>
    <div class="descargas">
      <a class="boton" href="investigadores/todos.pdf" download>Descargar los seis</a>
      <a class="boton sec" href="investigadores/ficha-en-blanco.pdf" download>Ficha en blanco</a>
    </div>
  </div>
  <div class="ayuda">
    <p><b>Son editables.</b> Ábrelas con Adobe Acrobat Reader, con el navegador o con cualquier lector de PDF que admita formularios, escribe encima y guarda: los cambios se quedan en el archivo. Las líneas en blanco de la hoja de trasfondo también se pueden rellenar.</p>
    <p>En las pistas de Puntos de vida, Cordura, Suerte y Puntos de magia, el círculo marca el valor actual. Haz clic en un número para rodearlo y vuelve a hacer clic en el que tenía el círculo para quitárselo. Las casillas junto a cada habilidad son para las tiradas de mejora.</p>
  </div>
  <div class="pjs">{{TARJETAS}}
  </div>
  <p class="aviso">Ficha de héroe de <i>Pulp Cthulhu</i> &copy; Chaosium Inc. y Edge Studio, rellenada para esta aventura sin ánimo de lucro.</p>
</main>
</body>
</html>
'''.replace('{{TARJETAS}}', tarjetas)


if __name__ == '__main__':
    open(os.path.join(PUBLIC, 'fichas.html'), 'w', encoding='utf-8', newline='\n').write(pagina_web())
    print('   fichas.html')
    if '--sin-pdf' not in sys.argv:
        generar_pdfs()
