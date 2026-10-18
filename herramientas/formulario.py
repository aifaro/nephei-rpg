# -*- coding: utf-8 -*-
"""Piezas comunes para rellenar fichas oficiales de La llamada de Cthulhu con campos de formulario.

Lo usan fichas-linares/generar.py (7.ª edición) y fichas-marca/generar.py (Pulp Cthulhu). Las dos
fichas de Edge comparten tipografía y casi toda la rejilla; cada generador pone su geometría.
"""
import os, re
import pymupdf

TINTA = (0.10, 0.15, 0.36)  # azul de pluma, para distinguir lo escrito de lo impreso
LETRA = 'TiRo'               # Times, la más cercana a la Minion de la ficha entre las 14 estándar
METRICA = 'tiro'


def credito(cr):
    """Nivel de gasto, dinero y bienes en pesetas según la tabla de Crédito de los años 20,
    a cinco pesetas por dólar."""
    if cr == 0: g, d, b = 0.5, 0.5, 0
    elif cr < 10: g, d, b = 2, cr, cr * 10
    elif cr < 50: g, d, b = 10, cr * 2, cr * 50
    elif cr < 90: g, d, b = 50, cr * 5, cr * 500
    elif cr < 99: g, d, b = 250, cr * 20, cr * 2000
    else: g, d, b = 5000, 50000, 5000000
    return int(g * 5), int(d * 5), int(b * 5)


def miles(n):
    return '{:,}'.format(n).replace(',', '.')


def partir(texto, anchos, tam):
    """Reparte el texto en líneas de los anchos dados; devuelve None si no cabe."""
    lineas, actual = [], ''
    for pal in texto.split():
        prueba = (actual + ' ' + pal).strip()
        if pymupdf.get_text_length(prueba, METRICA, tam) <= anchos[min(len(lineas), len(anchos) - 1)] - 3:
            actual = prueba
        else:
            lineas.append(actual)
            actual = pal
    lineas.append(actual)
    return lineas if len(lineas) <= len(anchos) else None


def repartir(texto, anchos, tam=9, minimo=5):
    """Como partir, pero baja la letra hasta que quepa. Devuelve (líneas rellenadas con '', tamaño)."""
    lineas = None
    while lineas is None:
        lineas = partir(texto, anchos, tam)
        if lineas is None:
            if tam <= minimo:
                raise SystemExit('No cabe: ' + texto)
            tam -= 0.25
    return lineas + [''] * (len(anchos) - len(lineas)), tam


def pistas(pagina, corte_x):
    """Posición de cada número de las cuatro pistas: {pista: {valor: (x, y) de su caja de texto}}.
    Vida y Magia quedan a la izquierda de corte_x; Cordura y Suerte, a la derecha."""
    res = {'PV': {}, 'Cordura': {}, 'PM': {}, 'Suerte': {}}
    for b in pagina.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                m = re.fullmatch(r'(\d\d)\t?', s['text'])
                if not m:
                    continue
                x, y = s['bbox'][:2]
                if 150 < y < 212: pista = 'PV' if x < corte_x else 'Cordura'
                elif 222 < y < 285: pista = 'PM' if x < corte_x else 'Suerte'
                else: continue
                res[pista][int(m.group(1))] = (x, y)
    return res


class Ficha:
    """Añade campos a las páginas n y n+1 de un documento; `prefijo` hace únicos los nombres."""

    def __init__(self, doc, n_pag, prefijo=''):
        self.doc, self.p1, self.p2, self.pre = doc, doc[n_pag], doc[n_pag + 1], prefijo
        self.anillos = []

    @staticmethod
    def etiqueta(pagina, texto, cerca=None):
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

    def subrayado(self, pagina, nombre, x0, x1, y, valor='', **kw):
        """Campo apoyado en una raya dibujada a la altura `y`."""
        self.texto(pagina, nombre, (x0, y - 10.6, x1, y - 0.2), valor, **kw)

    def pistas(self, numeros, actuales):
        """Una casilla sobre cada número de las pistas; marcada, rodea el número con un círculo."""
        for pista, nums in numeros.items():
            for n, (x, y) in sorted(nums.items()):
                cx, cy = x + 4.9, y + 8.6  # centro de la tinta de dos cifras en Segoe UI de 9 pt
                self.casilla(self.p1, f'{pista} {n:02d}', (cx - 6.6, cy - 5.2, cx + 6.6, cy + 5.2),
                             marcada=actuales.get(pista) == n, anillo=True)

    def cerrar(self):
        """Sustituye la apariencia de las casillas de las pistas por un círculo de tinta."""
        doc = self.doc
        for xref, marcada, r in self.anillos:
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
        self.anillos = []


def guardar(doc, ruta, titulo, asunto, creador, base):
    doc.set_metadata({'title': titulo, 'author': 'rpg.nephei.org', 'subject': asunto, 'creator': creador})
    doc.save(ruta, garbage=4, deflate=True)
    print('  ', os.path.relpath(ruta, base))


def vistas(doc, carpeta, nombre, paginas, dpi=100):
    """JPG de cada página para la web: <nombre>-1.jpg, <nombre>-2.jpg…"""
    for n in range(paginas):
        doc[n].get_pixmap(dpi=dpi).save(os.path.join(carpeta, f'{nombre}-{n + 1}.jpg'), jpg_quality=82)
