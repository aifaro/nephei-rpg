# -*- coding: utf-8 -*-
"""Hoja de personaje de Vieja Escuela: el juego de rol (edición revisada, grapas&mapas, CC BY-SA) con campos de formulario.

    python generar.py            saca la plantilla y las fichas de los aventureros de La Bestia de Farton
    python generar.py plantilla  solo la plantilla (vieja-escuela.pdf)

La hoja original es un A4 con dos fichas iguales en A5 apaisado, una encima de otra. La plantilla es solo la de
arriba, en un A5 de verdad (sigue siendo vectorial). Campos en Times, la más parecida a la letra de la hoja.
El generador de personajes (herramientas/generador/preparar.py) importa este módulo y llama a rellenar(doc, 0, None).

Necesita PyMuPDF (pip install pymupdf).
"""
import os, sys
import pymupdf

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from formulario import Ficha, guardar, vistas

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGINAL = r'D:\Descargas\vieja_escuela_hoja_personaje_A4.pdf'
PLANTILLA = os.path.join(AQUI, 'vieja-escuela.pdf')
SALIDA = os.path.normpath(os.path.join(AQUI, '..', '..', 'public', 'vieja-escuela', 'la-bestia-de-farton', 'aventureros'))
sys.stdout.reconfigure(encoding='utf-8')
ANCHO, ALTO = 595.28, 419.53  # A5 apaisado

# Geometría, en puntos, sacada de las rayas de la propia hoja
ATRIBUTOS = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR']
HABILIDADES_VE = ['Alerta', 'Comunicación', 'Manipulación', 'Erudición', 'Subterfugio', 'Supervivencia']
FILAS = [(236.0, 255.9), (264.4, 284.3), (292.9, 312.8), (321.4, 341.3), (349.9, 369.8), (378.4, 398.3)]
EQUIPO_Y = [227.9, 246.2, 263.0, 280.2, 297.0, 313.9, 330.8, 347.9, 364.7, 381.7, 398.8]
ARMAS_Y = [227.3, 245.7, 262.5, 279.6, 296.5, 313.4, 330.2, 347.4, 364.2]
FOTO = (434.5, 28.3, 540.2, 133)   # la mitad de arriba del recuadro de la derecha; abajo, las ambiciones
AMBICIONES = (435.5, 134, 539.2, 198.5)


def habilidades():
    return []


