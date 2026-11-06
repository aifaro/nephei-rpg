// Datos de Vieja Escuela: el juego de rol, edición revisada v1.1 (Javier «cabohicks» García, grapas&mapas), con la
// página del manual de cada cosa. El texto de las reglas se usa bajo la licencia CC BY-SA 4.0 de esa edición, resumido:
// este archivo se distribuye con esa misma licencia, no con la GPL del resto del repositorio.
'use strict';

const CARS_VE = ['FUE', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
const NOMBRES_CAR_VE = { FUE: 'Fuerza', DES: 'Destreza', CON: 'Constitución', INT: 'Inteligencia', SAB: 'Sabiduría', CAR: 'Carisma' };

// Pág. 3. Este modificador es el del juego: no es el (valor − 10) / 2 de otras ediciones.
const modVE = v => v <= 3 ? -2 : v <= 6 ? -1 : v <= 14 ? 0 : v <= 17 ? 1 : 2;

// Pág. 7: [ATQ, POD, INS] de los niveles 1 a 14
const AVANCE_VE = {
  guerrero: [[0, 0, 1], [1, 0, 2], [1, 0, 3], [2, 0, 4], [2, 0, 5], [3, 0, 6], [4, 0, 7], [5, 0, 8], [6, 0, 9], [7, 0, 10], [7, 0, 11], [8, 0, 11], [9, 0, 11], [9, 0, 11]],
  hechicero: [[0, 1, 0], [0, 2, 1], [0, 4, 2], [1, 5, 3], [1, 7, 4], [2, 8, 5], [2, 10, 6], [3, 12, 7], [3, 14, 8], [3, 15, 9], [4, 17, 10], [4, 19, 10], [4, 20, 10], [5, 22, 10]],
  bribon: [[0, 0, 0], [0, 0, 1], [1, 0, 2], [1, 0, 3], [2, 0, 4], [2, 0, 5], [3, 0, 6], [3, 0, 7], [4, 0, 8], [5, 0, 9], [5, 0, 10], [6, 0, 11], [7, 0, 11], [7, 0, 11]],
};

// Págs. 8-9 y 15
const TALENTOS_VE = {
  'Adaptable': 'Un +1 adicional a tu rasgo de Instintos.',
  'Afín a la Piedra': 'Ventaja en Erudición sobre el trabajo en piedra. Puedes hacer una prueba de Alerta para detectar trampas hechas sobre roca.',
  'Ataques Múltiples': 'Al abatir a un enemigo puedes hacer otro ataque de inmediato. Encadenas tantos ataques extra como Nivel tengas.',
  'Certero': '+1 en todos los ataques de proyectiles.',
  'Dedos Ágiles': 'Ventaja en Manipulación de precisión: abrir cerraduras, sustraer posesiones.',
  'Emboscar': 'Ventaja en Subterfugio para moverte en silencio y ocultarte en las sombras. +1d6 al daño contra un blanco desprevenido.',
  'Escurridizo': 'Ventaja en Subterfugio para moverte en silencio.',
  'Ímpetu Emprendedor': 'Ganas un trasfondo adicional.',
  'Infravisión': 'Ves en la oscuridad hasta 20 metros, por el calor de los objetos.',
  'Lucha con X': 'Con la forma de pelear que elijas ganas +1 al ataque y al daño.',
  'Sensibilidad Mágica': 'Puedes gastar puntos de poder (POD) para lanzar conjuros.',
  'Transferir Esencia': 'Puedes convertir 3 puntos de vida en 1 punto de poder.',
  'Vista Aguda': 'Ventaja en Alerta basada en la vista.',
  'Ataque Certero': 'Éxito automático o crítico con cualquier arma si sacas un 19 o un 20 natural.',
  'Sirviente Animal': 'Un pequeño animal es tu familiar. Lo mandas con la voz o, gastando 1 POD y concentrándote, con la mente hasta a 5 km, viendo y oyendo por él.',
  'Leer Magia': 'Usas pergaminos mágicos como un Hechicero cinco Niveles inferior.',
};

// Pág. 4
const RAZAS_VE = [
  { n: 'Elfo', f: 'Elfa', mov: 12, talentos: ['Vista Aguda', 'Infravisión'] },
  { n: 'Enano', f: 'Enana', mov: 9, talentos: ['Afín a la Piedra', 'Infravisión'] },
  { n: 'Mediano', f: 'Mediana', mov: 9, talentos: ['Escurridizo', 'Certero'] },
  { n: 'Humano', f: 'Humana', mov: 12, talentos: ['Ímpetu Emprendedor', 'Adaptable'] },
];

// Pág. 4 (y pág. 15, el talento del nivel 6). da: Dado de Aguante.
const CLASES_VE = [
  { n: 'Guerrero', f: 'Guerrera', clave: 'guerrero', da: 8, talentos: ['Lucha con X', 'Ataques Múltiples'], talento6: 'Ataque Certero',
    uso: 'Cualquier arma y armadura.', armas: null, armaduras: ['Cuero', 'Anillos', 'Mallas', 'Placas'], escudo: true,
    prioridad: ['FUE', 'CON', 'DES'] },
  { n: 'Hechicero', f: 'Hechicera', clave: 'hechicero', da: 4, talentos: ['Sensibilidad Mágica', 'Transferir Esencia'], talento6: 'Sirviente Animal',
    uso: 'Solo dagas, bastones y hondas. Ninguna armadura.', armas: ['Daga', 'Bastón', 'Honda'], armaduras: [], escudo: false,
    prioridad: ['INT', 'CON', 'DES'] },
  { n: 'Bribón', f: 'Bribona', clave: 'bribon', da: 6, talentos: ['Emboscar', 'Dedos Ágiles'], talento6: 'Leer Magia',
    uso: 'Cualquier arma, pero solo armaduras ligeras (cuero).', armas: null, armaduras: ['Cuero'], escudo: false,
    prioridad: ['DES', 'CON', 'CAR'] },
];

// «Lucha con X» (pág. 9)
const LUCHA_VE = ['arma de mano y escudo', 'dos armas de mano', 'armas a dos manos', 'armas de proyectiles'];

// Págs. 5 y 26
const HABILIDADES_VE = {
  'Alerta': 'Notar algo visible, oír un ruido, registrar un lugar.',
  'Comunicación': 'Influir, motivar, entenderse con otros seres.',
  'Manipulación': 'Abrir cerraduras, inutilizar trampas, robar sin ser descubierto.',
  'Erudición': 'Lenguas antiguas, leyendas, historia, identificar criaturas.',
  'Subterfugio': 'Deslizarse en silencio, ocultarse en las sombras.',
  'Supervivencia': 'Seguir un rastro, orientarse, buscar comida.',
};
const PESO_HAB_VE = {
  guerrero: { Alerta: 4, Supervivencia: 4, Comunicación: 2, Subterfugio: 2, Erudición: 1, Manipulación: 1 },
  hechicero: { Erudición: 6, Alerta: 3, Comunicación: 3, Manipulación: 2, Subterfugio: 1, Supervivencia: 1 },
  bribon: { Subterfugio: 6, Manipulación: 6, Alerta: 4, Comunicación: 2, Supervivencia: 1, Erudición: 1 },
};

// Pág. 24. Coste en monedas de cobre (1 mo = 10 mp = 100 mc).
const MO = 100, MP = 10;
// [nombre, daño, coste, manos, alcance en metros si se puede disparar o lanzar, disparos por asalto]
const ARMAS_VE = [
  ['Hacha de batalla', '1d8', 5 * MO, 1],
  ['Porra', '1d4', 0, 1],
  ['Daga', '1d4', 2 * MO, 1, 4, 1],
  ['Martillo de guerra', '1d4+1', 1 * MO, 1],
  ['Maza pesada', '1d6', 10 * MO, 1],
  ['Lanza', '1d6', 1 * MO, 1, 8, 1],
  ['Bastón', '1d6', 0, 2],
  ['Espada larga', '1d8', 15 * MO, 1],
  ['Espada corta', '1d6', 8 * MO, 1],
  ['Espada a dos manos', '1d10', 30 * MO, 2],
  ['Arco', '1d6', 15 * MO, 0, 60, 2],
  ['Ballesta ligera', '1d4+1', 12 * MO, 0, 70, 1],
  ['Honda', '1d4', 2 * MP, 0, 20, 1],
];
// [nombre, bono a DEF, coste]
const ARMADURAS_VE = [['Cuero', 2, 5 * MO], ['Anillos', 3, 30 * MO], ['Mallas', 4, 75 * MO], ['Placas', 6, 100 * MO]];
const ESCUDO_VE = ['Escudo', 1, 15 * MO];

// Pág. 25: [nombre, coste, pequeño]. Los objetos pequeños se agrupan en un bulto.
const EQUIPO_VE = [
  ['Aceite para quemar (frasco)', 5 * MP, 1], ['Agua sagrada (frasco)', 25 * MO, 1], ['Antorcha (1 h)', 1, 1], ['Cantimplora (2 l)', 1 * MO, 1],
  ['Carcaj y 20 flechas', 8 * MP, 0], ['Cuerda común (15 m)', 1 * MO, 0], ['Espejo pequeño de acero', 20 * MO, 1], ['Estacas (4) y maza', 3 * MO, 0],
  ['Farol con capuchón (4 h)', 7 * MO, 1], ['Farol de ojo de buey (4 h)', 12 * MO, 1], ['Garfio de escalada', 1 * MO, 1], ['Herramientas de ladrón', 25 * MO, 1],
  ['Instrumento musical', 5 * MO, 0], ['Libro de conjuros (50 hojas)', 25 * MO, 0], ['Mochila (10 kg)', 5 * MO, 0], ['Palanca', 2 * MP, 0],
  ['Pértiga de madera (3 m)', 2 * MP, 0], ['Piquetas de hierro (10)', 5 * MP, 1], ['Raciones comunes (1 día)', 5 * MP, 1], ['Raciones de viaje (1 día)', 1 * MO, 1],
  ['Saco (10 kg)', 1 * MO, 1], ['Saco de dormir', 2 * MP, 0], ['Símbolo religioso (plata)', 25 * MO, 1], ['Vendas (1 uso)', 1 * MP, 1], ['Yesca y pedernal', 1 * MP, 1],
];

// Pág. 5 da cinco ejemplos de trasfondo; los demás son míos, para el botón de sugerencias y el personaje al azar.
const TRASFONDOS_VE = [
  'Soldado en las guerras del norte', 'Asistente del gran templo de Curias', 'Custodio en la Gran Biblioteca Púrpura', 'Cazador de los Kuanda', 'Pirata en las costas de Landar',
  'Herrero de una aldea quemada', 'Contrabandista de sal en los pasos de montaña', 'Aprendiz fugado de un alquimista', 'Marinero de un barco naufragado', 'Sepulturero en una ciudad con mala fama',
  'Escudero de un caballero sin tierras', 'Pastor que vio algo en el monte', 'Recaudador de impuestos arrepentido', 'Titiritero ambulante', 'Guardabosques de un conde',
  'Novicia expulsada del convento', 'Cartógrafo de caminos que no existen', 'Ladrón de tumbas de medio pelo', 'Mozo de posada con buen oído', 'Mercenaria de la Compañía Roja',
];
const AMBICIONES_VE = [
  'Hacerse con un título y un castillo, aunque sea pequeño.', 'Pagar una deuda antes de que vengan a cobrarla.', 'Encontrar a quien arrasó su hogar.',
  'Reunir oro suficiente para no volver a pasar hambre.', 'Que su nombre salga en una canción, y que la canción sea buena.', 'Descubrir qué hay de verdad en un viejo mapa heredado.',
  'Demostrarle a su familia que se equivocaban.', 'Fundar una escuela, un gremio o una taberna, lo que salga antes.', 'Aprender un secreto que nadie quiere enseñarle.',
  'Volver a casa algún día con algo que enseñar.',
];
const CONJUROS_VE = 'detectar magia, curar heridas, dormir, escudo, hechizar persona, leer idiomas, leer magia, luz, protección contra el mal, proyectil ácido, cerradura, detectar invisibilidad, detectar el mal, levitar, localizar objeto, leer mente, bola de fuego, eliminar maldición';
