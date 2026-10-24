// Datos de La llamada de Cthulhu 7.ª edición para el asistente, sacados del Manual del Guardián
// de Edge (capítulos 3 y 4). Las páginas citadas son las del manual impreso.
'use strict';

const REGLAS = {
  // Edad, pág. 34 y referencia rápida de la pág. 36. resta: puntos a repartir entre las características
  // de `entre`; apa: lo que pierde APA; edu: tiradas de mejora de EDU (o, si es negativo, lo que se resta).
  edades: [
    { desde: 15, hasta: 19, resta: 5, entre: ['FUE', 'TAM'], apa: 0, mejoras: 0, eduMenos: 5, suerteDoble: true },
    { desde: 20, hasta: 39, resta: 0, entre: [], apa: 0, mejoras: 1 },
    { desde: 40, hasta: 49, resta: 5, entre: ['FUE', 'CON', 'DES'], apa: 5, mejoras: 2 },
    { desde: 50, hasta: 59, resta: 10, entre: ['FUE', 'CON', 'DES'], apa: 10, mejoras: 3 },
    { desde: 60, hasta: 69, resta: 20, entre: ['FUE', 'CON', 'DES'], apa: 15, mejoras: 4 },
    { desde: 70, hasta: 79, resta: 40, entre: ['FUE', 'CON', 'DES'], apa: 20, mejoras: 4 },
    { desde: 80, hasta: 89, resta: 80, entre: ['FUE', 'CON', 'DES'], apa: 25, mejoras: 4 },
  ],
  caracteristicas: ['FUE', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU'],
  tirada: { FUE: '3D6', CON: '3D6', DES: '3D6', APA: '3D6', POD: '3D6', TAM: '2D6+6', INT: '2D6+6', EDU: '2D6+6' },
  nombres: { FUE: 'Fuerza', CON: 'Constitución', TAM: 'Tamaño', DES: 'Destreza', APA: 'Apariencia',
             INT: 'Inteligencia', POD: 'Poder', EDU: 'Educación' },
  rapido: [40, 50, 50, 50, 60, 60, 70, 80],          // Opción 5: método rápido, pág. 50
  rapidoHabilidades: [70, 60, 60, 50, 50, 50, 40, 40, 40],
};

// Bonificación al daño y Corpulencia, Tabla I (pág. 35).
function combate(fue, tam) {
  const s = fue + tam;
  if (s <= 64) return { bd: '-2', corp: -2 };
  if (s <= 84) return { bd: '-1', corp: -1 };
  if (s <= 124) return { bd: '0', corp: 0 };
  if (s <= 164) return { bd: '+1D4', corp: 1 };
  if (s <= 204) return { bd: '+1D6', corp: 2 };
  if (s <= 284) return { bd: '+2D6', corp: 3 };
  if (s <= 364) return { bd: '+3D6', corp: 4 };
  if (s <= 444) return { bd: '+4D6', corp: 5 };
  const extra = Math.ceil((s - 444) / 80);  // +1D6 y +1 por cada 80 o fracción
  return { bd: `+${4 + extra}D6`, corp: 5 + extra };
}

// Movimiento, pág. 35.
function movimiento(fue, des, tam, edad) {
  let mov = 8;
  if (des < tam && fue < tam) mov = 7;
  else if (des > tam && fue > tam) mov = 9;
  if (edad >= 40) mov -= Math.min(5, Math.floor(edad / 10) - 3);
  return mov;
}

// Tabla II: Dinero y propiedades (pág. 41). Devuelve importes en dólares.
const DINERO = {
  '20': [
    { hasta: 0, nivel: 'Indigente', gasto: 0.5, dinero: () => 0.5, bienes: () => 0 },
    { hasta: 9, nivel: 'Pobre', gasto: 2, dinero: cr => cr, bienes: cr => cr * 10 },
    { hasta: 49, nivel: 'Clase media', gasto: 10, dinero: cr => cr * 2, bienes: cr => cr * 50 },
    { hasta: 89, nivel: 'Adinerado', gasto: 50, dinero: cr => cr * 5, bienes: cr => cr * 500 },
    { hasta: 98, nivel: 'Rico', gasto: 250, dinero: cr => cr * 20, bienes: cr => cr * 2000 },
    { hasta: 999, nivel: 'Inmensamente rico', gasto: 5000, dinero: () => 50000, bienes: () => 5000000 },
  ],
  actual: [
    { hasta: 0, nivel: 'Indigente', gasto: 10, dinero: () => 10, bienes: () => 0 },
    { hasta: 9, nivel: 'Pobre', gasto: 40, dinero: cr => cr * 20, bienes: cr => cr * 200 },
    { hasta: 49, nivel: 'Clase media', gasto: 200, dinero: cr => cr * 40, bienes: cr => cr * 1000 },
    { hasta: 89, nivel: 'Adinerado', gasto: 1000, dinero: cr => cr * 100, bienes: cr => cr * 10000 },
    { hasta: 98, nivel: 'Rico', gasto: 5000, dinero: cr => cr * 400, bienes: cr => cr * 40000 },
    { hasta: 999, nivel: 'Inmensamente rico', gasto: 100000, dinero: () => 1000000, bienes: () => 100000000 },
  ],
};
function dinero(cr, epoca) {
  const t = DINERO[epoca] || DINERO['20'];
  const f = t.find(x => cr <= x.hasta);
  return { nivel: f.nivel, gasto: f.gasto, dinero: f.dinero(cr), bienes: f.bienes(cr) };
}

// Habilidades (listado de la pág. 58). base: número, 'DES/2' o 'EDU'. fam: habilidad que se divide en
// especialidades (no se pueden comprar puntos en la genérica). rara: infrecuente, no viene impresa en la
// ficha normal. actual: solo en la época actual.
const HABILIDADES = [
  { n: 'Antropología', base: 1 }, { n: 'Armas de fuego', fam: true },
  { n: 'Arqueología', base: 1 }, { n: 'Arte/Artesanía', fam: true, base: 5 },
  { n: 'Artillería', base: 1, rara: true }, { n: 'Bucear', base: 1, rara: true },
  { n: 'Buscar libros', base: 20 }, { n: 'Cerrajería', base: 1 }, { n: 'Charlatanería', base: 5 },
  { n: 'Ciencia', fam: true, base: 1 }, { n: 'Ciencias ocultas', base: 5 }, { n: 'Combatir', fam: true },
  { n: 'Conducir automóvil', base: 20 }, { n: 'Conducir maquinaria', base: 1 },
  { n: 'Conocimiento', fam: true, base: 1, rara: true }, { n: 'Contabilidad', base: 5 },
  { n: 'Crédito', base: 0 }, { n: 'Demolición', base: 1, rara: true }, { n: 'Derecho', base: 5 },
  { n: 'Descubrir', base: 25 }, { n: 'Disfrazarse', base: 5 }, { n: 'Electricidad', base: 10 },
  { n: 'Electrónica', base: 1, actual: true }, { n: 'Encanto', base: 15 }, { n: 'Equitación', base: 5 },
  { n: 'Escuchar', base: 20 }, { n: 'Esquivar', base: 'DES/2' }, { n: 'Hipnosis', base: 1, rara: true },
  { n: 'Historia', base: 5 }, { n: 'Informática', base: 5, actual: true }, { n: 'Intimidar', base: 15 },
  { n: 'Juego de manos', base: 10 }, { n: 'Lanzar', base: 20 }, { n: 'Lectura de labios', base: 1, rara: true },
  { n: 'Lengua propia', base: 'EDU' }, { n: 'Mecánica', base: 10 }, { n: 'Medicina', base: 1 },
  { n: 'Mitos de Cthulhu', base: 0 }, { n: 'Nadar', base: 20 }, { n: 'Naturaleza', base: 10 },
  { n: 'Orientarse', base: 10 }, { n: 'Otras lenguas', fam: true, base: 1 }, { n: 'Persuasión', base: 10 },
  { n: 'Pilotar', fam: true, base: 1 }, { n: 'Primeros auxilios', base: 30 }, { n: 'Psicoanálisis', base: 1 },
  { n: 'Psicología', base: 10 }, { n: 'Saltar', base: 20 }, { n: 'Seguir rastros', base: 10 },
  { n: 'Sigilo', base: 20 }, { n: 'Supervivencia', fam: true, base: 10 }, { n: 'Tasación', base: 5 },
  { n: 'Trato con animales', base: 5, rara: true }, { n: 'Trepar', base: 20 },
];

// Especialidades de ejemplo del capítulo 4, con su base cuando no es la de la familia.
const ESPECIALIDADES = {
  'Armas de fuego': [['Arma corta', 20], ['Fusil/Escopeta', 25], ['Subfusil', 15], ['Ametralladora', 10],
                     ['Arco', 15], ['Armamento pesado', 10], ['Lanzallamas', 10]],
  'Combatir': [['Pelea', 25], ['Cable', 15], ['Espada', 20], ['Hacha', 15], ['Lanza', 20], ['Látigo', 5],
               ['Mayal', 10], ['Motosierra', 10]],
  'Arte/Artesanía': ['Barbero', 'Caligrafía', 'Carpintería', 'Cerámica', 'Cocina', 'Danza', 'Escritura', 'Escultura',
                     'Falsificación', 'Fotografía', 'Interpretación', 'Ópera', 'Pintor y decorador', 'Pintura',
                     'Soplado de vidrio'],
  'Ciencia': ['Astronomía', 'Biología', 'Botánica', 'Criptografía', 'Farmacología', 'Física', 'Geología',
              'Ingeniería', ['Matemáticas', 10], 'Medicina forense', 'Meteorología', 'Química', 'Zoología'],
  'Pilotar': ['Aeronave', 'Embarcación'],
  'Supervivencia': ['Desierto', 'Alta mar', 'Ártico'],
  'Otras lenguas': ['Latín', 'Francés', 'Inglés', 'Alemán', 'Italiano', 'Árabe', 'Griego'],
  'Conocimiento': [],
};

// Base de una habilidad escrita como «Familia (Especialidad)» o suelta.
function baseHabilidad(nombre, car) {
  const m = /^(.+?) \((.+)\)$/.exec(nombre);
  const fam = m ? m[1] : nombre;
  const h = HABILIDADES.find(x => x.n === fam);
  if (m && ESPECIALIDADES[fam]) {
    const e = ESPECIALIDADES[fam].find(x => (Array.isArray(x) ? x[0] : x).toLowerCase() === m[2].toLowerCase());
    if (Array.isArray(e)) return e[1];
  }
  if (!h) return 1;
  if (h.base === 'DES/2') return Math.floor((car.DES || 0) / 2);
  if (h.base === 'EDU') return car.EDU || 0;
  if (fam === 'Armas de fuego' || fam === 'Combatir') return 1;  // especialidad no listada: la decide el Guardián
  return h.base;
}

const INTERPERSONALES = ['Charlatanería', 'Encanto', 'Intimidar', 'Persuasión'];

// Ocupaciones de ejemplo (págs. 42-43). Cada hueco de `hab` es una habilidad de ocupación:
//   'Nombre' o 'Familia (Especialidad)'     fija
//   'Familia (*)'                           de esa familia, especialidad a elegir
//   ['A', 'B']                              una de las dos (o de la lista)
//   'interpersonal'                         Charlatanería, Encanto, Intimidar o Persuasión
//   'cualquiera'                            una habilidad a elección del jugador
// puntos: lista de sumandos; cada uno es una característica o varias a elegir, ×2 o ×4.
const OCUPACIONES = [
  { n: 'Abogado', cr: [30, 80], puntos: [['EDU', 4]],
    hab: ['Buscar libros', 'Contabilidad', 'Derecho', 'Psicología', 'interpersonal', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Agente de policía', cr: [9, 30], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Armas de fuego (*)', 'Combatir (Pelea)', 'Derecho', 'Descubrir', 'Primeros auxilios', 'Psicología', 'interpersonal',
          ['Conducir automóvil', 'Equitación']] },
  { n: 'Anticuario', love: true, cr: [30, 70], puntos: [['EDU', 4]],
    hab: ['Arte/Artesanía (*)', 'Buscar libros', 'Descubrir', 'Historia', 'Otras lenguas (*)', 'Tasación', 'interpersonal', 'cualquiera'] },
  { n: 'Artista', cr: [9, 50], puntos: [['EDU', 2], [['POD', 'DES'], 2]],
    hab: ['Arte/Artesanía (*)', 'Descubrir', ['Historia', 'Naturaleza'], 'Otras lenguas (*)', 'Psicología', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Atleta profesional', cr: [9, 70], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Combatir (Pelea)', 'Equitación', 'Lanzar', 'Nadar', 'Saltar', 'Trepar', 'interpersonal', 'cualquiera'] },
  { n: 'Bibliotecario', love: true, cr: [9, 35], puntos: [['EDU', 4]],
    hab: ['Buscar libros', 'Contabilidad', 'Lengua propia', 'Otras lenguas (*)', 'cualquiera', 'cualquiera', 'cualquiera', 'cualquiera'],
    nota: 'Las cuatro libres, como especialidades personales o lecturas especializadas.' },
  { n: 'Clérigo', cr: [9, 60], puntos: [['EDU', 4]],
    hab: ['Buscar libros', 'Contabilidad', 'Escuchar', 'Historia', 'Otras lenguas (*)', 'Psicología', 'interpersonal', 'cualquiera'] },
  { n: 'Criminal', cr: [5, 65], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Descubrir', 'Psicología', 'Sigilo', 'interpersonal',
          ...Array(4).fill(['Armas de fuego (*)', 'Cerrajería', 'Combatir (*)', 'Disfrazarse', 'Juego de manos', 'Mecánica', 'Tasación'])],
    nota: 'Cuatro especialidades de entre Armas de fuego, Cerrajería, Combatir, Disfrazarse, Juego de manos, Mecánica y Tasación.' },
  { n: 'Diletante', love: true, cr: [50, 99], puntos: [['EDU', 2], ['APA', 2]],
    hab: ['Armas de fuego (*)', 'Arte/Artesanía (*)', 'Equitación', 'Otras lenguas (*)', 'interpersonal', 'cualquiera', 'cualquiera', 'cualquiera'] },
  { n: 'Escritor', love: true, cr: [9, 30], puntos: [['EDU', 4]],
    hab: ['Arte/Artesanía (Literatura)', 'Buscar libros', 'Historia', 'Lengua propia', ['Naturaleza', 'Ciencias ocultas'], 'Otras lenguas (*)', 'Psicología', 'cualquiera'] },
  { n: 'Fanático', cr: [0, 30], puntos: [['EDU', 2], [['APA', 'POD'], 2]],
    hab: ['Historia', 'Psicología', 'Sigilo', 'interpersonal', 'interpersonal', 'cualquiera', 'cualquiera', 'cualquiera'] },
  { n: 'Granjero', cr: [9, 30], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Arte/Artesanía (Agricultura)', 'Conducir automóvil', 'Conducir maquinaria', 'Mecánica', 'Naturaleza', 'Seguir rastros', 'interpersonal', 'cualquiera'],
    nota: 'Conducir automóvil (o camioneta).' },
  { n: 'Ingeniero', cr: [30, 60], puntos: [['EDU', 4]],
    hab: ['Arte/Artesanía (Dibujo técnico)', 'Buscar libros', 'Ciencia (Ingeniería)', 'Ciencia (Física)', 'Conducir maquinaria', 'Electricidad', 'Mecánica', 'cualquiera'] },
  { n: 'Inspector de policía', love: true, cr: [20, 50], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Armas de fuego (*)', ['Arte/Artesanía (Interpretación)', 'Disfrazarse'], 'Derecho', 'Descubrir', 'Escuchar', 'Psicología', 'interpersonal', 'cualquiera'] },
  { n: 'Intérprete', cr: [9, 70], puntos: [['EDU', 2], ['APA', 2]],
    hab: ['Arte/Artesanía (Interpretación)', 'Disfrazarse', 'Escuchar', 'Psicología', 'interpersonal', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Investigador privado', cr: [9, 30], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Arte/Artesanía (Fotografía)', 'Buscar libros', 'Derecho', 'Descubrir', 'Disfrazarse', 'Psicología', 'interpersonal', 'cualquiera'],
    nota: 'La libre, por ejemplo Informática, Cerrajería o Armas de fuego.' },
  { n: 'Médico', love: true, cr: [30, 80], puntos: [['EDU', 4]],
    hab: ['Ciencia (Biología)', 'Ciencia (Farmacología)', 'Medicina', 'Otras lenguas (Latín)', 'Primeros auxilios', 'Psicología', 'cualquiera', 'cualquiera'],
    nota: 'Las dos libres, como especialidades personales o académicas (un psiquiatra podría elegir Psicoanálisis).' },
  { n: 'Miembro de una tribu', cr: [0, 15], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Ciencias ocultas', ['Combatir (*)', 'Lanzar'], 'Descubrir', 'Escuchar', 'Naturaleza', 'Supervivencia (*)', 'Trepar'] },
  { n: 'Misionero', cr: [0, 30], puntos: [['EDU', 4]],
    hab: ['Arte/Artesanía (*)', 'Medicina', 'Mecánica', 'Naturaleza', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Músico', cr: [9, 30], puntos: [['EDU', 2], [['DES', 'POD'], 2]],
    hab: ['Arte/Artesanía (Instrumento)', 'Escuchar', 'Psicología', 'interpersonal', 'cualquiera', 'cualquiera', 'cualquiera', 'cualquiera'] },
  { n: 'Oficial militar', cr: [20, 70], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Armas de fuego (*)', 'Contabilidad', 'Orientarse', 'Psicología', 'Supervivencia (*)', 'interpersonal', 'interpersonal', 'cualquiera'] },
  { n: 'Parapsicólogo', cr: [9, 30], puntos: [['EDU', 4]],
    hab: ['Antropología', 'Arte/Artesanía (Fotografía)', 'Buscar libros', 'Ciencias ocultas', 'Historia', 'Otras lenguas (*)', 'Psicología', 'cualquiera'] },
  { n: 'Periodista', love: true, cr: [9, 30], puntos: [['EDU', 4]],
    hab: ['Arte/Artesanía (Fotografía)', 'Buscar libros', 'Historia', 'Lengua propia', 'Psicología', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Piloto', cr: [20, 70], puntos: [['EDU', 2], ['DES', 2]],
    hab: ['Ciencia (Astronomía)', 'Conducir maquinaria', 'Electricidad', 'Mecánica', 'Orientarse', 'Pilotar (Aeronave)', 'cualquiera', 'cualquiera'] },
  { n: 'Pirata informático', actual: true, cr: [10, 70], puntos: [['EDU', 4]],
    hab: ['Buscar libros', 'Descubrir', 'Electricidad', 'Electrónica', 'Informática', 'interpersonal', 'cualquiera', 'cualquiera'] },
  { n: 'Profesor de universidad', love: true, cr: [20, 70], puntos: [['EDU', 4]],
    hab: ['Buscar libros', 'Lengua propia', 'Otras lenguas (*)', 'Psicología', 'cualquiera', 'cualquiera', 'cualquiera', 'cualquiera'],
    nota: 'Las cuatro libres, como especialidades personales o académicas.' },
  { n: 'Soldado', cr: [9, 30], puntos: [['EDU', 2], [['DES', 'FUE'], 2]],
    hab: ['Armas de fuego (*)', 'Combatir (*)', 'Esquivar', 'Sigilo', 'Supervivencia (*)', ['Trepar', 'Nadar'],
          ['Mecánica', 'Otras lenguas (*)', 'Primeros auxilios'], ['Mecánica', 'Otras lenguas (*)', 'Primeros auxilios']] },
  { n: 'Vagabundo', cr: [0, 5], puntos: [['EDU', 2], [['APA', 'DES', 'FUE'], 2]],
    hab: ['Escuchar', 'Orientarse', 'Saltar', 'Sigilo', 'Trepar', 'interpersonal', 'cualquiera', 'cualquiera'] },
];

// Tablas de trasfondo (págs. 45-48). Cada entrada: [lo que sale, ejemplos].
const TRASFONDO = {
  descripcion: ['Aburrido', 'Apocado', 'Arrugado', 'Atlético', 'Cansado', 'Cara de niño', 'Corpulento', 'Corriente',
    'Curtido', 'Delicado', 'Desaliñado', 'Descuidado', 'Desgarbado', 'Deslumbrante', 'Distinguido', 'Duro', 'Elegante',
    'Esbelto', 'Estirado', 'Fornido', 'Frágil', 'Guapo', 'Hermoso', 'Juvenil', 'Musculoso', 'Pálido', 'Peludo',
    'Ratón de biblioteca', 'Rechoncho', 'Refinado', 'Rollizo', 'Rubicundo', 'Sofisticado', 'Sucio', 'Taciturno', 'Torpe'],
  ideologia: [
    ['Hay un poder superior al que veneras y rezas', 'Vishnu, Jesucristo, Haile Selassie I…'],
    ['La humanidad se las puede apañar sin religiones', 'ateo acérrimo, humanista, secularista…'],
    ['La ciencia tiene todas las respuestas. Elige un área de tu interés', 'evolución, criogenia, exploración espacial…'],
    ['Crees en el destino', 'el karma, el sistema de castas, supersticiones…'],
    ['Miembro de un club o sociedad secreta', 'francmasones, el Instituto Femenino…'],
    ['En la sociedad hay un mal que debe ser erradicado. ¿Cuál?', 'drogas, violencia, racismo…'],
    ['Lo oculto', 'astrología, espiritualismo, tarot…'],
    ['Política', 'conservador, socialista, liberal…'],
    ['«El dinero es poder, y voy a amasar tanto como pueda»', 'avaro, emprendedor, implacable…'],
    ['Abanderado/Activista', 'feminismo, igualdad de derechos, sindicalismo…'],
  ],
  allegadosQuien: [
    ['Padre', 'madre, padre, madrastra…'], ['Abuelo', 'abuela materna, abuelo paterno…'],
    ['Hermano', 'hermano, hermanastro, hermanastra…'], ['Hijo', 'hijo, hija, hijastro, hijastra…'],
    ['Pareja', 'esposa, prometida, amante…'],
    ['La persona que te enseñó tu habilidad de ocupación más alta', 'un profesor del colegio, la persona de la que fuiste aprendiz, tu padre…'],
    ['Amigo de la infancia', 'compañero de clase, vecino, amigo imaginario…'],
    ['Una persona famosa, tu ídolo o tu héroe', 'estrella de cine, político, músico…'],
    ['Otro investigador de tu grupo de juego', 'elige uno o determínalo al azar'],
    ['Un personaje no jugador del juego', 'pide al Guardián que te elija uno'],
  ],
  allegadosPorque: [
    ['Estás en deuda con esa persona. ¿De qué forma te ayudó?', 'económicamente, te protegió en los malos tiempos, te consiguió tu primer trabajo…'],
    ['Te enseñó algo. ¿Qué?', 'una habilidad, a amar…'],
    ['Dio sentido a tu vida. ¿Cómo?', 'aspirar a ser como esa persona, quieres estar con ella, quieres hacerla feliz…'],
    ['Hiciste algo que la perjudicó y buscas la reconciliación. ¿Qué hiciste?', 'le robaste dinero, la delataste, te negaste a ayudarla…'],
    ['Una experiencia compartida. ¿Cuál?', 'pasasteis juntos una mala racha, crecisteis juntos, servisteis juntos en una guerra…'],
    ['Pretendes demostrarle tu valía. ¿Cómo?', 'consiguiendo un buen trabajo, una buena pareja, una educación…'],
    ['La idolatras', 'por su fama, por su belleza, por su trabajo…'],
    ['Remordimiento', 'deberías haber muerto en su lugar, discutisteis, no la ayudaste cuando pudiste…'],
    ['Quieres demostrar que eres mejor que esa persona. ¿Cuál era su defecto?', 'pereza, alcoholismo, incapaz de amar…'],
    ['Te hizo daño y buscas venganza. ¿De qué la culpas?', 'la muerte de un ser querido, tu ruina financiera, la ruptura de tu matrimonio…'],
  ],
  lugares: [
    ['Donde cursaste tus estudios', 'colegio, universidad…'], ['Tu ciudad natal', 'aldea rural, centro de comercio, ciudad ajetreada…'],
    ['El lugar donde conociste a tu primer amor', 'un concierto, de vacaciones, un refugio antiaéreo…'],
    ['Un lugar de tranquilidad y contemplación', 'la biblioteca, paseos por el campo, pesca…'],
    ['Un lugar para socializar', 'club de caballeros, bar local, la casa de tu tío…'],
    ['Un lugar vinculado a tu ideología o creencias', 'la parroquia, la Meca, Stonehenge…'],
    ['La tumba de un ser querido. ¿De quién?', 'tu padre, un hijo, un amante…'],
    ['La residencia familiar', 'una casa de campo, un apartamento alquilado, el orfanato en el que creciste…'],
    ['El lugar en el que fuiste más feliz', 'el banco del parque del primer beso, tu universidad…'],
    ['Tu lugar de trabajo', 'la oficina, la biblioteca, el banco…'],
  ],
  posesiones: [
    ['Un objeto vinculado a tu habilidad más alta', 'un traje caro, una identificación falsa, un puño americano…'],
    ['Un objeto fundamental para tu ocupación', 'el maletín de un médico, un coche, unas ganzúas…'],
    ['Un recuerdo de tu niñez', 'cómics, una navaja de bolsillo, una moneda de la suerte…'],
    ['Un recuerdo de una persona fallecida', 'una joya, una fotografía en la cartera, una carta…'],
    ['Algo que te dio un allegado', 'un anillo, un diario, un mapa…'],
    ['Tu colección. ¿De qué es?', 'billetes de autobús, animales de peluche, discos…'],
    ['Algo que encontraste y no sabes qué es: buscas respuestas', 'una carta en un idioma desconocido, una extraña flauta, una esfera de plata…'],
    ['Un artículo deportivo', 'un bate de críquet, una pelota firmada, una caña de pescar…'],
    ['Un arma', 'un revólver reglamentario, tu viejo rifle de caza, el cuchillo escondido en la bota…'],
    ['Una mascota', 'un perro, un gato, una tortuga…'],
  ],
  rasgos: [
    ['Generoso', 'propinas generosas, siempre ayuda a los necesitados, filántropo…'],
    ['Bueno con los animales', 'amante de los gatos, creció en una granja, mano para los caballos…'],
    ['Soñador', 'con la cabeza en las nubes, visionario, muy creativo…'],
    ['Hedonista', 'el alma de la fiesta, borracho divertido, «vive deprisa y muere joven»…'],
    ['Jugador y amante del riesgo', 'cara de póquer, lo ha probado todo al menos una vez, vive al límite…'],
    ['Buen cocinero', 'hace unas tartas maravillosas, cocina con casi cualquier cosa, paladar refinado…'],
    ['Seductor/Seductora', 'cortés, voz cautivadora, mirada arrebatadora…'],
    ['Leal', 'apoya a sus amigos, nunca rompe una promesa, moriría por sus creencias…'],
    ['Buena reputación', 'el mejor conversador de sobremesa, el más pío, impávido ante el peligro…'],
    ['Ambicioso', 'alcanzar una meta, convertirse en el jefe, hacerse con todo…'],
  ],
};
