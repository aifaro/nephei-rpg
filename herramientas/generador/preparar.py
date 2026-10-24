# -*- coding: utf-8 -*-
"""Prepara los archivos del generador de personajes (rpg.nephei.org/generador).

    python preparar.py

El generador funciona entero en el navegador: pinta la ficha oficial de fondo, pone encima un campo
por cada campo del PDF rellenable y, al descargar, rellena ese mismo PDF con pdf-lib. Este programa
saca de los dos generadores de pregenerados (fichas-linares y fichas-marca) lo que necesita:

    public/generador/coc.pdf, pulp.pdf          las fichas en blanco con campos de formulario
    public/generador/coc-1.jpg … pulp-2.jpg     el fondo de cada cara, sin campos
    public/generador/fichas.json                posición, letra y alineación de cada campo, el hueco
                                                del retrato y qué campo es cada habilidad

Solo hay que volver a ejecutarlo si cambia la geometría de alguna de las dos fichas.
Necesita PyMuPDF (pip install pymupdf).
"""
import importlib.util, json, os, sys
import pymupdf

AQUI = os.path.dirname(os.path.abspath(__file__))
HERR = os.path.join(AQUI, '..')
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'generador'))
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, HERR)

FICHAS = {
    'coc': dict(carpeta='fichas-linares', plantilla='coc-7ed-1920.pdf',
                titulo='La llamada de Cthulhu · 7.ª edición (años 20)',
                foto=(416, 22, 546, 127)),   # recuadro de la esquina superior derecha, sobre el logo
    'pulp': dict(carpeta='fichas-marca', plantilla='pulp-cthulhu-ficha.pdf',
                 titulo='Pulp Cthulhu',
                 foto=(416, 22, 566, 129)),
}
ETIQUETA = {'Ocultismo': 'Ciencias ocultas'}  # el campo se llama distinto de lo que pone la ficha


def cargar(clave, carpeta):
    """Importa el generar.py de una carpeta (los dos se llaman igual y traen su personajes.py)."""
    ruta = os.path.join(HERR, carpeta)
    sys.path.insert(0, ruta)
    sys.modules.pop('personajes', None)
    spec = importlib.util.spec_from_file_location('generar_' + clave, os.path.join(ruta, 'generar.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    sys.path.remove(ruta)
    return mod


def habilidades(clave, mod):
    """Cada fila de habilidad de la ficha: familia, etiqueta impresa, base y nombres de sus campos."""
    filas = []
    for c, col in enumerate(mod.HABILIDADES):
        for i, (nombre, base, mejora) in enumerate(col):
            if base == '':
                continue
            fila = f'{c + 1}-{i + 1}'
            h = {'fila': fila, 'mejora': bool(mejora)}
            if base is None:  # línea en blanco para una especialidad, o para cualquier otra habilidad
                h['familia'] = nombre
                if clave == 'coc':
                    h['nombre'], h['valor'] = f'Habilidad {fila}', f'{nombre or "Habilidad"} [{fila}]'
                else:
                    h['nombre'], h['valor'] = f'Habilidad {fila} (nombre)', f'Habilidad {fila}'
            elif base == 'EDU':
                h.update(habilidad='Lengua propia', base='EDU', nombre='Lengua propia (nombre)', valor='Lengua propia')
            else:
                h.update(habilidad=ETIQUETA.get(nombre, nombre), base=base, valor=nombre)
            filas.append(h)
    return filas


def campos(doc):
    res = []
    for n, pag in enumerate(doc):
        for w in pag.widgets():
            r = [round(v, 2) for v in w.rect]
            c = {'n': w.field_name, 'p': n, 'r': r}
            if w.field_type == pymupdf.PDF_WIDGET_TYPE_CHECKBOX:
                c['t'] = 'c'
            else:
                c['t'] = 't'
                c['tam'] = round(w.text_fontsize, 2)
                q = doc.xref_get_key(w.xref, 'Q')[1]
                if q in ('1', '2'):
                    c['q'] = int(q)
                if w.field_flags & pymupdf.PDF_TX_FIELD_IS_MULTILINE:
                    c['ml'] = 1
            res.append(c)
    return res


def main():
    os.makedirs(SALIDA, exist_ok=True)
    datos = {}
    for clave, f in FICHAS.items():
        mod = cargar(clave, f['carpeta'])
        plantilla = os.path.join(HERR, f['carpeta'], f['plantilla'])

        blanco = pymupdf.open()
        blanco.insert_pdf(pymupdf.open(plantilla))
        mod.rellenar(blanco, 0, None)
        blanco.set_metadata({'title': f'Ficha de investigador · {f["titulo"]}', 'author': 'rpg.nephei.org',
                             'creator': 'herramientas/generador/preparar.py'})
        blanco.save(os.path.join(SALIDA, clave + '.pdf'), garbage=4, deflate=True)

        limpio = pymupdf.open(plantilla)
        paginas = []
        for n in range(2):
            nombre = f'{clave}-{n + 1}.jpg'
            limpio[n].get_pixmap(dpi=150).save(os.path.join(SALIDA, nombre), jpg_quality=78)
            paginas.append({'fondo': nombre, 'w': round(limpio[n].rect.width, 2), 'h': round(limpio[n].rect.height, 2)})

        nombres = [c['n'] for c in campos(blanco)]
        repes = {n for n in nombres if nombres.count(n) > 1}
        if repes:
            raise SystemExit(f'{clave}: campos con el mismo nombre: {", ".join(sorted(repes))}')

        datos[clave] = {'titulo': f['titulo'], 'pdf': clave + '.pdf', 'paginas': paginas,
                        'foto': {'p': 0, 'r': list(f['foto'])}, 'campos': campos(blanco),
                        'habilidades': habilidades(clave, mod)}
        print('  ', clave, len(datos[clave]['campos']), 'campos,', len(datos[clave]['habilidades']), 'filas de habilidad')

    with open(os.path.join(SALIDA, 'fichas.json'), 'w', encoding='utf-8') as fh:
        json.dump(datos, fh, ensure_ascii=False, separators=(',', ':'))
    print('   public/generador/fichas.json')


if __name__ == '__main__':
    main()
