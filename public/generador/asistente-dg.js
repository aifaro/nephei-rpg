// Asistente de creación de agentes de Delta Green, paso a paso según el capítulo «Agents» del
// Agent's Handbook (y Delta Green: Confidencial en español): agencia y unidad, profesión,
// características, habilidades con bonificación, trasfondo de veterano, Lazos, motivaciones y equipo.
// Al final crea una ficha nueva en el editor con Generador.crear('dg', …).
'use strict';

(() => {
  const { h, regla, nota, d, suma } = AsisComun;
  const CARS = DG.caracteristicas;
  const AH = pag => `Agent's Handbook, pág. ${pag}`;

  function inicial() {
    return {
      paso: 0, visto: 0, metodo: 'tiradas', tiradas: null, conjunto: 0, asig: {}, puntos: {},
      agencia: '', unidad: null, otraAgencia: '', profesion: '', alt: {}, eleccion: [], esp: {},
      bonus: Array.from({ length: DG.bonificaciones }, () => ({ sel: '', esp: '' })), paquete: '',
      rasgos: {}, veterano: 'nuevo', dura: Array.from({ length: 5 }, () => ({ sel: '', esp: '' })), trastorno: '',
      lazos: [], motivaciones: ['', '', '', '', ''],
      datos: { Nombre: '', rango: '', Nacionalidad: 'Estadounidense', genero: '', generoTexto: '', edad: '', nacimiento: '', Educación: '', descripcion: '' },
      detalles: { admira: '', disgusta: '', confia: '', acepta: '' },
      armas: [], proteccion: '', equipo: '', formacion: [{ n: '', hab: '' }, { n: '', hab: '' }], oficial: '',
    };
  }

  // ------------------------------------------------------------ reglas aplicadas
  const agencia = () => AGENCIAS_DG.find(a => a.sigla === asis.A.agencia) || null;
  const unidad = () => { const a = agencia(); return a && asis.A.unidad != null ? a.unidades[asis.A.unidad] : null; };
  const unidadPropia = () => { const u = unidad(); return u && !Array.isArray(u.prof) ? u.prof : null; };
  const profesionesPosibles = () => { const u = unidad(); return u && Array.isArray(u.prof) ? u.prof : PROFESIONES_DG.map(p => p.n); };
  const profesion = () => unidadPropia() || PROFESIONES_DG.find(p => p.n === asis.A.profesion && profesionesPosibles().includes(p.n)) || null;

  const familia = n => /^(.+?) \(/.exec(n) ? /^(.+?) \(/.exec(n)[1] : n;
  const base = n => HABILIDADES_DG[familia(n)] ?? 0;
  const libre = n => n.endsWith('(*)');
  function resolver(n, esp) {  // 'Ciencia (*)' + 'física' → 'Ciencia (Física)'
    if (!libre(n)) return n;
    const e = (esp || '').trim();
    if (!e) return null;
    const fam = n.slice(0, -4);
    const sug = (ESPECIALIDADES_DG[fam] || []).find(x => x.toLowerCase() === e.toLowerCase());
    return `${fam} (${sug || e.replace(/^./, c => c.toUpperCase())})`;
  }

  // Habilidades profesionales: [{n, v, clave}] ya con las especialidades y elecciones resueltas
  function habProfesion() {
    const p = profesion();
    if (!p) return [];
    const res = [];
    p.hab.forEach((x, i) => {
      const [n, v] = x.uno ? x.uno[asis.A.alt[i] || 0] : x;
      res.push({ n: resolver(n, asis.A.esp['h' + i]), v, clave: 'h' + i, crudo: n });
    });
    if (p.elige) for (const j of asis.A.eleccion) {
      const x = p.elige.de[j];
      if (x) res.push({ n: resolver(x[0], asis.A.esp['e' + j]), v: x[1], clave: 'e' + j, crudo: x[0] });
    }
    return res;
  }
  const opcionesBonus = () => Object.keys(HABILIDADES_DG).filter(n => n !== 'Antinatural')
    .map(n => n in ESPECIALIDADES_DG ? n + ' (*)' : n);

  function caracteristicas() {  // las asignadas, antes del trasfondo de veterano
    const c = {};
    if (asis.A.metodo === 'puntos') for (const k of CARS) c[k] = +asis.A.puntos[k] || null;
    else {
      const vals = valoresAsignables();
      for (const k of CARS) c[k] = asis.A.asig[k] != null && vals ? vals[asis.A.asig[k]] : null;
    }
    return c;
  }
  const valoresAsignables = () => asis.A.metodo === 'tiradas' ? (asis.A.tiradas ? asis.A.tiradas.map(t => t.total) : null) : DG.conjuntos[asis.A.conjunto][1];
  function finales() {
    const c = caracteristicas();
    if (asis.A.veterano === 'violencia' && c.CAR) c.CAR = Math.max(1, c.CAR - 3);
    if (asis.A.veterano === 'cautiverio' && c.POD) c.POD = Math.max(1, c.POD - 3);
    return c;
  }
  function derivados() {
    const c0 = caracteristicas(), c = finales();
    let cor = (c0.POD || 0) * 5;
    if (['violencia', 'cautiverio', 'dura'].includes(asis.A.veterano)) cor -= 5;
    if (asis.A.veterano === 'cosas') cor -= c.POD || 0;
    return { PS: Math.ceil(((c.FUE || 0) + (c.CON || 0)) / 2), PV: c.POD || 0, COR: cor, PR: cor - (c.POD || 0), corMax: 99 - valores()['Antinatural'] };
  }
  const numLazos = () => { const p = profesion(); return p ? Math.max(0, p.lazos - (asis.A.veterano === 'dura' ? 1 : 0)) : 0; };

  // Valor final de cada habilidad que se ha tocado: profesión, +20 de bonificación y veterano
  function valores({ sinVeterano } = {}) {
    const v = {};
    for (const x of habProfesion()) if (x.n) v[x.n] = Math.max(v[x.n] ?? 0, x.v);
    for (const b of asis.A.bonus) {
      const n = b.sel && resolver(b.sel, b.esp);
      if (n) v[n] = (v[n] ?? base(n)) + 20;
    }
    if (!sinVeterano) {
      const vet = asis.A.veterano;
      if (vet !== 'nuevo') v['Ocultismo'] = (v['Ocultismo'] ?? base('Ocultismo')) + (vet === 'cosas' ? 20 : 10);
      if (vet === 'cosas') v['Antinatural'] = (v['Antinatural'] ?? 0) + 10;
      if (vet === 'dura') for (const b of asis.A.dura) {
        const n = b.sel && resolver(b.sel, b.esp);
        if (n) v[n] = Math.min(90, (v[n] ?? base(n)) + 10);
      }
    }
    v['Antinatural'] = v['Antinatural'] ?? 0;
    return v;
  }

  // ------------------------------------------------------------ piezas
  // Una habilidad (con especialidad si hace falta) elegida de una lista
  function selectorHab(obj, opciones, alCambiar, etiqueta) {
    const caja = h('span', { class: 'asis-hab' });
    caja.append(h('select', { 'aria-label': etiqueta || 'Habilidad', onchange: e => { obj.sel = e.target.value; obj.esp = ''; alCambiar(true); } },
      h('option', { value: '' }, '— elige —'), opciones.map(o => h('option', { value: o, selected: obj.sel === o }, o.replace(' (*)', ' (especialidad)')))));
    if (obj.sel && libre(obj.sel)) caja.append(campoEsp(obj.sel, obj.esp, v => { obj.esp = v; alCambiar(false); }));
    return caja;
  }
  function campoEsp(n, valor, alEscribir) {
    const fam = n.slice(0, -4), id = 'dg-esp-' + fam.replace(/\W/g, '');
    return h('span', null, h('input', { type: 'text', placeholder: fam === 'Idioma extranjero' ? 'idioma' : 'especialidad', value: valor || '', list: id,
      'aria-label': `Especialidad de ${fam}`, oninput: e => alEscribir(e.target.value) }),
      h('datalist', { id }, (ESPECIALIDADES_DG[fam] || []).map(x => h('option', { value: x }))));
  }
  const textoHab = ([n, v]) => `${n.replace(' (*)', ' (a elegir)')} ${v} %`;
  const cambio = rehacer => { asis.guardar(); if (rehacer) { asis.mismoPaso = true; asis.pintar(); } else asis.pie(); };

  // ------------------------------------------------------------ pasos
  const PASOS = [
    { t: 'Empezar', pintar: pasoEmpezar, ok: () => true },
    { t: 'Agencia', pintar: pasoAgencia, ok: okAgencia },
    { t: 'Profesión', pintar: pasoProfesion, ok: okProfesion },
    { t: 'Características', pintar: pasoCaracteristicas, ok: okCaracteristicas },
    { t: 'Habilidades con bonificación', pintar: pasoBonus, ok: okBonus },
    { t: '¿Qué te ha traído?', pintar: pasoVeterano, ok: okVeterano },
    { t: 'Lazos y motivaciones', pintar: pasoLazos, ok: okLazos },
    { t: 'Datos personales', pintar: pasoDatos, ok: () => true },
    { t: 'Equipo y armas', pintar: pasoEquipo, ok: () => true },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];

  function pasoEmpezar(c) {
    c.append(h('h3', null, 'Un agente nuevo'),
      h('p', null, 'El asistente sigue la creación de agentes del Agent\'s Handbook (la versión resumida en español está en Delta Green: Confidencial). Puedes ir y volver entre los pasos: lo que tires y elijas queda guardado en este navegador hasta que crees la ficha.'),
      regla('Pregunta antes al Supervisor por la partida: la época, si todos sois de la misma agencia o profesión («todos sois de la DEA»), y poneos de acuerdo para formar un equipo interesante.', AH(14)),
      h('h4', null, 'Características'),
      asis.radios('metodo', [
        ['tiradas', 'Tirar los dados', 'Para cada característica, 4D6 quitando el dado más bajo. Luego colocas las seis tiradas donde quieras.'],
        ['conjunto', 'Un conjunto fijo', 'Equilibrado (13, 13, 12, 12, 11, 11), centrado (15, 14, 12, 11, 10, 10) o muy centrado (17, 14, 12, 10, 10, 9).'],
        ['puntos', 'Repartir 72 puntos', 'Entre las seis características, como quieras (de 3 a 18 cada una).'],
      ], () => { asis.A.asig = {}; }),
      nota('La mayoría de los adultos tienen 10 u 11 en cada característica; por debajo de 6 o por encima de 15 es raro.'));
  }

  function pasoAgencia(c) {
    const A = asis.A, a = agencia();
    c.append(h('h3', null, 'Agencia'),
      regla('La mayoría de los agentes vienen del FBI, la CIA o el Mando de Operaciones Especiales; los demás, de agencias con acceso a conocimientos, equipo o ámbitos de actuación útiles. Cada agencia dice si su gente puede detener, si se espera que vaya armada, a qué fondos llega y qué recursos especiales puede pedir; cada unidad sugiere profesiones, habilidades con bonificación y equipo.', AH(104)),
      h('label', null, 'Agencia: ', h('select', { onchange: e => asis.cambia(A => { A.agencia = e.target.value; A.unidad = null; A.profesion = ''; A.alt = {}; A.eleccion = []; A.esp = {}; }) },
        h('option', { value: '' }, '— elige —'),
        ['Fuerzas del orden', 'Defensa', 'Inteligencia y diplomacia', 'Seguridad pública'].map(t => h('optgroup', { label: t },
          AGENCIAS_DG.filter(x => x.tipo === t).map(x => h('option', { value: x.sigla, selected: x.sigla === A.agencia }, `${x.sigla} · ${x.n}`)))),
        h('optgroup', { label: 'Otra' }, h('option', { value: 'otra', selected: A.agencia === 'otra' }, 'Otra agencia, empresa o ninguna')))));
    if (A.agencia === 'otra') {
      c.append(h('p', null, h('label', null, 'Compañía o agencia: ', h('input', { type: 'text', value: A.otraAgencia, placeholder: 'ATF, una universidad, la policía de Boston…',
        oninput: e => { A.otraAgencia = e.target.value; asis.guardar(); } }))),
        nota('Cualquier profesión vale. Otras agencias que menciona el manual: ' + OTRAS_AGENCIAS_DG.map(([s, t]) => `${s} (${t.split(':')[0]})`).join('; ') + '.'));
      return;
    }
    if (!a) return;
    c.append(h('p', null, h('em', null, a.resumen)),
      h('dl', { class: 'asis-dato' },
        h('dt', null, '¿Puede detener?'), h('dd', null, a.arresto),
        h('dt', null, '¿Va armado?'), h('dd', null, a.arma),
        h('dt', null, '¿Fondos oficiales?'), h('dd', null, a.fondos),
        h('dt', null, 'Presupuesto y material restringido'), h('dd', null, a.recursos)),
      h('h4', null, 'Unidad u oficina'),
      h('div', { class: 'asis-tarjetas' }, a.unidades.map((u, i) => h('label', null,
        h('input', { type: 'radio', name: 'dg-unidad', checked: A.unidad === i, onchange: () => asis.cambia(A => {
          A.unidad = i; A.alt = {}; A.eleccion = []; A.esp = {};
          A.profesion = Array.isArray(u.prof) && u.prof.length === 1 ? u.prof[0] : '';
        }) }),
        h('span', null, h('strong', null, u.n), h('small', null, u.texto),
          h('small', null, 'Profesión: ' + (Array.isArray(u.prof) ? u.prof.join(', ') : `propia (${u.prof.n})`) + '. Bonificación sugerida: ' + u.bonus.map(x => x.replace(' (*)', '')).join(', ') + '.'))))),
      a.nota ? nota(a.nota) : null);
  }
  function okAgencia() {
    if (!asis.A.agencia) return 'Elige una agencia (o «Otra»).';
    if (asis.A.agencia !== 'otra' && asis.A.unidad == null) return 'Elige la unidad u oficina.';
    return true;
  }

  function pasoProfesion(c) {
    const A = asis.A, u = unidad(), propia = unidadPropia();
    c.append(h('h3', null, 'Profesión'),
      regla('La profesión es la decisión más importante: da un «equipo» de habilidades cuyos valores sustituyen a los básicos y fija cuántos Lazos tiene el agente. Las profesiones exigentes dan más habilidades y menos Lazos.', AH(20)));
    if (!propia) {
      const posibles = profesionesPosibles();
      c.append(h('label', null, 'Profesión: ', h('select', { onchange: e => asis.cambia(A => { A.profesion = e.target.value; A.alt = {}; A.eleccion = []; A.esp = {}; }) },
        h('option', { value: '' }, '— elige —'),
        posibles.map(n => { const p = PROFESIONES_DG.find(x => x.n === n); return h('option', { value: n, selected: n === A.profesion }, n + (p.adicional ? ' (adicional)' : '')); }))));
      if (u) c.append(nota(`Para ${u.n}, el manual sugiere: ${posibles.join(', ')}.`));
      else c.append(nota('«Adicional» = profesiones poco habituales en Delta Green: que no haya más de una o dos en el equipo.'));
    } else c.append(h('p', null, `${u.n} tiene sus propias habilidades profesionales: `, h('strong', null, propia.n), '.'));
    const p = profesion();
    if (!p) return;
    if (p.texto) c.append(h('p', null, h('em', null, p.texto)));
    c.append(h('p', null, h('strong', null, 'Características recomendadas: '), (p.stats || []).map(k => DG.nombres[k]).join(', ') + ' (10 o más, al menos cuando empezó en el trabajo). ',
      h('strong', null, 'Lazos: '), p.lazos + '.'));
    if (p.nota) c.append(nota(p.nota));

    c.append(h('h4', null, 'Habilidades profesionales'));
    const lista = h('ul', { class: 'asis-dados asis-columnas' });
    p.hab.forEach((x, i) => {
      if (x.uno) {
        lista.append(h('li', null, x.uno.map(([n, v], j) => h('label', { style: 'margin-right:1rem' }, h('input', { type: 'radio', name: 'dg-alt' + i, checked: (A.alt[i] || 0) === j,
          onchange: () => asis.cambia(A => { A.alt[i] = j; }) }), ` ${n} ${v} %`))));
        return;
      }
      lista.append(h('li', null, textoHab(x), libre(x[0]) ? [' ', campoEsp(x[0], A.esp['h' + i], v => { A.esp['h' + i] = v; cambio(false); })] : null));
    });
    c.append(lista);
    if (p.elige) {
      const tiene = new Set(habProfesion().filter(x => x.clave.startsWith('h')).map(x => x.n));
      c.append(h('h4', null, `Elige ${p.elige.n}${p.elige.nuevas ? ' que no tengas ya' : ''}`));
      const t = h('div', { class: 'asis-tarjetas' });
      p.elige.de.forEach((x, j) => {
        const marcada = A.eleccion.includes(j);
        const repetida = p.elige.nuevas && !libre(x[0]) && tiene.has(x[0]);
        t.append(h('label', null, h('input', { type: 'checkbox', checked: marcada, disabled: !marcada && (repetida || A.eleccion.length >= p.elige.n),
          onchange: e => asis.cambia(A => { A.eleccion = e.target.checked ? [...A.eleccion, j] : A.eleccion.filter(k => k !== j); }) }),
          h('span', null, textoHab(x), marcada && libre(x[0]) ? h('small', null, campoEsp(x[0], A.esp['e' + j], v => { A.esp['e' + j] = v; cambio(false); })) : null)));
      });
      c.append(t);
    }
  }
  function okProfesion() {
    const p = profesion();
    if (!p) return 'Elige una profesión.';
    if (p.elige && asis.A.eleccion.length !== p.elige.n) return `Elige ${p.elige.n} de la lista.`;
    const hs = habProfesion();
    if (hs.some(x => !x.n)) return 'Falta escribir alguna especialidad.';
    if (p.elige && p.elige.nuevas) {
      const fijas = hs.filter(x => x.clave.startsWith('h')).map(x => x.n);
      if (hs.filter(x => x.clave.startsWith('e')).some(x => fijas.includes(x.n))) return 'Las elegidas tienen que ser habilidades que no tengas ya.';
    }
    return true;
  }

  function pasoCaracteristicas(c) {
    const A = asis.A, p = profesion();
    c.append(h('h3', null, 'Características'));
    if (p) c.append(nota(`Como ${p.n}, conviene tener 10 o más en ${(p.stats || []).join(', ')}. Una característica baja también puede contar algo: un policía que perdió FUE por una lesión de espalda.`));
    if (A.metodo === 'puntos') {
      c.append(regla('Reparte 72 puntos entre las seis características, como quieras. Cada una va de 3 a 18.', AH(15)));
      const resto = h('p');
      const act = () => {
        const q = DG.puntos - suma(CARS.map(k => A.puntos[k] || 0));
        resto.className = q === 0 ? 'asis-ok' : 'asis-aviso';
        resto.textContent = q === 0 ? 'Repartidos los 72.' : q > 0 ? `Quedan ${q} puntos.` : `Te has pasado ${-q} puntos.`;
      };
      c.append(h('div', { class: 'asis-cars' }, CARS.map(k => h('label', { class: 'asis-car' }, h('b', null, `${k} · ${DG.nombres[k]}`),
        h('input', { type: 'number', min: 3, max: 18, value: A.puntos[k] || '', oninput: e => { A.puntos[k] = parseInt(e.target.value, 10) || null; asis.guardar(); act(); asis.pie(); } })))), resto);
      act();
    } else {
      if (A.metodo === 'tiradas') {
        c.append(regla('Para cada característica tira 4D6, quita el dado más bajo y suma los otros tres. Después coloca las seis tiradas en las características que quieras.', AH(14)));
        if (!A.tiradas) {
          c.append(h('button', { type: 'button', class: 'gen-boton principal', onclick: () => asis.cambia(A => {
            A.tiradas = Array.from({ length: 6 }, () => { const dados = [d(6), d(6), d(6), d(6)]; const min = Math.min(...dados); return { dados, total: suma(dados) - min }; });
            A.asig = {};
          }) }, 'Tirar los dados'));
          return;
        }
        c.append(h('ul', { class: 'asis-dados' }, A.tiradas.map((t, i) => h('li', null, `Tirada ${i + 1}: ${t.dados.join(', ')} → quitando el ${Math.min(...t.dados)}, ${t.total}`))),
          h('p', null, h('button', { type: 'button', class: 'gen-boton', onclick: () => { if (confirm('¿Volver a tirar? Hazlo solo si el Supervisor lo permite.')) asis.cambia(A => { A.tiradas = null; A.asig = {}; }); } }, 'Volver a tirar')));
      } else {
        c.append(regla('Elige un conjunto y asigna cada valor a una característica.', AH(19)),
          h('div', { class: 'asis-opciones' }, DG.conjuntos.map(([n, vs], i) => h('label', null, h('input', { type: 'radio', name: 'dg-conj', checked: A.conjunto === i,
            onchange: () => asis.cambia(A => { A.conjunto = i; A.asig = {}; }) }), h('span', null, h('strong', null, n), h('small', null, vs.join(', ')))))));
      }
      const vals = valoresAsignables();
      c.append(h('h4', null, 'Asignar'), h('div', { class: 'asis-cars' }, CARS.map(k => {
        const usados = new Set(CARS.filter(j => j !== k && A.asig[j] != null).map(j => A.asig[j]));
        return h('label', { class: 'asis-car' }, h('b', null, `${k} · ${DG.nombres[k]}`),
          h('select', { onchange: e => asis.cambia(A => { A.asig[k] = e.target.value === '' ? null : +e.target.value; }) }, h('option', { value: '' }, '—'),
            vals.map((v, i) => usados.has(i) ? null : h('option', { value: i, selected: A.asig[k] === i }, v))));
      })));
    }
    // Rasgos distintivos
    const f = caracteristicas();
    if (CARS.every(k => f[k])) {
      c.append(h('h4', null, 'Rasgos distintivos'),
        regla('Una característica por debajo de 9 o por encima de 12 destaca: descríbela con una palabra o dos. Así empieza a verse el agente.', AH(18)));
      for (const k of CARS) {
        const v = f[k];
        const i = v <= 4 ? 0 : v <= 8 ? 1 : v >= 17 ? 3 : v >= 13 ? 2 : null;
        if (i == null) continue;
        if (A.rasgos[k] == null) A.rasgos[k] = DG.rasgos[k][i];
        c.append(h('p', null, h('label', null, `${DG.nombres[k]} ${v}: `, h('input', { type: 'text', value: A.rasgos[k], oninput: e => { A.rasgos[k] = e.target.value; asis.guardar(); } }))));
      }
    }
  }
  function okCaracteristicas() {
    const A = asis.A, f = caracteristicas();
    if (A.metodo === 'tiradas' && !A.tiradas) return 'Falta tirar los dados.';
    if (!CARS.every(k => f[k])) return 'Falta dar un valor a cada característica.';
    if (A.metodo === 'puntos') {
      if (CARS.some(k => f[k] < 3 || f[k] > 18)) return 'Cada característica va de 3 a 18.';
      if (suma(CARS.map(k => f[k])) !== DG.puntos) return 'Tienen que sumar 72.';
    }
    return true;
  }

  function pasoBonus(c) {
    const A = asis.A, u = unidad();
    c.append(h('h3', null, 'Habilidades con bonificación'),
      regla('Elige ocho habilidades (cualquiera salvo Antinatural) y súmales 20 puntos a cada una: a su valor de profesión si es profesional y, si no, a su valor básico. Puedes repetir una habilidad para sumarle +20 más de una vez. Ninguna puede empezar por encima del 80 %.', AH(20)));
    if (u) c.append(h('p', null, h('strong', null, `Sugeridas para ${u.n}: `), u.bonus.map(x => x.replace(' (*)', '')).join(', ') + '. ',
      h('button', { type: 'button', class: 'gen-boton mini', onclick: () => asis.cambia(A => {
        let i = 0;
        for (const n of u.bonus) { while (i < A.bonus.length && A.bonus[i].sel) i++; if (i < A.bonus.length) A.bonus[i] = { sel: n, esp: '' }; }
      }) }, 'Ponerlas')));
    c.append(h('p', null, h('label', null, 'O un paquete según lo que hacía antes: ', h('select', { onchange: e => asis.cambia(A => {
      A.paquete = e.target.value;
      const pq = PAQUETES_DG.find(x => x.n === A.paquete);
      if (!pq) return;
      const hs = pq.hab.map(x => typeof x === 'string' ? x : x.uno[0]);
      A.bonus = Array.from({ length: DG.bonificaciones }, (_, i) => ({ sel: hs[i] || '', esp: '' }));
    }) }, h('option', { value: '' }, '— ninguno —'), PAQUETES_DG.map(pq => h('option', { value: pq.n, selected: A.paquete === pq.n }, pq.n))))));
    const pq = PAQUETES_DG.find(x => x.n === A.paquete);
    if (pq) c.append(nota([pq.elige ? `Elige además ${pq.elige.n} de: ${pq.elige.de.join(', ').replace(/ \(\*\)/g, '')}.` : '',
      pq.libres ? `${pq.libres === 1 ? 'Una más' : pq.libres + ' más'} a tu elección, como especialidad personal.` : '',
      pq.hab.some(x => x.uno) ? 'El primero puede ser Antropología o Arqueología.' : ''].filter(Boolean).join(' ') || `Paquete «${pq.n}» (${AH(26)}).`));

    const v = valores({ sinVeterano: true });
    // Además de las de la lista, las especialidades que ya tiene y las que trae el paquete («Oficio (Electricista)»)
    const opciones = [...new Set(opcionesBonus().concat(habProfesion().map(x => x.n), A.bonus.map(b => b.sel)).filter(n => n && (!/\(/.test(n) || libre(n) || n in v || A.bonus.some(b => b.sel === n))))];
    const tb = h('tbody');
    A.bonus.forEach((b, i) => {
      const n = b.sel && resolver(b.sel, b.esp);
      tb.append(h('tr', { class: n && v[n] > DG.maximoInicial ? 'mal' : '' }, h('td', { class: 'n' }, i + 1),
        h('td', null, selectorHab(b, opciones, cambio, `Bonificación ${i + 1}`)),
        h('td', { class: 'n' }, n ? `+20 → ${v[n]} %` : '')));
    });
    c.append(h('table', { class: 'asis-tabla' }, tb));
  }
  function okBonus() {
    const A = asis.A;
    if (A.bonus.some(b => !b.sel)) return 'Elige las ocho bonificaciones.';
    if (A.bonus.some(b => !resolver(b.sel, b.esp))) return 'Falta alguna especialidad.';
    const v = valores({ sinVeterano: true });
    const pasadas = Object.entries(v).filter(([, x]) => x > DG.maximoInicial).map(([n]) => n);
    if (pasadas.length) return `Ninguna habilidad puede empezar por encima de 80 %: ${pasadas.join(', ')}.`;
    return true;
  }

  function pasoVeterano(c) {
    const A = asis.A;
    c.append(h('h3', null, '¿Qué te ha traído a Delta Green?'),
      regla('Si el agente ya es parte de Delta Green, algo antinatural del pasado llamó la atención del grupo y le convenció para unirse. No hace falta contar qué pasó (guárdalo para compartir historias terribles con tus compañeros), pero elige una opción y pacta los detalles con el Supervisor. Para agentes más veteranos, el Supervisor puede pedir que se haga más de una vez.', AH(38)),
      h('div', { class: 'asis-tarjetas' }, VETERANOS_DG.map(x => h('label', null, h('input', { type: 'radio', name: 'dg-vet', checked: A.veterano === x.k,
        onchange: () => asis.cambia(A => { A.veterano = x.k; }) }), h('span', null, h('strong', null, x.n), h('small', null, x.texto))))));
    if (A.veterano === 'dura') {
      c.append(h('h4', null, '+10 % a cinco habilidades'));
      const v = valores();
      A.dura.forEach((b, i) => {
        const n = b.sel && resolver(b.sel, b.esp);
        c.append(h('p', null, `${i + 1}. `, selectorHab(b, opcionesBonus(), cambio, `Experiencia dura ${i + 1}`), n ? h('span', { class: 'gen-nota' }, ` → ${v[n]} %`) : null));
      });
      c.append(nota('Ninguna puede pasar de 90 %. Al quitar un Lazo, en el paso siguiente tendrás uno menos.'));
    }
    if (A.veterano === 'cosas') {
      c.append(h('h4', null, 'Trastorno causado por lo antinatural'),
        h('p', null, h('input', { type: 'text', value: A.trastorno, list: 'dg-trastornos', placeholder: 'p. ej. trastorno de estrés postraumático', style: 'width:100%',
          oninput: e => { A.trastorno = e.target.value; asis.guardar(); asis.pie(); } }), h('datalist', { id: 'dg-trastornos' }, TRASTORNOS_DG.map(x => h('option', { value: x })))),
        nota('Ocupa el lugar de una de las cinco motivaciones (Agent\'s Handbook, pág. 72).'));
    }
    if (CARS.every(k => finales()[k])) {
      const dv = derivados(), f = finales();
      c.append(h('h4', null, 'Así queda'), h('div', { class: 'asis-cars' },
        [['PS', dv.PS, '(FUE+CON)/2'], ['PV', dv.PV, 'POD'], ['COR', dv.COR, 'POD×5' + (A.veterano === 'nuevo' ? '' : ' con la pérdida')], ['Punto de Ruptura', dv.PR, 'COR − POD'],
          ['CAR', f.CAR, ''], ['POD', f.POD, '']].map(([k, x, s]) => h('div', { class: 'asis-car' }, h('b', null, k), h('span', { class: 'v' }, x), h('small', null, s)))));
    }
  }
  function okVeterano() {
    const A = asis.A;
    if (A.veterano === 'dura') {
      if (A.dura.some(b => !b.sel || !resolver(b.sel, b.esp))) return 'Elige las cinco habilidades.';
      const ns = A.dura.map(b => resolver(b.sel, b.esp));
      if (new Set(ns).size !== 5) return 'Tienen que ser cinco habilidades distintas.';
    }
    if (A.veterano === 'cosas' && !A.trastorno.trim()) return 'Escribe el trastorno.';
    return true;
  }

  function pasoLazos(c) {
    const A = asis.A, n = numLazos(), car = finales().CAR;
    while (A.lazos.length < n) A.lazos.push({ n: '' });
    c.append(h('h3', null, 'Lazos'),
      regla(`Un Lazo es una de las relaciones humanas más importantes del agente: una persona concreta, o un grupo pequeño tan unido que lo que pasa con uno afecta a todos. Tiene que estar vivo y poder tratarse con él. Cada Lazo empieza con el CAR del agente (${car}). Tu profesión da ${n === 1 ? 'un Lazo' : n + ' Lazos'}${A.veterano === 'dura' ? ' (uno menos por la experiencia dura)' : ''}. Dales un nombre y una relación: «Taylor, el exmarido».`, AH(36)));
    const ejemplos = h('div', { class: 'asis-chips' }, LAZOS_DG.map(([t, g]) => h('button', { type: 'button', title: g, onclick: () => {
      const i = A.lazos.slice(0, n).findIndex(x => !x.n.trim());
      if (i < 0) return;
      A.lazos[i].n = t + ': ';
      asis.cambia(() => {});
    } }, t)));
    c.append(nota('Ejemplos (pulsa para usarlo en el primer hueco libre):'), ejemplos);
    for (let i = 0; i < n; i++) c.append(h('p', null, h('label', null, `Lazo ${i + 1}: `, h('input', { type: 'text', value: A.lazos[i].n, style: 'width:min(28rem,100%)',
      oninput: e => { A.lazos[i].n = e.target.value; asis.guardar(); asis.pie(); } })), h('span', { class: 'gen-nota' }, ` valor ${car}`)));
    c.append(h('h3', null, 'Motivaciones'),
      regla('Además de los Lazos, ¿qué hace que el agente se levante por las mañanas? Fe, patriotismo, una afición, un perro… Hasta cinco motivaciones; puedes dejarlas para cuando vaya saliendo la personalidad en la partida. Cada vez que llegue a su Punto de Ruptura, una se sustituye por un trastorno.', AH(38)),
      h('div', { class: 'asis-chips' }, MOTIVACIONES_DG.map(t => h('button', { type: 'button', onclick: () => {
        const i = A.motivaciones.findIndex(x => !x.trim());
        if (i >= 0) { A.motivaciones[i] = t; asis.cambia(() => {}); }
      } }, t))));
    const huecos = A.veterano === 'cosas' ? 4 : 5;
    for (let i = 0; i < huecos; i++) c.append(h('p', null, h('input', { type: 'text', value: A.motivaciones[i], style: 'width:min(28rem,100%)', 'aria-label': `Motivación ${i + 1}`,
      oninput: e => { A.motivaciones[i] = e.target.value; asis.guardar(); } })));
    if (A.veterano === 'cosas') c.append(nota(`El quinto hueco lo ocupa el trastorno: ${A.trastorno}.`));
  }
  function okLazos() {
    if (asis.A.lazos.slice(0, numLazos()).some(x => !x.n.trim())) return 'Describe cada Lazo.';
    return true;
  }

  function pasoDatos(c) {
    const A = asis.A, D = A.datos;
    const campo = (k, t, ph) => h('label', null, t, h('input', { type: 'text', value: D[k] || '', placeholder: ph || '', oninput: e => { D[k] = e.target.value; asis.guardar(); } }));
    c.append(h('h3', null, 'Datos personales'),
      regla('Usa un nombre que suene real: evita los tópicos y las gracias. Delta Green suele reclutar a gente de más de treinta años, ya asentada en carreras exigentes, y casi todos tienen estudios superiores: ¿dónde estudió y qué?', 'Delta Green: Confidencial, pág. 11; ' + AH(37)),
      h('div', { class: 'asis-rejilla' }, campo('Nombre', 'Apellido, nombre, alias o nombre en clave', 'Massim, Yusuf («Agente Daryl»)'),
        campo('rango', 'Rango o cargo (si procede)', 'Agente especial, capitán…'), campo('Nacionalidad', 'Nacionalidad'),
        campo('edad', 'Edad'), campo('nacimiento', 'Fecha de nacimiento'),
        h('label', null, 'Género', h('select', { onchange: e => { D.genero = e.target.value; asis.cambia(() => {}); } },
          [['', '—'], ['F', 'F'], ['M', 'M'], ['otro', 'Otro']].map(([v, t]) => h('option', { value: v, selected: D.genero === v }, t))))),
      D.genero === 'otro' ? h('p', null, campo('generoTexto', 'Cuál: ')) : null,
      h('p', null, h('label', null, 'Educación y vida laboral', h('textarea', { value: D.Educación, placeholder: 'Licenciado en Informática; cuatro años en el ejército…', oninput: e => { D.Educación = e.target.value; asis.guardar(); } }))),
      h('p', null, h('label', null, 'Descripción física', h('textarea', { value: D.descripcion, placeholder: 'Pelo negro y bigote; siempre desaliñado.', oninput: e => { D.descripcion = e.target.value; asis.guardar(); } }))),
      h('h4', null, 'Para acabar de verlo'),
      regla('No intentes hacer el agente perfecto: lo que lo hace memorable son los detalles. Van en «Detalles y notas personales» de la ficha.', AH(37)));
    for (const [k, t] of [['admira', '¿Qué admiras de tu agente?'], ['disgusta', '¿Qué te disgusta de tu agente?'],
      ['confia', '¿Por qué confía Delta Green en tu agente para enfrentarse a lo antinatural y guardar el secreto?'], ['acepta', '¿Por qué acepta ayudar a Delta Green, pese a todo?']]) {
      c.append(h('p', null, h('label', null, t, h('textarea', { value: A.detalles[k], oninput: e => { A.detalles[k] = e.target.value; asis.guardar(); } }))));
    }
  }

  function pasoEquipo(c) {
    const A = asis.A, u = unidad(), v = valores(), f = finales();
    const kit = u && u.equipo ? EQUIPO_DG[u.equipo] : '';
    c.append(h('h3', null, 'Equipo y armas'),
      regla('El Supervisor puede dar por hecho que el agente lleva el equipo normal de su profesión; apunta lo concreto. Si lleva protección corporal, anota sus puntos.', 'Delta Green: Confidencial, pág. 15'));
    if (kit || (u && u.equipoExtra)) c.append(h('p', null, h('strong', null, `Lo habitual en ${u.n}: `), [kit, u.equipoExtra].filter(Boolean).join(' ')),
      h('p', null, h('button', { type: 'button', class: 'gen-boton mini', onclick: () => { A.equipo = [A.equipo.trim(), kit, u.equipoExtra].filter(Boolean).join('\n'); asis.cambia(() => {}); } }, 'Copiarlo al equipo')));
    c.append(h('label', null, 'Protección corporal: ', h('select', { onchange: e => { A.proteccion = e.target.value; asis.guardar(); } }, h('option', { value: '' }, 'ninguna'),
      PROTECCION_DG.map(([n, p]) => h('option', { value: `${n} (protección ${p})`, selected: A.proteccion === `${n} (protección ${p})` }, `${n} · ${p}`)))),
      h('p', null, h('label', null, 'Equipo', h('textarea', { rows: 5, value: A.equipo, oninput: e => { A.equipo = e.target.value; asis.guardar(); } }))),
      h('h4', null, 'Armas (hasta siete)'));
    const tb = h('tbody');
    A.armas.forEach((i, j) => {
      const a = ARMAS_DG[i];
      const pct = a[1] === 'DES×5' ? f.DES * 5 : (v[a[1]] ?? base(a[1]));
      tb.append(h('tr', null, h('td', null, a[0]), h('td', null, `${a[1]} ${pct} %`), h('td', null, [a[2], a[3], a[4] && `letalidad ${a[4]}`, a[5] && `perforante ${a[5]}`].filter(Boolean).join(' · ')),
        h('td', null, h('button', { type: 'button', class: 'gen-boton mini', onclick: () => asis.cambia(A => { A.armas.splice(j, 1); }) }, 'Quitar'))));
    });
    c.append(h('table', { class: 'asis-tabla' }, tb));
    if (A.armas.length < 7) c.append(h('p', null, h('select', { 'aria-label': 'Añadir un arma', onchange: e => { if (e.target.value !== '') asis.cambia(A => { A.armas.push(+e.target.value); }); } },
      h('option', { value: '' }, '+ añadir un arma'), ARMAS_DG.map((a, i) => h('option', { value: i }, `${a[0]} (${a[1]})`)))));
    c.append(nota('Los datos son los de la tabla de armas del Agent\'s Handbook (págs. 96-98); el porcentaje sale de la habilidad del agente.'),
      h('h4', null, 'Formación especial'),
      regla('Saberes que no llegan a habilidad: abrir cerraduras (DES), bucear (Natación), saltar en paracaídas o lanzar granadas (Atletismo)… Solo si el Supervisor dice que el agente la tiene.', 'Delta Green: Confidencial, pág. 15'));
    A.formacion.forEach((x, i) => c.append(h('p', null, h('input', { type: 'text', value: x.n, placeholder: 'formación', 'aria-label': `Formación ${i + 1}`, oninput: e => { x.n = e.target.value; asis.guardar(); } }), ' ',
      h('input', { type: 'text', value: x.hab, placeholder: 'habilidad o característica', 'aria-label': `Habilidad de la formación ${i + 1}`, oninput: e => { x.hab = e.target.value; asis.guardar(); } }))));
    c.append(h('p', null, h('label', null, 'Oficial que lo autoriza: ', h('input', { type: 'text', value: A.oficial, placeholder: 'nombre en clave del oficial de control', oninput: e => { A.oficial = e.target.value; asis.guardar(); } }))));
  }

  function pasoResumen(c) {
    const A = asis.A, f = finales(), dv = derivados(), v = valores(), p = profesion(), a = agencia(), u = unidad();
    c.append(h('h3', null, A.datos.Nombre || 'Tu agente'),
      h('p', null, [p && p.n, a ? `${a.sigla} · ${u.n}` : A.otraAgencia, VETERANOS_DG.find(x => x.k === A.veterano).n].filter(Boolean).join(' · ')),
      h('h4', null, 'Características'), h('p', null, CARS.map(k => `${k} ${f[k]}`).join(' · ')),
      h('p', null, `PS ${dv.PS} · PV ${dv.PV} · COR ${dv.COR} (máx. ${dv.corMax}) · Punto de Ruptura ${dv.PR}`),
      h('h4', null, 'Habilidades que no están en su base'),
      h('div', { class: 'asis-resumen' }, Object.entries(v).filter(([n, x]) => x !== base(n)).sort((x, y) => x[0].localeCompare(y[0], 'es')).map(([n, x]) => h('div', null, `${n} ${x} %`))),
      h('h4', null, 'Lazos'), h('p', null, A.lazos.slice(0, numLazos()).map(x => `${x.n} (${f.CAR})`).join(' · ') || '—'),
      nota('Al crear la ficha se abre como personaje nuevo en el editor; lo que tengas abierto ahora se queda en «Mis personajes».'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: crearFicha }, 'Crear la ficha')));
  }

  // ------------------------------------------------------------ de aquí a la ficha
  const DOS_LINEAS = ['Arte', 'Ciencia', 'Ciencia militar', 'Oficio', 'Pilotaje'];
  function crearFicha(azar) {
    const A = asis.A, f = finales(), dv = derivados(), v = valores(), p = profesion(), a = agencia(), u = unidad(), D = A.datos;
    const cp = {};
    const pon = (n, x) => { if (x != null && x !== '') cp[n] = String(x); };
    pon('Nombre', D.Nombre);
    pon('Profesión', p.n + (D.rango.trim() ? ` (${D.rango.trim()})` : ''));
    pon('Agencia', a ? `${a.sigla} · ${u.n}` : A.otraAgencia);
    pon('Nacionalidad', D.Nacionalidad);
    if (D.genero === 'F') cp['Género F'] = true;
    if (D.genero === 'M') cp['Género M'] = true;
    if (D.genero === 'otro') { cp['Género otro'] = true; pon('Género', D.generoTexto); }
    pon('Edad', [D.edad, D.nacimiento && `(${D.nacimiento})`].filter(Boolean).join(' '));
    pon('Educación', D.Educación.replace(/\s*\n\s*/g, '. '));
    pon('Descripción física', D.descripcion);
    for (const k of CARS) {
      pon(k, f[k]);
      pon(k + ' rasgo', A.rasgos[k]);
    }
    pon('COR actual', dv.COR);
    pon('PR actual', dv.PR);

    // Habilidades: las impresas en su fila; las especialidades en las dos líneas de su familia; idiomas y lo que sobre, en las libres
    const otras = [], notas = [];
    for (const n of Object.keys(HABILIDADES_DG)) if (!(n in ESPECIALIDADES_DG) && (v[n] ?? HABILIDADES_DG[n])) pon(n, v[n] ?? HABILIDADES_DG[n]);  // los 0 % se dejan en blanco
    const usadas = {};
    for (const [n, x] of Object.entries(v).sort((a, b) => b[1] - a[1])) {
      const fam = familia(n);
      if (n === fam) continue;
      const esp = n.slice(fam.length + 2, -1);
      if (DOS_LINEAS.includes(fam) && (usadas[fam] || 0) < 2) {
        const i = usadas[fam] = (usadas[fam] || 0) + 1;
        pon(`${fam} ${i} (nombre)`, esp);
        pon(`${fam} ${i}`, x);
      } else otras.push([fam === 'Idioma extranjero' ? `Idioma (${esp})` : n, x]);
    }
    otras.forEach(([n, x], i) => { if (i < 6) { pon(`Otra ${i + 1} (nombre)`, n); pon(`Otra ${i + 1}`, x); } else notas.push(`${n} ${x} %`); });

    A.lazos.slice(0, numLazos()).forEach((x, i) => pon(`Lazo ${i + 1}`, x.n.replace(/:\s*$/, '')));
    const mot = A.motivaciones.slice(0, A.veterano === 'cosas' ? 4 : 5).filter(x => x.trim());
    if (A.veterano === 'cosas') mot.push(`Trastorno: ${A.trastorno.trim()}`);
    pon('Motivaciones', mot.join('\n'));
    if (A.veterano === 'violencia') [1, 2, 3].forEach(i => { cp[`Violencia ${i}`] = true; });
    if (A.veterano === 'cautiverio') [1, 2, 3].forEach(i => { cp[`Indefensión ${i}`] = true; });

    pon('Equipo', [A.proteccion, A.equipo.trim()].filter(Boolean).join('\n'));
    A.armas.slice(0, 7).forEach((i, j) => {
      const w = ARMAS_DG[i], l = 'abcdefg'[j];
      pon(`Arma ${l}`, w[0]);
      pon(`Arma ${l} hab`, w[1] === 'DES×5' ? f.DES * 5 : (v[w[1]] ?? base(w[1])));
      pon(`Arma ${l} alcance`, w[2]); pon(`Arma ${l} daño`, w[3]); pon(`Arma ${l} letalidad`, w[4]);
      pon(`Arma ${l} perforante`, w[5]); pon(`Arma ${l} radio`, w[6]); pon(`Arma ${l} munición`, w[7]);
    });
    A.formacion.filter(x => x.n.trim()).slice(0, 6).forEach((x, i) => { pon(`Formación ${i + 1}`, x.n); pon(`Formación ${i + 1} habilidad`, x.hab); });
    pon('Oficial', A.oficial);
    const det = [['Lo que admiro', A.detalles.admira], ['Lo que me disgusta', A.detalles.disgusta],
      ['Por qué confía Delta Green', A.detalles.confia], ['Por qué acepta', A.detalles.acepta]]
      .filter(([, t]) => t.trim()).map(([k, t]) => `${k}: ${t.trim()}`);
    if (A.veterano !== 'nuevo') det.push(`Llegó a Delta Green por: ${VETERANOS_DG.find(x => x.k === A.veterano).n.toLowerCase()}.`);
    if (notas.length) det.push('Otras habilidades: ' + notas.join(', ') + '.');
    pon('Detalles', det.join('\n'));

    Generador.crear('dg', { campos: cp });
    if (azar === true) return;
    if (confirm('Ficha creada. ¿Vaciar el asistente para crear otro agente más adelante?')) asis.reiniciar();
    document.querySelector('#d-asistente').close();
  }

  // ------------------------------------------------------------ agente al azar
  // Recorre los pasos del asistente eligiendo al azar entre lo que permiten las reglas y comprueba cada
  // paso con su ok(). El estado guardado del asistente no se toca.
  const uno = xs => xs[d(xs.length) - 1];
  const barajar = xs => { const r = [...xs]; for (let i = r.length - 1; i > 0; i--) { const j = d(i + 1) - 1; [r[i], r[j]] = [r[j], r[i]]; } return r; };
  // Una especialidad para 'Familia (*)' que no dé una habilidad que ya está en `usadas`
  function espAzar(n, usadas) {
    if (!libre(n)) return '';
    let e = '';
    for (let i = 0; i < 20; i++) { e = uno(ESPECIALIDADES_DG[n.slice(0, -4)]); if (!usadas || !usadas.has(resolver(n, e))) break; }
    return e;
  }
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
  // Bonificaciones: lo que suele servir en una operación pesa más que lo que casi nunca se tira
  const UTILES_DG = ['Alerta', 'Búsqueda', 'HUMINT', 'Persuasión', 'Armas de fuego', 'Esquiva', 'Primeros auxilios', 'Sigilo', 'Conducción',
    'Ocultismo', 'Burocracia', 'Criminología', 'Combate sin armas', 'Informática', 'Medicina', 'Psicoterapia', 'Ciencia forense', 'SIGINT',
    'Idioma extranjero (*)', 'Historia', 'Derecho', 'Atletismo'];
  const POCO_UTILES_DG = ['Montar', 'Maquinaria pesada', 'Artillería', 'Natación', 'Disfraz', 'Contabilidad', 'Supervivencia', 'Orientación',
    'Demoliciones', 'Armas pesadas', 'Pilotaje (*)', 'Arte (*)', 'Ciencia militar (*)', 'Cirugía'];
  const utilidad = n => UTILES_DG.includes(n) ? 9 : POCO_UTILES_DG.includes(n) ? 1 : 3;
  function lazoAzar(tipo, cultura) {
    const x = personaAlAzar(null, cultura), F = x.g === 'F', otro = () => personaAlAzar(null, cultura).nombre;
    return {
      'Cónyuge o excónyuge': `${x.nombre}, ${F ? uno(['su esposa', 'su exmujer']) : uno(['su marido', 'su exmarido'])}`,
      'Hijo o hija': `${x.nombre}, ${F ? 'su hija' : 'su hijo'}`,
      'Padre, madre o abuelo preferido': `${x.nombre}, ${F ? uno(['su madre', 'su abuela']) : uno(['su padre', 'su abuelo'])}`,
      'Mejor amigo': `${personaAlAzar(x.g).completo}, ${F ? 'su mejor amiga' : 'su mejor amigo'}`,
      'Compañero de trabajo': `${personaAlAzar(x.g).completo}, ${F ? 'compañera' : 'compañero'} de trabajo`,
      'Psicólogo o terapeuta': `${F ? 'La doctora' : 'El doctor'} ${personaAlAzar(x.g).apellido}, su terapeuta`,
      'Cónyuge e hijos': `Su familia: ${x.nombre} y ${d(2) === 1 ? `su ${uno(['hijo', 'hija'])} ${otro()}` : `los niños, ${otro()} y ${otro()}`}`,
      'Padres': `Sus padres, ${personaAlAzar('M', cultura).nombre} y ${personaAlAzar('F', cultura).nombre}`,
      'Hermanos': `Sus hermanos, ${otro()} y ${otro()}`,
      'Compañeros de un trabajo muy duro': uno(['Los de su antigua unidad', 'Su vieja brigada', 'Los compañeros de la plataforma petrolífera', 'Su antiguo equipo de urgencias']),
      'Iglesia o grupo de apoyo': uno(['Su parroquia', 'Su grupo de apoyo de los jueves', 'Su congregación', 'Alcohólicos Anónimos']),
      'Supervivientes de un trauma compartido': uno(['Los otros supervivientes del accidente', 'Los que salieron con vida del incendio', 'Los rehenes del banco']),
    }[tipo] || tipo;
  }
  function descripcionAzar(F) {
    const o = F ? 'a' : 'o';
    return `${uno(['Alt', 'Baj', 'Delgad', 'Corpulent', 'Fibros', 'Robust', 'Desgarbad'])}${o}, pelo ${uno(['castaño', 'negro', 'rubio', 'canoso', 'pelirrojo'])} ${uno(['corto', 'largo', 'rapado', 'recogido', 'ralo'])}; ` +
      uno(['gafas de montura metálica', 'una cicatriz en la barbilla', 'ojeras permanentes', 'la ropa siempre arrugada', 'un tatuaje en el antebrazo', 'voz grave y pausada', 'sonrisa fácil', 'mirada cansada', 'manos de trabajador']) + '.';
  }

  function generarAzar() {
    asis.A = inicial();
    const A = asis.A;
    // Agencia y unidad; de vez en cuando, otra de las que menciona el manual
    if (d(10) === 1) {
      A.agencia = 'otra';
      A.otraAgencia = uno(OTRAS_AGENCIAS_DG)[0];
      A.profesion = uno(PROFESIONES_DG.filter(x => !x.adicional || d(3) === 1)).n;
    } else {
      const a = uno(AGENCIAS_DG);
      A.agencia = a.sigla;
      A.unidad = d(a.unidades.length) - 1;
      if (!unidadPropia()) A.profesion = uno(profesionesPosibles());
    }
    const p = profesion(), usadas = new Set();
    p.hab.forEach((x, i) => {
      if (x.uno) A.alt[i] = d(x.uno.length) - 1;
      const n = x.uno ? x.uno[A.alt[i]][0] : x[0];
      if (libre(n)) A.esp['h' + i] = espAzar(n, usadas);
      usadas.add(resolver(n, A.esp['h' + i]));
    });
    if (p.elige) {
      const ops = barajar(p.elige.de.map((_, j) => j)).filter(j => !(p.elige.nuevas && !libre(p.elige.de[j][0]) && usadas.has(p.elige.de[j][0])));
      A.eleccion = ops.slice(0, p.elige.n);
      for (const j of A.eleccion) if (libre(p.elige.de[j][0])) A.esp['e' + j] = espAzar(p.elige.de[j][0], usadas);
    }

    // Características: lo más alto, en las recomendadas para la profesión
    const orden = [...barajar(p.stats || []), ...barajar(CARS.filter(k => !(p.stats || []).includes(k)))];
    A.metodo = uno(['tiradas', 'tiradas', 'tiradas', 'conjunto', 'conjunto', 'puntos']);
    if (A.metodo === 'puntos') {
      const v = Object.fromEntries(CARS.map(k => [k, 12]));
      for (let i = 0; i < 20; i++) {
        const de = uno(orden.slice(-3).filter(k => v[k] > 8)), a = uno(orden.slice(0, 3).filter(k => v[k] < 17).concat(CARS.filter(k => v[k] < 15)));
        if (de && a && de !== a) { v[de]--; v[a]++; }
      }
      A.puntos = v;
    } else {
      // Tiradas sin extremos: entre 66 y 80 en total y nada por debajo de 7 (como si el Supervisor dejara repetirlas)
      if (A.metodo === 'tiradas') do A.tiradas = Array.from({ length: 6 }, () => { const dados = [d(6), d(6), d(6), d(6)]; return { dados, total: suma(dados) - Math.min(...dados) }; });
      while (suma(A.tiradas.map(x => x.total)) < 66 || suma(A.tiradas.map(x => x.total)) > 80 || A.tiradas.some(x => x.total < 7));
      else A.conjunto = d(DG.conjuntos.length) - 1;
      const vals = valoresAsignables();
      const porValor = vals.map((x, i) => i).sort((i, j) => vals[j] - vals[i]);
      orden.forEach((k, i) => { A.asig[k] = porValor[i]; });
    }
    const c = caracteristicas();
    for (const k of CARS) {
      const i = c[k] <= 4 ? 0 : c[k] <= 8 ? 1 : c[k] >= 17 ? 3 : c[k] >= 13 ? 2 : null;
      if (i != null) A.rasgos[k] = DG.rasgos[k][i];
    }

    // Ocho bonificaciones: el paquete o las sugeridas por la unidad, y el resto entre las de la profesión y las demás
    const u = unidad(), pq = d(4) === 1 ? uno(PAQUETES_DG) : null;
    let primeras = [];
    if (pq) { A.paquete = pq.n; primeras = pq.hab.map(x => typeof x === 'string' ? x : uno(x.uno)); }
    else if (u && d(3) > 1) primeras = barajar(u.bonus);
    const deProfesion = habProfesion().map(x => x.n);
    A.bonus.forEach((b, i) => {
      const ops = [primeras[i], ...barajar((pq && pq.elige && pq.elige.de) || []), ...(d(2) === 1 ? barajar(deProfesion) : []),
        ...elegirPeso(opcionesBonus(), 99, utilidad)].filter(Boolean);
      for (const sel of ops) {
        const ya = libre(sel) && deProfesion.find(n => familia(n) === sel.slice(0, -4));  // mejor subir una especialidad que ya tiene
        A.bonus[i] = { sel, esp: ya && d(2) === 1 ? ya.slice(familia(ya).length + 2, -1) : espAzar(sel) };
        if (Object.values(valores({ sinVeterano: true })).every(x => x <= DG.maximoInicial)) break;
      }
    });

    // Lo que le trajo a Delta Green
    A.veterano = uno(['nuevo', 'nuevo', 'nuevo', 'violencia', 'cautiverio', 'dura', 'cosas']);
    if (A.veterano === 'cosas' && caracteristicas().POD < 11) A.veterano = 'nuevo';
    if (A.veterano === 'violencia' && caracteristicas().CAR < 10) A.veterano = 'nuevo';    // ni sin CAR para sus Lazos
    if (A.veterano === 'cautiverio' && caracteristicas().POD < 10) A.veterano = 'nuevo';  // con poco POD se quedaría casi sin COR
    if (A.veterano === 'dura') {
      const ya = new Set();
      A.dura = elegirPeso(opcionesBonus(), 5, utilidad).map(sel => { const esp = espAzar(sel, ya); ya.add(resolver(sel, esp)); return { sel, esp }; });
    }
    if (A.veterano === 'cosas') A.trastorno = uno(TRASTORNOS_DG);

    // Datos personales, Lazos y motivaciones
    const yo = personaAlAzar();
    A.datos = Object.assign(A.datos, { Nombre: `${yo.apellido}, ${yo.nombre}`, genero: yo.g, edad: String(25 + d(10) + d(10) + d(10)), descripcion: descripcionAzar(yo.g === 'F') });
    A.datos.nacimiento = `${String(d(28)).padStart(2, '0')}/${String(d(12)).padStart(2, '0')}/${new Date().getFullYear() - A.datos.edad - 1}`;
    A.lazos = barajar(LAZOS_DG).slice(0, numLazos()).map(([t]) => ({ n: lazoAzar(t, yo.cultura) }));
    A.motivaciones = barajar(MOTIVACIONES_DG).slice(0, Math.min(1 + d(3), A.veterano === 'cosas' ? 4 : 5)).concat(['', '', '', '', '']).slice(0, 5);

    // Equipo: el de la unidad y armas según sus habilidades
    if (u && (u.equipo || u.equipoExtra)) A.equipo = [u.equipo && EQUIPO_DG[u.equipo], u.equipoExtra].filter(Boolean).join('\n');
    const v = valores(), arma = n => ARMAS_DG.findIndex(x => x[0] === n);
    if ((agencia() && agencia().arma.startsWith('Sí')) || v['Armas de fuego'] >= 40) A.armas.push(arma(uno(['Pistola mediana', 'Pistola mediana', 'Pistola pesada', 'Revólver (mediano)'])));
    if (v['Armas de fuego'] >= 50 && d(2) === 1) A.armas.push(arma(uno(['Fusil ligero o carabina', 'Escopeta (perdigones)', 'Subfusil'])));
    if (v['Armas cuerpo a cuerpo'] >= 40) A.armas.push(arma(uno(['Cuchillo grande o daga de combate', 'Porra o defensa'])));
    return PASOS.every(x => x.ok() === true);
  }
  async function alAzar() {
    await Generador.listo;
    const guardado = asis.A;
    try {
      let bien = false;
      for (let i = 0; i < 30 && !bien; i++) bien = generarAzar();
      if (bien) crearFicha(true);
      else alert('No ha salido un agente válido; vuelve a intentarlo.');
    } finally { asis.A = guardado; }
  }

  const asis = AsisComun.marco({ clave: 'nephei-generador-asistente-dg-v1', inicial, pasos: () => PASOS, titulo: () => 'Asistente · Delta Green' });
  document.querySelector('#b-azar').addEventListener('click', alAzar);
})();
