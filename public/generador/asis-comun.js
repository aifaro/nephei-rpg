// Piezas comunes de los asistentes de Delta Green y D&D: crear nodos, dados y el marco del diálogo
// (pasos, «Anterior/Siguiente», el aviso de lo que falta y el estado guardado en el navegador).
// El de La llamada de Cthulhu (asistente.js) es anterior y lleva las suyas dentro.
'use strict';

const AsisComun = (() => {
  const $ = s => document.querySelector(s);

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
  const nota = txt => h('p', { class: 'gen-nota' }, txt);
  const aviso = txt => h('p', { class: 'asis-aviso' }, txt);

  function d(caras) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return 1 + (u[0] % caras);
  }
  const suma = xs => xs.reduce((a, b) => a + (+b || 0), 0);

  // Lee una imagen y la recorta para llenar el hueco del retrato (w × h puntos), en JPEG.
  function leerRetrato(f, w, hgt, listo) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = Math.round(w * 3); cv.height = Math.round(hgt * 3);
        const s = Math.max(cv.width / img.width, cv.height / img.height);
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, (cv.width - img.width * s) / 2, (cv.height - img.height * s) / 2, img.width * s, img.height * s);
        listo(cv.toDataURL('image/jpeg', 0.86));
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  }

  // El asistente: cfg = {clave, inicial(), pasos() → [{t, pintar(c), ok()}], titulo()}.
  // Devuelve un objeto con el estado (asis.A) y las funciones para guardarlo y repintar.
  function marco(cfg) {
    const asis = { A: null };
    asis.guardar = () => { try { localStorage.setItem(cfg.clave, JSON.stringify(asis.A)); } catch (e) { /* sigue sin recordar */ } };
    asis.leer = () => {
      try { asis.A = JSON.parse(localStorage.getItem(cfg.clave)); } catch (e) { asis.A = null; }
      asis.A = Object.assign(cfg.inicial(), asis.A || {});
    };
    asis.reiniciar = () => { asis.A = cfg.inicial(); asis.guardar(); };
    asis.pie = () => {
      const z = $('#asis-pie-msg');
      if (!z) return;
      const pasos = cfg.pasos();
      const r = pasos[asis.A.paso].ok();
      z.textContent = r === true ? '' : r;
      $('#asis-sig').disabled = r !== true || asis.A.paso === pasos.length - 1;
      document.querySelectorAll('.asis-pasos button').forEach((b, i) => { b.disabled = i > asis.A.visto && i !== asis.A.paso; });
    };
    asis.pintar = () => {
      const pasos = cfg.pasos();
      const dlg = $('#d-asistente');
      const arriba = dlg.querySelector('.asis-cuerpo') ? dlg.querySelector('.asis-cuerpo').scrollTop : 0;
      dlg.textContent = '';
      const cuerpo = h('div', { class: 'asis-cuerpo' });
      const meter = cuerpo.append.bind(cuerpo);  // los pasos añaden piezas opcionales: lo que es null no se pinta
      cuerpo.append = (...xs) => meter(...xs.flat().filter(x => x != null && x !== false));
      dlg.append(h('div', { class: 'asis' },
        h('form', { method: 'dialog', class: 'gen-dialogo-cab' }, h('h2', null, cfg.titulo()),
          h('button', { class: 'gen-cerrar', 'aria-label': 'Cerrar' }, '×')),
        h('ol', { class: 'asis-pasos' }, pasos.map((p, i) => h('li', null, h('button', { type: 'button',
          'aria-current': i === asis.A.paso ? 'step' : null, onclick: () => asis.ir(i) }, `${i + 1}. ${p.t}`)))),
        cuerpo,
        h('div', { class: 'asis-pie' },
          h('button', { type: 'button', class: 'gen-boton', disabled: asis.A.paso === 0, onclick: () => asis.ir(asis.A.paso - 1) }, 'Anterior'),
          h('span', { id: 'asis-pie-msg', class: 'asis-aviso', style: 'margin:0;align-self:center;text-align:center;flex:1' }),
          h('button', { type: 'button', class: 'gen-boton principal', id: 'asis-sig', onclick: () => asis.ir(asis.A.paso + 1) }, 'Siguiente'))));
      pasos[asis.A.paso].pintar(cuerpo);
      cuerpo.scrollTop = asis.mismoPaso ? arriba : 0;
      asis.mismoPaso = true;
      const actual = dlg.querySelector('[aria-current=step]');
      if (actual) actual.scrollIntoView({ block: 'nearest', inline: 'center' });
      asis.pie();
    };
    asis.ir = i => {
      const pasos = cfg.pasos();
      if (i < 0 || i >= pasos.length) return;
      for (let j = asis.A.paso; j < i; j++) if (pasos[j].ok() !== true) { i = j; break; }  // no se salta un paso a medias
      asis.mismoPaso = i === asis.A.paso;
      asis.A.paso = i;
      asis.A.visto = Math.max(asis.A.visto, i);
      asis.guardar();
      asis.pintar();
    };
    // Cambia algo del estado, lo guarda y repinta el paso sin moverse de sitio
    asis.cambia = fn => { fn(asis.A); asis.guardar(); asis.mismoPaso = true; asis.pintar(); };
    asis.abrir = async () => {
      await Generador.listo;
      asis.leer();
      if (asis.A.paso >= cfg.pasos().length) asis.A.paso = 0;
      asis.mismoPaso = false;
      asis.pintar();
      $('#d-asistente').showModal();
    };
    // Grupo de opciones excluyentes: ops = [[valor, título, explicación]]
    asis.radios = (clave, ops, alCambiar) => h('div', { class: 'asis-opciones', role: 'radiogroup' }, ops.map(([v, t, sub]) =>
      h('label', null, h('input', { type: 'radio', name: 'r-' + clave, value: v, checked: asis.A[clave] === v,
        onchange: () => asis.cambia(A => { if (alCambiar) alCambiar(v); A[clave] = v; }) }),
        h('span', null, h('strong', null, t), sub ? h('small', null, sub) : null))));
    $('#b-asistente').addEventListener('click', asis.abrir);
    return asis;
  }

  return { h, regla, nota, aviso, d, suma, marco, leerRetrato };
})();