def plantilla():
    src = pymupdf.open(ORIGINAL)
    # Se borra de verdad la ficha de abajo: si solo se recortara, seguiría dentro del PDF (3,5 MB en vez de 1,8)
    src[0].add_redact_annot(pymupdf.Rect(0, ALTO, ANCHO, src[0].rect.height))
    src[0].apply_redactions(images=0, graphics=2, text=0)
    doc = pymupdf.open()
    pag = doc.new_page(width=ANCHO, height=ALTO)
    pag.show_pdf_page(pag.rect, src, 0, clip=pymupdf.Rect(0, 0, ANCHO, ALTO))
    doc.set_metadata({'title': 'Hoja de personaje · Vieja Escuela: el juego de rol', 'author': 'grapas&mapas (CC BY-SA 4.0)'})
    doc.save(PLANTILLA, garbage=4, deflate=True)
    print('  ', os.path.basename(PLANTILLA), os.path.getsize(PLANTILLA) // 1024, 'KB')


def rellenar(doc, n_pag, p=None, prefijo=''):
    f = Ficha(doc, n_pag, prefijo)
    pg = f.p1
    v = (p or {}).get
    t = lambda n, r, tam=10, **kw: f.texto(pg, n, r, v(n, ''), tam=tam, **kw)

    t('Nombre', (205, 29, 424, 47.5), 13)
    t('Raza', (205, 58, 280, 76.5), 11)
    t('Clase', (349, 58, 424, 76.5), 11)
    t('Nivel', (108, 86.5, 135, 104.5), 12, alin=1)
    t('PX', (108, 115, 135, 133), 12, alin=1)
    t('MOV', (108, 152, 135, 170), 12, alin=1)
    t('INS', (108, 180, 135, 198), 12, alin=1)
    t('Trasfondo 1', (207, 92, 423, 105), 9.5)
    t('Trasfondo 2', (150, 109, 423, 122.2), 9.5)
    t('Talentos 1', (207, 139, 423, 152), 9.5)
    t('Talentos 2', (150, 156, 423, 169), 9.5)
    t('PV actuales', (174, 179.5, 195, 193.5), 11, alin=1)
    t('PV totales', (195.5, 179.5, 217, 193.5), 11, alin=1)
    t('POD actuales', (256, 179.5, 276, 193.5), 11, alin=1)
    t('POD totales', (276.5, 179.5, 298, 193.5), 11, alin=1)
    t('ATQ', (339, 180, 361, 198), 12, alin=1)
    t('DEF', (403, 180, 425, 198), 12, alin=1)
    for k, (y0, y1) in zip(ATRIBUTOS, FILAS):
        t(k, (93, y0, 113.8, y1 - 5), 11, alin=1)
        t(k + ' mod', (114.4, y0, 135.6, y1 - 5), 11, alin=1)
    for k, (y0, y1) in zip(HABILIDADES_VE, FILAS):
        t(k, (199.5, y0, 217.5, y1), 11, alin=1)
    n = 1
    for x0, x1 in ((227, 293.8), (294.6, 361.6)):
        for y0, y1 in zip(EQUIPO_Y, EQUIPO_Y[1:]):
            t(f'Equipo {n}', (x0, y0 + 2.5, x1, y1 - .5), 8.5)
            n += 1
    for i, (y0, y1) in enumerate(zip(ARMAS_Y, ARMAS_Y[1:]), 1):
        y = y0 + (4.5 if i == 1 else 2.5)  # en la primera fila están los rótulos «daño» y «notas»
        t(f'Arma {i}', (371.2, y, 455, y1 - .5), 8.5)
        t(f'Arma {i} daño', (455.8, y, 497.8, y1 - .5), 8.5, alin=1)
        t(f'Arma {i} notas', (498.5, y, 540.2, y1 - .5), 7.5)
    t('mo', (413.5, 373.6, 432.2, 387.5), 10, alin=1)
    t('mp', (432.8, 373.6, 455.2, 387.5), 10, alin=1)
    t('mc', (455.7, 373.6, 477.8, 387.5), 10, alin=1)
    t('Tesoro', (478.5, 374, 540, 393), 8)
    f.texto(pg, 'Ambiciones', AMBICIONES, v('Ambiciones', ''), tam=7.5, multilinea=True)
    return f


def main():
    if not os.path.exists(PLANTILLA) or 'plantilla' in sys.argv:
        plantilla()
    if 'plantilla' in sys.argv:
        return
    from personajes import PERSONAJES
    os.makedirs(SALIDA, exist_ok=True)
    blanco = pymupdf.open(PLANTILLA)
    rellenar(blanco, 0, None)
    guardar(blanco, os.path.join(SALIDA, 'ficha-en-blanco.pdf'), 'Ficha en blanco · Vieja Escuela: el juego de rol', '', 'herramientas/fichas-ve/generar.py', AQUI)
    todos = pymupdf.open()
    for i, p in enumerate(PERSONAJES):
        doc = pymupdf.open(PLANTILLA)
        rellenar(doc, 0, p)
        guardar(doc, os.path.join(SALIDA, p['archivo'] + '.pdf'), p['Nombre'] + ' · La Bestia de Farton', 'Aventurero pregenerado', 'herramientas/fichas-ve/generar.py', AQUI)
        vistas(doc, SALIDA, p['archivo'], 1, dpi=130)
        todos.insert_pdf(pymupdf.open(PLANTILLA))
        rellenar(todos, i, p, prefijo=f'p{i + 1}.')
    guardar(todos, os.path.join(SALIDA, 'todos.pdf'), 'Los cuatro aventureros · La Bestia de Farton', '', 'herramientas/fichas-ve/generar.py', AQUI)


if __name__ == '__main__':
    main()
