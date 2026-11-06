# -*- coding: utf-8 -*-
"""Los cuatro aventureros de La Bestia de Farton, con los valores recalculados por el manual de Vieja Escuela
(edición revisada, v1.1). Las diferencias con la hoja original están en «Erratas y aclaraciones» del cuaderno.
Si cambian, hay que tocar también sinopsis.html, fichas.html y aventura.html."""

ORO = '40'   # propuesta: el adelanto que les da el pueblo para la tienda de Podrik


def hab(alerta='', comunicacion='', manipulacion='', erudicion='', subterfugio='', supervivencia=''):
    return {'Alerta': alerta, 'Comunicación': comunicacion, 'Manipulación': manipulacion, 'Erudición': erudicion,
            'Subterfugio': subterfugio, 'Supervivencia': supervivencia}


def car(fue, des, con, int_, sab, car_):
    d = {}
    for k, (v, m) in {'FUE': fue, 'DES': des, 'CON': con, 'INT': int_, 'SAB': sab, 'CAR': car_}.items():
        d[k], d[k + ' mod'] = str(v), m
    return d


def armas(*filas):
    d = {}
    for i, (n, dano, notas) in enumerate(filas, 1):
        d[f'Arma {i}'], d[f'Arma {i} daño'], d[f'Arma {i} notas'] = n, dano, notas
    return d


def equipo(*cosas):
    return {f'Equipo {i}': c for i, c in enumerate(cosas, 1)}


PERSONAJES = [
    dict(archivo='brom-piedrarota', Nombre='Brom Piedrarota', Raza='Enano', Clase='Guerrero', Nivel='3', PX='0', MOV='9', INS='+3',
         **{'Trasfondo 1': 'Último descendiente del clan Piedrarota', 'Trasfondo 2': 'de la montaña Rocadura',
            'Talentos 1': 'Afín a la Piedra, Infravisión,', 'Talentos 2': 'Ataques Múltiples, Lucha con arma de mano y escudo',
            'PV actuales': '22', 'PV totales': '22', 'POD actuales': '0', 'POD totales': '0', 'ATQ': '+1', 'DEF': '14', 'mo': ORO,
            'Ambiciones': 'Encontrar un lugar donde refundar el clan y que alguien vuelva a pronunciar su nombre con respeto.'},
         **car((16, '+1'), (10, '+0'), (18, '+2'), (9, '+0'), (15, '+1'), (7, '+0')),
         **hab(alerta='+3', erudicion='+1', subterfugio='+1', supervivencia='+3'),
         **armas(('Hacha de batalla', '1d8+2', 'ATQ +3'), ('Martillo de guerra', '1d4+2', 'ATQ +3')),
         **equipo('Escudo (+1 DEF)', 'Anillos (+3 DEF)')),
    dict(archivo='nestor-dedos-agiles', Nombre='Néstor Dedos Ágiles', Raza='Mediano', Clase='Bribón', Nivel='3', PX='0', MOV='9', INS='+2',
         **{'Trasfondo 1': 'Saqueador profesional del gremio', 'Trasfondo 2': 'de ladrones de Ketharia',
            'Talentos 1': 'Escurridizo, Certero,', 'Talentos 2': 'Emboscar (+1d6 a desprevenidos), Dedos Ágiles',
            'PV actuales': '15', 'PV totales': '15', 'POD actuales': '0', 'POD totales': '0', 'ATQ': '+1', 'DEF': '14', 'mo': ORO,
            'Ambiciones': 'Pagar lo que le debe al gremio antes de que el gremio venga a cobrárselo.'},
         **car((10, '+0'), (18, '+2'), (15, '+1'), (7, '+0'), (16, '+1'), (9, '+0')),
         **hab(alerta='+2', comunicacion='+1', manipulacion='+3', subterfugio='+2'),
         **armas(('4 dagas (cuerpo a cuerpo)', '1d4', 'ATQ +1'), ('4 dagas (lanzadas)', '1d4', 'ATQ +4, 4 m'), ('Honda', '1d4', 'ATQ +4, 20 m')),
         **equipo('Cuero (+2 DEF)')),
    dict(archivo='kurgan-el-barbaro', Nombre='Kurgan el Bárbaro', Raza='Humano', Clase='Guerrero', Nivel='3', PX='0', MOV='12', INS='+4',
         **{'Trasfondo 1': 'Montañés de las cimas heladas del fin del mundo', 'Trasfondo 2': 'Cazador de mamuts',
            'Talentos 1': 'Ímpetu Emprendedor, Adaptable,', 'Talentos 2': 'Ataques Múltiples, Lucha con armas a dos manos',
            'PV actuales': '19', 'PV totales': '19', 'POD actuales': '0', 'POD totales': '0', 'ATQ': '+1', 'DEF': '13', 'mo': ORO,
            'Ambiciones': 'Volver a casa con una historia que nadie pueda superar junto al fuego.'},
         **car((18, '+2'), (16, '+1'), (15, '+1'), (7, '+0'), (10, '+0'), (9, '+0')),
         **hab(alerta='+2', subterfugio='+3', supervivencia='+3'),
         **armas(('Espada a dos manos', '1d10+3', 'ATQ +4'), ('2 dagas (cuerpo a cuerpo)', '1d4+2', 'ATQ +3'), ('2 dagas (lanzadas)', '1d4', 'ATQ +2, 4 m')),
         **equipo('Cuero (+2 DEF)')),
    dict(archivo='tcimiel-la-preclara', Nombre='Tcimiel la Preclara', Raza='Elfa', Clase='Hechicera', Nivel='3', PX='0', MOV='12', INS='+2',
         **{'Trasfondo 1': 'Hechicera principiante del círculo de oro', 'Trasfondo 2': '',
            'Talentos 1': 'Vista Aguda, Infravisión,', 'Talentos 2': 'Sensibilidad Mágica, Transferir Esencia (3 PV = 1 POD)',
            'PV actuales': '8', 'PV totales': '8', 'POD actuales': '6', 'POD totales': '6', 'ATQ': '+0', 'DEF': '11', 'mo': ORO,
            'Ambiciones': 'Ascender en el círculo con un hallazgo que los maestros no puedan ignorar.'},
         **car((7, '+0'), (16, '+1'), (10, '+0'), (18, '+2'), (15, '+1'), (9, '+0')),
         **hab(alerta='+2', comunicacion='+2', manipulacion='+1', erudicion='+2', subterfugio='+1'),
         **armas(('Bastón (a dos manos)', '1d6', 'ATQ +0'))),
]
