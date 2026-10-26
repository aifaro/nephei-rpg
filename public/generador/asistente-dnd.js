// Asistente de creación de personajes de D&D 5.ª edición (Manual del Jugador de 2014) a nivel 1:
// raza, clase, características, trasfondo, habilidades e idiomas, conjuros, equipo y personalidad.
// Al final crea una ficha nueva en el editor con Generador.crear('dnd', …).
'use strict';

(() => {
  const { h, regla, nota, d, suma, leerRetrato } = AsisComun;
  const CARS = DND.caracteristicas;
  const PHB = pag => `Player's Handbook (2014), pág. ${pag}`;
  const signo = v => (v >= 0 ? '+' : '-') + Math.abs(v);
  const metros = v => String(v).replace('.', ',') + ' m';
  const COMP = 2;  // bonificador por competencia a nivel 1

  function inicial() {
    return {
      paso: 0, visto: 0, metodo: 'estandar', tiradas: null, asig: {}, compra: { FUE: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 },
      raza: '', subraza: '', libres: [], linaje: '', herramientaRaza: '', dote: '',
      clase: '', subclase: '', estilo: '', enemigo: '', terreno: '',
      trasfondo: '', bgEsp: {},
      habClase: [], habLibres: [], pericia: [], habDominio: '', idiomas: [],
      trucos: [], trucoExtra: '', conjuros: [], preparados: [],
      equipo: {}, elecciones: {},
      alineamiento: '', personalidad: ['', ''], ideal: '', vinculo: '', defecto: '',
      datos: { Nombre: '', Jugador: '', Edad: '', Altura: '', Peso: '', Ojos: '', Piel: '', Pelo: '' },
      historia: '', aliados: '', foto: null,
    };
  }

  // ------------------------------------------------------------ reglas aplicadas
  const raza = () => RAZAS_DND.find(r => r.n === asis.A.raza) || null;
  const subraza = () => { const r = raza(); return r && r.subrazas ? r.subrazas.find(s => s.n === asis.A.subraza) || null : null; };
  const clase = () => CLASES_DND.find(c => c.n === asis.A.clase) || null;
  const subclase = () => { const c = clase(); return c && c.subclase ? c.subclase.opciones.find(s => s.n === asis.A.subclase) || null : null; };
  const trasfondo = () => TRASFONDOS_DND.find(t => t.n === asis.A.trasfondo) || null;
  const nombreRaza = () => (subraza() && subraza().n !== raza().n ? subraza().n : asis.A.raza);
  // Un dato de la subraza o, si no lo tiene, de la raza (los aumentos de característica van aparte)
  function deRaza(k) {
    const r = raza(), s = subraza();
    if (!r) return null;
    return s && s[k] != null ? s[k] : r[k] ?? null;
  }
  const libresRaza = () => deRaza('libres');

  function base() {  // las seis puntuaciones antes de la raza
    const A = asis.A, c = {};
    if (A.metodo === 'compra') for (const k of CARS) c[k] = A.compra[k];
    else {
      const vals = A.metodo === 'tiradas' ? (A.tiradas ? A.tiradas.map(t => t.total) : null) : DND.estandar;
      for (const k of CARS) c[k] = vals && A.asig[k] != null ? vals[A.asig[k]] : null;
    }
    return c;
  }
  function mejoras() {
    const r = raza(), s = subraza(), m = {};
    if (!r) return m;
    const suma1 = o => { for (const [k, v] of Object.entries(o || {})) m[k] = (m[k] || 0) + v; };
    if (!(s && s.reemplaza)) suma1(r.mejora);
    if (s) suma1(s.mejora);
    const l = libresRaza();
    if (l) for (const k of asis.A.libres.slice(0, l.n)) m[k] = (m[k] || 0) + l.valor;
    return m;
  }
  function finales() {
    const b = base(), m = mejoras(), c = {};
    for (const k of CARS) c[k] = b[k] == null ? null : Math.min(20, b[k] + (m[k] || 0));
    return c;
  }
  const mod = k => { const v = finales()[k]; return v == null ? 0 : Math.floor((v - 10) / 2); };

  // Habilidades con competencia y de dónde salen
  function habilidadesFijas() {
    const r = new Map();
    for (const n of deRaza('habilidades') || []) r.set(n, nombreRaza());
    const t = trasfondo();
    if (t) for (const n of t.habilidades) r.set(n, r.has(n) ? r.get(n) + ' y trasfondo' : 'trasfondo');
    const sc = subclase();
    if (sc && sc.habilidad && asis.A.habDominio) r.set(asis.A.habDominio, 'dominio');
    return r;
  }
  const repetidas = () => { const t = trasfondo(); return t ? t.habilidades.filter(n => (deRaza('habilidades') || []).includes(n)).length : 0; };
  const numLibres = () => (deRaza('habilidadesLibres') || 0) + repetidas();
  function competentes() {
    const s = new Set(habilidadesFijas().keys());
    for (const n of asis.A.habClase) s.add(n);
    for (const n of asis.A.habLibres) s.add(n);
    const sc = subclase();
    if (sc && sc.pericia) for (const n of asis.A.pericia) s.add(n);  // las del dominio del Conocimiento
    return s;
  }
  function pericias() {
    const c = clase(), sc = subclase();
    return (c && c.pericia) || (sc && sc.pericia) ? asis.A.pericia : [];
  }

  // Idiomas: los de la raza y la clase, más los que se eligen
  const idiomasFijos = () => [...new Set([...(raza() ? raza().idiomas : []), ...((clase() && clase().idiomasExtra) || []), ...((subclase() && subclase().idiomasExtra) || [])])];
  const numIdiomas = () => (deRaza('idiomasLibres') || 0) + ((trasfondo() && trasfondo().idiomasLibres) || 0) + ((subclase() && subclase().idiomasLibres) || 0);

  // Equipo: lista de objetos ya resueltos, con su cantidad
  function objetos() {
    const A = asis.A, c = clase(), t = trasfondo(), res = [];
    const meter = (s, clave) => {
      let m = /^(\d+) (.+)$/.exec(s), n = m ? +m[1] : 1, nombre = m ? m[2] : s;
      if (nombre.startsWith('?')) nombre = A.elecciones[clave] || A.bgEsp[nombre.slice(1)] || '';
      if (nombre) res.push({ n: nombre, cant: n });
    };
    if (c) c.equipo.forEach((grupo, g) => {
      const o = grupo.length === 1 ? 0 : A.equipo[g];
      if (o == null) return;
      grupo[o].forEach((s, i) => meter(s, `${g}-${o}-${i}`));
    });
    if (t) t.equipo.forEach(s => meter(s, ''));
    return res;
  }
  const arma = n => ARMAS_DND.find(a => a[0] === n);
  const armadura = n => ARMADURAS_DND.find(a => a[0] === n);
  function competenteArma(a) {
    const c = clase(), sc = subclase();
    const lista = [...(c ? c.armas : []), ...((sc && sc.armas) || []), ...(deRaza('armas') || [])];
    return lista.includes(a[0]) || (lista.includes('sencillas') && a[1][0] === 's') || (lista.includes('marciales') && a[1][0] === 'm');
  }
  function ca() {
    const c = clase(), sc = subclase(), obs = objetos();
    const arm = obs.map(o => armadura(o.n)).find(Boolean);
    const escudo = obs.some(o => /^Escudo/.test(o.n)) ? 2 : 0;
    const des = mod('DES');
    const opciones = [];
    if (arm) opciones.push(arm[2] + (arm[3] == null ? des : Math.min(des, arm[3])) + escudo + (asis.A.estilo === 'Defensa' ? 1 : 0));
    else {
      opciones.push(10 + des + escudo);
      if (c && c.sinArmadura) opciones.push(10 + mod(c.sinArmadura[0]) + mod(c.sinArmadura[1]) + (c.monje ? 0 : escudo));
      if (sc && sc.sinArmadura13) opciones.push(13 + des + escudo);
    }
    return Math.max(...opciones);
  }
  const pg = () => { const c = clase(); return c ? c.dg + mod('CON') + (deRaza('pgNivel') || 0) + ((subclase() && subclase().pgNivel) || 0) : 0; };
  const velocidad = () => deRaza('vel') || 9;

  function ataques() {
    const c = clase(), res = [];
    for (const o of objetos()) {
      const a = arma(o.n);
      if (!a || res.some(x => x.n === a[0])) continue;
      const sutil = /sutil/.test(a[4]), distancia = a[1][1] === 'd';
      let car = distancia ? 'DES' : 'FUE';
      if (sutil || (c && c.monje && (a[1][0] === 's' || a[0] === 'Espada corta') && !/pesada|a dos manos/.test(a[4]))) car = mod('DES') > mod('FUE') ? 'DES' : 'FUE';
      const m = mod(car);
      let bono = m + (competenteArma(a) ? COMP : 0), dano = m;
      if (asis.A.estilo === 'Arquería' && distancia) bono += 2;
      if (asis.A.estilo === 'Duelo' && !distancia && !/a dos manos/.test(a[4])) dano += 2;
      const dado = c && c.monje && a[2] === '1d4' && a[1][1] === 'c' ? '1d4' : a[2];
      res.push({ n: a[0], bono: signo(bono), dano: `${dado}${dano ? signo(dano) : ''} ${a[3]}` });
    }
    return res;
  }

  // Magia
  const magia = () => { const c = clase(); return c && c.magia ? c.magia : null; };
  const listaConjuros = nivel => { const m = magia(); return m ? CONJUROS_DND[m.lista][nivel] : []; };
  function conjurosSiempre() {  // los del dominio (clérigo) o la lista ampliada del patrón (brujo)
    const sc = subclase();
    return sc && sc.conjuros ? sc.conjuros : [];
  }
  const numPreparados = () => { const m = magia(); return m && m.prepara ? Math.max(1, mod(m.prepara) + 1) : 0; };

  // ------------------------------------------------------------ piezas
  const tarjetas = (nombre, ops, actual, alElegir) => h('div', { class: 'asis-tarjetas' }, ops.map(([v, t, sub]) => h('label', null,
    h('input', { type: 'radio', name: nombre, checked: actual === v, onchange: () => alElegir(v) }), h('span', null, h('strong', null, t), sub ? h('small', null, sub) : null))));
  const lista = xs => h('ul', { class: 'asis-dados asis-columnas' }, xs.map(x => h('li', null, x)));
  const elegirVarios = (nombre, ops, elegidos, max, alCambiar, deshabilitar) => h('div', { class: 'asis-tarjetas' }, ops.map(n => {
    const marcado = elegidos.includes(n);
    return h('label', null, h('input', { type: 'checkbox', name: nombre, checked: marcado, disabled: !marcado && (elegidos.length >= max || (deshabilitar && deshabilitar(n))),
      onchange: e => alCambiar(e.target.checked ? [...elegidos, n] : elegidos.filter(x => x !== n)) }), h('span', null, n));
  }));
  const textoMejoras = o => Object.entries(o || {}).map(([k, v]) => `${k} +${v}`).join(', ');

  // ------------------------------------------------------------ pasos
  const PASOS = [
    { t: 'Empezar', pintar: pasoEmpezar, ok: () => true },
    { t: 'Raza', pintar: pasoRaza, ok: okRaza },
    { t: 'Clase', pintar: pasoClase, ok: okClase },
    { t: 'Características', pintar: pasoCaracteristicas, ok: okCaracteristicas },
    { t: 'Trasfondo', pintar: pasoTrasfondo, ok: okTrasfondo },
    { t: 'Habilidades e idiomas', pintar: pasoHabilidades, ok: okHabilidades },
    { t: 'Conjuros', pintar: pasoConjuros, ok: okConjuros },
    { t: 'Equipo', pintar: pasoEquipo, ok: okEquipo },
    { t: 'Personalidad y detalles', pintar: pasoDetalles, ok: () => true },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];

  function pasoEmpezar(c) {
    c.append(h('h3', null, 'Un personaje nuevo'),
      h('p', null, 'El asistente crea un personaje de nivel 1 con las reglas del Manual del Jugador de 2014, el de esta hoja. Puedes ir y volver entre los pasos: lo que elijas queda guardado en este navegador hasta que crees la ficha.'),
      regla('Habla antes con tu DM del tipo de campaña y con el resto de jugadores del grupo que queréis formar: quién lucha, quién lanza conjuros, quién cura, quién negocia.', PHB(11)),
      h('h4', null, 'Puntuaciones de característica'),
      asis.radios('metodo', [
        ['estandar', 'Conjunto estándar', '15, 14, 13, 12, 10 y 8, a repartir como quieras.'],
        ['compra', 'Compra de puntos', '27 puntos para comprar puntuaciones de 8 a 15 antes de la raza.'],
        ['tiradas', 'Tirar los dados', '4d6 quitando el dado más bajo, seis veces; colocas cada resultado donde quieras.'],
      ], () => { asis.A.asig = {}; }));
  }

  function pasoRaza(c) {
    const A = asis.A, r = raza();
    c.append(h('h3', null, 'Raza'),
      regla('La raza da aumentos de puntuación de característica, la velocidad, el tamaño, idiomas y rasgos raciales. Algunas tienen subrazas.', PHB(17)),
      tarjetas('dnd-raza', RAZAS_DND.map(x => [x.n, x.n, textoMejoras(x.mejora) + (x.libres ? `, +1 a otras dos` : '') + ` · ${metros(x.vel)}`]), A.raza,
        v => asis.cambia(A => { A.raza = v; const x = raza(); A.subraza = x.subrazas ? x.subrazas[0].n : ''; A.libres = []; A.trucoExtra = ''; A.habLibres = []; A.herramientaRaza = ''; })));
    if (!r) return;
    if (r.subrazas) c.append(h('h4', null, 'Subraza'), tarjetas('dnd-subraza', r.subrazas.map(s => [s.n, s.n, s.reemplaza ? 'Variante opcional' : textoMejoras(s.mejora)]), A.subraza,
      v => asis.cambia(A => { A.subraza = v; A.libres = []; A.trucoExtra = ''; A.habLibres = []; })));
    c.append(h('h4', null, 'Rasgos'), lista([`Tamaño ${deRaza('tam')}, velocidad ${metros(velocidad())}.`, `Idiomas: ${r.idiomas.join(', ')}.`, ...r.rasgos, ...((subraza() && subraza().rasgos) || [])]));
    const l = libresRaza();
    if (l) {
      c.append(h('h4', null, `+${l.valor} a ${l.n} características`), elegirVarios('dnd-libres', CARS.filter(k => !(l.no || []).includes(k)), A.libres, l.n, v => asis.cambia(A => { A.libres = v; })));
    }
    if (r.herramienta || (subraza() && subraza().herramienta)) {
      const ops = (subraza() && subraza().herramienta) || r.herramienta;
      if (ops.length === 1) A.herramientaRaza = ops[0];
      else c.append(h('h4', null, 'Herramientas'), tarjetas('dnd-herr', ops.map(x => [x, x]), A.herramientaRaza, v => asis.cambia(A => { A.herramientaRaza = v; })));
    }
    if (r.linaje) c.append(h('h4', null, 'Linaje dracónico'), h('label', null, 'Dragón: ', h('select', { onchange: e => asis.cambia(A => { A.linaje = e.target.value; }) },
      h('option', { value: '' }, '— elige —'), LINAJES_DND.map(([n, t, a]) => h('option', { value: n, selected: A.linaje === n }, `${n} · ${t} · ${a}`)))));
    if (deRaza('trucoDe')) c.append(h('h4', null, `Truco de ${deRaza('trucoDe').toLowerCase()}`), h('select', { onchange: e => { A.trucoExtra = e.target.value; asis.guardar(); asis.pie(); } },
      h('option', { value: '' }, '— elige —'), CONJUROS_DND[deRaza('trucoDe')][0].map(n => h('option', { value: n, selected: A.trucoExtra === n }, n))));
    if (deRaza('dote')) c.append(h('h4', null, 'Dote'), h('p', null, h('input', { type: 'text', value: A.dote, list: 'dnd-dotes', placeholder: 'el nombre de la dote', oninput: e => { A.dote = e.target.value; asis.guardar(); asis.pie(); } }),
      h('datalist', { id: 'dnd-dotes' }, DOTES_DND.map(x => h('option', { value: x })))), nota('Las dotes están en el capítulo 6 del Manual del Jugador. Apunta su efecto en la ficha.'));
  }
  function okRaza() {
    const A = asis.A, r = raza(), l = libresRaza();
    if (!r) return 'Elige una raza.';
    if (r.subrazas && !subraza()) return 'Elige la subraza.';
    if (l && A.libres.length !== l.n) return `Elige ${l.n} características para el +${l.valor}.`;
    if (r.linaje && !A.linaje) return 'Elige el linaje dracónico.';
    if ((r.herramienta || (subraza() && subraza().herramienta)) && !A.herramientaRaza) return 'Elige las herramientas.';
    if (deRaza('trucoDe') && !A.trucoExtra) return 'Elige el truco.';
    if (deRaza('dote') && !A.dote.trim()) return 'Escribe la dote.';
    return true;
  }

  function pasoClase(c) {
    const A = asis.A, cl = clase();
    c.append(h('h3', null, 'Clase'),
      regla('La clase dice qué sabe hacer el personaje: su dado de golpe, en qué tiradas de salvación, armas y armaduras es competente, qué habilidades puede elegir y sus rasgos de clase.', PHB(45)),
      tarjetas('dnd-clase', CLASES_DND.map(x => [x.n, x.n, `d${x.dg} · salvaciones ${x.salvaciones.join(' y ')}${x.magia ? ' · conjuros' : ''}`]), A.clase,
        v => asis.cambia(A => { A.clase = v; A.subclase = ''; A.estilo = ''; A.habClase = []; A.pericia = []; A.trucos = []; A.conjuros = []; A.preparados = []; A.equipo = {}; A.elecciones = {}; A.habDominio = ''; })));
    if (!cl) return;
    c.append(h('dl', { class: 'asis-dato' },
      h('dt', null, 'Puntos de golpe'), h('dd', null, `d${cl.dg}: a nivel 1, ${cl.dg} + tu modificador de Constitución.`),
      h('dt', null, 'Salvaciones'), h('dd', null, cl.salvaciones.map(k => DND.nombres[k]).join(' y ')),
      h('dt', null, 'Armaduras'), h('dd', null, cl.armaduras),
      h('dt', null, 'Armas'), h('dd', null, cl.armas.join(', ')),
      cl.herramientas ? [h('dt', null, 'Herramientas'), h('dd', null, cl.herramientas)] : null,
      h('dt', null, 'Habilidades'), h('dd', null, `${cl.habilidades.n} de ${cl.habilidades.de === 'todas' ? 'cualquiera' : cl.habilidades.de.join(', ')}`)),
      h('h4', null, 'Rasgos de nivel 1'), lista([...cl.rasgos, cl.magia ? `Lanzamiento de conjuros con ${DND.nombres[cl.magia.aptitud]}.` : null].filter(Boolean)), nota(`Detalles en ${PHB(cl.pag)}.`));
    if (cl.subclase) {
      c.append(h('h4', null, cl.subclase.n), tarjetas('dnd-sub', cl.subclase.opciones.map(s => [s.n, s.n, s.rasgos.join(' ')]), A.subclase,
        v => asis.cambia(A => { A.subclase = v; A.pericia = []; A.habDominio = ''; })));
      const sc = subclase();
      if (sc && sc.habilidad) c.append(h('label', null, 'Habilidad del dominio: ', h('select', { onchange: e => asis.cambia(A => { A.habDominio = e.target.value; }) },
        h('option', { value: '' }, '— elige —'), sc.habilidad.map(x => h('option', { value: x, selected: A.habDominio === x }, x)))));
      if (sc && sc.trucoDe) c.append(h('p', null, 'Truco de druida: ', h('select', { onchange: e => { A.trucoExtra = e.target.value; asis.guardar(); asis.pie(); } },
        h('option', { value: '' }, '— elige —'), CONJUROS_DND.Druida[0].map(n => h('option', { value: n, selected: A.trucoExtra === n }, n)))));
      if (sc && sc.linaje && !raza().linaje) c.append(h('label', null, 'Dragón antepasado: ', h('select', { onchange: e => asis.cambia(A => { A.linaje = e.target.value; }) },
        h('option', { value: '' }, '— elige —'), LINAJES_DND.map(([n, t]) => h('option', { value: n, selected: A.linaje === n }, `${n} · ${t}`)))));
    }
    if (cl.estilo) c.append(h('h4', null, 'Estilo de combate'), tarjetas('dnd-estilo', ESTILOS_DND.map(([n, t]) => [n, n, t]), A.estilo, v => asis.cambia(A => { A.estilo = v; })));
    if (cl.explorador) c.append(h('h4', null, 'Enemigo predilecto y terreno favorito'),
      h('p', null, h('select', { 'aria-label': 'Enemigo predilecto', onchange: e => { A.enemigo = e.target.value; asis.guardar(); asis.pie(); } }, h('option', { value: '' }, 'enemigo predilecto'),
        ENEMIGOS_DND.map(x => h('option', { value: x, selected: A.enemigo === x }, x))), ' ',
        h('select', { 'aria-label': 'Terreno favorito', onchange: e => { A.terreno = e.target.value; asis.guardar(); asis.pie(); } }, h('option', { value: '' }, 'terreno favorito'),
          TERRENOS_DND.map(x => h('option', { value: x, selected: A.terreno === x }, x)))));
  }
  function okClase() {
    const A = asis.A, cl = clase(), sc = subclase();
    if (!cl) return 'Elige una clase.';
    if (cl.subclase && !sc) return `Elige ${cl.subclase.n.toLowerCase()}.`;
    if (sc && sc.habilidad && !A.habDominio) return 'Elige la habilidad del dominio.';
    if (sc && sc.trucoDe && !A.trucoExtra) return 'Elige el truco de druida.';
    if (sc && sc.linaje && !A.linaje) return 'Elige el dragón antepasado.';
    if (cl.estilo && !A.estilo) return 'Elige un estilo de combate.';
    if (cl.explorador && (!A.enemigo || !A.terreno)) return 'Elige enemigo predilecto y terreno favorito.';
    return true;
  }

  function pasoCaracteristicas(c) {
    const A = asis.A, cl = clase(), m = mejoras();
    c.append(h('h3', null, 'Puntuaciones de característica'));
    if (cl) c.append(nota(`Para un ${cl.n.toLowerCase()} conviene poner lo más alto en ${cl.magia ? DND.nombres[cl.magia.aptitud] : cl.salvaciones.map(k => DND.nombres[k]).join(' o ')}, y no descuidar la Constitución (puntos de golpe).`));
    if (A.metodo === 'compra') {
      const gasto = suma(CARS.map(k => DND.compra.coste[A.compra[k]]));
      c.append(regla('Tienes 27 puntos. Cada puntuación empieza en 8; subirla cuesta: 9 → 1, 10 → 2, 11 → 3, 12 → 4, 13 → 5, 14 → 7 y 15 → 9 puntos. No se puede comprar más de 15 antes de la raza.', PHB(13)),
        h('div', { class: 'asis-cars' }, CARS.map(k => h('div', { class: 'asis-car' }, h('b', null, `${k} · ${DND.nombres[k]}`), h('span', { class: 'v' }, A.compra[k]),
          h('small', null, `coste ${DND.compra.coste[A.compra[k]]}`),
          h('span', null, h('button', { type: 'button', class: 'gen-boton mini', disabled: A.compra[k] <= 8, onclick: () => asis.cambia(A => { A.compra[k]--; }) }, '−'), ' ',
            h('button', { type: 'button', class: 'gen-boton mini', disabled: A.compra[k] >= 15 || DND.compra.coste[A.compra[k] + 1] - DND.compra.coste[A.compra[k]] > 27 - gasto,
              onclick: () => asis.cambia(A => { A.compra[k]++; }) }, '+'))))),
        h('p', { class: gasto === 27 ? 'asis-ok' : 'asis-aviso' }, `Gastados ${gasto} de 27.`));
    } else {
      if (A.metodo === 'tiradas') {
        c.append(regla('Tira 4d6 y anota la suma de los tres dados más altos. Hazlo seis veces y coloca cada resultado en una característica.', PHB(13)));
        if (!A.tiradas) {
          c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => asis.cambia(A => {
            A.tiradas = Array.from({ length: 6 }, () => { const dados = [d(6), d(6), d(6), d(6)]; return { dados, total: suma(dados) - Math.min(...dados) }; });
            A.asig = {};
          }) }, 'Tirar los dados'));
          return;
        }
        c.append(h('ul', { class: 'asis-dados' }, A.tiradas.map((t, i) => h('li', null, `Tirada ${i + 1}: ${t.dados.join(', ')} → ${t.total}`))),
          h('p', null, h('button', { type: 'button', class: 'gen-boton', onclick: () => { if (confirm('¿Volver a tirar? Hazlo solo si tu DM lo permite.')) asis.cambia(A => { A.tiradas = null; A.asig = {}; }); } }, 'Volver a tirar')));
      } else c.append(regla('Reparte 15, 14, 13, 12, 10 y 8 entre las seis características.', PHB(13)));
      const vals = A.metodo === 'tiradas' ? A.tiradas.map(t => t.total) : DND.estandar;
      c.append(h('div', { class: 'asis-cars' }, CARS.map(k => {
        const usados = new Set(CARS.filter(j => j !== k && A.asig[j] != null).map(j => A.asig[j]));
        return h('label', { class: 'asis-car' }, h('b', null, `${k} · ${DND.nombres[k]}`),
          h('select', { onchange: e => asis.cambia(A => { A.asig[k] = e.target.value === '' ? null : +e.target.value; }) }, h('option', { value: '' }, '—'),
            vals.map((v, i) => usados.has(i) ? null : h('option', { value: i, selected: A.asig[k] === i }, v))));
      })));
    }
    const f = finales();
    if (CARS.every(k => f[k] != null)) c.append(h('h4', null, 'Con la raza'), h('div', { class: 'asis-cars' }, CARS.map(k => h('div', { class: 'asis-car' },
      h('b', null, k), h('span', { class: 'v' }, f[k]), h('small', null, `modificador ${signo(mod(k))}${m[k] ? ` · raza +${m[k]}` : ''}`)))));
  }
  function okCaracteristicas() {
    const A = asis.A, b = base();
    if (A.metodo === 'tiradas' && !A.tiradas) return 'Falta tirar los dados.';
    if (!CARS.every(k => b[k] != null)) return 'Falta dar un valor a cada característica.';
    if (A.metodo === 'compra' && suma(CARS.map(k => DND.compra.coste[A.compra[k]])) > 27) return 'Te has pasado de 27 puntos.';
    return true;
  }

  function pasoTrasfondo(c) {
    const A = asis.A, t = trasfondo();
    c.append(h('h3', null, 'Trasfondo'),
      regla('El trasfondo dice de dónde viene el personaje y a qué se dedicaba antes de ser aventurero: da dos habilidades, herramientas o idiomas, equipo, un rasgo y sugerencias de personalidad.', PHB(123)),
      tarjetas('dnd-tras', TRASFONDOS_DND.map(x => [x.n, x.n, x.habilidades.join(', ')]), A.trasfondo, v => asis.cambia(A => { A.trasfondo = v; A.bgEsp = {}; })));
    if (!t) return;
    c.append(h('dl', { class: 'asis-dato' },
      h('dt', null, 'Habilidades'), h('dd', null, t.habilidades.join(', ')),
      t.herramientas ? [h('dt', null, 'Herramientas'), h('dd', null, t.herramientas.map(x => x.replace('?instrumento', 'un instrumento').replace('?artesano', 'unas herramientas de artesano').replace('?juego', 'un tipo de juego')).join(', '))] : null,
      t.idiomasLibres ? [h('dt', null, 'Idiomas'), h('dd', null, t.idiomasLibres === 1 ? 'uno a elegir' : `${t.idiomasLibres} a elegir`)] : null,
      h('dt', null, 'Equipo'), h('dd', null, t.equipo.map(x => x.replace('?instrumento', 'un instrumento').replace('?artesano', 'herramientas de artesano')).join(', ')),
      h('dt', null, 'Rasgo'), h('dd', null, t.rasgo)), nota(`Detalles en ${PHB(t.pag)}.`));
    const usa = k => [...(t.herramientas || []), ...t.equipo].includes('?' + k);
    const elegir = (k, ops, t2) => c.append(h('p', null, h('label', null, t2 + ': ', h('select', { onchange: e => { A.bgEsp[k] = e.target.value; asis.guardar(); asis.pie(); } },
      h('option', { value: '' }, '— elige —'), ops.map(x => h('option', { value: x, selected: A.bgEsp[k] === x }, x))))));
    if (usa('instrumento')) elegir('instrumento', DND.instrumentos, 'Instrumento');
    if (usa('artesano')) elegir('artesano', DND.artesano, 'Herramientas de artesano');
    if (usa('juego')) elegir('juego', DND.juegos, 'Juego');
  }
  function okTrasfondo() {
    const t = trasfondo();
    if (!t) return 'Elige un trasfondo.';
    for (const k of ['instrumento', 'artesano', 'juego']) if ([...(t.herramientas || []), ...t.equipo].includes('?' + k) && !asis.A.bgEsp[k]) return 'Falta elegir algo del trasfondo.';
    return true;
  }

  function pasoHabilidades(c) {
    const A = asis.A, cl = clase(), sc = subclase(), fijas = habilidadesFijas(), todas = Object.keys(DND.habilidades);
    c.append(h('h3', null, 'Habilidades'),
      regla('Eres competente en las habilidades de tu raza y tu trasfondo, y eliges las de tu clase. Si dos fuentes te dan la misma, eliges otra cualquiera en su lugar. En una habilidad con competencia sumas tu bonificador por competencia (+2 a nivel 1).', PHB(125)));
    if (fijas.size) c.append(h('p', null, h('strong', null, 'Ya las tienes: '), [...fijas].map(([n, de]) => `${n} (${de})`).join(', ') + '.'));
    const deClase = cl.habilidades.de === 'todas' ? todas : cl.habilidades.de;
    c.append(h('h4', null, `De tu clase: elige ${cl.habilidades.n}`),
      elegirVarios('dnd-habclase', deClase, A.habClase, cl.habilidades.n, v => asis.cambia(A => { A.habClase = v; A.pericia = A.pericia.filter(x => competentes().has(x) || x === 'Herramientas de ladrón'); }),
        n => fijas.has(n) || A.habLibres.includes(n)));
    if (numLibres()) c.append(h('h4', null, `A tu elección: ${numLibres()}`), nota(repetidas() ? 'Incluye las que repite tu trasfondo con tu raza.' : 'Por tu raza.'),
      elegirVarios('dnd-hablibres', todas, A.habLibres, numLibres(), v => asis.cambia(A => { A.habLibres = v; }), n => fijas.has(n) || A.habClase.includes(n)));
    if (cl.pericia) {
      const ops = [...competentes(), cl.pericia.herramientas].filter(Boolean);
      c.append(h('h4', null, 'Pericia'), regla('Elige dos de tus habilidades con competencia (o una y las herramientas de ladrón): en ellas el bonificador por competencia se duplica.', PHB(96)),
        elegirVarios('dnd-pericia', ops, A.pericia, 2, v => asis.cambia(A => { A.pericia = v; })));
    }
    if (sc && sc.pericia) c.append(h('h4', null, 'Bendiciones del conocimiento'), regla('Elige dos: tienes competencia en ellas y el bonificador se duplica.', PHB(59)),
      elegirVarios('dnd-pericia', sc.pericia.de, A.pericia, 2, v => asis.cambia(A => { A.pericia = v; }), n => fijas.has(n) || A.habClase.includes(n)));
    // Idiomas
    const fijos = idiomasFijos(), n = numIdiomas();
    c.append(h('h3', null, 'Idiomas'), h('p', null, h('strong', null, 'Ya hablas: '), fijos.join(', ') + '.'));
    if (n) c.append(h('h4', null, `Elige ${n}`), nota('Los exóticos, si tu DM lo permite.'),
      elegirVarios('dnd-idiomas', [...DND.idiomas, ...DND.idiomasExoticos].filter(x => !fijos.includes(x)), A.idiomas, n, v => asis.cambia(A => { A.idiomas = v; })));
  }
  function okHabilidades() {
    const A = asis.A, cl = clase(), sc = subclase();
    if (A.habClase.length !== cl.habilidades.n) return `Elige ${cl.habilidades.n} habilidades de clase.`;
    if (A.habLibres.length !== numLibres()) return `Elige ${numLibres()} habilidades más.`;
    if ((cl.pericia || (sc && sc.pericia)) && A.pericia.length !== 2) return 'Elige las dos de pericia.';
    if (A.idiomas.length !== numIdiomas()) return `Elige ${numIdiomas()} idiomas.`;
    return true;
  }

  function pasoConjuros(c) {
    const A = asis.A, m = magia(), cl = clase(), siempre = conjurosSiempre();
    c.append(h('h3', null, 'Conjuros'));
    if (!m) {
      c.append(h('p', null, `Un ${cl.n.toLowerCase()} no lanza conjuros a nivel 1.`));
      const racial = [...(deRaza('trucos') || []), A.trucoExtra].filter(Boolean);
      if (racial.length) c.append(h('p', null, `Por tu raza conoces: ${racial.join(', ')}. Irán a la hoja de conjuros.`));
      return;
    }
    const extra = [...(deRaza('trucos') || []), ...((subclase() && subclase().trucos) || []), A.trucoExtra].filter(Boolean);
    c.append(regla(`Tu aptitud mágica es ${DND.nombres[m.aptitud]}: CD de salvación de tus conjuros = 8 + ${COMP} + ${signo(mod(m.aptitud)).replace('+', '')} = ${8 + COMP + mod(m.aptitud)}; ataque de conjuro ${signo(COMP + mod(m.aptitud))}. A nivel 1 tienes ${m.espacios === 1 ? 'un espacio' : m.espacios + ' espacios'} de conjuro de nivel 1${m.pacto ? ', que se recupera con un descanso corto' : ''}.`, PHB(cl.pag)),
      h('h4', null, `Trucos: elige ${m.trucos}`),
      extra.length ? nota(`Además conoces ${extra.join(', ')} por tu raza o tu subclase.`) : null,
      elegirVarios('dnd-trucos', listaConjuros(0), A.trucos, m.trucos, v => asis.cambia(A => { A.trucos = v; }), n => extra.includes(n)));
    if (m.conocidos) {
      const ops = [...new Set([...listaConjuros(1), ...siempre])];
      c.append(h('h4', null, `Conjuros de nivel 1: elige ${m.conocidos}`), siempre.length ? nota(`Tu patrón añade a tu lista: ${siempre.join(', ')}.`) : null,
        elegirVarios('dnd-conj', ops, A.conjuros, m.conocidos, v => asis.cambia(A => { A.conjuros = v; })));
    } else if (m.libro) {
      c.append(h('h4', null, `Libro de conjuros: elige ${m.libro} de nivel 1`), elegirVarios('dnd-conj', listaConjuros(1), A.conjuros, m.libro, v => asis.cambia(A => { A.conjuros = v; A.preparados = A.preparados.filter(x => v.includes(x)); })));
      if (A.conjuros.length) c.append(h('h4', null, `Preparados: ${numPreparados()} (INT + nivel)`), elegirVarios('dnd-prep', A.conjuros, A.preparados, numPreparados(), v => asis.cambia(A => { A.preparados = v; })));
    } else {
      c.append(h('h4', null, `Preparados: ${numPreparados()} (${m.aptitud} + nivel)`), regla('Preparas tus conjuros de la lista completa de tu clase cada día, tras un descanso largo.', PHB(cl.pag)),
        siempre.length ? nota(`Los de tu dominio están siempre preparados y no cuentan: ${siempre.join(', ')}.`) : null,
        elegirVarios('dnd-prep', listaConjuros(1).filter(n => !siempre.includes(n)), A.preparados, numPreparados(), v => asis.cambia(A => { A.preparados = v; })));
    }
  }
  function okConjuros() {
    const A = asis.A, m = magia();
    if (!m) return true;
    if (A.trucos.length !== m.trucos) return `Elige ${m.trucos} trucos.`;
    if (m.conocidos && A.conjuros.length !== m.conocidos) return `Elige ${m.conocidos} conjuros.`;
    if (m.libro && A.conjuros.length !== m.libro) return `Elige ${m.libro} conjuros para el libro.`;
    if ((m.libro || m.prepara) && A.preparados.length > numPreparados()) return 'Has preparado demasiados.';
    return true;
  }

  function pasoEquipo(c) {
    const A = asis.A, cl = clase(), t = trasfondo();
    c.append(h('h3', null, 'Equipo'),
      regla('Empiezas con el equipo de tu clase (eligiendo entre sus opciones) y el de tu trasfondo.', PHB(143)));
    const elegir = (clave, tipo) => {
      const ops = tipo === 'instrumento' ? DND.instrumentos : ARMAS_DND.filter(a => (tipo.startsWith('marcial') ? a[1][0] === 'm' : a[1][0] === 's') && (!tipo.endsWith('CaC') || a[1][1] === 'c')).map(a => a[0]);
      return h('select', { 'aria-label': 'Elige', onchange: e => { A.elecciones[clave] = e.target.value; asis.guardar(); asis.pie(); } },
        h('option', { value: '' }, { marcial: '— arma marcial —', marcialCaC: '— arma marcial cuerpo a cuerpo —', sencilla: '— arma sencilla —', sencillaCaC: '— arma sencilla cuerpo a cuerpo —', instrumento: '— instrumento —' }[tipo]),
        ops.map(n => h('option', { value: n, selected: A.elecciones[clave] === n }, n)));
    };
    cl.equipo.forEach((grupo, g) => {
      const fijo = grupo.length === 1;
      c.append(h('div', { class: 'asis-opciones' }, grupo.map((op, o) => h('label', null,
        fijo ? null : h('input', { type: 'radio', name: 'dnd-eq' + g, checked: A.equipo[g] === o, onchange: () => asis.cambia(A => { A.equipo[g] = o; }) }),
        h('span', null, op.map((s, i) => s.startsWith('?') ? (A.equipo[g] === o || fijo ? elegir(`${g}-${o}-${i}`, s.slice(1)) : h('em', null, s.slice(1).replace('CaC', ' cuerpo a cuerpo'))) : s.replace(/^(\d+) /, '$1 × '))
          .flatMap((x, i) => i ? [' + ', x] : [x]))))));
    });
    if (cl.notaEquipo) c.append(nota(cl.notaEquipo));
    c.append(h('p', null, h('strong', null, 'Del trasfondo: '), t.equipo.map(x => x.startsWith('?') ? A.bgEsp[x.slice(1)] : x).join(', ') + '.'),
      nota(`En vez del equipo de clase se puede empezar con ${cl.oro} po para comprarlo (PHB, pág. 143): si lo prefieres, apúntalo en la ficha a mano.`));
    if (Object.keys(A.equipo).length + cl.equipo.filter(g => g.length === 1).length === cl.equipo.length) {
      const at = ataques();
      c.append(h('h4', null, 'Así queda'), h('p', null, `CA ${ca()} · PG ${pg()} · velocidad ${metros(velocidad())}`),
        at.length ? h('table', { class: 'asis-tabla' }, h('tbody', null, at.map(a => h('tr', null, h('td', null, a.n), h('td', { class: 'n' }, a.bono), h('td', null, a.dano))))) : null);
    }
  }
  function okEquipo() {
    const A = asis.A, cl = clase();
    for (let g = 0; g < cl.equipo.length; g++) {
      const fijo = cl.equipo[g].length === 1, o = fijo ? 0 : A.equipo[g];
      if (o == null) return 'Elige una opción de cada grupo.';
      if (cl.equipo[g][o].some((s, i) => s.startsWith('?') && !A.elecciones[`${g}-${o}-${i}`])) return 'Falta elegir algún arma o instrumento.';
    }
    return true;
  }

  function pasoDetalles(c) {
    const A = asis.A, t = trasfondo(), D = A.datos;
    c.append(h('h3', null, 'Personalidad'),
      regla('Dos rasgos de personalidad, un ideal, un vínculo y un defecto. Las sugerencias de tu trasfondo son un punto de partida: cámbialas a tu gusto.', PHB(123)),
      h('label', null, 'Alineamiento: ', h('select', { onchange: e => { A.alineamiento = e.target.value; asis.guardar(); } }, h('option', { value: '' }, '—'),
        DND.alineamientos.map(x => h('option', { value: x, selected: A.alineamiento === x }, x)))));
    const bloque = (titulo, valor, sugerencias, poner) => {
      const ta = h('textarea', { value: valor(), 'aria-label': titulo, oninput: e => { poner(e.target.value); asis.guardar(); } });
      c.append(h('div', { class: 'asis-tras' }, h('header', null, h('b', null, titulo),
        h('button', { type: 'button', class: 'gen-boton mini', onclick: () => { const x = sugerencias[d(sugerencias.length) - 1]; poner(x); ta.value = x; asis.guardar(); } }, `Tirar 1d${sugerencias.length}`)),
        h('div', { class: 'asis-chips' }, sugerencias.map(x => h('button', { type: 'button', onclick: () => { poner(x); ta.value = x; asis.guardar(); } }, x))), ta));
    };
    bloque('Rasgo de personalidad 1', () => A.personalidad[0], t.rasgos, v => { A.personalidad[0] = v; });
    bloque('Rasgo de personalidad 2', () => A.personalidad[1], t.rasgos, v => { A.personalidad[1] = v; });
    bloque('Ideal', () => A.ideal, t.ideales, v => { A.ideal = v; });
    bloque('Vínculo', () => A.vinculo, t.vinculos, v => { A.vinculo = v; });
    bloque('Defecto', () => A.defecto, t.defectos, v => { A.defecto = v; });
    const campo = (k, tt) => h('label', null, tt, h('input', { type: 'text', value: D[k], oninput: e => { D[k] = e.target.value; asis.guardar(); } }));
    c.append(h('h3', null, 'Detalles'), h('div', { class: 'asis-rejilla' }, campo('Nombre', 'Nombre del personaje'), campo('Jugador', 'Jugador'),
      campo('Edad', 'Edad'), campo('Altura', 'Altura'), campo('Peso', 'Peso'), campo('Ojos', 'Ojos'), campo('Piel', 'Piel'), campo('Pelo', 'Pelo')),
      h('p', null, h('label', null, 'Historia del personaje', h('textarea', { rows: 4, value: A.historia, oninput: e => { A.historia = e.target.value; asis.guardar(); } }))),
      h('p', null, h('label', null, 'Aliados y organizaciones', h('textarea', { value: A.aliados, oninput: e => { A.aliados = e.target.value; asis.guardar(); } }))),
      h('h4', null, 'Aspecto del personaje'), nota('El retrato va en el recuadro «Aspecto del personaje» de la segunda hoja. Después podrás encuadrarlo pulsando sobre él en la ficha.'),
      A.foto ? h('p', null, h('img', { src: A.foto, alt: 'Retrato', style: 'max-width:10rem;border:1px solid var(--regla)' })) : null,
      h('p', null, h('label', { class: 'gen-boton' }, A.foto ? 'Cambiar la imagen' : 'Subir una imagen',
        h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => { const [x0, y0, x1, y1] = Generador.ficha('dnd').foto.r; leerRetrato(e.target.files[0], x1 - x0, y1 - y0, url => asis.cambia(A => { A.foto = url; })); } })),
        A.foto ? h('button', { type: 'button', class: 'gen-boton', style: 'margin-left:.4rem', onclick: () => asis.cambia(A => { A.foto = null; }) }, 'Quitar') : null));
  }

  function pasoResumen(c) {
    const A = asis.A, f = finales(), cl = clase();
    c.append(h('h3', null, A.datos.Nombre || 'Tu personaje'),
      h('p', null, [`${cl.n} 1`, subclase() && subclase().n, nombreRaza(), A.trasfondo, A.alineamiento].filter(Boolean).join(' · ')),
      h('p', null, CARS.map(k => `${k} ${f[k]} (${signo(mod(k))})`).join(' · ')),
      h('p', null, `CA ${ca()} · PG ${pg()} · velocidad ${metros(velocidad())} · iniciativa ${signo(mod('DES'))} · competencia +${COMP}`),
      h('p', null, h('strong', null, 'Competente en: '), [...competentes()].sort((a, b) => a.localeCompare(b, 'es')).join(', ') + '.'),
      nota('Al crear la ficha se abre como personaje nuevo en el editor; lo que tengas abierto ahora se queda en «Mis personajes». El editor calcula los modificadores, las salvaciones y las habilidades.'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: crearFicha }, 'Crear la ficha')));
  }

  // ------------------------------------------------------------ de aquí a la ficha
  function crearFicha() {
    const A = asis.A, cl = clase(), sc = subclase(), t = trasfondo(), r = raza(), f = finales(), m = magia(), cp = {};
    const pon = (n, x) => { if (x != null && x !== '') cp[n] = String(x); };
    pon('Nombre', A.datos.Nombre); pon('Jugador', A.datos.Jugador);
    pon('Clase y nivel', `${cl.n} 1`); pon('Trasfondo', t.n); pon('Raza', nombreRaza()); pon('Alineamiento', A.alineamiento); pon('Experiencia', 0);
    for (const k of CARS) pon(k, f[k]);
    for (const k of cl.salvaciones) cp[`Salvación ${k} (competente)`] = true;
    const comp = competentes();
    for (const n of comp) if (n in DND.habilidades) cp[n + ' (competente)'] = true;
    for (const n of pericias()) if (n in DND.habilidades) pon(n, signo(mod(DND.habilidades[n]) + 2 * COMP));  // el doble de competencia
    pon('CA', ca()); pon('Velocidad', metros(velocidad()));
    pon('PG máximos', pg()); pon('PG actuales', pg());
    pon('Dados de golpe total', `1d${cl.dg}`); pon('Dados de golpe', `1d${cl.dg}`);
    ataques().slice(0, 3).forEach((a, i) => { pon(`Ataque ${i + 1}`, a.n); pon(`Ataque ${i + 1} bonificador`, a.bono); pon(`Ataque ${i + 1} daño`, a.dano); });

    // Rasgos: raza, clase, subclase y trasfondo
    const linaje = LINAJES_DND.find(x => x[0] === A.linaje);
    const rasgos = [
      ...r.rasgos, ...((subraza() && subraza().rasgos) || []),
      linaje ? `Linaje dracónico ${linaje[0].toLowerCase()}: ${linaje[1]}${r.linaje ? `; aliento en ${linaje[2]}` : ''}.` : null,
      A.dote ? `Dote: ${A.dote}.` : null,
      ...cl.rasgos, ...(sc ? sc.rasgos : []),
      A.estilo ? `Estilo de combate (${A.estilo}): ${ESTILOS_DND.find(x => x[0] === A.estilo)[1]}` : null,
      A.enemigo ? `Enemigo predilecto: ${A.enemigo}. Terreno favorito: ${A.terreno}.` : null,
      pericias().length ? `Pericia: ${pericias().join(', ')}.` : null,
      `${t.rasgo}`,
    ].filter(Boolean);
    pon('Rasgos y atributos', rasgos.join('\n'));
    pon('Rasgos de personalidad', A.personalidad.filter(x => x.trim()).join('\n'));
    pon('Ideales', A.ideal); pon('Vínculos', A.vinculo); pon('Defectos', A.defecto);

    // Competencias e idiomas
    const armas = [...cl.armas, ...((sc && sc.armas) || []), ...(deRaza('armas') || [])].map(x => x === 'sencillas' ? 'armas sencillas' : x === 'marciales' ? 'armas marciales' : x.toLowerCase());
    const armaduras = [cl.armaduras, sc && sc.armaduras && `armaduras ${sc.armaduras}`, deRaza('armaduras') && `armaduras ${deRaza('armaduras')}`].filter(x => x && x !== 'ninguna');
    const herramientas = [cl.herramientas, A.herramientaRaza, ...(t.herramientas || []).map(x => x.startsWith('?') ? A.bgEsp[x.slice(1)] : x)]
      .filter((x, i, xs) => x && xs.findIndex(y => y && y.toLowerCase() === x.toLowerCase()) === i);
    pon('Otras competencias', [
      armaduras.length && `Armaduras: ${armaduras.join('; ')}.`, `Armas: ${[...new Set(armas)].join(', ')}.`,
      herramientas.length && `Herramientas: ${herramientas.join(', ')}.`, `Idiomas: ${[...idiomasFijos(), ...A.idiomas].join(', ')}.`,
    ].filter(Boolean).join('\n'));

    // Equipo y dinero
    const obs = objetos();
    pon('PO', obs.filter(o => o.n === 'po').reduce((s, o) => s + o.cant, 0));  // el dinero del trasfondo («15 po»)
    pon('Equipo', obs.filter(o => o.n !== 'po').map(o => (o.cant > 1 ? `${o.cant} × ` : '') + o.n + (PAQUETES_DND[o.n] ? ` (${PAQUETES_DND[o.n]})` : '')).join('\n'));

    // Conjuros: los de la clase y los raciales
    const trucos = [...(m ? A.trucos : []), ...(deRaza('trucos') || []), ...((sc && sc.trucos) || []), A.trucoExtra].filter(Boolean);
    trucos.slice(0, 8).forEach((n, i) => pon(`Truco ${i + 1}`, n));
    if (m) {
      pon('Clase lanzadora', cl.n); pon('Aptitud mágica', m.aptitud); pon('Nivel 1 espacios', m.espacios);
      const siempre = conjurosSiempre();
      const nivel1 = m.conocidos ? A.conjuros : m.libro ? A.conjuros : [...siempre, ...A.preparados];
      const prep = new Set(m.conocidos ? A.conjuros : m.libro ? A.preparados : nivel1);
      [...new Set(nivel1)].slice(0, 13).forEach((n, i) => { pon(`Conjuro 1-${i + 1}`, n); if (prep.has(n)) cp[`Conjuro 1-${i + 1} (preparado)`] = true; });
      const resumen = [`Conjuros: CD ${8 + COMP + mod(m.aptitud)}, ataque ${signo(COMP + mod(m.aptitud))}.`];
      if (siempre.length && cl.n === 'Clérigo') resumen.push(`Siempre preparados (dominio): ${siempre.join(', ')}.`);
      if (siempre.length && cl.n === 'Brujo') resumen.push(`Lista ampliada del patrón: ${siempre.join(', ')}.`);
      pon('Ataques y conjuros', resumen.join('\n'));
    } else if (trucos.length) {
      pon('Clase lanzadora', `${nombreRaza()} (racial)`);
      pon('Aptitud mágica', deRaza('aptitudTruco'));
    }

    pon('Edad', A.datos.Edad); pon('Altura', A.datos.Altura); pon('Peso', A.datos.Peso);
    pon('Ojos', A.datos.Ojos); pon('Piel', A.datos.Piel); pon('Pelo', A.datos.Pelo);
    pon('Historia del personaje', A.historia); pon('Aliados', A.aliados);

    Generador.crear('dnd', { campos: cp, foto: A.foto });
    if (confirm('Ficha creada. ¿Vaciar el asistente para crear otro personaje más adelante?')) asis.reiniciar();
    document.querySelector('#d-asistente').close();
  }

  const asis = AsisComun.marco({ clave: 'nephei-generador-asistente-dnd-v1', inicial, pasos: () => PASOS, titulo: () => 'Asistente · Dungeons & Dragons 5.ª' });
})();
