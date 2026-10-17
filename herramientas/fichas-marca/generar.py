# -*- coding: utf-8 -*-
"""Genera las fichas de los investigadores pregenerados de La Marca del Estrecho.

    python generar.py            → public/la-marca-del-estrecho/fichas.html y los PDF de fichas/
    python generar.py --sin-pdf  → solo el HTML

Los datos están en personajes.py. Los PDF los imprime Google Chrome (variable CHROME si no
está en la ruta habitual). Cada investigador ocupa dos hojas A4: la ficha y el trasfondo.
"""
import html, os, re, subprocess, sys, tempfile
from personajes import PERSONAJES, TALENTOS

AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'la-marca-del-estrecho'))
PDFS = os.path.join(PUBLIC, 'investigadores')
sys.stdout.reconfigure(encoding='utf-8')
e = html.escape

# ----------------------------------------------------------------- reglas
BASE = [  # habilidades de la 7.ª edición con su valor de base (None = se calcula)
    ('Antropología', 1), ('Armas de fuego (Arma corta)', 20), ('Armas de fuego (Fusil/Escopeta)', 25),
    ('Arqueología', 1), ('Arte/Artesanía', 5), ('Buscar libros', 20), ('Cerrajería', 1),
    ('Charlatanería', 5), ('Ciencia', 1), ('Combatir (Pelea)', 25), ('Conducir automóvil', 20),
    ('Contabilidad', 5), ('Crédito', 0), ('Derecho', 5), ('Descubrir', 25), ('Disfrazarse', 5),
    ('Electricidad', 10), ('Encanto', 15), ('Equitación', 5), ('Escuchar', 20), ('Esquivar', None),
    ('Historia', 5), ('Intimidar', 15), ('Juego de manos', 10), ('Lanzar', 20), ('Lengua propia', None),
    ('Mecánica', 10), ('Medicina', 1), ('Mitos de Cthulhu', 0), ('Nadar', 20), ('Naturaleza', 10),
    ('Ocultismo', 5), ('Orientarse', 10), ('Otras lenguas', 1), ('Persuasión', 10), ('Pilotar', 1),
    ('Primeros auxilios', 30), ('Psicoanálisis', 1), ('Psicología', 10), ('Saltar', 20),
    ('Seguir rastros', 10), ('Sigilo', 20), ('Supervivencia', 10), ('Tasación', 5), ('Trepar', 20),
]
FAMILIAS = {'Arte/Artesanía', 'Ciencia', 'Otras lenguas', 'Pilotar'}  # llevan especialidad


def derivados(p):
    c = p['car']
    fue_tam = c['FUE'] + c['TAM']
    if fue_tam <= 64: bd, corp = '−2', -2
    elif fue_tam <= 84: bd, corp = '−1', -1
    elif fue_tam <= 124: bd, corp = '0', 0
    elif fue_tam <= 164: bd, corp = '+1D4', 1
    else: bd, corp = '+1D6', 2
    if c['DES'] < c['TAM'] and c['FUE'] < c['TAM']: mov = 7
    elif c['DES'] > c['TAM'] and c['FUE'] > c['TAM']: mov = 9
    else: mov = 8
    edad = p['edad']
    mov -= 0 if edad < 40 else (edad - 30) // 10
    return {
        'PV': (c['CON'] + c['TAM']) // 5,  # Pulp Cthulhu: el doble que en la 7.ª edición
        'PM': c['POD'] // 5, 'Cordura': c['POD'], 'Suerte': p['suerte'],
        'MOV': mov, 'BD': bd, 'Corpulencia': corp,
    }


