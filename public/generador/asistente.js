// Asistente de creación de personajes paso a paso: investigadores de La llamada de Cthulhu 7.ª edición
// (capítulo 3 del Manual del Guardián) y héroes de Pulp Cthulhu (capítulo 2 de su manual). Guarda su progreso
// en el navegador y, al final, crea una ficha nueva en el editor con Generador.crear().
'use strict';

const Asistente = (() => {
  const CLAVE = 'nephei-generador-asistente-v1';
  const CARS = REGLAS.caracteristicas;
  const $ = s => document.querySelector(s);
  const pad = v => String(v).padStart(2, '0');
  const suma = o => Object.values(o).reduce((a, b) => a + (+b || 0), 0);

  function h(tag, attrs, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'value') e.value = v;
      else if (k in e && typeof v !== 'string') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of hijos.flat()) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
    return e;
  }
  const regla = (txt, cita) => h('p', { class: 'asis-regla' }, txt, cita ? h('cite', null, cita) : null);

  // ------------------------------------------------------------ dados
  function d(caras) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return 1 + (u[0] % caras);
  }
  function tirar(expr) {  // '3D6', '2D6+6' o '1D6+13'
    const m = /^(\d+)D(\d+)(?:\+(\d+))?$/.exec(expr);
    const dados = Array.from({ length: +m[1] }, () => d(+m[2]));
    const mas = +(m[3] || 0);
    return { dados, mas, total: (dados.reduce((a, b) => a + b, 0) + mas) * 5 };
  }
  const textoTirada = t => `${t.dados.join(' + ')}${t.mas ? ' + ' + t.mas : ''} = ${t.total / 5} × 5`;

  // ------------------------------------------------------------ estado
  function inicial() {
    return {
      paso: 0, visto: 0, sistema: 'coc', metodo: 'tiradas', epoca: Generador.opciones().epoca || '20', edad: 30,
      tiradas: null, rapido: {}, ajuste: {}, mejoras: null, suerte: null,
      ocupacion: '', formula: {}, huecos: [], ocupPuntos: {}, rapidoHab: {}, sobrante: {},
      interes: {}, interesRapido: [null, null, null, null],
      datos: { Nombre: '', Jugador: '', Género: '', Residencia: '', Nacimiento: '', lengua: 'Español' },
      tras: { descripcion: '', ideologia: '', allegados: '', lugares: '', posesiones: '', rasgos: '' }, vinculo: '',
      foto: null, equipo: '', armas: [{}, {}, {}, {}],
      arquetipo: '', principal: '', arqPuntos: {}, talentos: [], talentoExtra: {},
    };
  }
  let A = null;
  function leer() { try { A = JSON.parse(localStorage.getItem(CLAVE)); } catch (e) { A = null; } if (!A) A = inicial(); }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(A)); } catch (e) { /* el asistente sigue sin recordar */ } }

  // ------------------------------------------------------------ reglas aplicadas
  const pulp = () => A.sistema === 'pulp';
  function sis() {
    return pulp()
      ? { ficha: 'pulp', nombre: 'Pulp Cthulhu', quien: 'héroe', ocup: OCUPACIONES_PULP, rapido: PULP.rapido,
          rapidoHab: PULP.rapidoHabilidades, manual: 'manual de Pulp Cthulhu' }
      : { ficha: 'coc', nombre: 'La llamada de Cthulhu', quien: 'investigador', ocup: OCUPACIONES, rapido: REGLAS.rapido,
          rapidoHab: REGLAS.rapidoHabilidades, manual: 'Manual del Guardián' };
  }
  // En Pulp no hay modificadores por edad (pág. 23): ningún tramo.
  const tramo = () => pulp() ? null : REGLAS.edades.find(t => A.edad >= t.desde && A.edad <= t.hasta) || null;
  const edadValida = () => pulp() ? A.edad >= 15 && A.edad <= 90 : !!tramo();
  const arquetipo = () => ARQUETIPOS.find(a => a.n === A.arquetipo) || null;
  const dadosDe = k => pulp() && k === A.principal ? '1D6+13' : REGLAS.tirada[k];
  // Con «mover las tiradas» (opción 3 del Manual del Guardián, pág. 49), qué tirada lleva cada característica.
  const tiradaDe = k => (A.mover && A.asignacion && A.asignacion[k]) || k;
  function base(k) {
    if (A.metodo === 'tiradas') return A.tiradas ? A.tiradas[tiradaDe(k)].total : null;
    if (pulp() && k === A.principal) return PULP.rapidoPrincipal;
    return A.rapido[k] ?? null;
  }
  function bh(n, c) {  // base de una habilidad, con las diferencias de Pulp
    if (PULP.psiquicos.includes(n)) return 0;
    if (pulp() && n in PULP.base) return PULP.base[n];
    return baseHabilidad(n, c || finales());
  }
  // Habilidades que traen los talentos (el poder psíquico, la especialidad de Erudición).
  function habTalentos() {
    if (!pulp()) return [];
    const r = [];
    if (A.talentos.includes('Poder psíquico') && A.talentoExtra.psiquico) r.push(A.talentoExtra.psiquico);
    if (A.talentos.includes('Erudición') && (A.talentoExtra.erudicion || '').trim()) r.push(`Conocimiento (${A.talentoExtra.erudicion.trim()})`);
    return r;
  }
  function eduPrevia() {  // EDU antes de las tiradas de mejora
    const t = tramo();
    return base('EDU') - (t && t.eduMenos || 0);
  }
  function finales() {
    if (pulp()) return Object.fromEntries(CARS.map(k => [k, base(k)]));
    const t = tramo();
    const c = {};
    for (const k of CARS) {
      let v = base(k);
      if (v == null) { c[k] = null; continue; }
      v -= +(A.ajuste[k] || 0);
      if (k === 'APA' && t) v -= t.apa;
      if (k === 'EDU') {
        v = eduPrevia();
        for (const m of A.mejoras || []) v += m.sube;
        v = Math.min(99, v);
      }
      c[k] = Math.max(0, v);
    }
    return c;
  }
  const suerte = () => {
    if (!A.suerte) return null;
    if (pulp()) return A.suerte[0].total;
    const t = tramo();
    return t && t.suerteDoble ? Math.max(A.suerte[0].total, A.suerte[1].total) : A.suerte[0].total;
  };
  const ocupacion = () => sis().ocup.find(o => o.n === A.ocupacion) || null;

  // Huecos de la ocupación; en el método rápido siempre ocho («ocho habilidades de ocupación apropiadas»).
  function huecosDef() {
    const o = ocupacion();
    if (!o) return [];
    const hs = [...o.hab];
    if (A.metodo === 'rapido') while (hs.length < 8) hs.push('cualquiera');
    return hs;
  }
  function canonica(fam, esp) {
    const lista = ESPECIALIDADES[fam] || [];
    const e = lista.map(x => Array.isArray(x) ? x[0] : x).find(x => x.toLowerCase() === esp.trim().toLowerCase());
    return e || esp.trim().replace(/^./, c => c.toUpperCase());
  }
  function resuelta(hu) {  // {sel, esp} → 'Ciencia (Física)', o null si falta algo
    if (!hu || !hu.sel) return null;
    if (!hu.sel.endsWith('(*)')) return hu.sel;
    const fam = hu.sel.slice(0, -4);
    if (!hu.esp || !hu.esp.trim()) return null;
    return `${fam} (${canonica(fam, hu.esp)})`;
  }
  const habOcupacion = () => huecosDef().map((_, i) => resuelta(A.huecos[i])).filter(Boolean);

  function puntosOcupacion() {
    const o = ocupacion(), c = finales();
    if (!o) return 0;
    return o.puntos.reduce((s, [car, x], i) => {
      const k = Array.isArray(car) ? (A.formula[i] || mejorDe(car, c)) : car;
      return s + (c[k] || 0) * x;
    }, 0);
  }
  const mejorDe = (cars, c) => cars.reduce((a, b) => ((c[b] || 0) > (c[a] || 0) ? b : a));
  const valoresRapido = () => [...sis().rapidoHab];

  // Valor final de cada habilidad que no está en su base.
  function valores() {
    const c = finales(), o = ocupacion();
    const v = {};
    const b = n => bh(n, c);
    const ocup = habOcupacion();
    const anade = reparto => { for (const [n, p] of Object.entries(reparto || {})) if (+p) v[n] = (v[n] ?? b(n)) + +p; };
    if (pulp() && A.talentos.includes('Conocimiento de los Mitos')) v['Mitos de Cthulhu'] = 10;
    for (const n of habTalentos()) v[n] = b(n);
    if (A.metodo === 'tiradas') {
      for (const n of ocup) v[n] = (v[n] ?? b(n)) + (+A.ocupPuntos[n] || 0);
      v['Crédito'] = +A.ocupPuntos['Crédito'] || 0;
      if (pulp()) anade(A.arqPuntos);
      anade(A.interes);
    } else {
      ocup.forEach((n, i) => { const a = A.rapidoHab[i]; v[n] = a ? Math.max(+a, b(n)) : (v[n] ?? b(n)); });
      const cr = +A.rapidoHab.credito || 0;
      v['Crédito'] = o ? Math.min(cr, o.cr[1]) : cr;
      anade(A.sobrante);
      for (const n of A.interesRapido) if (n) v[n] = b(n) + 20;
      if (pulp()) anade(A.arqPuntos);
    }
    return v;
  }
  function credito() { return valores()['Crédito'] || 0; }

  // ------------------------------------------------------------ selector de habilidades
  function opcionesHabilidad() {  // todas menos Crédito y Mitos de Cthulhu
    const lista = [];
    for (const x of HABILIDADES) {
      if (x.n === 'Crédito' || x.n === 'Mitos de Cthulhu') continue;
      if (x.actual && A.epoca !== 'actual' && !(pulp() && x.n === 'Informática')) continue;  // Pulp la trae en su listado
      lista.push(x.fam ? `${x.n} (*)` : x.n);
    }
    return lista.concat(habTalentos());
  }
  const etiquetaOpcion = s => s.endsWith('(*)') ? s.slice(0, -4) + ' (especialidad)' : s;
  // Un desplegable con las opciones y, si se elige una familia, un campo para la especialidad.
  function selectorHab(hu, opciones, alCambiar) {
    const caja = h('span', { class: 'asis-hab' });
    const sel = h('select', { onchange: () => { hu.sel = sel.value; hu.esp = ''; alCambiar(true); } },
      h('option', { value: '' }, '— elige —'),
      opciones.map(o => h('option', { value: o, selected: hu.sel === o }, etiquetaOpcion(o))));
    caja.append(sel);
    if (hu.sel && hu.sel.endsWith('(*)')) {
      const fam = hu.sel.slice(0, -4);
      const id = 'esp-' + fam.replace(/\W/g, '');
      const lista = (ESPECIALIDADES[fam] || []).map(x => Array.isArray(x) ? x[0] : x);
      caja.append(h('input', { type: 'text', placeholder: 'especialidad', value: hu.esp || '', list: id,
        'aria-label': `Especialidad de ${fam}`, oninput: e => { hu.esp = e.target.value; alCambiar(false); } }),
        h('datalist', { id }, lista.map(x => h('option', { value: x }))));
    }
    return caja;
  }

  // ------------------------------------------------------------ pasos
  const PASOS_COC = [
    { t: 'Empezar', pintar: pasoEmpezar, ok: () => true },
    { t: 'Edad', pintar: pasoEdad, ok: () => edadValida() ? true : 'La edad tiene que estar entre 15 y 89 años.' },
    { t: 'Características', pintar: pasoCaracteristicas, ok: okCaracteristicas },
    { t: 'Ajustes por edad', pintar: pasoAjustes, ok: okAjustes },
    { t: 'Atributos derivados', pintar: pasoDerivados, ok: () => true },
    { t: 'Ocupación', pintar: pasoOcupacion, ok: okOcupacion },
    { t: 'Habilidades de ocupación', pintar: pasoPuntos, ok: okPuntos },
    { t: 'Intereses particulares', pintar: pasoInteres, ok: okInteres },
    { t: 'Trasfondo y retrato', pintar: pasoTrasfondo, ok: () => true },
    { t: 'Ingresos y equipo', pintar: pasoEquipo, ok: () => true },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];
  const PASOS_PULP = [
    { t: 'Empezar', pintar: pasoEmpezar, ok: () => true },
    { t: 'Arquetipo', pintar: pasoArquetipo, ok: okArquetipo },
    { t: 'Edad', pintar: pasoEdad, ok: () => edadValida() ? true : 'La edad tiene que estar entre 15 y 90 años.' },
    { t: 'Características', pintar: pasoCaracteristicas, ok: okCaracteristicas },
    { t: 'Talentos', pintar: pasoTalentos, ok: okTalentos },
    { t: 'Atributos derivados', pintar: pasoDerivados, ok: () => true },
    { t: 'Ocupación', pintar: pasoOcupacion, ok: okOcupacion },
    { t: 'Habilidades de ocupación', pintar: pasoPuntos, ok: okPuntos },
    { t: 'Habilidades de arquetipo', pintar: pasoArqPuntos, ok: okArqPuntos },
    { t: 'Intereses particulares', pintar: pasoInteres, ok: okInteres },
    { t: 'Trasfondo y retrato', pintar: pasoTrasfondo, ok: () => true },
    { t: 'Ingresos y equipo', pintar: pasoEquipo, ok: () => true },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];
  const pasos = () => pulp() ? PASOS_PULP : PASOS_COC;

  function pasoEmpezar(c) {
    const reiniciar = () => { A.ocupPuntos = {}; A.rapidoHab = {}; A.sobrante = {}; A.interes = {}; A.interesRapido = [null, null, null, null]; A.interesHuecos = null; A.mejoras = null; A.arqPuntos = {}; };
    c.append(h('h3', null, pulp() ? 'Un héroe pulp nuevo' : 'Un investigador nuevo'),
      h('p', null, `El asistente sigue ${pulp() ? 'el capítulo 2 del manual de Pulp Cthulhu' : 'el capítulo 3 del Manual del Guardián'}. Puedes ir y volver entre los pasos: lo que tires y elijas queda guardado en este navegador hasta que crees la ficha.`),
      h('h4', null, 'Juego'),
      radios('sistema', [
        ['coc', 'La llamada de Cthulhu', '7.ª edición. Investigadores corrientes; ficha de los años 20.'],
        ['pulp', 'Pulp Cthulhu', 'Héroes más duros y capaces: arquetipos, talentos y el doble de Puntos de Vida.'],
      ], v => {
        if (v === A.sistema) return;
        const nuevo = inicial();
        Object.assign(nuevo, { metodo: A.metodo, epoca: A.epoca, datos: A.datos, tras: A.tras, vinculo: A.vinculo, foto: A.foto, equipo: A.equipo, armas: A.armas });
        A = nuevo;
      }),
      h('h4', null, 'Método'),
      radios('metodo', pulp() ? [
        ['tiradas', 'Tiradas', 'El método completo: 3D6×5 y 2D6+6×5, y 1D6+13×5 para la característica principal del arquetipo; puntos de ocupación, de arquetipo e intereses particulares.'],
        ['rapido', 'Creación rápida', '90 a la característica principal y 80, 70, 60, 60, 50, 50 y 40 a las demás, y valores fijos entre las habilidades.'],
      ] : [
        ['tiradas', 'Tiradas', 'El método normal: 3D6×5 y 2D6+6×5 para las características; puntos de ocupación e intereses particulares para las habilidades.'],
        ['rapido', 'Método rápido', 'Opción 5: repartes 40, 50, 50, 50, 60, 60, 70 y 80 entre las características, y valores fijos entre las habilidades.'],
      ], v => { if (v !== A.metodo) { A.metodo = v; reiniciar(); } }),
      h('h4', null, 'Época'),
      radios('epoca', [
        ['20', pulp() ? 'Años 20 o 30' : 'Años 20', pulp() ? 'La tabla de dinero de los años 30 de Pulp tiene los mismos importes que la de los años 20.' : 'La de la ficha. Dinero según la tabla de los años 20.'],
        ['actual', 'Época actual', 'Añade las habilidades y ocupaciones marcadas como actuales y usa la tabla de dinero actual.'],
      ]));
  }
  function radios(clave, ops, alCambiar) {
    return h('div', { class: 'asis-opciones', role: 'radiogroup' }, ops.map(([v, t, sub]) =>
      h('label', null, h('input', { type: 'radio', name: 'r-' + clave, value: v, checked: A[clave] === v,
        onchange: () => { if (alCambiar) alCambiar(v); A[clave] = v; guardar(); pintar(); } }),
        h('span', null, h('strong', null, t), h('small', null, sub)))));
  }

  function pasoArquetipo(c) {
    const a = arquetipo();
    c.append(h('h3', null, 'Arquetipo pulp'),
      regla('Escoge el arquetipo que mejor se ajuste al héroe que quieres interpretar. Cada uno tiene una característica principal (que empieza más alta), una lista de habilidades entre las que repartir 100 puntos de bonificación y, a veces, un talento obligatorio o recomendado.', 'Pulp Cthulhu, págs. 15-22'),
      h('label', null, 'Arquetipo: ', h('select', { onchange: e => {
        A.arquetipo = e.target.value; A.principal = ''; A.arqPuntos = {}; A.tiradas = null; A.rapido = {}; A.talentos = [];
        const x = arquetipo();
        if (x && x.principal.length === 1) A.principal = x.principal[0];
        if (x && x.talento) A.talentos = [x.talento];
        guardar(); pintar();
      } }, h('option', { value: '' }, '— elige —'), ARQUETIPOS.map(x => h('option', { value: x.n, selected: x.n === A.arquetipo }, x.n)))));
    if (!a) return;
    c.append(h('p', null, h('em', null, a.texto)));
    c.append(h('h4', null, 'Característica principal'));
    if (a.principal.length === 1) c.append(h('p', null, `${REGLAS.nombres[a.principal[0]]} (${a.principal[0]}).`));
    else c.append(h('div', { class: 'asis-opciones' }, a.principal.map(k => h('label', null,
      h('input', { type: 'radio', name: 'principal', checked: A.principal === k, onchange: () => { A.principal = k; A.tiradas = null; A.rapido = {}; guardar(); pintar(); } }),
      h('span', null, h('strong', null, `${REGLAS.nombres[k]} (${k})`))))));
    c.append(h('h4', null, 'Habilidades de arquetipo (100 puntos)'),
      h('p', null, a.hab.map(x => x.replace(' (*)', ' (cualquiera)')).join(', ') + (a.psiquico ? '; con el talento Poder psíquico, también las habilidades psíquicas.' : '.')),
      h('h4', null, 'Talentos'),
      h('p', null, a.talento ? `Debe escoger el talento ${a.talento} y otro más.` : `Escoge dos cualesquiera${a.recomienda ? ` (se recomienda ${a.recomienda})` : ''}.`),
      h('h4', null, 'Ocupaciones sugeridas'), h('p', null, a.ocupaciones + '.'),
      h('h4', null, 'Rasgos sugeridos'), h('p', null, a.rasgos.join(', ') + '.'),
      a.especial ? h('p', { class: 'asis-regla' }, 'Especial: ' + a.especial) : null);
  }
  function okArquetipo() {
    if (!arquetipo()) return 'Elige un arquetipo.';
    return A.principal ? true : 'Elige la característica principal.';
  }

  function pasoEdad(c) {
    if (pulp()) {
      c.append(h('h3', null, 'Edad'),
        regla('Escoge una edad entre los 15 y los 90 años. Los modificadores por edad (penalizaciones a las características o bonificaciones por experiencia) no se utilizan en Pulp Cthulhu.', 'Pulp Cthulhu, pág. 23'),
        h('label', null, 'Edad: ', h('input', { type: 'number', min: 15, max: 90, value: A.edad,
          oninput: e => { A.edad = parseInt(e.target.value, 10) || 0; guardar(); pie(); } })));
      return;
    }
    c.append(h('h3', null, 'Edad'),
      regla('Antes de anotar las características, decide la edad del investigador (de 15 a 89 años; fuera de ese margen, con permiso del Guardián). Los modificadores de cada tramo no se acumulan.', 'Manual del Guardián, pág. 34'),
      h('label', null, 'Edad: ', h('input', { type: 'number', min: 15, max: 89, value: A.edad,
        oninput: e => { A.edad = parseInt(e.target.value, 10) || 0; A.ajuste = {}; A.mejoras = null; guardar(); resumenEdad(); pie(); } })),
      h('div', { id: 'asis-edad' }));
    resumenEdad();
    function resumenEdad() {
      const z = $('#asis-edad');
      const t = tramo();
      z.textContent = '';
      if (!t) { z.append(h('p', { class: 'asis-aviso' }, 'Fuera de los tramos del manual (15 a 89).')); return; }
      const lista = [];
      if (t.resta) lista.push(`Resta ${t.resta} puntos entre ${t.entre.join(' y ')} (de una sola o repartidos).`);
      if (t.eduMenos) lista.push(`Resta ${t.eduMenos} puntos de EDU.`);
      if (t.apa) lista.push(`Reduce ${t.apa} puntos la APA.`);
      if (t.mejoras) lista.push(`${t.mejoras === 1 ? 'Una tirada' : t.mejoras + ' tiradas'} de mejora de EDU.`);
      if (t.suerteDoble) lista.push('Tira dos veces la Suerte y quédate con el resultado mayor.');
      if (t.desde >= 40) lista.push(`MOV −${Math.min(5, Math.floor(A.edad / 10) - 3)}.`);
      z.append(h('h4', null, `De ${t.desde} a ${t.hasta} años`), h('ul', null, lista.map(x => h('li', null, x))));
    }
  }

  function pasoCaracteristicas(c) {
    c.append(h('h3', null, 'Características'));
    const P = pulp() ? A.principal : null;
    if (A.metodo === 'tiradas') {
      c.append(pulp()
        ? regla(`Tira 3D6×5 para FUE, CON, DES, APA y POD, y 2D6+6×5 para TAM, INT y EDU, salvo la característica principal del arquetipo (${P}), que se tira con 1D6+13 y se multiplica por 5.`, 'Pulp Cthulhu, pág. 23')
        : regla('Tira 3D6 y multiplica el resultado por 5 para FUE, CON, DES, APA y POD. Tira 2D6+6 y multiplica el resultado por 5 para TAM, INT y EDU. Los ajustes por la edad vienen en el paso siguiente.', 'Manual del Guardián, pág. 36'));
      c.append(regla('Unas características bajas no hacen un ' + sis().quien + ' peor: a menudo le dan vida y lo hacen más real, lejos del superhombre increíble. En lugar de rechazar una mala tirada, intenta incorporarla a su historia. Una DES baja puede venir de una herida en una pierna o en una mano mientras servía en el ejército; una EDU baja, de no haber ido nunca a la escuela y haber crecido en la calle.', 'Manual del Guardián, pág. 33'));
      if (!A.tiradas) {
        c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => {
          A.tiradas = Object.fromEntries(CARS.map(k => [k, tirar(dadosDe(k))]));
          A.ajuste = {}; A.mejoras = null; A.asignacion = null; guardar(); pintar();
        } }, 'Tirar los dados'));
      } else {
        // Mover las tiradas: cada característica toma el resultado de otra; al elegir, se intercambian.
        // En Pulp la característica principal se queda con su 1D6+13, que es del arquetipo.
        if (!A.asignacion) A.asignacion = Object.fromEntries(CARS.map(k => [k, k]));
        const movibles = CARS.filter(k => k !== P);
        const cambiar = (k, origen) => {
          const otra = movibles.find(j => A.asignacion[j] === origen);
          if (otra) A.asignacion[otra] = A.asignacion[k];
          A.asignacion[k] = origen;
          A.ajuste = {}; A.mejoras = null; guardar(); pintar();
        };
        c.append(h('label', { class: 'asis-opcion-mover' }, h('input', { type: 'checkbox', checked: !!A.mover, onchange: e => {
          A.mover = e.target.checked; A.ajuste = {}; A.mejoras = null; guardar(); pintar();
        } }), ' Mover las tiradas entre características (si el Guardián lo permite)'));
        c.append(h('div', { class: 'asis-cars' }, CARS.map(k => {
          const t = A.tiradas[tiradaDe(k)];
          const caja = h('div', { class: 'asis-car' },
            h('b', null, `${k}${k === P ? ' · principal' : ''}`), h('span', { class: 'v' }, t.total),
            h('small', null, (tiradaDe(k) !== k ? `tirada de ${tiradaDe(k)}: ` : `${dadosDe(k)}: `) + textoTirada(t)));
          if (A.mover && k !== P) caja.append(h('select', { 'aria-label': `Tirada para ${k}`, onchange: e => cambiar(k, e.target.value) },
            movibles.map(j => h('option', { value: j, selected: tiradaDe(k) === j }, `${A.tiradas[j].total} · ${j}`))));
          return caja;
        })));
        if (A.mover) {
          c.append(h('p', { class: 'gen-nota' }, 'Opción 3 del Manual del Guardián (pág. 49): se pueden asignar los ocho resultados como se quiera entre las características. Al elegir una tirada para una característica, las dos se intercambian.' +
            (pulp() ? ` La característica principal (${P}) conserva su tirada de 1D6+13.` : '')));
          const bajas40 = ['INT', 'TAM'].filter(k => base(k) < 40);
          if (bajas40.length) c.append(h('p', { class: 'asis-aviso' }, `Se recomienda un mínimo de 40 en INT y TAM; aquí ${bajas40.join(' y ')} ${bajas40.length > 1 ? 'quedan' : 'queda'} por debajo (se puede, con el consentimiento del Guardián).`));
        }
        const bajas = CARS.filter(k => A.tiradas[k].total < 50).length;
        if (!pulp()) c.append(h('p', { class: 'gen-nota' }, 'Opción 1 del manual (pág. 49): si no te gusta el resultado, el Guardián puede dejarte empezar de nuevo, por ejemplo cuando tres o más características salen por debajo de 50.' + (bajas >= 3 ? ` Aquí hay ${bajas}.` : '')));
        c.append(h('button', { type: 'button', class: 'gen-boton', onclick: () => {
          if (!confirm('¿Descartar estas tiradas y volver a tirar? Hazlo solo si tu Guardián lo permite.')) return;
          A.tiradas = null; A.ajuste = {}; A.mejoras = null; A.asignacion = null; guardar(); pintar();
        } }, 'Volver a tirar'));
      }
    } else {
      c.append(pulp()
        ? regla(`Asigna 90 a tu característica principal (${P}) y a continuación 80, 70, 60, 60, 50, 50 y 40 como desees entre las restantes.`, 'Creación rápida, pág. 45')
        : regla('Asigna 40, 50, 50, 50, 60, 60, 70 y 80 como desees entre tus características. Después se aplican los modificadores de edad y EDU.', 'Opción 5: método rápido, pág. 50'));
      const tabla = h('div', { class: 'asis-cars' });
      const pintarSel = () => {
        tabla.textContent = '';
        for (const k of CARS) {
          if (k === P) {
            tabla.append(h('div', { class: 'asis-car' }, h('b', null, `${k} · principal`), h('span', { class: 'v' }, PULP.rapidoPrincipal)));
            continue;
          }
          const libres = [...sis().rapido];
          for (const j of CARS) if (j !== k && j !== P && A.rapido[j] != null) libres.splice(libres.indexOf(A.rapido[j]), 1);
          const ops = [...new Set(libres)].sort((a, b) => b - a);
          tabla.append(h('label', { class: 'asis-car' }, h('b', null, `${k} · ${REGLAS.nombres[k]}`),
            h('select', { onchange: e => { A.rapido[k] = e.target.value ? +e.target.value : null; A.ajuste = {}; A.mejoras = null; guardar(); pintarSel(); pie(); } },
              h('option', { value: '' }, '—'), ops.map(v => h('option', { value: v, selected: A.rapido[k] === v }, v)))));
        }
      };
      pintarSel();
      c.append(tabla);
    }
    if (pulp()) {
      c.append(h('h4', null, 'Suerte'), regla('Tira 2D6+6 y multiplica el resultado por 5.', 'Pulp Cthulhu, pág. 23'));
      if (!A.suerte) c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => { A.suerte = [tirar('2D6+6')]; guardar(); pintar(); } }, 'Tirar la Suerte'));
      else c.append(h('p', null, `2D6+6 = ${textoTirada(A.suerte[0])} = `, h('strong', null, `Suerte ${A.suerte[0].total}`)));
    }
  }
  function okCaracteristicas() {
    if (A.metodo === 'tiradas' && !A.tiradas) return 'Falta tirar los dados.';
    if (A.metodo === 'rapido' && !CARS.every(k => base(k) != null)) return 'Falta asignar un valor a cada característica.';
    if (pulp() && !A.suerte) return 'Falta tirar la Suerte.';
    return true;
  }

  // Talentos pulp: dos, elegidos o al azar (1D4 para la tabla y 1D10 para el talento).
  function pasoTalentos(c) {
    const a = arquetipo();
    const max = 2;
    c.append(h('h3', null, 'Talentos pulp'),
      regla('Elige dos talentos de entre las cuatro tablas, o determínalos al azar: 1D4 para la tabla (físicos, mentales, de combate, varios) y 1D10 para el talento.' +
        (a && a.talento ? ` Tu arquetipo (${a.n}) debe escoger ${a.talento}.` : a && a.recomienda ? ` Para tu arquetipo se recomienda ${a.recomienda}.` : ''), 'Pulp Cthulhu, págs. 23-25'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton', disabled: A.talentos.length >= max, onclick: () => {
        const tablas = Object.keys(TALENTOS);
        for (let i = 0; i < 50 && A.talentos.length < max; i++) {
          const t = d(4), n = d(10), x = TALENTOS[tablas[t - 1]][n - 1][0];
          A.ultimaTirada = `1D4 = ${t} (${tablas[t - 1].toLowerCase()}), 1D10 = ${n}: ${x}`;
          if (!A.talentos.includes(x)) { A.talentos.push(x); break; }
        }
        guardar(); pintar();
      } }, 'Tirar un talento al azar'), A.ultimaTirada ? h('span', { class: 'gen-nota' }, ' ' + A.ultimaTirada) : null));
    for (const [tabla, lista] of Object.entries(TALENTOS)) {
      c.append(h('h4', null, `Talentos ${tabla.toLowerCase()}`));
      const t = h('table', { class: 'asis-tabla' }, h('tbody'));
      lista.forEach(([n, ef], i) => {
        const marcado = A.talentos.includes(n);
        const fijo = a && a.talento === n;
        t.tBodies[0].append(h('tr', null,
          h('td', { class: 'n' }, i + 1),
          h('td', null, h('label', null, h('input', { type: 'checkbox', checked: marcado, disabled: fijo || (!marcado && A.talentos.length >= max),
            onchange: e => { if (e.target.checked) A.talentos.push(n); else A.talentos = A.talentos.filter(x => x !== n); guardar(); pintar(); } }), ' ', h('strong', null, n))),
          h('td', null, ef)));
      });
      c.append(t);
    }
    if (A.talentos.includes('Poder psíquico')) {
      c.append(h('h4', null, 'Poder psíquico'), h('label', null, 'Poder: ', h('select', { onchange: e => { A.talentoExtra.psiquico = e.target.value; guardar(); pie(); } },
        h('option', { value: '' }, '— elige —'), PULP.psiquicos.map(x => h('option', { value: x, selected: A.talentoExtra.psiquico === x }, x)))),
        h('p', { class: 'gen-nota' }, 'Empieza en 0%: hay que darle puntos de ocupación, de arquetipo o de interés particular (pág. 87).'));
    }
    if (A.talentos.includes('Erudición')) {
      c.append(h('h4', null, 'Erudición'), h('label', null, 'Conocimiento de… ', h('input', { type: 'text', value: A.talentoExtra.erudicion || '', placeholder: 'los sueños, los vampiros…',
        oninput: e => { A.talentoExtra.erudicion = e.target.value; guardar(); pie(); } })),
        h('p', { class: 'gen-nota' }, 'Hay que darle puntos de ocupación o de interés particular.'));
    }
    if (A.talentos.includes('Recarga rápida')) {
      c.append(h('h4', null, 'Recarga rápida'), h('label', null, 'Especialidad de Armas de fuego: ', h('input', { type: 'text', value: A.talentoExtra.recarga || '', list: 'esp-recarga',
        oninput: e => { A.talentoExtra.recarga = e.target.value; guardar(); } }), h('datalist', { id: 'esp-recarga' }, ESPECIALIDADES['Armas de fuego'].map(x => h('option', { value: x[0] })))));
    }
  }
  function okTalentos() {
    const a = arquetipo();
    if (A.talentos.length !== 2) return 'Elige dos talentos.';
    if (a && a.talento && !A.talentos.includes(a.talento)) return `Tu arquetipo debe escoger ${a.talento}.`;
    if (A.talentos.includes('Poder psíquico') && !A.talentoExtra.psiquico) return 'Elige el poder psíquico.';
    if (A.talentos.includes('Erudición') && !(A.talentoExtra.erudicion || '').trim()) return 'Escribe la especialidad de Conocimiento.';
    return true;
  }

  function pasoArqPuntos(c) {
    const a = arquetipo();
    c.append(h('h3', null, 'Habilidades de arquetipo'),
      regla(`Reparte ${PULP.puntosArquetipo} puntos de bonificación entre las habilidades de tu arquetipo (${a.n}); pueden coincidir con las de la ocupación. No se pueden usar en otras habilidades, y los que no asignes se pierden.` +
        (A.metodo === 'rapido' ? ' En la creación rápida se recomienda subir solo dos o tres.' : ''), 'Pulp Cthulhu, págs. 37 y 45'),
      tablaReparto(A.arqPuntos, PULP.puntosArquetipo, () => { guardar(); pie(); }, { opciones: opcionesArquetipo() }));
  }
  function opcionesArquetipo() {
    const a = arquetipo();
    return a ? a.hab.concat(a.psiquico ? habTalentos().filter(n => PULP.psiquicos.includes(n)) : []) : [];
  }
  function okArqPuntos() {
    if (suma(A.arqPuntos) > PULP.puntosArquetipo) return 'Has repartido más puntos de los que tienes.';
    const ops = opcionesArquetipo();
    const valida = n => ops.includes(n) || ops.some(o => o.endsWith('(*)') && n.startsWith(o.slice(0, -3)));
    if (Object.entries(A.arqPuntos).some(([n, p]) => +p && !valida(n))) return 'Solo se pueden usar en habilidades del arquetipo.';
    if (Object.values(valores()).some(x => x > 99)) return 'Ninguna habilidad puede pasar de 99.';
    return true;
  }

  function pasoAjustes(c) {
    const t = tramo();
    c.append(h('h3', null, 'Ajustes por la edad'));
    if (!t) { c.append(h('p', { class: 'asis-aviso' }, 'Primero elige una edad válida.')); return; }
    c.append(regla(`${A.edad} años. ` + [
      t.resta && `Resta ${t.resta} puntos entre ${t.entre.join(t.entre.length === 2 ? ' y ' : ', ')}.`,
      t.eduMenos && `Resta ${t.eduMenos} de EDU.`, t.apa && `Reduce ${t.apa} la APA.`,
      t.mejoras && `${t.mejoras} tirada${t.mejoras > 1 ? 's' : ''} de mejora de EDU: tira 1D100; si sale más que tu EDU actual, súmale 1D10 (máximo 99).`,
      t.suerteDoble && 'Tira dos veces la Suerte y quédate con la mayor.',
    ].filter(Boolean).join(' '), 'Manual del Guardián, pág. 34'));

    if (t.resta) {
      c.append(h('h4', null, `Restar ${t.resta} puntos`));
      const fila = h('div', { class: 'asis-cars' });
      for (const k of t.entre) {
        fila.append(h('label', { class: 'asis-car' }, h('b', null, `${k} (${base(k)})`),
          h('span', null, '− ', h('input', { type: 'number', min: 0, max: t.resta, step: 1, value: A.ajuste[k] || 0,
            oninput: e => { A.ajuste[k] = Math.max(0, parseInt(e.target.value, 10) || 0); guardar(); falta(); pie(); } }))));
      }
      c.append(fila, h('p', { id: 'asis-falta' }));
      const falta = () => {
        const n = t.resta - t.entre.reduce((s, k) => s + (+A.ajuste[k] || 0), 0);
        const p = $('#asis-falta');
        p.className = n === 0 ? 'asis-ok' : 'asis-aviso';
        p.textContent = n === 0 ? 'Repartido.' : n > 0 ? `Faltan ${n} puntos por restar.` : `Te has pasado ${-n} puntos.`;
        cartas();
      };
      setTimeout(falta);
    }

    if (t.mejoras) {
      c.append(h('h4', null, 'Tiradas de mejora de EDU'));
      if (!A.mejoras) {
        c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => { tirarMejoras(); guardar(); pintar(); } },
          t.mejoras === 1 ? 'Tirar la mejora' : `Tirar las ${t.mejoras} mejoras`));
      } else {
        c.append(h('ul', { class: 'asis-dados' }, A.mejoras.map(m => h('li', null,
          `1D100 = ${m.d100} contra EDU ${m.edu}: ` + (m.sube ? `sube ${m.sube} (1D10).` : (m.d100 > m.edu ? 'ya está en 99.' : 'no sube.'))))));
      }
    }

    c.append(h('h4', null, 'Suerte'));
    if (!A.suerte) {
      c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => {
        A.suerte = [tirar('3D6'), tirar('3D6')]; guardar(); pintar();
      } }, t.suerteDoble ? 'Tirar la Suerte (dos veces)' : 'Tirar la Suerte'));
    } else {
      const ts = t.suerteDoble ? A.suerte : [A.suerte[0]];
      c.append(h('ul', { class: 'asis-dados' }, ts.map(x => h('li', null, `3D6 = ${textoTirada(x)} = ${x.total}`))),
        h('p', null, h('strong', null, `Suerte ${suerte()}`)));
    }

    c.append(h('h4', null, 'Resultado'), h('div', { class: 'asis-cars', id: 'asis-finales' }));
    cartas();
    function cartas() {
      const z = $('#asis-finales');
      if (!z) return;
      const f = finales();
      z.textContent = '';
      for (const k of CARS) z.append(h('div', { class: 'asis-car' }, h('b', null, k), h('span', { class: 'v' }, f[k]),
        h('small', null, `½ ${Math.floor(f[k] / 2)} · ⅕ ${Math.floor(f[k] / 5)}`)));
    }
  }
  function tirarMejoras() {
    let edu = eduPrevia();
    A.mejoras = [];
    for (let i = 0; i < tramo().mejoras; i++) {
      const t100 = d(100), sube = t100 > edu ? Math.min(d(10), 99 - edu) : 0;
      A.mejoras.push({ d100: t100, edu, sube });
      edu += sube;
    }
  }
  function okAjustes() {
    const t = tramo();
    if (!t) return 'Falta una edad válida.';
    if (t.resta && t.entre.reduce((s, k) => s + (+A.ajuste[k] || 0), 0) !== t.resta) return `Reparte exactamente ${t.resta} puntos.`;
    if (t.entre.some(k => base(k) - (+A.ajuste[k] || 0) < 1)) return 'Ninguna característica puede quedar a cero.';
    if (t.mejoras && !A.mejoras) return 'Faltan las tiradas de mejora de EDU.';
    if (A.mejoras && A.mejoras.length && A.mejoras[0].edu !== eduPrevia()) return 'La EDU ha cambiado: vuelve a tirar las mejoras.';
    if (!A.suerte) return 'Falta tirar la Suerte.';
    return true;
  }

  function derivados() {
    const f = finales();
    const k = combate(f.FUE, f.TAM);
    return { Cordura: f.POD, PM: Math.floor(f.POD / 5), PV: Math.floor((f.CON + f.TAM) / (pulp() ? 5 : 10)), Suerte: suerte(),
             MOV: movimiento(f.FUE, f.DES, f.TAM, pulp() ? 0 : A.edad), BD: k.bd, Corpulencia: k.corp, Esquivar: Math.floor(f.DES / 2) };
  }
  function pasoDerivados(c) {
    const v = derivados();
    c.append(h('h3', null, 'Atributos derivados y combate'),
      pulp()
        ? regla('Cordura = POD. Puntos de Magia = POD/5. Puntos de Vida = (CON+TAM)/5: los héroes pulp aguantan el doble que un investigador. MOV 7 si DES y FUE son menores que TAM, 9 si las dos son mayores, 8 en otro caso (en Pulp, sin descuento por edad). Bonificación al daño y Corpulencia según FUE+TAM. Esquivar empieza en DES/2.', 'Pulp Cthulhu, pág. 23')
        : regla('Cordura = POD. Puntos de Magia = POD/5. Puntos de Vida = (CON+TAM)/10. MOV 7 si DES y FUE son menores que TAM, 9 si las dos son mayores, 8 en otro caso, menos 1 por década a partir de los 40. Bonificación al daño y Corpulencia según FUE+TAM. Esquivar empieza en DES/2.', 'Manual del Guardián, págs. 34-36'),
      h('div', { class: 'asis-cars' }, [['Cordura', 'POD'], ['PM', 'POD/5'], ['PV', pulp() ? '(CON+TAM)/5' : '(CON+TAM)/10'], ['Suerte', ''], ['MOV', ''],
        ['BD', 'FUE+TAM'], ['Corpulencia', 'FUE+TAM'], ['Esquivar', 'DES/2']].map(([k, s]) =>
        h('div', { class: 'asis-car' }, h('b', null, k === 'BD' ? 'Bonif. daño' : k), h('span', { class: 'v' }, v[k]), h('small', null, s)))),
      h('p', { class: 'gen-nota' }, 'Combatir (Pelea) y Esquivar se pueden subir con los puntos de habilidad de los pasos siguientes.'));
  }

  function pasoOcupacion(c) {
    const o = ocupacion();
    c.append(h('h3', null, 'Ocupación'),
      pulp()
        ? regla('La ocupación determina con qué habilidades tiene más soltura el héroe, sus ingresos y a quién conoce. Ten en cuenta las sugeridas por tu arquetipo' + (arquetipo() ? `: ${arquetipo().ocupaciones.toLowerCase()}.` : '.'), 'Pulp Cthulhu, págs. 26-36')
        : regla('Elige una ocupación y anota sus habilidades y su Crédito. Las marcadas [Lovecraftiana] aparecen en los relatos de Lovecraft; las [Actual], solo en partidas de hoy en día.', 'Ocupaciones de ejemplo, págs. 42-43'),
      h('label', null, 'Ocupación: ', h('select', { onchange: e => {
        A.ocupacion = e.target.value; A.huecos = []; A.formula = {}; A.ocupPuntos = {}; A.rapidoHab = {}; A.sobrante = {};
        A.interes = {}; A.interesRapido = [null, null, null, null]; A.interesHuecos = null; guardar(); pintar();
      } }, h('option', { value: '' }, '— elige —'),
        sis().ocup.filter(x => !x.actual || A.epoca === 'actual').map(x =>
          h('option', { value: x.n, selected: x.n === A.ocupacion }, x.n + (x.love ? ' [Lovecraftiana]' : '') + (x.actual ? ' [Actual]' : ''))))));
    if (!o) return;
    const f = finales();
    c.append(h('p', null, h('strong', null, 'Crédito: '), `${o.cr[0]}–${o.cr[1]}. `, h('strong', null, 'Puntos de ocupación: '),
      o.puntos.map(([k, x]) => (Array.isArray(k) ? k.map(j => `${j}×${x}`).join(' o ') : `${k}×${x}`)).join(' + ') + '.'));
    if (o.nota) c.append(h('p', { class: 'gen-nota' }, o.nota));

    if (A.metodo === 'tiradas') o.puntos.forEach(([k, x], i) => {
      if (!Array.isArray(k)) return;
      const elegido = A.formula[i] || mejorDe(k, f);
      c.append(h('div', { class: 'asis-opciones' }, k.map(j => h('label', null,
        h('input', { type: 'radio', name: 'f' + i, checked: elegido === j, onchange: () => { A.formula[i] = j; guardar(); pintar(); } }),
        h('span', null, h('strong', null, `${j}×${x}`), h('small', null, `${f[j]} × ${x} = ${f[j] * x}`))))));
    });
    if (A.metodo === 'tiradas') c.append(h('p', null, `Tienes ${puntosOcupacion()} puntos para habilidades de ocupación.`));

    c.append(h('h4', null, 'Habilidades de la ocupación'));
    if (A.metodo === 'rapido' && o.hab.length > 8) c.append(h('p', { class: 'gen-nota' }, `Esta ocupación trae ${o.hab.length} habilidades y el método rápido reparte nueve valores entre ocho y el Crédito: una se quedará sin valor (en su base).`));
    if (A.metodo === 'rapido' && o.hab.length < 8) c.append(h('p', { class: 'gen-nota' }, `Esta ocupación trae ${o.hab.length}; el método rápido pide ocho, así que eliges ${8 - o.hab.length} más.`));
    const tabla = h('table', { class: 'asis-tabla' }, h('tbody'));
    huecosDef().forEach((hd, i) => {
      A.huecos[i] = A.huecos[i] || {};
      const hu = A.huecos[i];
      let celda;
      const cambio = rehacer => { guardar(); if (rehacer) pintar(); else pie(); };
      if (typeof hd === 'string' && hd !== 'interpersonal' && hd !== 'cualquiera') {
        hu.sel = hd;
        celda = hd.endsWith('(*)') ? selectorHab(hu, [hd], cambio) : h('span', null, hd);
      } else {
        const ops = hd === 'interpersonal' ? INTERPERSONALES : hd === 'cualquiera' ? opcionesHabilidad() : hd;
        if (hu.sel && !ops.includes(hu.sel)) { hu.sel = ''; hu.esp = ''; }
        celda = h('span', null, h('span', { class: 'gen-nota' }, hd === 'interpersonal' ? 'Interpersonal: ' : hd === 'cualquiera' ? 'A tu elección: ' : 'Una de: '),
          selectorHab(hu, ops, cambio));
      }
      tabla.tBodies[0].append(h('tr', null, h('td', { class: 'n' }, i + 1), h('td', null, celda)));
    });
    A.huecos.length = huecosDef().length;
    c.append(tabla);
  }
  function okOcupacion() {
    if (!ocupacion()) return 'Elige una ocupación.';
    const hs = huecosDef().map((_, i) => resuelta(A.huecos[i]));
    if (hs.some(x => !x)) return 'Falta elegir alguna habilidad o escribir su especialidad.';
    if (new Set(hs).size !== hs.length) return 'Hay una habilidad repetida.';
    return true;
  }

  function pasoPuntos(c) {
    const o = ocupacion(), f = finales();
    const ocup = habOcupacion();
    c.append(h('h3', null, 'Habilidades de ocupación'));
    if (A.metodo === 'tiradas') {
      c.append(regla(`Reparte ${puntosOcupacion()} puntos entre las habilidades de la ocupación y el Crédito (de ${o.cr[0]} a ${o.cr[1]}). Se suman a la puntuación básica; los que no asignes se pierden.`, pulp() ? 'Pulp Cthulhu, pág. 37' : 'Manual del Guardián, págs. 38 y 41'));
      const filas = [...ocup, 'Crédito'];
      const tb = h('tbody');
      const tabla = h('table', { class: 'asis-tabla' }, h('thead', null, h('tr', null, h('th', null, 'Habilidad'), h('th', null, 'Base'), h('th', null, 'Puntos'), h('th', null, 'Total'))), tb);
      for (const n of filas) {
        const b = n === 'Crédito' ? 0 : bh(n, f);
        const tot = h('td', { class: 'n' });
        const tr = h('tr', null, h('td', null, n), h('td', { class: 'n' }, b),
          h('td', null, h('input', { type: 'number', min: 0, max: 99, value: A.ocupPuntos[n] || 0, 'aria-label': `Puntos en ${n}`,
            oninput: e => { A.ocupPuntos[n] = Math.max(0, parseInt(e.target.value, 10) || 0); guardar(); act(); } })), tot);
        tr._act = () => {
          const t = b + (+A.ocupPuntos[n] || 0);
          tot.textContent = t;
          tr.classList.toggle('mal', t > 99 || (n === 'Crédito' && (t < o.cr[0] || t > o.cr[1])));
        };
        tb.append(tr);
      }
      const resto = h('p');
      c.append(tabla, resto);
      const act = () => {
        [...tb.rows].forEach(r => r._act());
        const quedan = puntosOcupacion() - suma(Object.fromEntries(filas.map(n => [n, A.ocupPuntos[n] || 0])));
        resto.className = quedan < 0 ? 'asis-aviso' : 'asis-ok';
        resto.textContent = quedan < 0 ? `Te has pasado ${-quedan} puntos.` : `Quedan ${quedan} puntos.` + (quedan > 0 ? ' Si no los asignas, se pierden.' : '');
        pie();
      };
      act();
    } else {
      c.append(regla(`Asigna estos valores entre las ocho habilidades de ocupación y el Crédito: ${pulp() ? 'uno a 80%, dos a 70%, dos a 60%, tres a 50% y uno a 40%' : 'uno a 70%, dos a 60%, tres a 50% y tres a 40%'}, directamente, sin sumar la puntuación básica. Si el Crédito de tu ocupación no puede llegar al valor que le das, se queda en su máximo y el exceso se reparte entre otras habilidades.`, pulp() ? 'Creación rápida, pág. 45' : 'Opción 5: método rápido, pág. 50'));
      const filas = [...ocup.map((n, i) => [i, n]), ['credito', 'Crédito']];
      const tb = h('tbody');
      const pintarFilas = () => {
        tb.textContent = '';
        for (const [i, n] of filas) {
          const libres = valoresRapido();
          for (const [j] of filas) if (j !== i && A.rapidoHab[j]) libres.splice(libres.indexOf(A.rapidoHab[j]), 1);
          const b = n === 'Crédito' ? 0 : bh(n, f);
          const a = A.rapidoHab[i];
          let nota = '';
          if (a && n !== 'Crédito' && b > a) nota = `Su base (${b}) ya es mayor: se queda en ${b}.`;
          if (a && n === 'Crédito' && a > o.cr[1]) nota = `El máximo de la ocupación es ${o.cr[1]}: sobran ${a - o.cr[1]} puntos.`;
          if (a && n === 'Crédito' && a < o.cr[0]) nota = `El mínimo de la ocupación es ${o.cr[0]}.`;
          tb.append(h('tr', { class: a && n === 'Crédito' && a < o.cr[0] ? 'mal' : '' }, h('td', null, n),
            h('td', null, h('select', { 'aria-label': `Valor de ${n}`, onchange: e => {
              A.rapidoHab[i] = e.target.value ? +e.target.value : null; A.sobrante = {}; guardar(); pintarFilas(); exceso(); pie();
            } }, h('option', { value: '' }, '—'), [...new Set(libres)].sort((x, y) => y - x).map(v => h('option', { value: v, selected: a === v }, v + '%')))),
            h('td', { class: 'gen-nota' }, nota)));
        }
      };
      const zonaExceso = h('div');
      c.append(h('table', { class: 'asis-tabla' }, tb), zonaExceso);
      const exceso = () => {
        zonaExceso.textContent = '';
        const sobra = Math.max(0, (+A.rapidoHab.credito || 0) - o.cr[1]);
        if (!sobra) { A.sobrante = {}; return; }
        zonaExceso.append(h('h4', null, `Reparte los ${sobra} puntos que sobran del Crédito`),
          tablaReparto(A.sobrante, sobra, () => { guardar(); pie(); }, { incluirOcupacion: true }));
      };
      pintarFilas();
      exceso();
    }
  }
  function okPuntos() {
    const o = ocupacion();
    if (!o) return 'Falta la ocupación.';
    const v = valores();
    if (A.metodo === 'tiradas') {
      const usados = suma(Object.fromEntries([...habOcupacion(), 'Crédito'].map(n => [n, A.ocupPuntos[n] || 0])));
      if (usados > puntosOcupacion()) return 'Has repartido más puntos de los que tienes.';
      if (v['Crédito'] < o.cr[0] || v['Crédito'] > o.cr[1]) return `El Crédito tiene que estar entre ${o.cr[0]} y ${o.cr[1]}.`;
    } else {
      const filas = [...habOcupacion().keys(), 'credito'];
      if (!A.rapidoHab.credito || filas.filter(k => A.rapidoHab[k]).length < Math.min(filas.length, valoresRapido().length)) return 'Falta asignar algún valor.';
      if ((+A.rapidoHab.credito || 0) < o.cr[0]) return `El Crédito de esta ocupación empieza en ${o.cr[0]}: dale un valor mayor.`;
      const sobra = Math.max(0, (+A.rapidoHab.credito || 0) - o.cr[1]);
      if (sobra && suma(A.sobrante) !== sobra) return `Reparte los ${sobra} puntos que sobran del Crédito.`;
    }
    if (Object.entries(v).some(([n, x]) => x > 99)) return 'Ninguna habilidad puede pasar de 99.';
    return true;
  }

  // Tabla para repartir puntos entre habilidades a elección (intereses particulares, exceso del Crédito).
  function tablaReparto(reparto, total, alCambiar, { incluirOcupacion, opciones } = {}) {
    const f = finales();
    const caja = h('div');
    const tb = h('tbody');
    const resto = h('p');
    const nuevo = { sel: '', esp: '' };
    const actual = n => {  // valor sin lo que se reparte en esta tabla
      const v = valores();
      return (v[n] ?? bh(n, f)) - (+reparto[n] || 0);
    };
    const pintarT = () => {
      tb.textContent = '';
      for (const n of Object.keys(reparto)) {
        const tot = h('td', { class: 'n' });
        const act = () => { tot.textContent = actual(n) + (+reparto[n] || 0); };
        tb.append(h('tr', null, h('td', null, n), h('td', { class: 'n' }, actual(n)),
          h('td', null, h('input', { type: 'number', min: 0, max: 99, value: reparto[n] || 0, 'aria-label': `Puntos en ${n}`,
            oninput: e => { reparto[n] = Math.max(0, parseInt(e.target.value, 10) || 0); act(); cuenta(); alCambiar(); } })),
          tot, h('td', null, h('button', { type: 'button', class: 'gen-boton mini', onclick: () => { delete reparto[n]; pintarT(); cuenta(); alCambiar(); } }, 'Quitar'))));
        act();
      }
    };
    const cuenta = () => {
      const q = total - suma(reparto);
      resto.className = q < 0 ? 'asis-aviso' : 'asis-ok';
      resto.textContent = q < 0 ? `Te has pasado ${-q} puntos.` : `Quedan ${q} puntos.`;
    };
    const agregar = h('div', { class: 'asis-hab' });
    const pintarAgregar = () => {
      agregar.textContent = '';
      agregar.append(selectorHab(nuevo, opciones || opcionesHabilidad(), rehacer => { if (rehacer) pintarAgregar(); }),
        h('button', { type: 'button', class: 'gen-boton mini', onclick: () => {
          const n = resuelta(nuevo);
          if (!n) return;
          if (!(n in reparto)) reparto[n] = 0;
          nuevo.sel = ''; nuevo.esp = '';
          pintarT(); pintarAgregar(); cuenta(); alCambiar();
        } }, 'Añadir'));
    };
    if (incluirOcupacion) for (const n of habOcupacion()) if (!(n in reparto)) reparto[n] = 0;
    pintarT(); pintarAgregar(); cuenta();
    caja.append(h('table', { class: 'asis-tabla' }, h('thead', null, h('tr', null, h('th', null, 'Habilidad'), h('th', null, 'Ahora'), h('th', null, 'Puntos'), h('th', null, 'Total'), h('th'))), tb),
      h('p', { class: 'gen-nota' }, 'Añadir otra habilidad:'), agregar, resto);
    return caja;
  }

  function pasoInteres(c) {
    const f = finales();
    c.append(h('h3', null, 'Habilidades de interés particular'));
    if (A.metodo === 'tiradas') {
      c.append(regla(`INT×2 = ${f.INT * 2} puntos para repartir entre cualesquiera habilidades, también las de ocupación, salvo Mitos de Cthulhu. No olvides Combatir y Armas de fuego si te hacen falta. Los que no asignes se pierden.`, 'Manual del Guardián, págs. 37 y 41'),
        tablaReparto(A.interes, f.INT * 2, () => { guardar(); pie(); }));
    } else {
      c.append(regla('Elige cuatro habilidades que no sean de tu ocupación y súmales 20 a su puntuación básica.', 'Opción 5: método rápido, pág. 50'));
      const ocup = habOcupacion();
      const ops = opcionesHabilidad().filter(n => !ocup.includes(n));
      if (!A.interesHuecos) A.interesHuecos = [{}, {}, {}, {}];
      A.interesHuecos.forEach((hu, i) => {
        if (hu.sel && !ops.includes(hu.sel)) { hu.sel = ''; hu.esp = ''; }
        const valor = h('span', { class: 'gen-nota' });
        const act = () => {
          const r = resuelta(hu);
          A.interesRapido[i] = r;
          valor.textContent = r ? ` ${bh(r, f)} + 20 = ${bh(r, f) + 20}` : '';
        };
        act();
        c.append(h('p', null, `${i + 1}. `, selectorHab(hu, ops, rehacer => { act(); guardar(); if (rehacer) pintar(); else pie(); }), valor));
      });
    }
  }
  function okInteres() {
    const f = finales();
    if (A.metodo === 'tiradas') {
      if (suma(A.interes) > f.INT * 2) return 'Has repartido más puntos de los que tienes.';
      if (A.interes['Mitos de Cthulhu']) return 'Mitos de Cthulhu no se puede subir con intereses particulares.';
    } else {
      const ns = A.interesRapido;
      if (ns.some(x => !x)) return 'Elige las cuatro habilidades.';
      if (new Set(ns).size !== 4) return 'Hay una habilidad repetida.';
      if (ns.some(x => habOcupacion().includes(x))) return 'Tienen que ser habilidades que no sean de tu ocupación.';
    }
    if (Object.values(valores()).some(x => x > 99)) return 'Ninguna habilidad puede pasar de 99.';
    return true;
  }

  const TRAS = [
    ['descripcion', 'Descripción personal'], ['ideologia', 'Ideología/Creencias'], ['allegados', 'Allegados'],
    ['lugares', 'Lugares significativos'], ['posesiones', 'Posesiones preciadas'], ['rasgos', 'Rasgos'],
  ];
  // Cómo se llaman esos apartados en los campos de cada ficha.
  const campoTras = (k, t) => pulp() ? ({ descripcion: 'Descripción', ideologia: 'Ideología y creencias' }[k] || t) : t;
  const sugerencia = x => x[1] ? `${x[0]} (${x[1]})` : x[0];
  function pasoTrasfondo(c) {
    const P = pulp(), T = P ? TRASFONDO_PULP : TRASFONDO;
    c.append(h('h3', null, 'Datos, trasfondo y retrato'),
      h('div', { class: 'asis-rejilla' }, [['Nombre', 'Nombre'], ['Jugador', 'Jugador'], ['Género', 'Género'],
        ['Residencia', 'Lugar de residencia'], ['Nacimiento', 'Lugar de nacimiento'], ['lengua', 'Lengua propia']].map(([k, t]) =>
        h('label', null, t, h('input', { type: 'text', value: A.datos[k] || '', oninput: e => { A.datos[k] = e.target.value; guardar(); } })))),
      regla('Escribe al menos una frase sobre cada categoría. Las tablas del manual sirven de inspiración: tira o elige, y luego hazlo concreto y personal (dale un nombre, un sentimiento). Marca una como vínculo fundamental: el Guardián no puede arrebatártelo sin darte una tirada para salvarlo.',
        P ? 'Paso 6: crear un trasfondo, Pulp Cthulhu, págs. 41-43' : 'Paso 4: crear un trasfondo, Manual del Guardián, págs. 44-48'));
    for (const [k, t] of TRAS) {
      const ta = h('textarea', { 'aria-label': t, value: A.tras[k], oninput: e => { A.tras[k] = e.target.value; guardar(); } });
      const sug = h('p', { class: 'sugerencia' });
      const poner = txt => { A.tras[k] = (A.tras[k] ? A.tras[k].replace(/\s*$/, '') + (['descripcion', 'rasgos'].includes(k) ? ', ' : '. ') : '') + txt; ta.value = A.tras[k]; guardar(); };
      const chips = lista => h('div', { class: 'asis-chips' }, lista.map(x => h('button', { type: 'button', onclick: () => poner(x.toLowerCase()) }, x)));
      const tirada = (txt, fn) => h('button', { type: 'button', class: 'gen-boton mini', onclick: () => { sug.textContent = fn(); } }, txt);
      const cab = h('header', null, h('b', null, t), h('label', { class: 'gen-nota' },
        h('input', { type: 'radio', name: 'vinculo', checked: A.vinculo === k, onchange: () => { A.vinculo = k; guardar(); } }), ' vínculo fundamental'));
      const caja = h('div', { class: 'asis-tras' }, cab);
      if (k === 'descripcion' && !P) {
        caja.append(h('p', { class: 'sugerencia' }, 'Elige en lugar de tirar:'), chips(TRASFONDO.descripcion));
      } else if (k === 'descripcion') {
        cab.append(tirada('Tirar 1D20', () => { const n = d(20), D = T.descripcion; return `1D20 = ${n}: ${D.Masculino[n - 1]} · ${D.Femenino[n - 1]} · ${D.Unisex[n - 1]} (masculino, femenino, unisex)`; }));
        for (const [g, lista] of Object.entries(T.descripcion)) caja.append(h('p', { class: 'sugerencia' }, g + ':'), chips(lista));
      } else if (k === 'allegados') {
        cab.append(tirada('Tirar 1D10', () => {
          const a = d(10), b = d(10);
          return `1D10 = ${a}: ${sugerencia(T.allegadosQuien[a - 1])}. 1D10 = ${b}: ${sugerencia(TRASFONDO.allegadosPorque[b - 1])}`;
        }));
      } else if (k === 'rasgos' && P) {
        const a = arquetipo();
        cab.append(tirada('Tirar 1D10', () => { const n = d(10); return `1D10 = ${n}: ${T.rasgos[n - 1].join(', ')} (elige uno)`; }));
        if (a) caja.append(h('p', { class: 'sugerencia' }, `Sugeridos para ${a.n}:`), chips(a.rasgos.map(x => x.replace(/^./, m => m.toUpperCase()))));
      } else {
        const tabla = (P && T[k]) || TRASFONDO[k];
        cab.append(tirada('Tirar 1D10', () => { const n = d(10); return `1D10 = ${n}: ${sugerencia(tabla[n - 1])}`; }));
        if (P && k === 'lugares') caja.append(h('p', { class: 'sugerencia' }, 'El manual de Pulp no trae esta tabla: es la del Manual del Guardián.'));
      }
      caja.append(sug, ta);
      c.append(caja);
    }
    c.append(h('h4', null, 'Retrato'),
      h('p', { class: 'gen-nota' }, 'Va en la esquina superior derecha de la ficha. Después podrás encuadrarlo mejor pulsando sobre él en la ficha.'),
      A.foto ? h('p', null, h('img', { src: A.foto, alt: 'Retrato', style: 'max-width:12rem;border:1px solid var(--regla)' })) : null,
      h('p', null, h('label', { class: 'gen-boton' }, A.foto ? 'Cambiar la imagen' : 'Subir una imagen',
        h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: e => subirFoto(e.target.files[0]) })),
        A.foto ? h('button', { type: 'button', class: 'gen-boton', style: 'margin-left:.4rem', onclick: () => { A.foto = null; guardar(); pintar(); } }, 'Quitar') : null));
  }
  function subirFoto(f) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const [x0, y0, x1, y1] = Generador.ficha(sis().ficha).foto.r;
        const cv = document.createElement('canvas');
        cv.width = Math.round((x1 - x0) * 3); cv.height = Math.round((y1 - y0) * 3);
        const s = Math.max(cv.width / img.width, cv.height / img.height);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, (cv.width - img.width * s) / 2, (cv.height - img.height * s) / 2, img.width * s, img.height * s);
        A.foto = cv.toDataURL('image/jpeg', 0.86);
        guardar(); pintar();
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  }

  function pasoEquipo(c) {
    const cr = credito();
    const din = dinero(cr, A.epoca);
    const imp = Generador.importe;
    c.append(h('h3', null, 'Ingresos y equipo'),
      regla(`Con Crédito ${cr}, tu nivel de vida es ${din.nivel.toLowerCase()}: nivel de gasto ${imp(din.gasto)}, dinero en efectivo ${imp(din.dinero)} y propiedades por valor de ${imp(din.bienes)}. Lo que encaja en tu nivel de vida no hay que pagarlo: simplemente lo tienes. La moneda se cambia en «Más», en la barra de la ficha.`, pulp() && A.epoca !== 'actual' ? 'Tabla 7: Dinero y propiedades (años 30), Pulp Cthulhu, pág. 44' : `Tabla II: Dinero y propiedades (${A.epoca === 'actual' ? 'época actual' : 'años 20'}), Manual del Guardián, pág. 41`),
      h('h4', null, 'Equipo y posesiones'),
      h('p', { class: 'gen-nota' }, 'Una cosa por línea (caben 14 en la ficha). Las listas de equipo están en las págs. 424-429 del manual.'),
      h('textarea', { rows: 6, value: A.equipo, oninput: e => { A.equipo = e.target.value; guardar(); } }),
      h('h4', null, 'Armas'),
      h('p', { class: 'gen-nota' }, 'Desarmado ya viene impreso. Copia los datos de la Tabla XVII: Armas (págs. 430-435). El porcentaje sale de la habilidad que elijas.'));
    const v = valores(), f = finales();
    const habs = [...new Set([...Object.keys(v).filter(n => /^(Armas de fuego|Combatir) \(/.test(n)),
      'Combatir (Pelea)', 'Armas de fuego (Arma corta)', 'Armas de fuego (Fusil/Escopeta)', 'Lanzar'])];
    const tb = h('tbody');
    A.armas.forEach(a => {
      const campo = (k, ph, w) => h('input', { type: 'text', placeholder: ph, value: a[k] || '', style: `width:${w}`, oninput: e => { a[k] = e.target.value; guardar(); } });
      tb.append(h('tr', null, h('td', null, campo('arma', 'Arma', '9rem')),
        h('td', null, h('select', { onchange: e => { a.hab = e.target.value; guardar(); } }, h('option', { value: '' }, 'habilidad'),
          habs.map(n => h('option', { value: n, selected: a.hab === n }, `${n} (${v[n] ?? bh(n, f)})`)))),
        h('td', null, campo('dano', 'Daño', '4.5rem')), h('td', null, campo('alcance', 'Alcance', '4.5rem')),
        h('td', null, campo('ataques', 'Ataq.', '3rem')), h('td', null, campo('municion', 'Mun.', '3rem')),
        h('td', null, campo('averia', 'Avería', '3rem'))));
    });
    c.append(h('div', { style: 'overflow-x:auto' }, h('table', { class: 'asis-tabla' }, tb)));
  }

  function pasoResumen(c) {
    const f = finales(), v = valores(), dv = derivados();
    c.append(h('h3', null, A.datos.Nombre || (pulp() ? 'Tu héroe' : 'Tu investigador')),
      h('p', null, [pulp() && A.arquetipo, A.ocupacion, `${A.edad} años`, A.datos.Residencia].filter(Boolean).join(' · ')),
      pulp() ? h('p', null, h('strong', null, 'Talentos: '), textoTalentos().map(t => t.split(':')[0]).join(', ') + '.') : null,
      h('h4', null, 'Características'),
      h('p', null, CARS.map(k => `${k} ${f[k]}`).join(' · ')),
      h('p', null, `Cordura ${dv.Cordura} · PM ${dv.PM} · PV ${dv.PV} · Suerte ${dv.Suerte} · MOV ${dv.MOV} · BD ${dv.BD} · Corpulencia ${dv.Corpulencia}`),
      h('h4', null, 'Habilidades que no están en su base'),
      h('div', { class: 'asis-resumen' }, Object.entries(v).filter(([n, x]) => x !== bh(n, f) || n === 'Crédito')
        .sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([n, x]) => h('div', null, `${n} ${x}`))),
      h('p', { class: 'gen-nota', style: 'margin-top:1rem' }, 'Al crear la ficha se abre como personaje nuevo en el editor; lo que tienes abierto ahora se queda en «Mis personajes». Desde allí puedes retocar cualquier cosa y descargar el PDF.'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: crearFicha }, 'Crear la ficha')));
  }

  // ------------------------------------------------------------ de aquí a la ficha
  function repartirTexto(texto, anchos, tam, minimo = 5) {
    for (; tam >= minimo; tam -= 0.25) {
      const lineas = [];
      let actual = '';
      for (const pal of texto.split(/\s+/).filter(Boolean)) {
        const prueba = (actual + ' ' + pal).trim();
        if (Generador.ancho(prueba, tam) <= anchos[Math.min(lineas.length, anchos.length - 1)] - 3) actual = prueba;
        else { lineas.push(actual); actual = pal; }
      }
      lineas.push(actual);
      if (lineas.length <= anchos.length) return { lineas, tam };
    }
    return null;
  }

  function textoTalentos() {  // «Nombre: efecto.» de cada talento, con lo que se haya elegido
    const efecto = Object.fromEntries(Object.values(TALENTOS).flat());
    return A.talentos.map(n => {
      if (n === 'Poder psíquico' && A.talentoExtra.psiquico) return `Poder psíquico: ${A.talentoExtra.psiquico}.`;
      if (n === 'Erudición' && A.talentoExtra.erudicion) return `Erudición: Conocimiento de ${A.talentoExtra.erudicion.trim()}.`;
      if (n === 'Recarga rápida' && A.talentoExtra.recarga) return `Recarga rápida (${A.talentoExtra.recarga.trim()}): ${efecto[n]}`;
      return `${n}: ${efecto[n]}`;
    });
  }

  function crearFicha(azar) {
    const def = Generador.ficha(sis().ficha);
    const rect = Object.fromEntries(def.campos.map(c => [c.n, c]));
    const f = finales(), v = valores(), cp = {}, tam = {};
    const pon = (n, x) => { if (rect[n] && x != null && x !== '') cp[n] = String(x); };
    pon('Nombre', A.datos.Nombre); pon('Jugador', A.datos.Jugador); pon('Ocupación', A.ocupacion);
    pon('Residencia', A.datos.Residencia); pon('Nacimiento', A.datos.Nacimiento); pon('Género', A.datos.Género); pon('Edad', A.edad);
    if (pulp()) pon('Arquetipo', A.arquetipo);
    for (const k of CARS) pon(k, f[k]);

    // Habilidades: las impresas en su fila; las especialidades en las líneas de su familia; el resto, en las libres.
    const pendientes = new Set(Object.keys(v));
    for (const fila of def.habilidades) {
      if (!fila.habilidad) continue;
      const n = fila.habilidad;
      let x = v[n];
      if (x == null) x = n === 'Esquivar' ? Math.floor(f.DES / 2) : n === 'Lengua propia' ? f.EDU : fila.base;
      pon(fila.valor, pad(x));
      if (n === 'Lengua propia') pon(fila.nombre, A.datos.lengua);
      pendientes.delete(n);
    }
    const CORTO = { 'Otras lenguas': 'Lengua', 'Armas de fuego': 'Armas', 'Arte/Artesanía': 'Arte' };
    const libres = def.habilidades.filter(x => !x.habilidad);
    const sobran = [];
    for (const n of [...pendientes].sort((a, b) => v[b] - v[a])) {
      const m = /^(.+?) \((.+)\)$/.exec(n);
      let fila = m && libres.find(x => x.familia === m[1] && !cp[x.valor]);
      let etiqueta = m ? m[2] : n;
      if (!fila) {
        fila = libres.find(x => x.familia === '' && !cp[x.valor]);
        etiqueta = m ? `${CORTO[m[1]] || m[1]}: ${m[2]}` : n;
      }
      if (!fila) { sobran.push(`${n} ${v[n]}`); continue; }
      pon(fila.nombre, etiqueta);
      pon(fila.valor, pad(v[n]));
    }

    // Armas: la fila 1 (Desarmado) la calcula el editor con Combatir (Pelea)
    let fa = 2;
    for (const a of A.armas) {
      if (!a.arma) continue;
      const pct = a.hab ? (v[a.hab] ?? bh(a.hab, f)) : '';
      pon(`Arma ${fa} arma`, a.arma); pon(`Arma ${fa} normal`, pct); pon(`Arma ${fa} dano`, a.dano);
      pon(`Arma ${fa} alcance`, a.alcance); pon(`Arma ${fa} ataques`, a.ataques); pon(`Arma ${fa} municion`, a.municion);
      pon(`Arma ${fa} averia`, a.averia);
      if (++fa > 5) break;
    }

    // Trasfondo: tres líneas por apartado, con la letra que haga falta para que quepa
    for (const [k, t] of TRAS) {
      let texto = (A.tras[k] || '').trim();
      if (!texto) continue;
      if (A.vinculo === k) texto = '* ' + texto;
      const ns = [1, 2, 3].map(i => `${campoTras(k, t)} ${i}`).filter(n => rect[n]);
      const r = repartirTexto(texto, ns.map(n => rect[n].r[2] - rect[n].r[0]), rect[ns[0]].tam);
      if (!r) { pon(ns[0], texto); continue; }
      r.lineas.forEach((l, i) => { pon(ns[i], l); tam[ns[i]] = r.tam; });
    }
    A.equipo.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 14).forEach((x, i) => pon(`Equipo ${i + 1}`, x));

    const s = suerte();
    if (rect[`Suerte ${pad(s)}`]) cp[`Suerte ${pad(s)}`] = true;
    // Talentos de Pulp: cada uno en sus líneas, con la letra que haga falta para que quepan los dos en cinco
    if (pulp() && rect['Talento 1']) {
      const ns = [1, 2, 3, 4, 5].map(i => `Talento ${i}`);
      const w = rect[ns[0]].r[2] - rect[ns[0]].r[0];
      for (let t = rect[ns[0]].tam; t >= 5; t -= 0.25) {
        const lineas = textoTalentos().flatMap(x => (repartirTexto(x, Array(5).fill(w), t, t) || { lineas: [x, '', '', '', '', ''] }).lineas);
        if (lineas.length <= 5 || t <= 5.25) { lineas.slice(0, 5).forEach((l, i) => { pon(ns[i], l); tam[ns[i]] = t; }); break; }
      }
    }
    const notas = [];
    if (sobran.length) notas.push('Otras habilidades: ' + sobran.join(', ') + '.');
    if (pulp() && arquetipo() && arquetipo().especial) notas.push(arquetipo().especial);
    if (notas.length) pon('Notas', notas.join('\n'));

    Generador.opciones().epoca = A.epoca;
    $('#o-epoca').value = A.epoca;
    Generador.crear(sis().ficha, { campos: cp, tam, foto: A.foto });
    if (azar === true) return;
    if (confirm(`Ficha creada. ¿Vaciar el asistente para empezar otro ${sis().quien} más adelante?`)) { A = inicial(); guardar(); }
    $('#d-asistente').close();
  }

  // ------------------------------------------------------------ personaje al azar
  // Hace lo mismo que el asistente con el método de tiradas, eligiendo al azar entre lo que permiten las
  // reglas, y comprueba cada paso con su ok(). El estado guardado del asistente no se toca.
  const uno = xs => xs[d(xs.length) - 1];
  const barajar = xs => { const r = [...xs]; for (let i = r.length - 1; i > 0; i--) { const j = d(i + 1) - 1; [r[i], r[j]] = [r[j], r[i]]; } return r; };
  // Especialidades habituales, para no sacar a cada investigador con lanzallamas o motosierra
  const ESP_AZAR = {
    'Armas de fuego': ['Arma corta', 'Arma corta', 'Fusil/Escopeta', 'Fusil/Escopeta', 'Subfusil', 'Arco'],
    'Combatir': ['Pelea', 'Pelea', 'Pelea', 'Espada', 'Hacha', 'Lanza', 'Látigo', 'Cable'],
    'Conocimiento': ['Los sueños', 'Los vampiros', 'Los hombres lobo', 'El antiguo Egipto', 'Las sectas', 'El folclore de Nueva Inglaterra'],
    'Arte/Artesanía': ['Fotografía', 'Pintura', 'Escritura', 'Interpretación', 'Cocina', 'Carpintería', 'Danza', 'Caligrafía', 'Escultura', 'Instrumento'],
    'Supervivencia': ['Bosque', 'Desierto', 'Montaña', 'Alta mar', 'Ártico', 'Selva'],
  };
  function especialidadAzar(fam) {
    if (fam === 'Otras lenguas') return uno(ESPECIALIDADES[fam].concat(['Español', 'Ruso', 'Chino', 'Japonés', 'Portugués', 'Hebreo']).filter(x => x !== A.datos.lengua));
    const l = ESP_AZAR[fam] || (ESPECIALIDADES[fam] || []).map(x => Array.isArray(x) ? x[0] : x);
    return uno(l.length ? l : ['General']);
  }
  const hueco = sel => ({ sel, esp: sel.endsWith('(*)') ? especialidadAzar(sel.slice(0, -4)) : '' });
  // n elementos de xs sin repetir, con más probabilidad cuanto más peso(x)
  function elegirPeso(xs, n, peso) {
    const resto = [...xs], r = [];
    while (r.length < n && resto.length) {
      let t = d(resto.reduce((s, x) => s + peso(x), 0));
      const i = resto.findIndex(x => (t -= peso(x)) <= 0);
      r.push(...resto.splice(i, 1));
    }
    return r;
  }
  // Lo que suele servir en una partida: 3, lo corriente: 2, lo que casi nunca se tira: 1
  const UTILES = ['Descubrir', 'Buscar libros', 'Psicología', 'Escuchar', 'Persuasión', 'Charlatanería', 'Encanto', 'Intimidar', 'Combatir',
    'Armas de fuego', 'Esquivar', 'Primeros auxilios', 'Medicina', 'Ciencias ocultas', 'Historia', 'Sigilo', 'Conducir automóvil', 'Otras lenguas',
    'Ciencia', 'Derecho', 'Antropología', 'Arqueología', 'Informática'];
  const POCO_UTILES = ['Tasación', 'Lanzar', 'Saltar', 'Trepar', 'Nadar', 'Equitación', 'Juego de manos', 'Conducir maquinaria', 'Seguir rastros',
    'Contabilidad', 'Electricidad', 'Mecánica', 'Cerrajería', 'Disfrazarse', 'Lengua propia', 'Orientarse', 'Naturaleza', 'Supervivencia', 'Electrónica'];
  const utilidad = n => { const fam = n.replace(/ \(.*$/, ''); return UTILES.includes(fam) ? 3 : POCO_UTILES.includes(fam) ? 1 : 2; };
  // Lo que se puede elegir «a tu elección», sin las habilidades raras
  const libresAzar = () => opcionesHabilidad().filter(n => !HABILIDADES.some(x => x.rara && (x.n === n || `${x.n} (*)` === n)));
  // Reparte `total` puntos de 10 en 10 entre `nombres`, sin pasar de `tope`: más a las útiles, nada a las que ya
  // empiezan altas (Lengua propia), y lo que no llega a 10 a una que ya tenga puntos
  function repartirAzar(reparto, total, nombres, actual, tope) {
    const peso = Object.fromEntries(nombres.map(n => [n, actual(n) >= 60 ? 0 : utilidad(n) * d(6) * d(6)]));
    let quedan = total;
    while (quedan > 0) {
      const p = Math.min(10, quedan);
      let libres = nombres.filter(n => peso[n] && actual(n) + (reparto[n] || 0) + p <= tope);
      if (p < 10 && libres.some(n => reparto[n])) libres = libres.filter(n => reparto[n]);
      if (!libres.length) break;
      let r = d(libres.reduce((s, n) => s + peso[n], 0));
      const n = libres.find(x => (r -= peso[x]) <= 0);
      reparto[n] = (reparto[n] || 0) + p;
      quedan -= p;
    }
  }
  // Tiradas que dan un personaje corriente: nada por debajo de 30, como mucho dos por debajo de 50 (el criterio
  // de la opción 1 del Manual del Guardián para volver a tirar), POD de 40 o más y una suma razonable
  function tiradasJugables() {
    const k8 = CARS.filter(k => k !== A.principal), v = k => A.tiradas[k].total;
    const sumaT = CARS.reduce((s, k) => s + v(k), 0) - (pulp() ? v(A.principal) - 50 : 0);
    return k8.every(k => v(k) >= 30) && k8.filter(k => v(k) < 50).length <= 2 && v('POD') >= 40 && sumaT >= 420 && sumaT <= 540;
  }
  function ocupacionAzar() {
    const ops = sis().ocup.filter(x => !x.actual || A.epoca === 'actual');
    const a = arquetipo();
    if (a && d(4) > 1) {  // en Pulp, casi siempre una de las que sugiere el arquetipo
      const sug = a.ocupaciones.toLowerCase().split(/,\s*/).map(x => x.split(/[ /]/)[0]);
      const afines = ops.filter(o => sug.includes(o.n.toLowerCase().split(/[ /]/)[0]));
      if (afines.length) return uno(afines).n;
    }
    return uno(ops).n;
  }
  // [lo que sale, ejemplos] de las tablas de trasfondo → una frase con uno de los ejemplos
  function textoTabla(x) {
    if (!x[1] || /^(elige|pide|habla)/.test(x[1])) return x[0] + '.';
    const ej = uno(x[1].replace(/…$/, '').split(/,\s*|\s+o\s+/)).trim();
    if (x[0].includes('¿')) return x[0].replace(/\.?\s*¿[^?]*\?\s*$/, '') + ': ' + ej + '.';
    return `${x[0]} (${ej}).`;
  }
  const FEMENINO = { Padre: 'Madre', Abuelo: 'Abuela', Hermano: 'Hermana', Hijo: 'Hija', Pareja: 'Pareja' };
  function trasfondoAzar(persona) {
    const P = pulp(), T = P ? TRASFONDO_PULP : TRASFONDO, a = arquetipo();
    const desc = P ? [uno(T.descripcion[persona.g === 'F' ? 'Femenino' : 'Masculino']), uno(T.descripcion.Unisex)] : barajar(TRASFONDO.descripcion).slice(0, 2);
    const quien = uno(T.allegadosQuien);
    let otra = personaAlAzar(null, persona.cultura);
    while (otra.nombre === persona.nombre) otra = personaAlAzar(null, persona.cultura);
    const allegado = quien[0] in FEMENINO ? `${otra.g === 'F' ? FEMENINO[quien[0]] : quien[0]}, ${otra.nombre}.` : textoTabla(quien);
    const mayus = t => t.replace(/^./, c => c.toUpperCase());
    return {
      descripcion: mayus(desc.join(', ').toLowerCase()),
      ideologia: textoTabla(uno(T.ideologia)),
      allegados: `${allegado} ${textoTabla(uno(TRASFONDO.allegadosPorque))}`,
      lugares: textoTabla(uno((P && T.lugares) || TRASFONDO.lugares)),
      posesiones: textoTabla(uno((P && T.posesiones) || TRASFONDO.posesiones)),
      rasgos: P ? mayus(a && d(2) === 1 ? uno(a.rasgos) : uno(uno(T.rasgos))) + '.' : textoTabla(uno(TRASFONDO.rasgos)),
    };
  }
  const RESIDENCIAS = ['Arkham, Massachusetts', 'Boston', 'Nueva York', 'Providence', 'Chicago', 'Londres', 'París', 'Madrid', 'Barcelona', 'Berlín', 'El Cairo', 'Buenos Aires', 'San Francisco'];

  function generarAzar(sistema) {
    A = Object.assign(inicial(), { sistema, metodo: 'tiradas' });
    const persona = personaAlAzar();
    const nacio = uno(persona.cultura.ciudades);
    A.datos = { Nombre: persona.completo, Jugador: '', Género: persona.g === 'F' ? 'Femenino' : 'Masculino',
      Nacimiento: nacio, Residencia: d(2) === 1 ? nacio : uno(RESIDENCIAS), lengua: persona.cultura.lengua };
    if (pulp()) {
      const a = uno(ARQUETIPOS);
      A.arquetipo = a.n;
      A.principal = uno(a.principal);
    }
    A.edad = 17 + d(12) + d(12) + d(10);  // de 20 a 51, sin las penalizaciones fuertes de la vejez
    do A.tiradas = Object.fromEntries(CARS.map(k => [k, tirar(dadosDe(k))])); while (!tiradasJugables());
    if (pulp()) {
      A.suerte = [tirar('2D6+6')];
      const a = arquetipo(), tablas = Object.keys(TALENTOS);
      if (a.talento) A.talentos.push(a.talento);
      while (A.talentos.length < 2) { const x = TALENTOS[tablas[d(4) - 1]][d(10) - 1][0]; if (!A.talentos.includes(x)) A.talentos.push(x); }
      if (A.talentos.includes('Poder psíquico')) A.talentoExtra.psiquico = uno(PULP.psiquicos);
      if (A.talentos.includes('Erudición')) A.talentoExtra.erudicion = uno(ESP_AZAR.Conocimiento).toLowerCase();
      if (A.talentos.includes('Recarga rápida')) A.talentoExtra.recarga = uno(['Arma corta', 'Fusil/Escopeta']);
    } else {
      const t = tramo();
      for (let q = t.resta; q > 0; q -= 5) {  // de 5 en 5, casi siempre a la que más tiene en ese momento
        const queda = j => base(j) - (A.ajuste[j] || 0);
        const k = elegirPeso(t.entre, 1, j => Math.max(1, queda(j) - 25) ** 2)[0];
        A.ajuste[k] = (A.ajuste[k] || 0) + Math.min(5, q);
      }
      if (t.mejoras) tirarMejoras();
      A.suerte = [tirar('3D6'), tirar('3D6')];
    }

    A.ocupacion = ocupacionAzar();
    huecosDef().forEach((hd, i) => {
      const usadas = new Set(A.huecos.map(resuelta));
      for (let intento = 0; intento < 40; intento++) {
        const hu = hueco(typeof hd !== 'string' ? uno(hd) : hd === 'interpersonal' ? uno(INTERPERSONALES) : hd === 'cualquiera' ? elegirPeso(libresAzar(), 1, n => utilidad(n) ** 2)[0] : hd);
        if (!usadas.has(resuelta(hu))) { A.huecos[i] = hu; break; }
      }
    });
    const o = ocupacion(), f = finales(), ocup = habOcupacion();
    const cr = o.cr[0] + Math.round((o.cr[1] - o.cr[0]) * (d(6) + d(6) - 2) / 10);  // más cerca del centro del margen
    A.ocupPuntos['Crédito'] = cr;
    const sin = reparto => n => (valores()[n] ?? bh(n, f)) - (reparto[n] || 0);
    repartirAzar(A.ocupPuntos, puntosOcupacion() - cr, ocup, sin(A.ocupPuntos), 80);
    if (pulp()) {
      const ops = opcionesArquetipo().map(n => n.endsWith('(*)') ? (ocup.find(x => x.startsWith(n.slice(0, -3))) || resuelta(hueco(n))) : n);
      repartirAzar(A.arqPuntos, PULP.puntosArquetipo, elegirPeso(ops, 2 + d(2), n => utilidad(n) ** 2), sin(A.arqPuntos), 90);
    }
    // Intereses: unas pocas útiles, y siempre algo con que defenderse
    const intereses = new Set(elegirPeso(libresAzar().filter(n => !n.endsWith('(*)')), 2 + d(2), n => utilidad(n) ** 3));
    intereses.add(uno(['Combatir (Pelea)', 'Combatir (Pelea)', 'Armas de fuego (Arma corta)', 'Armas de fuego (Fusil/Escopeta)']));
    if (d(2) === 1) intereses.add('Esquivar');
    if (d(4) === 1) intereses.add(resuelta(hueco('Otras lenguas (*)')));
    repartirAzar(A.interes, f.INT * 2, [...intereses], sin(A.interes), 75);

    A.tras = trasfondoAzar(persona);
    A.vinculo = uno(['ideologia', 'allegados', 'lugares', 'posesiones']);
    return pasos().every(p => p.ok() === true);
  }
  async function alAzar(sistema) {
    await Generador.listo;
    leer();
    const guardado = A;
    try {
      let bien = false;
      for (let i = 0; i < 30 && !bien; i++) bien = generarAzar(sistema);
      if (bien) crearFicha(true);
      else alert('No ha salido un personaje válido; vuelve a intentarlo.');
    } finally { A = guardado; }
  }

  // ------------------------------------------------------------ marco del diálogo
  function pie() {
    const z = $('#asis-pie-msg');
    if (!z) return;
    const r = pasos()[A.paso].ok();
    z.textContent = r === true ? '' : r;
    $('#asis-sig').disabled = r !== true || A.paso === pasos().length - 1;
    document.querySelectorAll('.asis-pasos button').forEach((b, i) => { b.disabled = i > A.visto && i !== A.paso; });
  }
  function pintar() {
    const dlg = $('#d-asistente');
    dlg.textContent = '';
    const cuerpo = h('div', { class: 'asis-cuerpo' });
    dlg.append(h('div', { class: 'asis' },
      h('form', { method: 'dialog', class: 'gen-dialogo-cab' }, h('h2', null, 'Asistente · ' + sis().nombre),
        h('button', { class: 'gen-cerrar', 'aria-label': 'Cerrar' }, '×')),
      h('ol', { class: 'asis-pasos' }, pasos().map((p, i) => h('li', null, h('button', { type: 'button',
        'aria-current': i === A.paso ? 'step' : null, onclick: () => ir(i) }, `${i + 1}. ${p.t}`)))),
      cuerpo,
      h('div', { class: 'asis-pie' },
        h('button', { type: 'button', class: 'gen-boton', disabled: A.paso === 0, onclick: () => ir(A.paso - 1) }, 'Anterior'),
        h('span', { id: 'asis-pie-msg', class: 'asis-aviso', style: 'margin:0;align-self:center;text-align:center;flex:1' }),
        h('button', { type: 'button', class: 'gen-boton principal', id: 'asis-sig', onclick: () => ir(A.paso + 1) }, 'Siguiente'))));
    pasos()[A.paso].pintar(cuerpo);
    const actual = dlg.querySelector('[aria-current=step]');
    if (actual) actual.scrollIntoView({ block: 'nearest', inline: 'center' });
    pie();
  }
  function ir(i) {
    if (i < 0 || i >= pasos().length) return;
    for (let j = A.paso; j < i; j++) if (pasos()[j].ok() !== true) { i = j; break; }  // no se salta un paso a medias
    A.paso = i;
    A.visto = Math.max(A.visto, i);
    guardar();
    pintar();
    $('.asis-cuerpo').scrollTop = 0;
  }

  async function abrir() {
    await Generador.listo;
    leer();
    if (A.paso >= pasos().length) A.paso = 0;
    pintar();
    $('#d-asistente').showModal();
  }
  document.querySelector('#b-asistente').addEventListener('click', abrir);
  document.querySelector('#b-azar-coc').addEventListener('click', () => alAzar('coc'));
  document.querySelector('#b-azar-pulp').addEventListener('click', () => alAzar('pulp'));
  return { abrir, alAzar };
})();
