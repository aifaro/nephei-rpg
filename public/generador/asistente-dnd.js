// Asistente de creación de personajes de D&D con el Player's Handbook de 2024, a nivel 1, en el orden del
// libro: clase, trasfondo (aumentos de característica y dote de origen), especie, características,
// habilidades e idiomas, conjuros, equipo y detalles. Al final crea una ficha nueva en el editor
// con Generador.crear('dnd24', …).
'use strict';

(() => {
  const { h, regla, nota, d, suma, leerRetrato } = AsisComun;
  const CARS = DND.caracteristicas;
  const PHB = cap => `Player's Handbook (2024), ${cap}`;
  const signo = v => (v >= 0 ? '+' : '-') + Math.abs(v);
  const metros = v => String(v).replace('.', ',') + ' m';
  const COMP = 2;  // bonificador por competencia a nivel 1
  const doteVacia = () => ({ n: '', lista: '', aptitud: '', trucos: [], conjuro: '', habs: [], herrs: [] });

  function inicial() {
    return {
      paso: 0, visto: 0, metodo: 'estandar', tiradas: null, asig: {}, compra: { FUE: 8, DES: 8, CON: 8, INT: 8, SAB: 8, CAR: 8 },
      clase: '', orden: '', estilo: '', invocacion: '', maestrias: [],
      trasfondo: '', reparto: '21', mas2: '', mas1: '', herrTras: '', doteTras: doteVacia(),
      especie: '', tam: '', opcion: '', aptitudEspecie: '', habEspecie: '', doteHumano: doteVacia(),
      habClase: [], pericia: [], idiomas: [], herrMonje: '',
      trucos: [], preparados: [], libro: [],
      equipo: null, elecciones: {}, equipoTras: 'A',
      alineamiento: '', personalidad: ['', ''], ideal: '', vinculo: '', defecto: '',
      datos: { Nombre: '', Jugador: '' }, aspecto: '', historia: '', foto: null,
    };
  }

  // ------------------------------------------------------------ reglas aplicadas
  const clase = () => CLASES_DND.find(c => c.n === asis.A.clase) || null;
  const orden = () => { const c = clase(); return c && c.orden ? c.orden.opciones.find(o => o.n === asis.A.orden) || null : null; };
  const trasfondo = () => TRASFONDOS_DND.find(t => t.n === asis.A.trasfondo) || null;
  const especie = () => ESPECIES_DND.find(e => e.n === asis.A.especie) || null;
  const opcionEspecie = () => { const e = especie(); return e && e.opciones ? e.opciones.find(o => o.n === asis.A.opcion) || null : null; };
  const dote = n => DOTES_ORIGEN_DND.find(x => x.n === n) || null;
  // Las dotes de origen del personaje: la del trasfondo y, si es humano, la que elija
  function dotes() {
    const r = [], t = trasfondo();
    if (t) r.push(Object.assign({}, asis.A.doteTras, { n: t.dote, lista: t.listaMagia || asis.A.doteTras.lista, clave: 'doteTras' }));
    if (especie() && especie().doteOrigen && asis.A.doteHumano.n) r.push(Object.assign({}, asis.A.doteHumano, { clave: 'doteHumano' }));
    return r;
  }
  const tieneDote = n => dotes().some(x => x.n === n);
  const nombreEspecie = () => [asis.A.especie, opcionEspecie() && opcionEspecie().n].filter(Boolean).join(' · ');

  function base() {
    const A = asis.A, c = {};
    if (A.metodo === 'compra') for (const k of CARS) c[k] = A.compra[k];
    else {
      const vals = A.metodo === 'tiradas' ? (A.tiradas ? A.tiradas.map(t => t.total) : null) : DND.estandar;
      for (const k of CARS) c[k] = vals && A.asig[k] != null ? vals[A.asig[k]] : null;
    }
    return c;
  }
  function mejoras() {  // las del trasfondo: +2 y +1, o +1 a las tres
    const A = asis.A, t = trasfondo(), m = {};
    if (!t) return m;
    if (A.reparto === '111') for (const k of t.car) m[k] = 1;
    else { if (A.mas2) m[A.mas2] = 2; if (A.mas1) m[A.mas1] = (m[A.mas1] || 0) + 1; }
    return m;
  }
  function finales() {
    const b = base(), m = mejoras(), c = {};
    for (const k of CARS) c[k] = b[k] == null ? null : Math.min(20, b[k] + (m[k] || 0));
    return c;
  }
  const mod = k => { const v = finales()[k]; return v == null ? 0 : Math.floor((v - 10) / 2); };

  // Competencias
  function habilidadesFijas() {  // habilidad → de dónde sale
    const r = new Map(), A = asis.A, t = trasfondo();
    if (t) for (const n of t.habilidades) r.set(n, 'trasfondo');
    if (especie() && especie().habilidadDe && A.habEspecie) r.set(A.habEspecie, A.especie);
    if (especie() && especie().habilidadLibre && A.habEspecie) r.set(A.habEspecie, A.especie);
    for (const x of dotes()) if (x.n === 'Habilidoso') for (const n of x.habs) r.set(n, 'Habilidoso');
    return r;
  }
  const competentes = () => new Set([...habilidadesFijas().keys(), ...asis.A.habClase]);
  function armaduras() {
    const c = clase(), o = orden();
    return new Set([...(c ? c.armaduras : []), ...((o && o.armaduras) || [])]);
  }
  function competenteArma(a) {
    const c = clase(), o = orden();
    const l = [...(c ? c.armas : []), ...((o && o.armas) || [])];
    if (l.includes(a[0]) || (l.includes('sencillas') && a[1][0] === 's') || (l.includes('marciales') && a[1][0] === 'm')) return true;
    if (a[1][0] === 'm' && l.includes('marcialesLigeras') && /ligera/.test(a[4])) return true;
    return a[1][0] === 'm' && l.includes('marcialesSutiles') && /sutil|ligera/.test(a[4]);
  }
  function herramientas() {
    const A = asis.A, c = clase(), t = trasfondo(), r = [];
    if (c && c.herramientas && !c.herramientaElegir) r.push(c.herramientas.replace(/^./, x => x.toUpperCase()));
    if (c && c.herramientaElegir && A.herrMonje) r.push(A.herrMonje);
    if (t) r.push(t.herramienta.startsWith('?') ? A.herrTras : t.herramienta);
    for (const x of dotes()) r.push(...x.herrs);
    return [...new Set(r.filter(Boolean))];
  }
  const idiomasFijos = () => ['Común', ...((clase() && clase().idiomasExtra) || [])];
  const numIdiomas = () => 2 + ((clase() && clase().idiomasLibres) || 0);

  // Equipo: objetos con su cantidad, y el oro
  function objetos() {
    const A = asis.A, c = clase(), t = trasfondo(), res = [];
    let po = 0;
    const meter = (s, clave) => {
      const m = /^(\d+) (.+)$/.exec(s);
      let n = m ? m[2] : s;
      if (n === '?herramientaMonje') n = A.herrMonje;
      else if (n.startsWith('?')) n = A.elecciones[clave] || (n === '?instrumento' || n === '?artesano' || n === '?juego' ? A.herrTras : '');
      const ya = res.find(x => x.n === n);  // la túnica del mago y la del sabio, por ejemplo
      if (ya) ya.cant += m ? +m[1] : 1;
      else if (n) res.push({ n, cant: m ? +m[1] : 1 });
    };
    if (c && A.equipo != null) { const op = c.equipo[A.equipo]; op.items.forEach((s, i) => meter(s, `c${i}`)); po += op.po; }
    if (t) { if (A.equipoTras === 'A') { t.equipo.forEach((s, i) => meter(s, `t${i}`)); po += t.po; } else po += 50; }
    return { res, po };
  }
  const arma = n => ARMAS_DND.find(a => a[0] === n);
  const armadura = n => ARMADURAS_DND.find(a => a[0] === n);
  function ca() {
    const c = clase(), obs = objetos().res;
    const arm = obs.map(o => armadura(o.n)).find(Boolean);
    const escudo = obs.some(o => o.n === 'Escudo') ? 2 : 0;
    const des = mod('DES'), op = [];
    if (arm) op.push(arm[2] + (arm[3] == null ? des : Math.min(des, arm[3])) + escudo + (asis.A.estilo === 'Defensa' ? 1 : 0));
    else {
      op.push(10 + des + escudo);
      if (c && c.sinArmadura) op.push(10 + mod(c.sinArmadura[0]) + mod(c.sinArmadura[1]) + (c.monje ? 0 : escudo));
      if (asis.A.invocacion === 'Armadura de sombras') op.push(13 + des + escudo);
    }
    return Math.max(...op);
  }
  const pg = () => { const c = clase(); return c ? c.dg + mod('CON') + ((especie() && especie().pgNivel) || 0) + (tieneDote('Duro') ? 2 : 0) : 0; };
  const velocidad = () => (opcionEspecie() && opcionEspecie().vel) || (especie() && especie().vel) || 9;
  function ataques() {
    const c = clase(), res = [];
    for (const o of objetos().res) {
      const a = arma(o.n);
      if (!a || res.some(x => x.n === a[0])) continue;
      const distancia = a[1][1] === 'd', sutil = /sutil/.test(a[4]);
      const monje = c && c.monje && competenteArma(a) && !distancia && (a[1][0] === 's' || /ligera/.test(a[4]));
      let car = distancia ? 'DES' : 'FUE';
      if (sutil || monje) car = mod('DES') > mod('FUE') ? 'DES' : 'FUE';
      const m = mod(car);
      let bono = m + (competenteArma(a) ? COMP : 0), dano = m;
      if (asis.A.estilo === 'Tiro con arco' && distancia) bono += 2;
      if (asis.A.estilo === 'Duelo' && !distancia && !/a dos manos/.test(a[4])) dano += 2;
      const dado = monje && ['1d4', '1d6'].includes(a[2]) ? '1d6' : a[2];
      const maestria = asis.A.maestrias.includes(a[0]) ? `Maestría: ${MAESTRIAS_DND[a[5]][0]} (${a[5]}). ` : '';
      res.push({ n: a[0], bono: signo(bono), dano: `${dado}${dano ? signo(dano) : ''} ${a[3]}`, notas: maestria + (a[4] || '').replace(/^./, x => x.toUpperCase()) });
    }
    return res;
  }

  // Magia: la de la clase y la que dan la especie y las dotes
  const magia = () => { const c = clase(); return c && c.magia ? c.magia : null; };
  const numTrucos = () => { const m = magia(), o = orden(); return m ? m.trucos + ((o && o.trucoExtra) || 0) : 0; };
  const listaConjuros = (lista, nivel) => (CONJUROS_DND[lista] || {})[nivel] || [];
  function conjurosAparte() {  // [nombre, nivel, de dónde]
    const r = [], e = especie(), o = opcionEspecie();
    for (const n of [...((e && e.trucos) || []), ...((o && o.trucos) || [])]) r.push([n, 0, e.n]);
    for (const x of dotes()) if (x.n === 'Iniciado en la magia') {
      for (const n of x.trucos) r.push([n, 0, 'Iniciado en la magia']);
      if (x.conjuro) r.push([x.conjuro, 1, 'Iniciado en la magia']);
    }
    for (const n of (clase() && clase().siempre) || []) r.push([n, 1, 'Siempre preparado']);
    return r;
  }

  // ------------------------------------------------------------ piezas
  const tarjetas = (nombre, ops, actual, alElegir) => h('div', { class: 'asis-tarjetas' }, ops.map(([v, t, sub]) => h('label', null,
    h('input', { type: 'radio', name: nombre, checked: actual === v, onchange: () => alElegir(v) }), h('span', null, h('strong', null, t), sub ? h('small', null, sub) : null))));
  const lista = xs => h('ul', { class: 'asis-dados asis-columnas' }, xs.map(x => h('li', null, x)));
  const elegirVarios = (nombre, ops, elegidos, max, alCambiar, deshabilitar) => h('div', { class: 'asis-tarjetas' }, ops.map(n => {
    const marcado = elegidos.includes(n);
    return h('label', null, h('input', { type: 'checkbox', name: nombre, checked: marcado, disabled: !marcado && (elegidos.length >= max || (deshabilitar && deshabilitar(n))),
      onchange: e => alCambiar(e.target.checked ? [...elegidos, n] : elegidos.filter(x => x !== n)) }), h('span', null, n));
  }));
  const desplegable = (etiqueta, ops, valor, alCambiar) => h('label', null, etiqueta, ' ', h('select', { onchange: e => alCambiar(e.target.value) },
    h('option', { value: '' }, '— elige —'), ops.map(o => h('option', { value: o, selected: valor === o }, o))));

  // Lo que pide elegir cada dote de origen
  function eleccionesDote(clave, nombre, listaFija) {
    const D = asis.A[clave], x = dote(nombre), caja = h('div');
    if (!x) return caja;
    caja.append(h('p', null, h('strong', null, nombre + ': '), x.texto));
    if (x.magia) {
      if (!listaFija) caja.append(h('p', null, desplegable('Lista:', ['Clérigo', 'Druida', 'Mago'], D.lista, v => asis.cambia(() => { D.lista = v; D.trucos = []; D.conjuro = ''; }))));
      const l = listaFija || D.lista;
      caja.append(h('p', null, desplegable('Aptitud mágica para estos conjuros:', ['INT', 'SAB', 'CAR'], D.aptitud, v => asis.cambia(() => { D.aptitud = v; }))));
      if (l) caja.append(h('p', { class: 'gen-nota' }, `Dos trucos de ${l.toLowerCase()}:`), elegirVarios(clave + '-trucos', listaConjuros(l, 0), D.trucos, 2, v => asis.cambia(() => { D.trucos = v; })),
        h('p', null, desplegable(`Un conjuro de nivel 1 de ${l.toLowerCase()}:`, listaConjuros(l, 1), D.conjuro, v => asis.cambia(() => { D.conjuro = v; }))));
    }
    if (x.habilidades) caja.append(h('p', { class: 'gen-nota' }, 'Tres habilidades (si prefieres alguna herramienta, apúntala luego en la ficha):'),
      elegirVarios(clave + '-habs', Object.keys(DND.habilidades), D.habs, 3, v => asis.cambia(() => { D.habs = v; }), n => (trasfondo() && trasfondo().habilidades.includes(n))));
    if (x.herramientas) caja.append(h('p', { class: 'gen-nota' }, 'Tres herramientas de artesano:'),
      elegirVarios(clave + '-herrs', DND.artesano, D.herrs, 3, v => asis.cambia(() => { D.herrs = v; })));
    if (nombre === 'Músico') caja.append(h('p', { class: 'gen-nota' }, 'Tres instrumentos:'),
      elegirVarios(clave + '-herrs', DND.instrumentos, D.herrs, 3, v => asis.cambia(() => { D.herrs = v; })));
    return caja;
  }
  function okDote(D, nombre, listaFija) {
    const x = dote(nombre);
    if (!x) return true;
    if (x.magia && (!(listaFija || D.lista) || !D.aptitud || D.trucos.length !== 2 || !D.conjuro)) return `Completa ${nombre}.`;
    if (x.habilidades && D.habs.length !== 3) return 'Elige las tres habilidades de Habilidoso.';
    if ((x.herramientas || nombre === 'Músico') && D.herrs.length !== 3) return `Elige las tres herramientas de ${nombre}.`;
    return true;
  }

  // ------------------------------------------------------------ pasos
  const PASOS = [
    { t: 'Empezar', pintar: pasoEmpezar, ok: () => true },
    { t: 'Clase', pintar: pasoClase, ok: okClase },
    { t: 'Trasfondo', pintar: pasoTrasfondo, ok: okTrasfondo },
    { t: 'Especie', pintar: pasoEspecie, ok: okEspecie },
    { t: 'Características', pintar: pasoCaracteristicas, ok: okCaracteristicas },
    { t: 'Habilidades e idiomas', pintar: pasoHabilidades, ok: okHabilidades },
    { t: 'Conjuros', pintar: pasoConjuros, ok: okConjuros },
    { t: 'Equipo', pintar: pasoEquipo, ok: okEquipo },
    { t: 'Personalidad y detalles', pintar: pasoDetalles, ok: () => true },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];

  function pasoEmpezar(c) {
    c.append(h('h3', null, 'Un personaje nuevo'),
      h('p', null, 'El asistente crea un personaje de nivel 1 con las reglas del Player\'s Handbook de 2024, en el orden del libro: clase, origen (trasfondo y especie), características y el resto. Puedes ir y volver entre los pasos: lo que elijas queda guardado en este navegador hasta que crees la ficha.'),
      regla('Novedades de 2024: los aumentos de característica y una dote de origen los da el trasfondo, no la especie; todas las clases eligen su subclase a nivel 3; los guerreros, bárbaros, paladines, exploradores y pícaros dominan la maestría de algunas armas.', PHB('cap. 2')),
      h('h4', null, 'Puntuaciones de característica'),
      asis.radios('metodo', [
        ['estandar', 'Conjunto estándar', '15, 14, 13, 12, 10 y 8, a repartir como quieras.'],
        ['compra', 'Compra de puntos', '27 puntos para comprar puntuaciones de 8 a 15.'],
        ['tiradas', 'Tirar los dados', '4d6 quitando el dado más bajo, seis veces.'],
      ], () => { asis.A.asig = {}; }));
  }

  function pasoClase(c) {
    const A = asis.A, cl = clase();
    c.append(h('h3', null, 'Clase'),
      regla('La clase dice qué sabe hacer el personaje: dado de golpe, salvaciones, armas y armaduras, habilidades y rasgos. La subclase se elige a nivel 3.', PHB('cap. 3')),
      tarjetas('dnd-clase', CLASES_DND.map(x => [x.n, x.n, `d${x.dg} · salvaciones ${x.salvaciones.join(' y ')}${x.magia ? ' · conjuros' : ''}${x.maestria ? ` · maestría ×${x.maestria}` : ''}`]), A.clase,
        v => asis.cambia(A => { Object.assign(A, { clase: v, orden: '', estilo: '', invocacion: '', maestrias: [], habClase: [], pericia: [], trucos: [], preparados: [], libro: [], equipo: null, elecciones: {}, herrMonje: '' }); })));
    if (!cl) return;
    c.append(h('dl', { class: 'asis-dato' },
      h('dt', null, 'Puntos de golpe'), h('dd', null, `d${cl.dg}: a nivel 1, ${cl.dg} + tu modificador de Constitución.`),
      h('dt', null, 'Salvaciones'), h('dd', null, cl.salvaciones.map(k => DND.nombres[k]).join(' y ')),
      h('dt', null, 'Armaduras'), h('dd', null, cl.armaduras.join(', ') || 'ninguna'),
      h('dt', null, 'Armas'), h('dd', null, cl.armas.map(x => ({ sencillas: 'sencillas', marciales: 'marciales', marcialesLigeras: 'marciales con la propiedad ligera', marcialesSutiles: 'marciales sutiles o ligeras' }[x] || x)).join(', ')),
      cl.herramientas ? [h('dt', null, 'Herramientas'), h('dd', null, cl.herramientas)] : null,
      h('dt', null, 'Habilidades'), h('dd', null, `${cl.habilidades.n} de ${cl.habilidades.de === 'todas' ? 'cualquiera' : cl.habilidades.de.join(', ')}`)),
      h('h4', null, 'Rasgos de nivel 1'), lista([...cl.rasgos, cl.magia ? `Lanzamiento de conjuros con ${DND.nombres[cl.magia.aptitud]}.` : null].filter(Boolean)));
    if (cl.orden) c.append(h('h4', null, cl.orden.n), tarjetas('dnd-orden', cl.orden.opciones.map(o => [o.n, o.n, o.texto]), A.orden, v => asis.cambia(A => { A.orden = v; A.trucos = []; })));
    if (cl.estilo) c.append(h('h4', null, 'Estilo de combate (una dote)'), tarjetas('dnd-estilo', ESTILOS_DND.map(([n, t]) => [n, n, t]), A.estilo, v => asis.cambia(A => { A.estilo = v; })));
    if (cl.invocaciones) c.append(h('h4', null, 'Invocación sobrenatural'), tarjetas('dnd-inv', INVOCACIONES_DND.map(([n, t]) => [n, n, t]), A.invocacion, v => asis.cambia(A => { A.invocacion = v; })));
    if (cl.maestria) {
      const ops = ARMAS_DND.filter(a => competenteArma(a) && (cl.n !== 'Bárbaro' || a[1][1] === 'c'));
      c.append(h('h4', null, `Maestría con armas: ${cl.maestria}${cl.n === 'Bárbaro' ? ' armas cuerpo a cuerpo' : ''}`),
        regla('Con esos tipos de arma usas su propiedad de maestría. Puedes cambiar una tras cada descanso largo.', PHB('cap. 6')),
        h('div', { class: 'asis-tarjetas' }, ops.map(a => {
          const marcado = A.maestrias.includes(a[0]), [es, ef] = MAESTRIAS_DND[a[5]];
          return h('label', null, h('input', { type: 'checkbox', checked: marcado, disabled: !marcado && A.maestrias.length >= cl.maestria,
            onchange: e => asis.cambia(A => { A.maestrias = e.target.checked ? [...A.maestrias, a[0]] : A.maestrias.filter(x => x !== a[0]); }) }),
            h('span', null, h('strong', null, a[0]), h('small', null, `${es} (${a[5]}): ${ef}.`)));
        })));
    }
  }
  function okClase() {
    const A = asis.A, cl = clase();
    if (!cl) return 'Elige una clase.';
    if (cl.orden && !orden()) return `Elige ${cl.orden.n.toLowerCase()}.`;
    if (cl.estilo && !A.estilo) return 'Elige un estilo de combate.';
    if (cl.invocaciones && !A.invocacion) return 'Elige una invocación.';
    if (cl.maestria && A.maestrias.length !== cl.maestria) return `Elige ${cl.maestria} armas para la maestría.`;
    return true;
  }

  function pasoTrasfondo(c) {
    const A = asis.A, t = trasfondo();
    c.append(h('h3', null, 'Trasfondo'),
      regla('El trasfondo es a qué se dedicaba el personaje antes de la aventura. Da tres características entre las que repartir +2 y +1 (o +1 a las tres), una dote de origen, dos habilidades, una herramienta y el equipo inicial (o 50 po).', PHB('cap. 4')),
      tarjetas('dnd-tras', TRASFONDOS_DND.map(x => [x.n, x.n, `${x.car.join(', ')} · ${x.dote}${x.listaMagia ? ` (${x.listaMagia.toLowerCase()})` : ''} · ${x.habilidades.join(', ')}`]), A.trasfondo,
        v => asis.cambia(A => { A.trasfondo = v; A.mas2 = ''; A.mas1 = ''; A.herrTras = ''; A.doteTras = doteVacia(); })));
    if (!t) return;
    c.append(h('h4', null, 'Aumentos de característica'),
      asis.radios('reparto', [['21', '+2 a una y +1 a otra', t.car.join(', ')], ['111', '+1 a las tres', t.car.join(', ')]]));
    if (A.reparto === '21') c.append(h('p', null, desplegable('+2 a', t.car, A.mas2, v => asis.cambia(A => { A.mas2 = v; if (A.mas1 === v) A.mas1 = ''; })), ' ',
      desplegable('+1 a', t.car.filter(k => k !== A.mas2), A.mas1, v => asis.cambia(A => { A.mas1 = v; }))));
    if (t.herramienta.startsWith('?')) {
      const ops = { '?artesano': DND.artesano, '?instrumento': DND.instrumentos, '?juego': DND.juegos }[t.herramienta];
      c.append(h('h4', null, 'Herramienta'), h('p', null, desplegable('Competencia con:', ops, A.herrTras, v => asis.cambia(A => { A.herrTras = v; }))));
    } else c.append(h('p', null, h('strong', null, 'Herramienta: '), t.herramienta + '.'));
    c.append(h('h4', null, 'Dote de origen'), eleccionesDote('doteTras', t.dote, t.listaMagia));
  }
  function okTrasfondo() {
    const A = asis.A, t = trasfondo();
    if (!t) return 'Elige un trasfondo.';
    if (A.reparto === '21' && (!A.mas2 || !A.mas1)) return 'Elige dónde van el +2 y el +1.';
    if (t.herramienta.startsWith('?') && !A.herrTras) return 'Elige la herramienta.';
    return okDote(A.doteTras, t.dote, t.listaMagia);
  }

  function pasoEspecie(c) {
    const A = asis.A, e = especie();
    c.append(h('h3', null, 'Especie'),
      regla('La especie da el tamaño, la velocidad y rasgos especiales; algunas tienen linajes o legados entre los que elegir. En 2024 no da aumentos de característica.', PHB('cap. 4')),
      tarjetas('dnd-especie', ESPECIES_DND.map(x => [x.n, x.n, `${x.tam.join(' o ')} · ${metros(x.vel)}`]), A.especie,
        v => asis.cambia(A => { A.especie = v; A.tam = especie().tam[0]; A.opcion = ''; A.aptitudEspecie = ''; A.habEspecie = ''; A.doteHumano = doteVacia(); })));
    if (!e) return;
    c.append(h('h4', null, 'Rasgos'), lista([`Velocidad ${metros(velocidad())}.`, ...e.rasgos]));
    if (e.tam.length > 1) c.append(h('h4', null, 'Tamaño'), tarjetas('dnd-tam', e.tam.map(x => [x, x]), A.tam, v => asis.cambia(A => { A.tam = v; })));
    if (e.opciones) c.append(h('h4', null, e.opcion), tarjetas('dnd-opcion', e.opciones.map(o => [o.n, o.n, o.texto]), A.opcion, v => asis.cambia(A => { A.opcion = v; })));
    if (e.aptitudLibre || e.aptitud) {
      if (e.aptitud) A.aptitudEspecie = e.aptitud;
      else c.append(h('p', null, desplegable('Aptitud mágica para los conjuros de tu especie:', ['INT', 'SAB', 'CAR'], A.aptitudEspecie, v => asis.cambia(A => { A.aptitudEspecie = v; }))));
    }
    if (e.habilidadDe) c.append(h('h4', null, 'Sentidos agudos'), tarjetas('dnd-habesp', e.habilidadDe.map(x => [x, x]), A.habEspecie, v => asis.cambia(A => { A.habEspecie = v; })));
    if (e.habilidadLibre) c.append(h('h4', null, 'Hábil'), h('p', null, desplegable('Competencia en:', Object.keys(DND.habilidades).filter(n => !(trasfondo() && trasfondo().habilidades.includes(n))), A.habEspecie,
      v => asis.cambia(A => { A.habEspecie = v; }))));
    if (e.doteOrigen) {
      c.append(h('h4', null, 'Versátil: una dote de origen'), h('p', null, desplegable('Dote:', DOTES_ORIGEN_DND.map(x => x.n), A.doteHumano.n,
        v => asis.cambia(A => { A.doteHumano = Object.assign(doteVacia(), { n: v }); }))));
      if (A.doteHumano.n) c.append(eleccionesDote('doteHumano', A.doteHumano.n));
    }
  }
  function okEspecie() {
    const A = asis.A, e = especie();
    if (!e) return 'Elige una especie.';
    if (e.opciones && !opcionEspecie()) return `Elige ${e.opcion.toLowerCase()}.`;
    if (e.aptitudLibre && !A.aptitudEspecie) return 'Elige la aptitud mágica de tu especie.';
    if ((e.habilidadDe || e.habilidadLibre) && !A.habEspecie) return 'Elige la habilidad de tu especie.';
    if (e.doteOrigen) { if (!A.doteHumano.n) return 'Elige la dote de origen.'; return okDote(A.doteHumano, A.doteHumano.n); }
    return true;
  }

  function pasoCaracteristicas(c) {
    const A = asis.A, cl = clase(), m = mejoras();
    c.append(h('h3', null, 'Puntuaciones de característica'));
    if (cl) c.append(nota(`Para un ${cl.n.toLowerCase()} conviene poner lo más alto en ${cl.magia ? DND.nombres[cl.magia.aptitud] : cl.salvaciones.map(k => DND.nombres[k]).join(' o ')}, y no descuidar la Constitución.`));
    if (A.metodo === 'compra') {
      const gasto = suma(CARS.map(k => DND.compra.coste[A.compra[k]]));
      c.append(regla('Tienes 27 puntos. Cada puntuación empieza en 8; subirla cuesta: 9 → 1, 10 → 2, 11 → 3, 12 → 4, 13 → 5, 14 → 7 y 15 → 9 puntos.', PHB('cap. 2')),
        h('div', { class: 'asis-cars' }, CARS.map(k => h('div', { class: 'asis-car' }, h('b', null, `${k} · ${DND.nombres[k]}`), h('span', { class: 'v' }, A.compra[k]),
          h('small', null, `coste ${DND.compra.coste[A.compra[k]]}`),
          h('span', null, h('button', { type: 'button', class: 'gen-boton mini', disabled: A.compra[k] <= 8, onclick: () => asis.cambia(A => { A.compra[k]--; }) }, '−'), ' ',
            h('button', { type: 'button', class: 'gen-boton mini', disabled: A.compra[k] >= 15 || DND.compra.coste[A.compra[k] + 1] - DND.compra.coste[A.compra[k]] > 27 - gasto,
              onclick: () => asis.cambia(A => { A.compra[k]++; }) }, '+'))))),
        h('p', { class: gasto === 27 ? 'asis-ok' : 'asis-aviso' }, `Gastados ${gasto} de 27.`));
    } else {
      if (A.metodo === 'tiradas') {
        c.append(regla('Tira 4d6 y suma los tres dados más altos, seis veces; coloca cada resultado en una característica.', PHB('cap. 2')));
        if (!A.tiradas) {
          c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => asis.cambia(A => {
            A.tiradas = Array.from({ length: 6 }, () => { const dados = [d(6), d(6), d(6), d(6)]; return { dados, total: suma(dados) - Math.min(...dados) }; });
            A.asig = {};
          }) }, 'Tirar los dados'));
          return;
        }
        c.append(h('ul', { class: 'asis-dados' }, A.tiradas.map((t, i) => h('li', null, `Tirada ${i + 1}: ${t.dados.join(', ')} → ${t.total}`))),
          h('p', null, h('button', { type: 'button', class: 'gen-boton', onclick: () => { if (confirm('¿Volver a tirar? Hazlo solo si tu DM lo permite.')) asis.cambia(A => { A.tiradas = null; A.asig = {}; }); } }, 'Volver a tirar')));
      } else c.append(regla('Reparte 15, 14, 13, 12, 10 y 8 entre las seis características.', PHB('cap. 2')));
      const vals = A.metodo === 'tiradas' ? A.tiradas.map(t => t.total) : DND.estandar;
      c.append(h('div', { class: 'asis-cars' }, CARS.map(k => {
        const usados = new Set(CARS.filter(j => j !== k && A.asig[j] != null).map(j => A.asig[j]));
        return h('label', { class: 'asis-car' }, h('b', null, `${k} · ${DND.nombres[k]}`),
          h('select', { onchange: e => asis.cambia(A => { A.asig[k] = e.target.value === '' ? null : +e.target.value; }) }, h('option', { value: '' }, '—'),
            vals.map((v, i) => usados.has(i) ? null : h('option', { value: i, selected: A.asig[k] === i }, v))));
      })));
    }
    const f = finales();
    if (CARS.every(k => f[k] != null)) c.append(h('h4', null, 'Con el trasfondo'), h('div', { class: 'asis-cars' }, CARS.map(k => h('div', { class: 'asis-car' },
      h('b', null, k), h('span', { class: 'v' }, f[k]), h('small', null, `modificador ${signo(mod(k))}${m[k] ? ` · trasfondo +${m[k]}` : ''}`)))));
  }
  function okCaracteristicas() {
    const A = asis.A, b = base();
    if (A.metodo === 'tiradas' && !A.tiradas) return 'Falta tirar los dados.';
    if (!CARS.every(k => b[k] != null)) return 'Falta dar un valor a cada característica.';
    if (A.metodo === 'compra' && suma(CARS.map(k => DND.compra.coste[A.compra[k]])) > 27) return 'Te has pasado de 27 puntos.';
    return true;
  }

  function pasoHabilidades(c) {
    const A = asis.A, cl = clase(), fijas = habilidadesFijas(), todas = Object.keys(DND.habilidades);
    c.append(h('h3', null, 'Habilidades'),
      regla('Eres competente en las habilidades de tu trasfondo (y de tu especie o tus dotes, si dan alguna) y eliges las de tu clase. En ellas sumas tu bonificador por competencia (+2 a nivel 1).', PHB('cap. 2')));
    if (fijas.size) c.append(h('p', null, h('strong', null, 'Ya las tienes: '), [...fijas].map(([n, de]) => `${n} (${de})`).join(', ') + '.'));
    const deClase = cl.habilidades.de === 'todas' ? todas : cl.habilidades.de;
    c.append(h('h4', null, `De tu clase: elige ${cl.habilidades.n}`),
      elegirVarios('dnd-habclase', deClase, A.habClase, cl.habilidades.n, v => asis.cambia(A => { A.habClase = v; A.pericia = A.pericia.filter(x => competentes().has(x)); }), n => fijas.has(n)));
    if (cl.pericia) c.append(h('h4', null, 'Pericia'), regla('Elige dos de tus habilidades con competencia: en ellas el bonificador por competencia se duplica. Se recomiendan Juego de manos y Sigilo.', PHB('cap. 3, Pícaro')),
      elegirVarios('dnd-pericia', [...competentes()], A.pericia, cl.pericia, v => asis.cambia(A => { A.pericia = v; })));
    if (cl.herramientaElegir) c.append(h('h4', null, 'Herramienta'), h('p', null, desplegable('Herramienta de artesano o instrumento:', [...DND.artesano, ...DND.instrumentos], A.herrMonje, v => asis.cambia(A => { A.herrMonje = v; }))));
    const n = numIdiomas();
    c.append(h('h3', null, 'Idiomas'), regla(`Todos los personajes saben común y dos idiomas estándar a elegir${cl.idiomasLibres ? '; el pícaro, además, la jerga de ladrones y uno más' : ''}. Los idiomas raros, si tu DM lo permite.`, PHB('cap. 2')),
      h('p', null, h('strong', null, 'Ya hablas: '), idiomasFijos().join(', ') + '.'),
      elegirVarios('dnd-idiomas', [...DND.idiomas, ...DND.idiomasRaros], A.idiomas, n, v => asis.cambia(A => { A.idiomas = v; })));
  }
  function okHabilidades() {
    const A = asis.A, cl = clase();
    if (A.habClase.length !== cl.habilidades.n) return `Elige ${cl.habilidades.n} habilidades de clase.`;
    if (cl.pericia && A.pericia.length !== cl.pericia) return 'Elige las dos de pericia.';
    if (cl.herramientaElegir && !A.herrMonje) return 'Elige la herramienta.';
    if (A.idiomas.length !== numIdiomas()) return `Elige ${numIdiomas()} idiomas.`;
    return true;
  }

  function pasoConjuros(c) {
    const A = asis.A, m = magia(), cl = clase(), aparte = conjurosAparte();
    c.append(h('h3', null, 'Conjuros'));
    if (aparte.length) c.append(h('p', null, h('strong', null, 'Ya tienes: '), aparte.map(([n, nv, de]) => `${n} (${nv ? 'nivel 1' : 'truco'}, ${de})`).join(', ') + '.'));
    if (!m) { c.append(h('p', null, `Un ${cl.n.toLowerCase()} no lanza conjuros a nivel 1.`)); return; }
    const ya = new Set(aparte.map(x => x[0]));
    c.append(regla(`Aptitud mágica: ${DND.nombres[m.aptitud]}. CD de salvación de tus conjuros ${8 + COMP + mod(m.aptitud)}, ataque de conjuro ${signo(COMP + mod(m.aptitud))}. A nivel 1 tienes ${m.espacios === 1 ? 'un espacio' : m.espacios + ' espacios'} de nivel 1${m.pacto ? ', que se recupera con un descanso corto' : ''}.`, PHB(`cap. 3, ${cl.n}`)));
    if (numTrucos()) c.append(h('h4', null, `Trucos: elige ${numTrucos()}`), elegirVarios('dnd-trucos', listaConjuros(m.lista, 0), A.trucos, numTrucos(), v => asis.cambia(A => { A.trucos = v; }), n => ya.has(n)));
    if (m.libro) {
      c.append(h('h4', null, `Libro de conjuros: elige ${m.libro} de nivel 1`), elegirVarios('dnd-libro', listaConjuros(m.lista, 1), A.libro, m.libro, v => asis.cambia(A => { A.libro = v; A.preparados = A.preparados.filter(x => v.includes(x)); })));
      if (A.libro.length) c.append(h('h4', null, `Preparados: ${m.preparados} del libro`), elegirVarios('dnd-prep', A.libro, A.preparados, m.preparados, v => asis.cambia(A => { A.preparados = v; })));
    } else c.append(h('h4', null, `Conjuros preparados de nivel 1: elige ${m.preparados}`),
      elegirVarios('dnd-prep', listaConjuros(m.lista, 1), A.preparados, m.preparados, v => asis.cambia(A => { A.preparados = v; }), n => ya.has(n)));
  }
  function okConjuros() {
    const A = asis.A, m = magia();
    if (!m) return true;
    if (A.trucos.length !== numTrucos()) return `Elige ${numTrucos()} trucos.`;
    if (m.libro && A.libro.length !== m.libro) return `Elige ${m.libro} conjuros para el libro.`;
    if (A.preparados.length !== m.preparados) return `Prepara ${m.preparados} conjuros.`;
    return true;
  }

  function pasoEquipo(c) {
    const A = asis.A, cl = clase(), t = trasfondo();
    const texto = s => s.replace(/^(\d+) /, '$1 × ').replace('?herramientaMonje', A.herrMonje || 'tu herramienta').replace('?instrumento', 'un instrumento');
    c.append(h('h3', null, 'Equipo'), regla('Elige el equipo inicial de tu clase o su oro, y el de tu trasfondo o 50 po.', PHB('cap. 3 y 4')),
      h('h4', null, `De tu clase (${cl.n.toLowerCase()})`),
      tarjetas('dnd-eqc', cl.equipo.map((op, i) => [i, `Opción ${'ABC'[i]}`, (op.items.length ? op.items.map(texto).join(', ') + ' y ' : '') + `${op.po} po`]), A.equipo, v => asis.cambia(A => { A.equipo = v; })));
    if (A.equipo != null) cl.equipo[A.equipo].items.forEach((s, i) => {
      if (s === '?instrumento') c.append(h('p', null, desplegable('Instrumento:', DND.instrumentos, A.elecciones[`c${i}`], v => asis.cambia(A => { A.elecciones[`c${i}`] = v; }))));
    });
    c.append(h('h4', null, `De tu trasfondo (${t.n.toLowerCase()})`),
      tarjetas('dnd-eqt', [['A', 'Opción A', t.equipo.map(s => texto(s.startsWith('?') ? (A.herrTras || s) : s)).join(', ') + ` y ${t.po} po`], ['B', 'Opción B', '50 po']], A.equipoTras, v => asis.cambia(A => { A.equipoTras = v; })));
    if (A.equipo != null) {
      const at = ataques();
      c.append(h('h4', null, 'Así queda'), h('p', null, `CA ${ca()} · PG ${pg()} · velocidad ${metros(velocidad())} · ${objetos().po} po`),
        at.length ? h('table', { class: 'asis-tabla' }, h('tbody', null, at.map(a => h('tr', null, h('td', null, a.n), h('td', { class: 'n' }, a.bono), h('td', null, a.dano), h('td', { class: 'gen-nota' }, a.notas))))) : null,
        A.equipo === cl.equipo.length - 1 ? nota('Con el oro compras el equipo en el capítulo 6 del libro; apúntalo después en la ficha.') : null);
    }
  }
  function okEquipo() {
    const A = asis.A, cl = clase();
    if (A.equipo == null) return 'Elige el equipo de tu clase.';
    if (cl.equipo[A.equipo].items.some((s, i) => s === '?instrumento' && !A.elecciones[`c${i}`])) return 'Elige el instrumento.';
    return true;
  }

  function pasoDetalles(c) {
    const A = asis.A, D = A.datos, P = PERSONALIDAD_DND;
    c.append(h('h3', null, 'Personalidad'),
      regla('Dale al personaje un par de rasgos de personalidad, un ideal, un vínculo y un defecto, y un alineamiento. Las sugerencias son solo un punto de partida.', PHB('cap. 2')),
      h('p', null, desplegable('Alineamiento:', DND.alineamientos, A.alineamiento, v => { A.alineamiento = v; asis.guardar(); })));
    const bloque = (titulo, valor, sugerencias, poner) => {
      const ta = h('textarea', { value: valor(), 'aria-label': titulo, oninput: e => { poner(e.target.value); asis.guardar(); } });
      c.append(h('div', { class: 'asis-tras' }, h('header', null, h('b', null, titulo),
        h('button', { type: 'button', class: 'gen-boton mini', onclick: () => { const x = sugerencias[d(sugerencias.length) - 1]; poner(x); ta.value = x; asis.guardar(); } }, `Tirar 1d${sugerencias.length}`)),
        h('div', { class: 'asis-chips' }, sugerencias.map(x => h('button', { type: 'button', onclick: () => { poner(x); ta.value = x; asis.guardar(); } }, x))), ta));
    };
    bloque('Rasgo de personalidad 1', () => A.personalidad[0], P.rasgos, v => { A.personalidad[0] = v; });
    bloque('Rasgo de personalidad 2', () => A.personalidad[1], P.rasgos, v => { A.personalidad[1] = v; });
    bloque('Ideal', () => A.ideal, P.ideales, v => { A.ideal = v; });
    bloque('Vínculo', () => A.vinculo, P.vinculos, v => { A.vinculo = v; });
    bloque('Defecto', () => A.defecto, P.defectos, v => { A.defecto = v; });
    c.append(h('h3', null, 'Detalles'), h('div', { class: 'asis-rejilla' },
      h('label', null, 'Nombre del personaje', h('input', { type: 'text', value: D.Nombre, oninput: e => { D.Nombre = e.target.value; asis.guardar(); } })),
      h('label', null, 'Jugador', h('input', { type: 'text', value: D.Jugador, oninput: e => { D.Jugador = e.target.value; asis.guardar(); } }))),
      h('p', null, h('label', null, 'Aspecto (edad, altura, ojos, pelo…)', h('textarea', { value: A.aspecto, oninput: e => { A.aspecto = e.target.value; asis.guardar(); } }))),
      h('p', null, h('label', null, 'Historia del personaje', h('textarea', { rows: 4, value: A.historia, oninput: e => { A.historia = e.target.value; asis.guardar(); } }))),
      h('h4', null, 'Retrato'), nota('Va junto a «Appearance», en la segunda cara. Después podrás encuadrarlo pulsando sobre él en la ficha.'),
      A.foto ? h('p', null, h('img', { src: A.foto, alt: 'Retrato', style: 'max-width:8rem;border:1px solid var(--regla)' })) : null,
      h('p', null, h('label', { class: 'gen-boton' }, A.foto ? 'Cambiar la imagen' : 'Subir una imagen',
        h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => { const [x0, y0, x1, y1] = Generador.ficha('dnd24').foto.r; leerRetrato(e.target.files[0], x1 - x0, y1 - y0, url => asis.cambia(A => { A.foto = url; })); } })),
        A.foto ? h('button', { type: 'button', class: 'gen-boton', style: 'margin-left:.4rem', onclick: () => asis.cambia(A => { A.foto = null; }) }, 'Quitar') : null));
  }

  function pasoResumen(c) {
    const A = asis.A, f = finales(), cl = clase();
    c.append(h('h3', null, A.datos.Nombre || 'Tu personaje'),
      h('p', null, [`${cl.n} 1`, orden() && orden().n, nombreEspecie(), A.trasfondo, A.alineamiento].filter(Boolean).join(' · ')),
      h('p', null, CARS.map(k => `${k} ${f[k]} (${signo(mod(k))})`).join(' · ')),
      h('p', null, `CA ${ca()} · PG ${pg()} · velocidad ${metros(velocidad())} · iniciativa ${signo(mod('DES') + (tieneDote('Alerta') ? COMP : 0))} · competencia +${COMP}`),
      h('p', null, h('strong', null, 'Dotes: '), [...dotes().map(x => x.n), A.estilo].filter(Boolean).join(', ') + '.'),
      h('p', null, h('strong', null, 'Competente en: '), [...competentes()].sort((a, b) => a.localeCompare(b, 'es')).join(', ') + '.'),
      nota('Al crear la ficha se abre como personaje nuevo en el editor; lo que tengas abierto ahora se queda en «Mis personajes». La hoja es la oficial de 2024, en inglés (no hay versión oficial en español); lo que se escribe va en español.'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: crearFicha }, 'Crear la ficha')));
  }

  // ------------------------------------------------------------ de aquí a la ficha
  function crearFicha(azar) {
    const A = asis.A, cl = clase(), o = orden(), t = trasfondo(), e = especie(), f = finales(), m = magia(), cp = {};
    const pon = (n, x) => { if (x != null && x !== '') cp[n] = String(x); };
    pon('Nombre', A.datos.Nombre); pon('Trasfondo', t.n); pon('Clase', cl.n); pon('Especie', nombreEspecie());
    pon('Nivel', 1); pon('Experiencia', 0); pon('Tamaño', A.tam);
    for (const k of CARS) pon(k, f[k]);
    for (const k of cl.salvaciones) cp[`Salvación ${k} (competente)`] = true;
    for (const n of competentes()) cp[n + ' (competente)'] = true;
    for (const n of A.pericia) pon(n, signo(mod(DND.habilidades[n]) + 2 * COMP));  // el doble de competencia
    if (tieneDote('Alerta')) pon('Iniciativa', signo(mod('DES') + COMP));
    pon('CA', ca()); pon('Velocidad', metros(velocidad()));
    if (objetos().res.some(x => x.n === 'Escudo')) cp['Escudo'] = true;
    pon('PG máximos', pg()); pon('PG actuales', pg()); pon('Dados de golpe', `1d${cl.dg}`);
    ataques().slice(0, 6).forEach((a, i) => { pon(`Ataque ${i + 1}`, a.n); pon(`Ataque ${i + 1} bonificador`, a.bono); pon(`Ataque ${i + 1} daño`, a.dano); pon(`Ataque ${i + 1} notas`, a.notas); });
    const arm = armaduras();
    for (const [k, n] of [['ligeras', 'Armaduras ligeras'], ['medias', 'Armaduras medias'], ['pesadas', 'Armaduras pesadas'], ['escudos', 'Escudos']]) if (arm.has(k)) cp[n] = true;
    const armas = [...cl.armas, ...((o && o.armas) || [])].map(x => ({ sencillas: 'Armas sencillas', marciales: 'armas marciales', marcialesLigeras: 'armas marciales con la propiedad ligera', marcialesSutiles: 'armas marciales sutiles o ligeras' }[x] || x));
    pon('Armas', [...new Set(armas)].join(', ') + '.' + (A.maestrias.length ? `\nMaestría: ${A.maestrias.join(', ')}.` : ''));
    pon('Herramientas', herramientas().join(', '));

    // Rasgos: los de la clase en la primera columna; orden, estilo, invocación y pericia en la segunda
    pon('Rasgos de clase', cl.rasgos.join('\n'));
    pon('Rasgos de clase 2', [
      o && `${cl.orden.n} (${o.n}): ${o.texto}`, A.invocacion && `Invocación: ${A.invocacion}. ${INVOCACIONES_DND.find(x => x[0] === A.invocacion)[1]}`,
      A.pericia.length && `Pericia: ${A.pericia.join(', ')}.`, cl.magia && `Lanzamiento de conjuros (${DND.nombres[cl.magia.aptitud]}).`,
    ].filter(Boolean).join('\n'));
    pon('Rasgos de especie', [...e.rasgos, opcionEspecie() && `${e.opcion}: ${opcionEspecie().n}. ${opcionEspecie().texto}`].filter(Boolean).join('\n'));
    pon('Dotes', [...dotes().map(x => {
      const extra = x.n === 'Iniciado en la magia' ? ` (${x.lista.toLowerCase()}, ${x.aptitud}): ${x.trucos.join(', ')}; ${x.conjuro}.` : x.habs.length ? `: ${x.habs.join(', ')}.` : x.herrs.length ? `: ${x.herrs.join(', ')}.` : '';
      return `${x.n} (origen)${extra || '. ' + dote(x.n).texto}`;
    }), A.estilo && `${A.estilo} (estilo de combate): ${ESTILOS_DND.find(x => x[0] === A.estilo)[1]}`].filter(Boolean).join('\n'));

    // Conjuros: trucos, luego nivel 1, con tiempo, alcance y C/R/M
    const filas = [];
    const meter = (n, nivel, notas) => { if (!filas.some(x => x[0] === n)) filas.push([n, nivel, notas]); };
    if (m) A.trucos.forEach(n => meter(n, 0, ''));
    for (const [n, nv, de] of conjurosAparte()) if (!nv) meter(n, 0, de);
    for (const [n, nv, de] of conjurosAparte()) if (nv) meter(n, 1, de);  // los siempre preparados, antes
    if (m) (m.libro ? A.libro : A.preparados).forEach(n => meter(n, 1, m.libro ? (A.preparados.includes(n) ? 'Preparado' : 'En el libro') : ''));
    filas.slice(0, 30).forEach(([n, nivel, notas], i) => {
      const inf = INFO_CONJUROS_DND[n] || [];
      pon(`Conjuro ${i + 1} nivel`, nivel); pon(`Conjuro ${i + 1}`, n); pon(`Conjuro ${i + 1} tiempo`, inf[0]); pon(`Conjuro ${i + 1} alcance`, inf[1]);
      ['C', 'R', 'M'].forEach((l, j) => { if (inf[2 + j]) cp[`Conjuro ${i + 1} ${l}`] = true; });
      pon(`Conjuro ${i + 1} notas`, notas);
    });
    const aptitud = m ? m.aptitud : (A.aptitudEspecie || dotes().map(x => x.aptitud).find(Boolean));
    if (filas.length) pon('Aptitud mágica', DND.nombres[aptitud] || aptitud);
    if (m) pon('Nivel 1 espacios', m.espacios);

    // Equipo, idiomas y personaje
    const { res, po } = objetos();
    pon('Equipo', res.map(x => (x.cant > 1 ? `${x.cant} × ` : '') + x.n).join('\n'));
    pon('PO', po);
    pon('Idiomas', [...idiomasFijos(), ...A.idiomas].join(', ') + '.');
    pon('Alineamiento', A.alineamiento); pon('Aspecto', A.aspecto);
    pon('Historia del personaje', [A.historia.trim(),
      [['Rasgos', A.personalidad.filter(x => x.trim()).join(' ')], ['Ideal', A.ideal], ['Vínculo', A.vinculo], ['Defecto', A.defecto]].filter(([, x]) => x.trim()).map(([k, x]) => `${k}: ${x.trim()}`).join('\n'),
    ].filter(Boolean).join('\n\n'));

    Generador.crear('dnd24', { campos: cp, foto: A.foto });
    if (azar === true) return;
    if (confirm('Ficha creada. ¿Vaciar el asistente para crear otro personaje más adelante?')) asis.reiniciar();
    document.querySelector('#d-asistente').close();
  }

  // ------------------------------------------------------------ personaje al azar
  // Recorre los pasos del asistente eligiendo al azar entre lo que permiten las reglas (con las puntuaciones
  // más altas donde la clase las necesita) y comprueba cada paso con su ok(). El estado guardado del
  // asistente no se toca.
  const uno = xs => xs[d(xs.length) - 1];
  const barajar = xs => { const r = [...xs]; for (let i = r.length - 1; i > 0; i--) { const j = d(i + 1) - 1; [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const PRIORIDAD = { 'Bárbaro': ['FUE', 'CON', 'DES'], 'Bardo': ['CAR', 'DES', 'CON'], 'Brujo': ['CAR', 'CON', 'DES'], 'Clérigo': ['SAB', 'CON', 'FUE'],
    'Druida': ['SAB', 'CON', 'DES'], 'Explorador': ['DES', 'SAB', 'CON'], 'Guerrero': ['FUE', 'CON', 'DES'], 'Hechicero': ['CAR', 'CON', 'DES'],
    'Mago': ['INT', 'CON', 'DES'], 'Monje': ['DES', 'SAB', 'CON'], 'Paladín': ['FUE', 'CAR', 'CON'], 'Pícaro': ['DES', 'CON', 'INT'] };
  const IDIOMA_ESPECIE = { 'Dracónido': 'Dracónico', 'Enano': 'Enano', 'Elfo': 'Élfico', 'Gnomo': 'Gnomo', 'Goliat': 'Gigante', 'Mediano': 'Mediano', 'Orco': 'Orco' };
  const mejorMental = () => ['INT', 'SAB', 'CAR'].reduce((a, b) => (mod(b) > mod(a) ? b : a));

  function doteAzar(D, nombre, listaFija) {  // lo que pide elegir una dote de origen
    const x = dote(nombre);
    if (x.magia) {
      D.lista = listaFija || uno(['Clérigo', 'Druida', 'Mago']);
      D.aptitud = mejorMental();
      D.trucos = barajar(listaConjuros(D.lista, 0)).slice(0, 2);
      D.conjuro = uno(listaConjuros(D.lista, 1));
    }
    if (x.habilidades) D.habs = barajar(Object.keys(DND.habilidades).filter(n => !habilidadesFijas().has(n))).slice(0, 3);
    if (x.herramientas) D.herrs = barajar(DND.artesano).slice(0, 3);
    if (nombre === 'Músico') D.herrs = barajar(DND.instrumentos).slice(0, 3);
  }

  function generarAzar() {
    asis.A = inicial();
    const A = asis.A;
    // Clase, con sus elecciones; un guerrero de cada tres, arquero
    const cl = uno(CLASES_DND);
    A.clase = cl.n;
    const arquero = cl.n === 'Guerrero' && d(3) === 1;
    if (cl.orden) A.orden = uno(cl.orden.opciones).n;
    if (cl.estilo) A.estilo = arquero ? 'Tiro con arco' : uno(ESTILOS_DND.filter(x => x[0] !== 'Tiro con arco'))[0];
    if (cl.invocaciones) A.invocacion = uno(INVOCACIONES_DND)[0];
    // Trasfondo y especie
    const t = uno(TRASFONDOS_DND), e = uno(ESPECIES_DND);
    A.trasfondo = t.n;
    A.especie = e.n;
    A.tam = uno(e.tam);
    if (e.opciones) A.opcion = uno(e.opciones).n;

    // Puntuaciones: lo más alto en lo que pide la clase, y el +2 y el +1 del trasfondo donde más luzcan
    const prio = arquero ? ['DES', 'CON', 'FUE'] : PRIORIDAD[cl.n];
    const orden = [...prio, ...barajar(CARS.filter(k => !prio.includes(k)))];
    A.metodo = d(5) <= 3 ? 'estandar' : 'tiradas';
    if (A.metodo === 'tiradas') A.tiradas = Array.from({ length: 6 }, () => { const dados = [d(6), d(6), d(6), d(6)]; return { dados, total: suma(dados) - Math.min(...dados) }; });
    const vals = A.metodo === 'tiradas' ? A.tiradas.map(x => x.total) : DND.estandar;
    const porValor = vals.map((_, i) => i).sort((i, j) => vals[j] - vals[i]);
    orden.forEach((k, i) => { A.asig[k] = porValor[i]; });
    if (d(4) === 1) A.reparto = '111';
    else { const [a, b] = [...t.car].sort((x, y) => orden.indexOf(x) - orden.indexOf(y)); A.mas2 = a; A.mas1 = b; }

    if (t.herramienta.startsWith('?')) A.herrTras = uno({ '?artesano': DND.artesano, '?instrumento': DND.instrumentos, '?juego': DND.juegos }[t.herramienta]);
    doteAzar(A.doteTras, t.dote, t.listaMagia);
    if (e.aptitudLibre) A.aptitudEspecie = mejorMental();
    if (e.aptitud) A.aptitudEspecie = e.aptitud;
    if (e.habilidadDe) A.habEspecie = uno(e.habilidadDe.filter(n => !t.habilidades.includes(n)));
    if (e.habilidadLibre) A.habEspecie = uno(Object.keys(DND.habilidades).filter(n => !habilidadesFijas().has(n)));
    if (e.doteOrigen) {
      A.doteHumano = Object.assign(doteVacia(), { n: uno(DOTES_ORIGEN_DND.filter(x => x.n !== t.dote)).n });
      doteAzar(A.doteHumano, A.doteHumano.n);
    }

    // Equipo (casi siempre el de la opción A, que trae armas) y maestría con las armas que lleva
    A.equipo = arquero ? 1 : d(4) > 1 ? 0 : d(cl.equipo.length) - 1;
    cl.equipo[A.equipo].items.forEach((x, i) => { if (x === '?instrumento') A.elecciones[`c${i}`] = uno(DND.instrumentos); });
    if (cl.herramientaElegir) A.herrMonje = uno([...DND.artesano, ...DND.instrumentos]);
    A.equipoTras = d(5) > 1 ? 'A' : 'B';
    if (cl.maestria) {
      const ops = ARMAS_DND.filter(a => competenteArma(a) && (cl.n !== 'Bárbaro' || a[1][1] === 'c')).map(a => a[0]);
      const lleva = objetos().res.map(o => o.n).filter(n => ops.includes(n));
      A.maestrias = [...new Set([...barajar(lleva), ...barajar(ops)])].slice(0, cl.maestria);
    }

    // Habilidades, pericia e idiomas
    const deClase = cl.habilidades.de === 'todas' ? Object.keys(DND.habilidades) : cl.habilidades.de;
    A.habClase = barajar(deClase.filter(n => !habilidadesFijas().has(n))).slice(0, cl.habilidades.n);
    if (cl.pericia) A.pericia = barajar([...competentes()]).slice(0, cl.pericia);
    const propio = IDIOMA_ESPECIE[e.n];
    A.idiomas = [...new Set([propio, ...barajar(DND.idiomas)].filter(Boolean))].slice(0, numIdiomas());

    // Conjuros
    const m = magia();
    if (m) {
      const ya = new Set(conjurosAparte().map(x => x[0]));
      A.trucos = barajar(listaConjuros(m.lista, 0).filter(n => !ya.has(n))).slice(0, numTrucos());
      if (m.libro) {
        A.libro = barajar(listaConjuros(m.lista, 1)).slice(0, m.libro);
        A.preparados = barajar(A.libro).slice(0, m.preparados);
      } else A.preparados = barajar(listaConjuros(m.lista, 1).filter(n => !ya.has(n))).slice(0, m.preparados);
    }

    // Personalidad y nombre
    const P = PERSONALIDAD_DND;
    A.alineamiento = uno(DND.alineamientos.filter(x => !/malvado/.test(x) || d(4) === 1));
    A.personalidad = barajar(P.rasgos).slice(0, 2);
    A.ideal = uno(P.ideales); A.vinculo = uno(P.vinculos); A.defecto = uno(P.defectos);
    A.datos.Nombre = uno(NOMBRES_DND[e.n]);
    return PASOS.every(x => x.ok() === true);
  }
  async function alAzar() {
    await Generador.listo;
    const guardado = asis.A;
    try {
      let bien = false;
      for (let i = 0; i < 30 && !bien; i++) bien = generarAzar();
      if (bien) crearFicha(true);
      else alert('No ha salido un personaje válido; vuelve a intentarlo.');
    } finally { asis.A = guardado; }
  }

  const asis = AsisComun.marco({ clave: 'nephei-generador-asistente-dnd24-v1', inicial, pasos: () => PASOS, titulo: () => 'Asistente · Dungeons & Dragons (2024)' });
  document.querySelector('#b-azar').addEventListener('click', alAzar);
})();