def habilidades(p):
    """Lista ordenada de (nombre, valor, mejorada) con las de base y las del personaje."""
    hab = dict(p['hab'])
    c = p['car']
    filas = []
    for nombre, base in BASE:
        if nombre in FAMILIAS:
            propias = sorted(k for k in hab if k.startswith(nombre + ' ('))
            for k in propias:
                filas.append((k, hab.pop(k), True))
            filas.append((nombre + ' (          )', base, False))
            continue
        if nombre == 'Esquivar':
            v = hab.pop('Esquivar', c['DES'] // 2)
            filas.append((nombre, v, v != c['DES'] // 2)); continue
        if nombre == 'Lengua propia':
            filas.append(('Lengua propia (%s)' % p['lengua'], c['EDU'], False)); continue
        v = hab.pop(nombre, base)
        filas.append((nombre, v, v != base))
    if hab:
        raise SystemExit('Habilidades desconocidas en %s: %s' % (p['nombre'], ', '.join(hab)))
    return filas


def valor(v):
    return '<span class="v">%02d</span><span class="m">%d</span><span class="q">%d</span>' % (v, v // 2, v // 5)


# ----------------------------------------------------------------- HTML
def hoja_ficha(p):
    blanca = p is None
    c = p['car'] if p else {k: None for k in ('FUE', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU')}
    d = derivados(p) if p else None
    def car(k):
        v = c[k]
        return '<div class="car"><b>%s</b>%s</div>' % (k, valor(v) if v is not None else '<span class="v"></span><span class="m"></span><span class="q"></span>')
    datos = [('Ocupación', p and p['ocupacion']), ('Arquetipo', p and p['arquetipo']), ('Edad', p and p['edad']),
             ('Sexo', p and p['sexo']), ('Lugar de nacimiento', p and p['nacimiento']), ('Residencia', p and p['residencia'])]
    datos_html = ''.join('<span><b>%s</b> %s</span>' % (k, e(str(v)) if v else '<i class="linea"></i>') for k, v in datos)

    def caja(titulo, maximo, nota=''):
        return '<div class="der"><b>%s</b><span class="max">%s</span><span class="act">actual</span>%s</div>' % (
            titulo, '' if maximo is None else maximo, nota)
    der = ''.join([
        caja('Puntos de vida', d and d['PV'], '<small>Herida grave: la mitad o más de golpe</small>'),
        caja('Cordura', d and d['Cordura'], '<small>Máx. 99 − Mitos de Cthulhu</small>'),
        caja('Suerte', d and d['Suerte']),
        caja('Puntos de magia', d and d['PM']),
    ])
    menores = ''.join('<span><b>%s</b> %s</span>' % (k, '' if not d else d[k]) for k in ('MOV', 'BD', 'Corpulencia'))

    filas = habilidades(p) if p else [((n + ' (          )') if n in FAMILIAS else ('Lengua propia (          )' if n == 'Lengua propia' else n), None, False) for n, _ in BASE]
    habs = []
    for nombre, v, mej in filas:
        val = valor(v) if (v is not None and not blanca) else '<span class="v"></span><span class="m"></span><span class="q"></span>'
        habs.append('<li class="%s"><i class="caja-mejora"></i><span class="n">%s</span>%s</li>' % ('sube' if mej else '', e(nombre), val))

    if blanca:
        talentos = '<li><b class="linea larga"></b></li><li><b class="linea larga"></b></li>'
    else:
        talentos = ''.join('<li><b>%s.</b> %s</li>' % (e(t), e(TALENTOS[t])) for t in p['talentos'])

    armas = [('Desarmado', 'Combatir (Pelea)', '1D3+BD', '—', '1', '—', '—')] + (p['armas'] if p else [])
    if not blanca:
        hv = dict((n, v) for n, v, _ in habilidades(p))
    filas_armas = ''
    for a in armas:
        pct = '' if blanca else '%d / %d / %d' % (hv[a[1]], hv[a[1]] // 2, hv[a[1]] // 5)
        filas_armas += '<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
            e(a[0]), pct, e(a[2]), e(a[3]), e(a[4]), e(a[5]), e(a[6]))
    for _ in range(4 - len(armas)):
        filas_armas += '<tr>' + '<td></td>' * 7 + '</tr>'

    return '''<section class="hoja ficha">
  <header class="cab">
    <p class="sello">Pulp Cthulhu &middot; La Marca del Estrecho &middot; Ceuta, septiembre de 1921</p>
    <h2 class="nombre">%(nombre)s</h2>
    <div class="datos">%(datos)s</div>
  </header>
  <div class="fila">
    <div class="bloque cars"><h3>Características</h3><div class="rejilla">%(cars)s</div></div>
    <div class="bloque ders"><h3>Atributos</h3><div class="rejilla2">%(der)s</div><div class="menores">%(menores)s</div></div>
  </div>
  <div class="bloque talentos"><h3>Talentos pulp</h3><ul>%(talentos)s</ul></div>
  <div class="bloque habs"><h3>Habilidades <small>&#9633; marca la casilla cuando la uses con éxito</small></h3><ul>%(habs)s</ul></div>
  <div class="bloque armas"><h3>Armas</h3>
    <table><thead><tr><th>Arma</th><th>Normal / Difícil / Extremo</th><th>Daño</th><th>Alcance</th><th>Ataques</th><th>Munición</th><th>Avería</th></tr></thead>
    <tbody>%(armas)s</tbody></table></div>
  <div class="fila pie">
    <div class="bloque"><h3>Equipo y posesiones</h3><p>%(pos)s</p></div>
    <div class="bloque dinero"><h3>Dinero</h3><p>%(dinero)s</p></div>
  </div>
</section>''' % dict(
        nombre=e(p['nombre']) if p else '<i class="linea larga"></i>',
        datos=datos_html, cars=''.join(car(k) for k in ('FUE', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU')),
        der=der, menores=menores, talentos=talentos, habs=''.join(habs), armas=filas_armas,
        pos=e(p['posesiones']) if p else '', dinero=e(p['dinero']) if p else '')


def hoja_trasfondo(p):
    if p is None:
        rasgos = ''.join('<dt>%s</dt><dd><i class="linea larga"></i></dd>' % k for k in
                         ('Descripción', 'Ideología y creencias', 'Allegados', 'Lugares significativos', 'Posesiones preciadas', 'Rasgos'))
        cuerpo = '<div class="lineas grande"></div>'
        guerrero = '<div class="lineas"></div>'
        conoce = '<div class="lineas"></div>'
        nombre = 'Trasfondo'
    else:
        rasgos = ''.join('<dt>%s</dt><dd>%s</dd>' % (e(k), e(v)) for k, v in p['rasgos'].items())
        cuerpo = ''.join('<p>%s</p>' % e(t) for t in p['quien'])
        guerrero = '<p>%s</p>' % e(p['guerrero'])
        conoce = '<ul>' + ''.join('<li><b>%s</b>: %s</li>' % (e(n), e(t)) for n, t in p['conoce']) + '</ul>'
        nombre = e(p['nombre'])
    return '''<section class="hoja trasfondo">
  <header class="cab">
    <p class="sello">Trasfondo</p>
    <h2 class="nombre">%s</h2>
  </header>
  <div class="prosa">%s</div>
  <div class="bloque"><h3>Por qué te escribía Paco Guerrero</h3>%s</div>
  <div class="bloque"><h3>A quién conoces en el barco</h3>%s</div>
  <div class="bloque"><h3>Rasgos</h3><dl>%s</dl></div>
  <div class="fila">
    <div class="bloque"><h3>Por qué no le contestaste <small>(se decide en la sesión cero)</small></h3><div class="lineas"></div></div>
    <div class="bloque"><h3>Heridas, secuelas, fobias y manías</h3><div class="lineas"></div></div>
  </div>
  <div class="bloque notas"><h3>Notas</h3><div class="lineas"></div></div>
</section>''' % (nombre, cuerpo, guerrero, conoce, rasgos)


CSS = r'''
:root{--papel:#fbf7ec;--tinta:#1d1812;--tinta2:#4a3f30;--ocre:#a8780f;--sangre:#7b2019;--regla:#cdbd97;--suave:#efe6cf;
 --f-texto:'EB Garamond',Georgia,serif;--f-titulo:'IM Fell English',Georgia,serif;--f-caja:'Alegreya Sans',Arial,sans-serif;--f-sc:'Alegreya Sans SC','Alegreya Sans',sans-serif}
*{box-sizing:border-box}
body{margin:0;background:#2a241c;color:var(--tinta);font-family:var(--f-texto)}
.barra{max-width:210mm;margin:0 auto;padding:1rem;display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;font-family:var(--f-caja);color:#d8c9a4}
.barra a{color:#e8c86a;text-decoration:none}
.intro{max-width:210mm;margin:0 auto 1rem;padding:0 1rem;color:#e9dfc6;font-family:var(--f-caja);font-size:1rem;line-height:1.5}
.intro h1{font-family:var(--f-titulo);font-weight:400;font-size:2.2rem;margin:.4rem 0 .6rem;color:#f1e3bd}
.intro .descargas{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(14rem,100%),1fr));gap:.4rem .9rem;margin:.8rem 0 0;padding:0;list-style:none}
.intro .descargas a{color:#e8c86a}
.hoja{width:210mm;height:297mm;margin:0 auto 8mm;padding:11mm 12mm 10mm;background:var(--papel);position:relative;overflow:hidden;display:flex;flex-direction:column;gap:2.6mm;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.hoja::before{content:"";position:absolute;inset:5mm;border:.6pt solid var(--regla);outline:.3pt solid var(--regla);outline-offset:1mm;pointer-events:none}
.cab{text-align:center;border-bottom:1.2pt double var(--ocre);padding-bottom:2mm}
.sello{margin:0;font-family:var(--f-sc);font-size:7.5pt;letter-spacing:.25em;text-transform:uppercase;color:var(--ocre)}
.nombre{margin:.5mm 0 1mm;font-family:var(--f-titulo);font-weight:400;font-size:24pt;line-height:1.05}
.datos{display:flex;flex-wrap:wrap;justify-content:center;gap:.6mm 5mm;font-family:var(--f-caja);font-size:8.5pt}
.datos b,.der b,.menores b,.car b{font-family:var(--f-sc);font-weight:700;color:var(--sangre);letter-spacing:.06em}
.bloque h3{margin:0 0 1.2mm;font-family:var(--f-sc);font-size:8.5pt;letter-spacing:.18em;text-transform:uppercase;color:var(--sangre);border-bottom:.5pt solid var(--regla);padding-bottom:.6mm}
.bloque h3 small{letter-spacing:0;text-transform:none;color:var(--tinta2);font-family:var(--f-caja);font-weight:400}
.fila{display:flex;gap:4mm}.fila>.bloque{flex:1}
.cars{flex:1.15!important}
.rejilla{display:grid;grid-template-columns:repeat(4,1fr);gap:1.4mm}
.car{min-height:11.5mm;border:.6pt solid var(--tinta2);background:#fff;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;align-items:center;padding:.8mm 1.4mm;font-family:var(--f-caja)}
.car b{grid-column:1/3;font-size:8pt}
.car .v{font-size:15pt;font-weight:700}
.car .m,.car .q{font-size:7.5pt;color:var(--tinta2);text-align:right;display:block}
.car .m{grid-row:2;grid-column:2;margin-top:-6mm}
.car .q{grid-row:2;grid-column:2}
.rejilla2{display:grid;grid-template-columns:1fr 1fr;gap:1.4mm}
.der{border:.6pt solid var(--tinta2);background:#fff;padding:.8mm 1.4mm;font-family:var(--f-caja);font-size:8pt;display:grid;grid-template-columns:1fr auto;align-items:baseline;min-height:13mm}
.der .max{font-size:14pt;font-weight:700;text-align:right}
.der .act{grid-column:1/3;font-size:6.5pt;color:#9a8f7a;border-bottom:.4pt dotted #9a8f7a}
.der small{grid-column:1/3;font-size:6pt;color:var(--tinta2)}
.menores{display:flex;justify-content:space-around;margin-top:1.4mm;font-family:var(--f-caja);font-size:9pt;border:.6pt solid var(--tinta2);background:#fff;padding:.8mm}
.menores span{font-weight:700}
.talentos ul{margin:0;padding:0;list-style:none;font-family:var(--f-caja);font-size:8.3pt;line-height:1.3;display:grid;grid-template-columns:1fr 1fr;gap:.4mm 4mm}
.talentos b{color:var(--sangre)}
.habs{flex:1}
.habs ul{margin:0;padding:0;list-style:none;columns:3;column-gap:4mm;column-rule:.4pt solid var(--regla);font-family:var(--f-caja);font-size:8.4pt}
.habs li{display:grid;grid-template-columns:2.6mm 1fr 6mm 4.6mm 4.6mm;align-items:center;gap:.8mm;border-bottom:.3pt dotted #c7b994;padding:2.15mm 0;break-inside:avoid}
.habs li.sube .n{font-weight:700}
.caja-mejora{width:2.3mm;height:2.3mm;border:.5pt solid var(--tinta2);display:inline-block}
.habs .v{font-weight:700;text-align:right;font-size:9pt}
.habs .m,.habs .q{text-align:right;color:var(--tinta2);font-size:6.6pt}
.armas table{width:100%;border-collapse:collapse;font-family:var(--f-caja);font-size:7.8pt}
.armas th{font-family:var(--f-sc);font-size:7pt;letter-spacing:.06em;text-align:left;background:var(--suave);border:.5pt solid var(--regla);padding:.6mm 1mm}
.armas td{border:.5pt solid var(--regla);padding:.6mm 1mm;height:5mm;background:#fff}
.pie p{margin:0;font-family:var(--f-caja);font-size:8pt;line-height:1.35;min-height:12mm}
.pie .dinero{flex:.55}
.linea{display:inline-block;min-width:22mm;border-bottom:.5pt solid var(--tinta2);height:3.5mm;vertical-align:bottom}
.linea.larga{min-width:60mm;width:100%}
.trasfondo .prosa{column-count:2;column-gap:6mm;font-size:10.8pt;line-height:1.38;text-align:justify;hyphens:auto}
.trasfondo .prosa p{margin:0 0 2mm}
.trasfondo .bloque p,.trasfondo .bloque li{font-size:10.4pt;line-height:1.35;margin:0}
.trasfondo .bloque ul{margin:0;padding-left:4mm}
.trasfondo dl{display:grid;grid-template-columns:36mm 1fr;gap:.8mm 3mm;margin:0;font-size:9.6pt;line-height:1.3}
.trasfondo dt{font-family:var(--f-sc);font-size:8pt;letter-spacing:.06em;color:var(--sangre);padding-top:.6mm}
.trasfondo dd{margin:0}
.lineas{height:22mm;background-image:linear-gradient(to bottom,transparent calc(100% - .25mm),#b9ab88 calc(100% - .25mm));background-size:100% 7mm}
.lineas.grande{height:70mm}
.notas{flex:1 1 0;display:flex;flex-direction:column;min-height:0}.notas .lineas{flex:1 1 0;height:auto}
@page{size:A4;margin:0}
@media print{
  body{background:none}
  .barra,.intro{display:none}
  .hoja{margin:0;box-shadow:none;break-after:page}
  .solo-pantalla{display:none}
}
@media screen and (max-width:820px){.hoja{width:auto;height:auto;margin:0 .5rem 1.5rem;padding:7mm 5mm}.fila{flex-direction:column}.rejilla{grid-template-columns:repeat(2,1fr)}.talentos ul{grid-template-columns:1fr}.habs ul{columns:1}.armas{overflow-x:auto}.trasfondo .prosa{column-count:1}.trasfondo dl{grid-template-columns:1fr}.lineas.grande,.notas .lineas{height:30mm}}
'''

FUENTES = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
           '<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=IM+Fell+English&'
           'family=Alegreya+Sans:wght@400;700&family=Alegreya+Sans+SC:wght@500;700&display=swap" rel="stylesheet">')


def documento(titulo, cuerpo, intro=''):
    return '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<meta name="description" content="Los investigadores pregenerados de La Marca del Estrecho, una aventura de Pulp Cthulhu en Ceuta en 1921: fichas y trasfondos para imprimir.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
%s
<style>%s</style>
</head>
<body>
%s
%s
</body>
</html>
''' % (e(titulo), FUENTES, CSS, intro, cuerpo)


def pagina_web():
    descargas = ''.join('<li><a href="/la-marca-del-estrecho/investigadores/%s.pdf">%s</a> <small>(PDF, 2 hojas)</small></li>' % (p['id'], e(p['nombre'])) for p in PERSONAJES)
    intro = '''<nav class="barra"><a href="/la-marca-del-estrecho/players">&laquo; La Marca del Estrecho &middot; Jugadores</a><a href="/">rpg&middot;nephei</a></nav>
<div class="intro">
  <h1>Los investigadores</h1>
  <p>Seis personas a las que Paco Guerrero tenía en su agenda bajo «los que saben de estas cosas». Cada una lleva dos hojas: la ficha de Pulp Cthulhu y su trasfondo, con el motivo por el que le escribía Guerrero y a quién conoce ya en el barco. Imprímelas a doble cara.</p>
  <ul class="descargas">%s
    <li><a href="/la-marca-del-estrecho/investigadores/todos.pdf">Las seis, juntas</a> <small>(PDF, 12 hojas)</small></li>
    <li><a href="/la-marca-del-estrecho/investigadores/ficha-en-blanco.pdf">Ficha en blanco</a> <small>(PDF, 2 hojas)</small></li>
  </ul>
</div>''' % descargas
    cuerpo = '\n'.join(hoja_ficha(p) + '\n' + hoja_trasfondo(p) for p in PERSONAJES)
    return documento('Los investigadores · La Marca del Estrecho', cuerpo, intro)


def imprimir(html_texto, destino):
    chrome = os.environ.get('CHROME') or next((c for c in (
        r'C:/Program Files/Google/Chrome/Application/chrome.exe',
        r'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome') if os.path.exists(c)), None)
    if not chrome:
        raise SystemExit('No encuentro Chrome: indica la ruta con la variable CHROME.')
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, 'f.html')
        open(f, 'w', encoding='utf-8').write(html_texto)
        subprocess.run([chrome, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=20000',
                        '--user-data-dir=' + os.path.join(tmp, 'perfil'), '--print-to-pdf=' + destino,
                        'file:///' + f.replace('\\', '/')], check=True, capture_output=True)
    print('PDF:', os.path.relpath(destino, PUBLIC).replace(os.sep, '/'))


if __name__ == '__main__':
    os.makedirs(PDFS, exist_ok=True)
    web = pagina_web()
    open(os.path.join(PUBLIC, 'fichas.html'), 'w', encoding='utf-8', newline='\n').write(web)
    print('HTML: fichas.html')
    if '--sin-pdf' in sys.argv:
        sys.exit()
    for p in PERSONAJES:
        imprimir(documento(p['nombre'], hoja_ficha(p) + hoja_trasfondo(p)), os.path.join(PDFS, p['id'] + '.pdf'))
    imprimir(documento('Los investigadores', '\n'.join(hoja_ficha(p) + hoja_trasfondo(p) for p in PERSONAJES)),
             os.path.join(PDFS, 'todos.pdf'))
    imprimir(documento('Ficha en blanco', hoja_ficha(None) + hoja_trasfondo(None)), os.path.join(PDFS, 'ficha-en-blanco.pdf'))
