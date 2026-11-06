// Asistente de creación de Vieja Escuela: el juego de rol, en el orden del capítulo I del manual: atributos, raza,
// clase, habilidades, trasfondo, equipo y últimos toques. Al final crea una ficha nueva en el editor con
// Generador.crear('ve', …). El manual empieza siempre en Nivel 1; se deja elegir otro (La Bestia de Farton es para Nivel 3)
// aplicando lo que dice «Subir de Nivel»: un Dado de Aguante y 2 puntos de habilidad por Nivel.
'use strict';

(() => {
  const { h, regla, nota, d, suma, leerRetrato } = AsisComun;
  const MANUAL = pag => `Vieja Escuela, edición revisada, pág. ${pag}`;
  const signo = v => (v >= 0 ? '+' : '-') + Math.abs(v);
  const uno = xs => xs[d(xs.length) - 1];
  const barajar = xs => { const r = [...xs]; for (let i = r.length - 1; i > 0; i--) { const j = d(i + 1) - 1; [r[i], r[j]] = [r[j], r[i]]; } return r; };

  function inicial() {
    return {
      paso: 0, visto: 0,
      tiradas: null, asig: {},
      raza: '', femenino: false, clase: '', nivel: 1, lucha: '', dadosPV: [],
      hab: {}, trasfondos: ['', ''], trasfondo11: '',
      oro: null, armas: [], armadura: '', escudo: false, cosas: {},
      datos: { Nombre: '' }, ambiciones: '', foto: null,
    };
  }

  // ------------------------------------------------------------ reglas aplicadas
  const raza = () => RAZAS_VE.find(x => x.n === asis.A.raza) || null;
  const clase = () => CLASES_VE.find(x => x.n === asis.A.clase) || null;
  const valor = k => { const A = asis.A; return A.tiradas && A.asig[k] != null ? A.tiradas[A.asig[k]].total : null; };
  const mod = k => { const v = valor(k); return v == null ? 0 : modVE(v); };
  const fila = () => AVANCE_VE[clase().clave][asis.A.nivel - 1];
  const talentos = () => {
    const r = raza(), c = clase(), A = asis.A;
    if (!r || !c) return [];
    const t = [...r.talentos, ...c.talentos.map(x => x === 'Lucha con X' ? `Lucha con ${A.lucha || 'X'}` : x)];
    if (A.nivel >= 6) t.push(c.talento6);
    return t;
  };
  const tieneImpetu = () => !!raza() && raza().talentos.includes('Ímpetu Emprendedor');
  const numTrasfondos = () => (tieneImpetu() ? 2 : 1);
  const puntosHab = () => 4 + 2 * (asis.A.nivel - 1);
  const maxHab = () => Math.min(10, asis.A.nivel);
  const pv = () => { const c = clase(); return c ? Math.max(1, c.da + mod('CON') + suma(asis.A.dadosPV.slice(0, asis.A.nivel - 1))) : 0; };
  const ins = () => fila()[2] + (raza() && raza().talentos.includes('Adaptable') ? 1 : 0);
  const pod = () => { const b = fila()[1]; return b ? Math.max(0, b + mod('INT')) : 0; };
  const mov = () => { const a = armaduraElegida(); const base = raza() ? raza().mov : 12; return a && a[0] === 'Placas' ? Math.min(base, 6) : base; };

  const arma = n => ARMAS_VE.find(a => a[0] === n);
  const armaduraElegida = () => ARMADURAS_VE.find(a => a[0] === asis.A.armadura) || null;
  const def = () => 10 + mod('DES') + (armaduraElegida() ? armaduraElegida()[1] : 0) + (asis.A.escudo ? ESCUDO_VE[1] : 0);
  const puedeArma = n => { const c = clase(); return !c || !c.armas || c.armas.includes(n); };
  const costeTotal = () => {
    const A = asis.A;
    return suma(A.armas.map(n => arma(n)[2])) + (armaduraElegida() ? armaduraElegida()[2] : 0) + (A.escudo ? ESCUDO_VE[2] : 0)
      + suma(EQUIPO_VE.map(e => e[1] * (A.cosas[e[0]] || 0)));
  };
  const queda = () => (asis.A.oro ? asis.A.oro.total * MO : 0) - costeTotal();
  const moneda = mc => {
    const mo = Math.floor(mc / MO), mp = Math.floor((mc % MO) / MP), c = mc % MP, r = [];
    if (mo) r.push(`${mo} mo`);
    if (mp) r.push(`${mp} mp`);
    if (c || !r.length) r.push(`${c} mc`);
    return r.join(' ');
  };
  // Un bulto por objeto; los pequeños se agrupan (el manual no dice cuántos: aquí, de cinco en cinco)
  const bultos = () => {
    const A = asis.A;
    let pequenos = 0, grandes = A.armas.length + (A.armadura ? 1 : 0) + (A.escudo ? 1 : 0);
    for (const e of EQUIPO_VE) { const n = A.cosas[e[0]] || 0; if (e[2]) pequenos += n; else grandes += n; }
    return grandes + Math.ceil(pequenos / 5);
  };

  // ATQ y daño de un arma, con FUE o DES, y «Lucha con X» y Certero donde tocan
  function usos(n) {
    const a = arma(n), A = asis.A, base = fila()[0], res = [];
    const dano = (b) => {  // «1d4+1» con +1 es «1d4+2»
      const [dado, fijo] = a[1].split('+');
      const t = (+fijo || 0) + b;
      return dado + (t ? signo(t) : '');
    };
    const manos = a[3];
    const dosManosIguales = A.armas.filter(x => arma(x)[3] === 1).length >= 2;
    const luchaCaC = (A.lucha === 'armas a dos manos' && manos === 2) || (A.lucha === 'arma de mano y escudo' && manos === 1 && A.escudo) || (A.lucha === 'dos armas de mano' && manos === 1 && dosManosIguales);
    if (manos > 0) {
      const l = luchaCaC ? 1 : 0;
      res.push({ n: n + (a[4] ? ' (cuerpo a cuerpo)' : n === 'Bastón' ? ' (a dos manos)' : ''), dano: dano(mod('FUE') + l), notas: `ATQ ${signo(base + mod('FUE') + l)}` });
    }
    if (a[4]) {
      const extra = (A.lucha === 'armas de proyectiles' ? 1 : 0) + (raza() && raza().talentos.includes('Certero') ? 1 : 0);
      res.push({ n: n + (manos > 0 ? ' (lanzada)' : ''), dano: dano(A.lucha === 'armas de proyectiles' ? 1 : 0), notas: `ATQ ${signo(base + mod('DES') + extra)}, ${a[4]} m` + (a[5] > 1 ? `, ${a[5]}/asalto` : '') });
    }
    return res;
  }

  // ------------------------------------------------------------ 1. atributos
  function tirar3d6() { const dados = [d(6), d(6), d(6)]; return { dados, total: suma(dados) }; }
  function pasoAtributos(c) {
    const A = asis.A;
    c.append(h('h3', null, 'Atributos'),
      regla('Tira 3d6 siete veces y asigna seis de los resultados a los atributos que quieras; el séptimo se pierde. El modificador sale de esta tabla: 3 da −2; de 4 a 6, −1; de 7 a 14, 0; de 15 a 17, +1; y 18, +2.', MANUAL(3)));
    c.append(h('p', null,
      h('button', { type: 'button', class: 'gen-boton principal', onclick: () => asis.cambia(X => { X.tiradas = Array.from({ length: 7 }, tirar3d6); X.asig = {}; }) }, A.tiradas ? 'Volver a tirar' : 'Tirar 3d6 siete veces'),
      ' ', A.tiradas ? h('button', { type: 'button', class: 'gen-boton', onclick: () => asis.cambia(X => { const o = X.tiradas.map((t, i) => i).sort((p, q) => X.tiradas[q].total - X.tiradas[p].total); X.asig = {}; const orden = clase() ? [...clase().prioridad, ...CARS_VE.filter(k => !clase().prioridad.includes(k))] : CARS_VE; orden.forEach((k, i) => { X.asig[k] = o[i]; }); }) }, 'Colocarlas de mayor a menor') : null));
    if (!A.tiradas) { c.append(nota('¿Prefieres tus propios dados? Tira aquí y luego corrige los valores en la ficha.')); return; }
    const usados = Object.values(A.asig);
    c.append(h('ol', { class: 'asis-dados' }, A.tiradas.map((t, i) => h('li', { style: usados.includes(i) ? 'opacity:.55' : null }, `${t.dados.join(' + ')} = `, h('strong', null, t.total), ` (${signo(modVE(t.total))})`))));
    c.append(h('div', { class: 'asis-cars' }, CARS_VE.map(k => h('div', { class: 'asis-car' },
      h('b', null, NOMBRES_CAR_VE[k]),
      h('div', { class: 'v' }, valor(k) ?? '—'),
      h('small', null, valor(k) == null ? 'sin asignar' : `modificador ${signo(modVE(valor(k)))}`),
      h('select', { 'aria-label': NOMBRES_CAR_VE[k], onchange: e => asis.cambia(X => {
        const v = e.target.value === '' ? null : +e.target.value;
        for (const q of CARS_VE) if (X.asig[q] === v) delete X.asig[q];
        if (v == null) delete X.asig[k]; else X.asig[k] = v;
      }) },
        h('option', { value: '' }, 'Elegir…'),
        A.tiradas.map((t, i) => { const o = h('option', { value: String(i) }, `${t.total} (tirada ${i + 1})`); if (A.asig[k] === i) o.selected = true; return o; }))))));
  }

  // ------------------------------------------------------------ 2. raza
  function pasoRaza(c) {
    const A = asis.A;
    c.append(h('h3', null, 'Raza'), regla('Cada raza da dos talentos y fija tu movimiento: los metros que andas por asalto (el doble si corres).', MANUAL(4)),
      asis.radios('raza', RAZAS_VE.map(r => [r.n, `${r.n} · MOV ${r.mov}`, r.talentos.map(t => `${t}: ${TALENTOS_VE[t]}`).join(' ')])));
    c.append(h('label', { class: 'asis-opcion-mover' }, h('input', { type: 'checkbox', checked: A.femenino, onchange: e => asis.cambia(X => { X.femenino = e.target.checked; }) }), ' Escribir raza y clase en femenino en la ficha (Elfa, Hechicera…)'));
  }

  // ------------------------------------------------------------ 3. clase
  function pasoClase(c) {
    const A = asis.A, cl = clase();
    c.append(h('h3', null, 'Clase'), regla('Solo hay tres. La clase da dos talentos, el Dado de Aguante y lo que puedes llevar encima. No hay subclases ni lista de conjuros: el Hechicero nombra lo que quiere hacer y negocia su coste con el máster.', MANUAL(4)),
      asis.radios('clase', CLASES_VE.map(x => [x.n, `${x.n} · Dado de Aguante d${x.da}`, `${x.uso} ${x.talentos.map(t => `${t}: ${TALENTOS_VE[t]}`).join(' ')}`]), () => { A.armas = []; A.armadura = ''; A.escudo = false; A.lucha = ''; }));
    if (cl && cl.talentos.includes('Lucha con X')) {
      c.append(h('h4', null, 'Lucha con…'), asis.radios('lucha', LUCHA_VE.map(x => [x, x[0].toUpperCase() + x.slice(1), null])));
    }
    c.append(h('h4', null, 'Nivel inicial'),
      nota('El manual empieza siempre en Nivel 1. Elige otro solo si tu máster lo pide: La Bestia de Farton, por ejemplo, es para Nivel 3.'),
      h('p', null, h('select', { 'aria-label': 'Nivel inicial', onchange: e => asis.cambia(X => {
        X.nivel = +e.target.value;
        const n = X.nivel - 1, dado = cl ? cl.da : 6;
        while (X.dadosPV.length < n) X.dadosPV.push(d(dado));
        for (const k of Object.keys(X.hab)) X.hab[k] = Math.min(X.hab[k], maxHab());
      }) }, Array.from({ length: 14 }, (_, i) => { const o = h('option', { value: String(i + 1) }, `Nivel ${i + 1}`); if (A.nivel === i + 1) o.selected = true; return o; }))));
    if (cl) {
      if (A.nivel > 1) {
        while (A.dadosPV.length < A.nivel - 1) A.dadosPV.push(d(cl.da));
        c.append(h('p', null, `Dados de Aguante por encima del Nivel 1: ${A.dadosPV.slice(0, A.nivel - 1).join(' + ')}. `, h('button', { type: 'button', class: 'gen-boton mini', onclick: () => asis.cambia(X => { X.dadosPV = X.dadosPV.map(() => d(cl.da)); }) }, 'Volver a tirar')));
      }
      const f = fila();
      c.append(h('dl', { class: 'asis-dato' },
        h('dt', null, 'ATQ'), h('dd', null, signo(f[0]), ' más FUE cuerpo a cuerpo o DES con proyectiles'),
        h('dt', null, 'INS'), h('dd', null, signo(ins())),
        h('dt', null, 'POD'), h('dd', null, String(pod())),
        h('dt', null, 'PV'), h('dd', null, String(pv()), raza() ? ` (d${cl.da} al máximo, ${signo(mod('CON'))} de CON${A.nivel > 1 ? ', más los dados tirados' : ''})` : '')));
    }
  }

  // ------------------------------------------------------------ 4. habilidades
  function pasoHabilidades(c) {
    const A = asis.A, gastados = suma(Object.values(A.hab)), libres = puntosHab() - gastados, m = maxHab();
    c.append(h('h3', null, 'Habilidades'),
      regla(A.nivel === 1 ? 'Reparte 4 puntos entre las seis habilidades, como mucho 1 en cada una.' : `Empiezas con 4 puntos, como mucho 1 en cada habilidad, y sumas 2 por Nivel, como mucho 1 en cada una por Nivel: a Nivel ${A.nivel}, ${puntosHab()} puntos y un máximo de ${m}.`, MANUAL(A.nivel === 1 ? 5 : 14)),
      h('p', null, h('strong', null, `Te quedan ${libres} ${libres === 1 ? 'punto' : 'puntos'}.`)));
    const t = h('table', { class: 'asis-tabla' }, h('tr', null, h('th', null, 'Habilidad'), h('th', null, 'Para qué sirve'), h('th', null, 'Puntos')));
    for (const [n, uso] of Object.entries(HABILIDADES_VE)) {
      const v = A.hab[n] || 0;
      t.append(h('tr', null, h('td', null, h('strong', null, n)), h('td', null, uso), h('td', { class: 'n' },
        m === 1
          ? h('input', { type: 'checkbox', 'aria-label': n, checked: v === 1, disabled: v === 0 && libres <= 0, onchange: e => asis.cambia(X => { X.hab[n] = e.target.checked ? 1 : 0; }) })
          : h('input', { type: 'number', 'aria-label': n, min: 0, max: m, value: String(v), onchange: e => asis.cambia(X => {
            const pedido = Math.max(0, Math.min(m, parseInt(e.target.value, 10) || 0));
            X.hab[n] = Math.min(pedido, v + puntosHab() - suma(Object.values(X.hab)));
          }) }))));
    }
    c.append(t, nota('Una tirada normal es 1d20 más los puntos de la habilidad o el modificador de un atributo, a superar 11 o más. Tener trasfondo ayuda: mira el paso siguiente.'));
  }

  // ------------------------------------------------------------ 5. trasfondo
  function pasoTrasfondo(c) {
    const A = asis.A, n = numTrasfondos();
    c.append(h('h3', null, n > 1 ? 'Trasfondos' : 'Trasfondo'),
      regla('Una frase con lo que hacías antes de dedicarte a la aventura. En juego, si tiene algo que ver con lo que intentas, el máster puede darte +2; si tiene mucho que ver, ventaja.' + (n > 1 ? ' Por Ímpetu Emprendedor, los humanos tienen dos.' : ''), MANUAL('5 y 10')));
    for (let i = 0; i < n; i++) {
      c.append(h('p', null, h('input', { type: 'text', style: 'width:100%', 'aria-label': `Trasfondo ${i + 1}`, value: A.trasfondos[i], maxlength: 70, placeholder: 'Soldado en las guerras del norte…',
        onchange: e => asis.cambia(X => { X.trasfondos[i] = e.target.value.trim(); }) })));
    }
    if (A.nivel >= 11) c.append(h('h4', null, 'Trasfondo de Nivel 11'), nota('A Nivel 11 se gana otro, ligado a tus andanzas y tu estatus: Protector de Aguasnegras, Conde de Fronteranorte…'),
      h('p', null, h('input', { type: 'text', style: 'width:100%', 'aria-label': 'Trasfondo de nivel 11', value: A.trasfondo11, maxlength: 70, onchange: e => asis.cambia(X => { X.trasfondo11 = e.target.value.trim(); }) })));
    c.append(h('h4', null, 'Ideas'), h('div', { class: 'asis-chips' }, barajar(TRASFONDOS_VE).slice(0, 8).map(t => h('button', { type: 'button', onclick: () => asis.cambia(X => {
      const i = X.trasfondos.slice(0, n).findIndex(x => !x);
      X.trasfondos[i < 0 ? n - 1 : i] = t;
    }) }, t))));
  }

  // ------------------------------------------------------------ 6. equipo
  function pasoEquipo(c) {
    const A = asis.A, cl = clase();
    c.append(h('h3', null, 'Equipo'), regla('Empiezas con 3d6 × 10 monedas de oro. Puedes cargar tantos bultos como puntuación de Fuerza; por encima estás sobrecargado y tiras con desventaja al atacar y en lo que tenga que ver con moverte.', MANUAL('5 y 24-25')));
    if (!A.oro) {
      c.append(h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: () => asis.cambia(X => { const dados = [d(6), d(6), d(6)]; X.oro = { dados, total: suma(dados) * 10 }; }) }, 'Tirar 3d6 × 10')));
      return;
    }
    const q = queda(), b = bultos(), fue = valor('FUE');
    c.append(h('p', null, `${A.oro.dados.join(' + ')} × 10 = `, h('strong', null, `${A.oro.total} mo`), '. Te quedan ', h('strong', { style: q < 0 ? 'color:var(--sangre)' : null }, q < 0 ? `${moneda(-q)} de menos` : moneda(q)), `. Bultos: ${b} de ${fue}${b > fue ? ' (sobrecargado)' : ''}. DEF ${def()}.`));

    c.append(h('h4', null, 'Armas'), nota(cl.uso));
    c.append(h('div', { class: 'asis-tarjetas' }, ARMAS_VE.filter(a => puedeArma(a[0])).map(a => h('label', null,
      h('input', { type: 'checkbox', checked: A.armas.includes(a[0]), onchange: e => asis.cambia(X => { X.armas = e.target.checked ? [...X.armas, a[0]] : X.armas.filter(n => n !== a[0]); }) }),
      h('span', null, h('strong', null, a[0]), h('small', null, `${a[1]} · ${moneda(a[2])}${a[3] === 2 ? ' · a dos manos' : ''}${a[4] ? ` · ${a[3] ? 'se lanza a' : 'alcance'} ${a[4]} m` : ''}${a[5] > 1 ? ` · ${a[5]} disparos por asalto` : ''}`))))));
    if (cl.armaduras.length) {
      c.append(h('h4', null, 'Armadura'), asis.radios('armadura', [['', 'Sin armadura', null], ...ARMADURAS_VE.filter(a => cl.armaduras.includes(a[0])).map(a => [a[0], `${a[0]} · DEF +${a[1]}`, moneda(a[2]) + (a[0] === 'Placas' ? ' · MOV 6 como mucho y siempre sobrecargado' : '')])]));
    }
    if (cl.escudo) c.append(h('p', null, h('label', null, h('input', { type: 'checkbox', checked: A.escudo, onchange: e => asis.cambia(X => { X.escudo = e.target.checked; }) }), ` Escudo · DEF +1 · ${moneda(ESCUDO_VE[2])}`)));

    c.append(h('h4', null, 'Equipo diverso'));
    const t = h('table', { class: 'asis-tabla' });
    for (const e of EQUIPO_VE) {
      t.append(h('tr', null, h('td', null, e[0]), h('td', { class: 'n' }, moneda(e[1])), h('td', { class: 'n' }, h('input', { type: 'number', min: 0, max: 40, 'aria-label': e[0], value: String(A.cosas[e[0]] || 0),
        onchange: ev => asis.cambia(X => { X.cosas[e[0]] = Math.max(0, parseInt(ev.target.value, 10) || 0); }) }))));
    }
    c.append(t);
  }

  // ------------------------------------------------------------ 7. últimos toques
  function pasoToques(c) {
    const A = asis.A;
    c.append(h('h3', null, 'Últimos toques'), regla('Escribe un par de líneas sobre las ambiciones y objetivos de tu aventurero.', MANUAL(6)));
    c.append(h('div', { class: 'asis-rejilla' }, h('label', null, 'Nombre', h('input', { type: 'text', value: A.datos.Nombre, onchange: e => asis.cambia(X => { X.datos.Nombre = e.target.value.trim(); }) }))));
    if (raza()) c.append(h('div', { class: 'asis-chips' }, barajar(NOMBRES_DND[raza().n]).slice(0, 5).map(n => h('button', { type: 'button', onclick: () => asis.cambia(X => { X.datos.Nombre = n; }) }, n))));
    c.append(h('h4', null, 'Ambiciones'), h('textarea', { 'aria-label': 'Ambiciones', maxlength: 180, onchange: e => asis.cambia(X => { X.ambiciones = e.target.value.trim(); }) }, A.ambiciones),
      h('div', { class: 'asis-chips' }, barajar(AMBICIONES_VE).slice(0, 4).map(t => h('button', { type: 'button', onclick: () => asis.cambia(X => { X.ambiciones = t; }) }, t))));
    c.append(h('h4', null, 'Retrato (opcional)'), h('p', null, h('input', { type: 'file', accept: 'image/*', 'aria-label': 'Retrato', onchange: e => leerRetrato(e.target.files[0], 105.7, 104.7, url => asis.cambia(X => { X.foto = url; })) }),
      A.foto ? h('button', { type: 'button', class: 'gen-boton', style: 'margin-left:.4rem', onclick: () => asis.cambia(X => { X.foto = null; }) }, 'Quitar') : null));
    if (clase() && clase().clave === 'hechicero') c.append(nota(`Conjuros: no se apuntan. Nombras lo que quieres hacer y negocias con el máster; como guía, 1 POD por cada d6 de daño, curación o nivel afectado. Algunos nombres: ${CONJUROS_VE}.`));
  }

  function pasoResumen(c) {
    const A = asis.A;
    c.append(h('h3', null, A.datos.Nombre || 'Tu aventurero'),
      h('p', null, `${nombreRaza()} · ${nombreClase()} · Nivel ${A.nivel} · MOV ${mov()}`),
      h('p', null, CARS_VE.map(k => `${k} ${valor(k)} (${signo(mod(k))})`).join(' · ')),
      h('p', null, `PV ${pv()} · POD ${pod()} · ATQ ${signo(fila()[0])} · DEF ${def()} · INS ${signo(ins())}`),
      h('p', null, h('strong', null, 'Talentos: '), talentos().join(', ') + '.'),
      h('p', null, h('strong', null, 'Habilidades: '), Object.keys(HABILIDADES_VE).filter(n => A.hab[n]).map(n => `${n} +${A.hab[n]}`).join(', ') + '.'),
      h('p', null, h('strong', null, 'Trasfondo: '), A.trasfondos.slice(0, numTrasfondos()).filter(Boolean).join('; ') + '.'),
      A.armas.length ? h('ul', { class: 'asis-columnas' }, A.armas.flatMap(usos).map(u => h('li', null, `${u.n}: ${u.dano}, ${u.notas}`))) : null,
      nota('Al crear la ficha se abre como personaje nuevo en el editor; lo que tengas abierto ahora se queda en «Mis personajes». La hoja es de una cara, en A5.'),
      h('p', null, h('button', { type: 'button', class: 'gen-boton principal', onclick: crearFicha }, 'Crear la ficha')));
  }

  const nombreRaza = () => { const r = raza(); return r ? (asis.A.femenino ? r.f : r.n) : ''; };
  const nombreClase = () => { const c = clase(); return c ? (asis.A.femenino ? c.f : c.n) : ''; };

  // ------------------------------------------------------------ de aquí a la ficha
  // Reparte un texto en dos líneas: la primera más corta (la de la ficha empieza tras el rótulo)
  function dosLineas(partes, ancho1) {
    const sep = ', ';
    let a = '', i = 0;
    for (; i < partes.length; i++) {
      const prueba = a ? a + sep + partes[i] : partes[i];
      if (Generador.ancho(prueba + ',', 9.5) > ancho1) break;
      a = prueba;
    }
    const resto = partes.slice(i).join(sep);
    return [a + (resto ? ',' : ''), resto];
  }
  function crearFicha(azar) {
    const A = asis.A, cp = {};
    const pon = (n, x) => { if (x != null && x !== '') cp[n] = String(x); };
    pon('Nombre', A.datos.Nombre); pon('Raza', nombreRaza()); pon('Clase', nombreClase());
    pon('Nivel', A.nivel); pon('PX', 0); pon('MOV', mov()); pon('INS', signo(ins()));
    pon('PV actuales', pv()); pon('PV totales', pv()); pon('POD actuales', pod()); pon('POD totales', pod());
    pon('ATQ', signo(fila()[0])); pon('DEF', def());
    for (const k of CARS_VE) { pon(k, valor(k)); pon(k + ' mod', signo(mod(k))); }
    for (const n of Object.keys(HABILIDADES_VE)) if (A.hab[n]) pon(n, signo(A.hab[n]));
    const tras = [...A.trasfondos.slice(0, numTrasfondos()), A.nivel >= 11 ? A.trasfondo11 : ''].filter(Boolean);
    if (tras.length <= 2) { pon('Trasfondo 1', tras[0]); pon('Trasfondo 2', tras[1]); }
    else { pon('Trasfondo 1', tras[0]); pon('Trasfondo 2', tras.slice(1).join('; ')); }
    const [t1, t2] = dosLineas(talentos(), 208);
    pon('Talentos 1', t1); pon('Talentos 2', t2);
    A.armas.flatMap(usos).slice(0, 8).forEach((u, i) => { pon(`Arma ${i + 1}`, u.n); pon(`Arma ${i + 1} daño`, u.dano); pon(`Arma ${i + 1} notas`, u.notas); });
    const cosas = [];
    if (A.armadura) cosas.push(`${A.armadura} (+${armaduraElegida()[1]} DEF)`);
    if (A.escudo) cosas.push('Escudo (+1 DEF)');
    for (const e of EQUIPO_VE) { const n = A.cosas[e[0]] || 0; if (n) cosas.push((n > 1 ? `${n} × ` : '') + e[0].replace(/ \(.*\)$/, '')); }  // en la ficha, sin lo de entre paréntesis: no cabe
    cosas.slice(0, 20).forEach((x, i) => pon(`Equipo ${i + 1}`, x));
    const q = Math.max(0, queda());
    pon('mo', Math.floor(q / MO)); pon('mp', Math.floor((q % MO) / MP) || ''); pon('mc', q % MP || '');
    pon('Ambiciones', A.ambiciones);
    Generador.crear('ve', { campos: cp, foto: A.foto });
    if (azar !== true) document.querySelector('#d-asistente').close();
    if (azar !== true) asis.reiniciar();
  }

  // ------------------------------------------------------------ pasos
  const PASOS = [
    { t: 'Atributos', pintar: pasoAtributos, ok: () => CARS_VE.every(k => valor(k) != null) || 'Tira los dados y asigna los seis atributos.' },
    { t: 'Raza', pintar: pasoRaza, ok: () => !!raza() || 'Elige una raza.' },
    { t: 'Clase', pintar: pasoClase, ok: () => !clase() ? 'Elige una clase.' : clase().clave === 'guerrero' && !asis.A.lucha ? 'Elige con qué luchas.' : true },
    { t: 'Habilidades', pintar: pasoHabilidades, ok: () => { const f = puntosHab() - suma(Object.values(asis.A.hab)); return f === 0 || `Te faltan ${f} ${f === 1 ? 'punto' : 'puntos'} por repartir.`; } },
    { t: 'Trasfondo', pintar: pasoTrasfondo, ok: () => asis.A.trasfondos.slice(0, numTrasfondos()).every(Boolean) || 'Escribe tu trasfondo.' },
    { t: 'Equipo', pintar: pasoEquipo, ok: () => !asis.A.oro ? 'Tira tu dinero inicial.' : queda() < 0 ? 'Te has pasado de presupuesto.' : true },
    { t: 'Últimos toques', pintar: pasoToques, ok: () => !!asis.A.datos.Nombre || 'Ponle nombre.' },
    { t: 'Resumen', pintar: pasoResumen, ok: () => true },
  ];

  // ------------------------------------------------------------ al azar
  // Un aventurero típico y jugable: se descartan las tiradas peores que una ficha mala de verdad, los atributos van
  // donde la clase los pide, y el dinero se gasta primero en lo imprescindible.
  function compraAzar() {
    const A = asis.A, cl = clase();
    const dameArma = n => { if (puedeArma(n) && !A.armas.includes(n) && queda() >= arma(n)[2]) A.armas.push(n); };
    const dameArmadura = n => { if (cl.armaduras.includes(n) && queda() >= ARMADURAS_VE.find(a => a[0] === n)[2]) A.armadura = n; };
    const dame = (n, k = 1) => { const e = EQUIPO_VE.find(x => x[0] === n); for (let i = 0; i < k && queda() >= e[1]; i++) A.cosas[n] = (A.cosas[n] || 0) + 1; };
    if (cl.clave === 'guerrero') {
      if (A.lucha === 'armas a dos manos') { dameArma('Espada a dos manos'); if (!A.armas.length) dameArma('Bastón'); }
      else if (A.lucha === 'armas de proyectiles') { dameArma('Arco'); if (A.armas.includes('Arco')) dame('Carcaj y 20 flechas'); else { dameArma('Ballesta ligera'); if (!A.armas.length) dameArma('Honda'); } dameArma('Espada corta'); }
      else if (A.lucha === 'dos armas de mano') { dameArma(uno(['Espada corta', 'Hacha de batalla', 'Maza pesada'])); dameArma('Daga'); dameArma('Lanza'); }
      else {
        dameArma(uno(['Espada larga', 'Hacha de batalla', 'Maza pesada', 'Lanza']));
        if (!A.armas.length) dameArma('Porra');
        if (queda() >= ESCUDO_VE[2]) A.escudo = true;
      }
      if (!A.armas.length) dameArma('Porra');
      for (const n of ['Mallas', 'Anillos', 'Cuero']) { dameArmadura(n); if (A.armadura) break; }
    } else if (cl.clave === 'hechicero') {
      dameArma('Bastón'); dameArma('Daga');
      dame('Libro de conjuros (50 hojas)');
    } else {
      dameArmadura('Cuero');
      dameArma(uno(['Espada corta', 'Daga', 'Espada corta']));
      dameArma('Daga'); dameArma('Honda');
      dame('Herramientas de ladrón');
    }
    dame('Mochila (10 kg)');
    dame('Antorcha (1 h)', 4); dame('Yesca y pedernal'); dame('Raciones comunes (1 día)', 3); dame('Cantimplora (2 l)'); dame('Vendas (1 uso)', 2); dame('Cuerda común (15 m)');
  }
  function elegirHab(n) {
    const A = asis.A, pesos = PESO_HAB_VE[clase().clave], m = maxHab();
    A.hab = {};
    for (let i = 0; i < n; i++) {
      const libres = Object.keys(HABILIDADES_VE).filter(k => (A.hab[k] || 0) < m);
      let t = suma(libres.map(k => pesos[k])), x = d(t);
      for (const k of libres) { x -= pesos[k]; if (x <= 0) { A.hab[k] = (A.hab[k] || 0) + 1; break; } }
    }
  }
  function generarAzar() {
    asis.A = inicial();
    const A = asis.A;
    const r = uno(RAZAS_VE), c = uno(CLASES_VE);
    A.raza = r.n; A.clase = c.n; A.femenino = d(2) === 1;
    if (c.clave === 'guerrero') A.lucha = uno(LUCHA_VE);
    // Tiradas: que al menos haya un modificador positivo y como mucho uno negativo entre las seis mejores
    do A.tiradas = Array.from({ length: 7 }, tirar3d6);
    while (A.tiradas.map(t => t.total).sort((x, y) => y - x).slice(0, 6).filter(v => modVE(v) < 0).length > 1 || Math.max(...A.tiradas.map(t => t.total)) < 15);
    const porValor = A.tiradas.map((_, i) => i).sort((i, j) => A.tiradas[j].total - A.tiradas[i].total);
    [...c.prioridad, ...barajar(CARS_VE.filter(k => !c.prioridad.includes(k)))].forEach((k, i) => { A.asig[k] = porValor[i]; });
    elegirHab(puntosHab());
    A.trasfondos = barajar(TRASFONDOS_VE).slice(0, 2);
    const dados = [d(6), d(6), d(6)];
    A.oro = { dados, total: suma(dados) * 10 };
    compraAzar();
    A.datos.Nombre = uno(NOMBRES_DND[r.n]);
    A.ambiciones = uno(AMBICIONES_VE);
    return PASOS.every(x => x.ok() === true) && A.armas.length > 0;
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

  const asis = AsisComun.marco({ clave: 'nephei-generador-asistente-ve-v1', inicial, pasos: () => PASOS, titulo: () => 'Asistente · Vieja Escuela' });
  document.querySelector('#b-azar').addEventListener('click', alAzar);
})();
