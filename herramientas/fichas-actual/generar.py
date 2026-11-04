# -*- coding: utf-8 -*-
"""Ficha oficial de 7.ª edición de época actual (Edge), para el generador de personajes.

Tiene la misma geometría que la de los años 20 (fichas-linares/coc-7ed-1920.pdf), así que se rellena
con el mismo código; solo cambian las habilidades impresas: entran Electrónica e Informática, sale
Equitación, Medicina pasa a la tercera columna y por eso esta tiene cinco líneas libres en vez de seis.
"""
import importlib.util, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
LINARES = os.path.join(AQUI, '..', 'fichas-linares')
sys.path.insert(0, LINARES)  # su generar.py importa su personajes.py
spec = importlib.util.spec_from_file_location('generar_linares', os.path.join(LINARES, 'generar.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
sys.path.remove(LINARES)

HABILIDADES = [
    base.HABILIDADES[0],
    [('Conducir maquinaria', 1, 1), ('Contabilidad', 5, 1), ('Crédito', 0, 0), ('Derecho', 5, 1),
     ('Descubrir', 25, 1), ('Disfrazarse', 5, 1), ('Electricidad', 10, 1), ('Electrónica', 1, 1), ('Encanto', 15, 1),
     ('Escuchar', 20, 1), ('Esquivar', 'DES', 1), ('Historia', 5, 1), ('Informática', 5, 1),
     ('Intimidar', 15, 1), ('Juego de manos', 10, 1), ('Lanzar', 20, 1), ('Lengua propia', '', 0),
     ('Lengua propia', 'EDU', 1), ('Otras lenguas', '', 0), ('Otras lenguas', None, 1),
     ('Otras lenguas', None, 1), ('Otras lenguas', None, 1), ('Mecánica', 10, 1)],
    [('Medicina', 1, 1), ('Mitos de Cthulhu', 0, 0), ('Nadar', 20, 1), ('Naturaleza', 10, 1), ('Orientarse', 10, 1),
     ('Persuasión', 10, 1), ('Pilotar', '', 0), ('Pilotar', None, 1), ('Primeros auxilios', 30, 1),
     ('Psicoanálisis', 1, 1), ('Psicología', 10, 1), ('Saltar', 20, 1), ('Seguir rastros', 10, 1),
     ('Sigilo', 20, 1), ('Supervivencia', '', 0), ('Supervivencia', None, 1), ('Tasación', 5, 1),
     ('Trepar', 20, 1)] + [('', None, 1)] * 5,
]


def rellenar(doc, n_pag, p, prefijo='', todos=()):
    base.rellenar(doc, n_pag, p, prefijo, todos, habilidades=HABILIDADES)
