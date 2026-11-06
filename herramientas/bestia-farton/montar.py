# -*- coding: utf-8 -*-
"""Monta public/vieja-escuela/la-bestia-de-farton/aventura.html a partir de cuerpo.html.

    python montar.py        escribe aventura.html (y, la primera vez, cuaderno.css y paginador.js)
    python montar.py pdf    además regenera aventura.pdf con Chrome headless (hace falta un servidor en public/, ver abajo)

cuaderno.css y paginador.js salen de la hoja y el paginador de La maldición del Palacio de Linares (repo público), sin
lo que es propio de Cthulhu; luego se editan a mano en public/. El texto de la OGL se saca del PDF original.
Para el PDF: cd public && python -m http.server 8765
"""
import os, re, subprocess, sys
import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..', '..', 'public'))
DEST = os.path.join(RAIZ, 'vieja-escuela', 'la-bestia-de-farton')
LINARES = os.path.join(RAIZ, 'la-maldicion-de-linares', 'aventura.html')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
sys.stdout.reconfigure(encoding='utf-8')

CABEZA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>La Bestia de Farton · Cuaderno del máster</title>
<meta name="description" content="Cuaderno del máster de La Bestia de Farton, aventura de iniciación para Vieja Escuela: el juego de rol, con escenas, voces, consejos de dirección y hoja de control. Contiene spoilers.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Alegreya:wght@700;800;900&family=Alegreya+SC:wght@700;800&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;0,800;1,400;1,500&family=Alegreya+Sans+SC:wght@500;700&family=Marcellus+SC&family=Special+Elite&family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=UnifrakturMaguntia&display=swap">
<link rel="stylesheet" href="cuaderno.css?v=1">
</head>
<body>
"""


def ogl():
    doc = pymupdf.open(r'D:\Descargas\La_Bestia_de_Farton.pdf')
    t = doc[12].get_text()
    t = t[t.index('OPEN GAME LICENSE'):]
    t = t.replace('\xad\n', '').replace('\xad', '')
    t = re.sub(r'\s+', ' ', t)
    t = t.replace('OPEN GAME LICENSE Version 1.0a ', '').strip()
    fin = t.index('15. COPYRIGHT NOTICE')
    cuerpo, _ = t[:fin], t[fin:]
    partes = re.split(r'(?=(?:^| )\d{1,2}\. ?(?:Definitions|The License|Offer|Grant|Representation|Notice of|Use of Product|Identification|Updating|Copy of|Use of Contributor|Inability|Termination|Reformation))', cuerpo)
    html = ['<h4>OPEN GAME LICENSE Version 1.0a</h4>']
    html.append(f'<p>{partes[0].strip()}</p>')
    html += [f'<p>{p.strip()}</p>' for p in partes[1:]]
    html.append('<p>15. COPYRIGHT NOTICE<br>Open Game License v 1.0a Copyright 2000, Wizards of the Coast, Inc.<br>'
                'Vieja Escuela Copyright 2016, Eneko Palencia y Eneko Menica.<br>'
                'Vieja Escuela: el juego de rol Copyright 2017, Javier García “cabohicks”.<br>'
                'Vieja Escuela: el juego de rol, edición revisada Copyright 2026, Javier García “cabohicks”.<br>'
                'La Bestia de Farton, Iñaki Raya, grapas&amp;mapas.<br>'
                'La Bestia de Farton: cuaderno del máster Copyright 2026, rpg.nephei.org.</p>')
    return '\n'.join(html)


def hoja_y_paginador():
    """La hoja y el paginador de Linares, sin los adornos propios de Cthulhu (solo la primera vez)."""
    css_ruta, js_ruta = os.path.join(DEST, 'cuaderno.css'), os.path.join(DEST, 'paginador.js')
    if os.path.exists(css_ruta) and os.path.exists(js_ruta):
        return
    s = open(LINARES, encoding='utf8').read()
    css = re.search(r'<style>\s*(.*?)</style>', s, re.S).group(1)
    js = re.search(r'<script id="paginador">\s*(.*?)</script>', s, re.S).group(1)
    # Fuera los tentáculos: las URL de imagen embebidas en estos tres selectores
    css = re.sub(r'(\.marco-titulo::before\{[^}]*?)background-image:url\("data:[^"]*"\);?', r'\1', css)
    css = re.sub(r'(\.marco-titulo::after\{[^}]*?)background-image:url\("data:[^"]*"\);?', r'\1', css)
    css = re.sub(r'(\.nota::after\{[^}]*?)background:url\("data:[^"]*"\)[^;}]*;?', r'\1', css)
    for a, b in [('LA MALDICIÓN DEL PALACIO DE LINARES', 'LA BESTIA DE FARTON'), ('LA LLAMADA DE CTHULHU', 'VIEJA ESCUELA')]:
        css, js = css.replace(a, b), js.replace(a, b)
    open(css_ruta, 'w', encoding='utf8', newline='').write(css.strip() + '\n')
    open(js_ruta, 'w', encoding='utf8', newline='').write(js.strip() + '\n')
    print('   cuaderno.css', len(css) // 1024, 'KB; paginador.js', len(js) // 1024, 'KB')


def main():
    hoja_y_paginador()
    cuerpo = open(os.path.join(AQUI, 'cuerpo.html'), encoding='utf8').read().replace('<!--OGL-->', ogl())
    html = CABEZA + cuerpo + '\n<script src="paginador.js?v=1"></script>\n</body>\n</html>\n'
    open(os.path.join(DEST, 'aventura.html'), 'w', encoding='utf8', newline='').write(html)
    print('   aventura.html', len(html) // 1024, 'KB')
    if 'pdf' in sys.argv:
        pdf = os.path.join(DEST, 'aventura.pdf')
        subprocess.run([CHROME, '--headless=new', '--no-pdf-header-footer', '--virtual-time-budget=30000', '--print-to-pdf=' + pdf,
                        'http://localhost:8765/vieja-escuela/la-bestia-de-farton/aventura.html?paginar'], check=False, capture_output=True)
        doc = pymupdf.open(pdf)
        print('   aventura.pdf', len(doc), 'páginas,', os.path.getsize(pdf) // 1024, 'KB')


if __name__ == '__main__':
    main()
