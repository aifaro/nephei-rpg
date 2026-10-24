// Editor de la ficha: pinta la ficha oficial de fondo, pone encima un campo por cada campo del PDF
// rellenable (fichas.json, que sale de herramientas/generador/preparar.py), calcula lo derivado,
// guarda los personajes en el almacenamiento local del navegador y descarga el PDF relleno con pdf-lib.
'use strict';

const Generador = (() => {
  const CLAVE = 'nephei-generador-v1';
  const CARS = ['FUE', 'CON', 'TAM', 'DES', 'APA', 'INT', 'POD', 'EDU'];
  const PISTA = /^(PV|PM|Cordura|Suerte) (\d\d)$/;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const pad = v => (v == null || v === '' ? '' : String(v).padStart(2, '0'));

  let FICHAS = null;
  let almacen = { actual: null, personajes: {}, opciones: { moneda: 'dolar', epoca: '20', auto: true } };
  let pj = null;
  const campos = new Map();   // nombre del campo → elemento
  let def = null, nombres = new Set();

  // ------------------------------------------------------------ almacenamiento local
  function leer() {
    try {
      const t = localStorage.getItem(CLAVE);
      if (t) {
        const a = JSON.parse(t);
        almacen.personajes = a.personajes || {};
        almacen.actual = a.actual || null;
        Object.assign(almacen.opciones, a.opciones || {});
      }
    } catch (e) { /* sin almacenamiento: se trabaja igual, pero no se recuerda */ }
  }
  let espera = null;
  function guardar() { clearTimeout(espera); espera = setTimeout(guardarYa, 250); }
  function guardarYa() {
    clearTimeout(espera);
    pj.actualizado = Date.now();
    almacen.personajes[pj.id] = pj;
    almacen.actual = pj.id;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(almacen));
      $('#guardado').textContent = 'Guardado en este navegador';
    } catch (e) {
      $('#guardado').textContent = 'No se ha podido guardar en el navegador (¿almacenamiento lleno o bloqueado?)';
    }
  }
  function nuevoPj(ficha) {
    return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ficha,
             campos: {}, auto: {}, tam: {}, foto: null, creado: Date.now(), actualizado: Date.now() };
  }
  function vacio(p) { return !p.foto && !Object.values(p.campos).some(v => v !== '' && v !== false); }

  // ------------------------------------------------------------ dibujo de la ficha
  const lienzo = document.createElement('canvas').getContext('2d');
  function ancho(texto, tam) { lienzo.font = `${tam}px "Times New Roman", Times, serif`; return lienzo.measureText(texto).width; }
  function letra(c, texto) {  // tamaño para que quepa en una línea, como hará el PDF
    let t = pj.tam[c.n] || c.tam;
    if (!c.ml) while (t > 4.5 && ancho(texto, t) > c.r[2] - c.r[0] - 3) t -= 0.25;
    return t;
  }
  function situar(e, r, pg) {
    e.style.left = r[0] / pg.w * 100 + '%';
    e.style.top = r[1] / pg.h * 100 + '%';
    e.style.width = (r[2] - r[0]) / pg.w * 100 + '%';
    e.style.height = (r[3] - r[1]) / pg.h * 100 + '%';
  }

  function pintar() {
    def = FICHAS[pj.ficha];
    nombres = new Set(def.campos.map(c => c.n));
    const cont = $('#hojas');
    cont.textContent = '';
    campos.clear();
    def.paginas.forEach((pg, i) => {
      const hoja = el('div', 'gen-hoja');
      hoja.style.aspectRatio = `${pg.w} / ${pg.h}`;
      const img = el('img');
      img.src = '/generador/' + pg.fondo;
      img.alt = `Cara ${i + 1} de la ficha`;
      img.draggable = false;
      const capa = el('div', 'gen-capa');
      hoja.append(img, capa);
      for (const c of def.campos) if (c.p === i) capa.append(crearCampo(c, pg));
      if (def.foto.p === i) capa.append(crearFoto(pg));
      cont.append(hoja);
    });
    rotulos();
  }

  function crearCampo(c, pg) {
    let e;
    const m = PISTA.exec(c.n);
    if (c.t === 'c') {
      e = el('button', m ? 'gen-pista' : 'gen-casilla');
      e.type = 'button';
      e.setAttribute('aria-label', c.n);
      e.setAttribute('aria-pressed', pj.campos[c.n] === true ? 'true' : 'false');
      e.addEventListener('click', () => {
        const on = pj.campos[c.n] !== true;
        if (m) for (const n of nombres) if (n !== c.n && n.startsWith(m[1] + ' ') && PISTA.test(n)) marcar(n, false);
        marcar(c.n, on);
        if (m) pj.auto['pista:' + m[1]] = '';  // elegido a mano: el cálculo ya no lo mueve
        guardar();
      });
    } else {
      e = el(c.ml ? 'textarea' : 'input', 'gen-campo');
      if (!c.ml) e.type = 'text';
      e.spellcheck = false;
      e.autocomplete = 'off';
      e.setAttribute('aria-label', c.n);
      if (c.q === 1) e.style.textAlign = 'center';
      if (c.q === 2) e.style.textAlign = 'right';
      e.value = pj.campos[c.n] ?? '';
      e.dataset.tam = c.tam;
      e.addEventListener('input', () => {
        pj.campos[c.n] = e.value;
        tamano(c, e);
        if (almacen.opciones.auto) recalcular();
        if (c.n === 'Nombre' || c.n === 'Ocupación') rotulos();
        guardar();
      });
      tamano(c, e, pg);
    }
    situar(e, c.r, pg);
    e.dataset.campo = c.n;
    campos.set(c.n, e);
    return e;
  }
  function tamano(c, e) {
    const w = def.paginas[c.p].w;
    e.style.fontSize = `calc(${letra(c, e.value)} * 100cqw / ${w})`;
  }
  function marcar(n, on) {
    pj.campos[n] = on;
    const e = campos.get(n);
    if (e) e.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function refrescar(n) {
    const e = campos.get(n);
    if (!e) return;
    const c = def.campos.find(x => x.n === n);
    if (c.t === 'c') e.setAttribute('aria-pressed', pj.campos[n] === true ? 'true' : 'false');
    else { e.value = pj.campos[n] ?? ''; tamano(c, e); }
  }
  function rotulos() {
    $('#rotulo-ficha').textContent = def.titulo;
    $('#rotulo-nombre').textContent = pj.campos['Nombre'] || 'Sin nombre';
  }

  function crearFoto(pg) {
    const b = el('button', 'gen-foto');
    b.type = 'button';
    situar(b, def.foto.r, pg);
    b.setAttribute('aria-label', pj.foto ? 'Cambiar el retrato' : 'Subir un retrato');
    if (pj.foto) {
      const i = el('img');
      i.src = pj.foto;
      i.alt = 'Retrato';
      b.append(i);
    } else {
      b.append(el('span', 'gen-foto-pon', '+ Retrato'));
    }
    b.addEventListener('click', () => Retrato.abrir());
    return b;
  }

  // ------------------------------------------------------------ cálculos
  function num(n) {
    const m = /-?\d+/.exec(String(pj.campos[n] ?? ''));
    return m ? parseInt(m[0], 10) : null;
  }
  // Pone un valor calculado, salvo que el campo tenga algo escrito a mano (distinto del último cálculo).
  function poner(n, v, forzar) {
    if (!nombres.has(n)) return;
    const s = v == null ? '' : String(v);
    const actual = pj.campos[n] ?? '';
    if (!forzar && actual !== '' && actual !== (pj.auto[n] ?? '')) return;
    if (actual === s) { pj.auto[n] = s; return; }
    pj.campos[n] = s;
    pj.auto[n] = s;
    refrescar(n);
  }
  function rodear(pista, valor) {
    const n = `${pista} ${pad(valor)}`;
    const clave = 'pista:' + pista;
    const actual = [...nombres].find(x => x.startsWith(pista + ' ') && PISTA.test(x) && pj.campos[x] === true) || '';
    if (actual && actual !== (pj.auto[clave] ?? '')) return;
    if (actual) marcar(actual, false);
    if (valor != null && nombres.has(n)) { marcar(n, true); pj.auto[clave] = n; }
    else pj.auto[clave] = '';
  }
  function importe(d) {
    const pts = almacen.opciones.moneda === 'peseta';
    const v = pts ? d * 5 : d;
    const s = v.toLocaleString('es-ES', { maximumFractionDigits: 2 });
    return pts ? `${s} ptas.` : `${s} $`;
  }

  function recalcular() {
    const c = {};
    for (const k of CARS) c[k] = num(k);
    const edad = num('Edad') || 0;
    const algo = CARS.some(k => c[k] != null);
    if (c.CON != null && c.TAM != null) {
      const pv = Math.floor((c.CON + c.TAM) / (pj.ficha === 'pulp' ? 5 : 10));
      poner('PV máximo', pv);
      rodear('PV', pv);
    }
    if (c.POD != null) {
      poner('PM máximo', Math.floor(c.POD / 5));
      rodear('PM', Math.floor(c.POD / 5));
      poner('Cordura inicial', c.POD);
      rodear('Cordura', c.POD);
    }
    if (algo) poner('Cordura máxima', 99 - (num('Mitos de Cthulhu') || 0));
    if (c.FUE != null && c.DES != null && c.TAM != null) poner('MOV', movimiento(c.FUE, c.DES, c.TAM, pj.ficha === 'pulp' ? 0 : edad));  // en Pulp no hay modificadores por edad
    if (c.FUE != null && c.TAM != null) {
      const k = combate(c.FUE, c.TAM);
      poner('Bonificación al daño', k.bd);
      poner('Corpulencia', k.corp);
    }
    if (c.DES != null) poner('Esquivar', pad(Math.floor(c.DES / 2)));
    if (c.EDU != null) poner('Lengua propia', pad(c.EDU));
    poner('Esquivar (combate)', num('Esquivar') ?? '');
    poner('Arma 1 normal', num('Combatir (Pelea)') ?? '');
    const cr = num('Crédito');
    if (cr != null) {
      const d = dinero(cr, almacen.opciones.epoca);
      poner('Nivel de gasto', `${importe(d.gasto)} (${d.nivel.toLowerCase()})`);
      poner('Dinero', importe(d.dinero));
      poner('Bienes', importe(d.bienes));
    }
    // Mitades y quintos: siempre los de su valor
    for (const n of nombres) {
      if (!nombres.has(n + ' (mitad)')) continue;
      const v = num(n);
      poner(n + ' (mitad)', v == null ? '' : Math.floor(v / 2), true);
      poner(n + ' (quinto)', v == null ? '' : Math.floor(v / 5), true);
    }
    for (let i = 1; i <= 5; i++) {
      const v = num(`Arma ${i} normal`);
      poner(`Arma ${i} dificil`, v == null ? '' : Math.floor(v / 2), true);
      poner(`Arma ${i} extremo`, v == null ? '' : Math.floor(v / 5), true);
    }
  }

  // ------------------------------------------------------------ PDF
  function cargarPdfLib() {
    if (window.PDFLib) return Promise.resolve();
    return new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = '/generador/pdf-lib.min.js';
      s.onload = ok;
      s.onerror = () => ko(new Error('No se ha podido cargar pdf-lib'));
      document.head.append(s);
    });
  }
  function bytesDe(dataUrl) {
    const b = atob(dataUrl.split(',')[1]);
    const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  function nombreArchivo(s) {
    return (s || 'investigador').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'investigador';
  }
  function bajar(blob, nombre) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function descargar() {
    const b = $('#b-pdf');
    const texto = b.textContent;
    b.disabled = true;
    b.textContent = 'Preparando…';
    try {
      guardarYa();
      await cargarPdfLib();
      const { PDFDocument, StandardFonts } = window.PDFLib;
      const bytes = await (await fetch('/generador/' + def.pdf)).arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      const font = await doc.embedFont(StandardFonts.TimesRoman);
      const sirve = new Map();
      const limpiar = s => [...s].map(ch => {
        if (ch === '\n') return ch;
        if (!sirve.has(ch)) { try { font.encodeText(ch); sirve.set(ch, true); } catch (e) { sirve.set(ch, false); } }
        return sirve.get(ch) ? ch : '?';
      }).join('');
      for (const c of def.campos) {
        const v = pj.campos[c.n];
        if (c.t === 'c') {
          if (v === true) { const cb = form.getCheckBox(c.n); cb.check(); form.markFieldAsClean(cb.ref); }
          continue;
        }
        if (v == null || v === '') continue;
        const tf = form.getTextField(c.n);
        let s = limpiar(String(v));
        if (!c.ml) {
          s = s.replace(/\s*\n\s*/g, ' ');
          let t = pj.tam[c.n] || c.tam;
          while (t > 4.5 && font.widthOfTextAtSize(s, t) > c.r[2] - c.r[0] - 3) t -= 0.25;
          tf.setFontSize(t);
        }
        tf.setText(s);
      }
      form.updateFieldAppearances(font);
      if (pj.foto) {
        const img = await doc.embedJpg(bytesDe(pj.foto));
        const pag = doc.getPage(def.foto.p);
        const [x0, y0, x1, y1] = def.foto.r;
        pag.drawImage(img, { x: x0, y: pag.getHeight() - y1, width: x1 - x0, height: y1 - y0 });
      }
      const nombre = pj.campos['Nombre'] || '';
      doc.setTitle(nombre ? `${nombre} · Ficha de investigador` : 'Ficha de investigador');
      doc.setCreator('rpg.nephei.org/generador');
      doc.setProducer('rpg.nephei.org/generador (pdf-lib)');
      const out = await doc.save({ updateFieldAppearances: false });
      bajar(new Blob([out], { type: 'application/pdf' }), nombreArchivo(nombre) + '.pdf');
    } catch (e) {
      console.error(e);
      alert('No se ha podido preparar el PDF: ' + e.message);
    } finally {
      b.disabled = false;
      b.textContent = texto;
    }
  }

  // ------------------------------------------------------------ retrato
  const Retrato = (() => {
    const cv = () => $('#c-retrato');
    let img = null, zoom = 1, dx = 0, dy = 0;
    function medidas() {
      const [x0, y0, x1, y1] = def.foto.r;
      const W = Math.min(420, window.innerWidth - 80);
      return { W, H: Math.round(W * (y1 - y0) / (x1 - x0)), pw: x1 - x0, ph: y1 - y0 };
    }
    function dibujar(ctx, W, H) {
      const s = Math.max(W / img.width, H / img.height) * zoom;
      const w = img.width * s, h = img.height * s;
      dx = Math.min(Math.max(dx, (W - w) / 2), (w - W) / 2);   // la imagen siempre cubre el hueco
      dy = Math.min(Math.max(dy, (H - h) / 2), (h - H) / 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, (W - w) / 2 + dx, (H - h) / 2 + dy, w, h);
    }
    function pintarLienzo() {
      const { W, H } = medidas();
      const c = cv();
      c.width = W; c.height = H;
      if (img) dibujar(c.getContext('2d'), W, H);
    }
    function cargar(src) {
      const i = new Image();
      i.onload = () => { img = i; zoom = 1; dx = dy = 0; $('#r-zoom').value = 1; pintarLienzo(); };
      i.src = src;
    }
    function abrir() {
      if (!pj.foto && !img) { $('#f-retrato').click(); return; }
      if (pj.foto && !img) cargar(pj.foto);
      $('#d-retrato').showModal();
      pintarLienzo();
    }
    function enlazar() {
      $('#f-retrato').addEventListener('change', ev => {
        const f = ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        const r = new FileReader();
        r.onload = () => { cargar(r.result); if (!$('#d-retrato').open) $('#d-retrato').showModal(); };
        r.readAsDataURL(f);
      });
      const c = cv();
      let arrastre = null;
      c.addEventListener('pointerdown', e => { arrastre = { x: e.clientX, y: e.clientY, dx, dy }; c.setPointerCapture(e.pointerId); });
      c.addEventListener('pointermove', e => {
        if (!arrastre || !img) return;
        dx = arrastre.dx + e.clientX - arrastre.x;
        dy = arrastre.dy + e.clientY - arrastre.y;
        pintarLienzo();
      });
      c.addEventListener('pointerup', () => { arrastre = null; });
      $('#r-zoom').addEventListener('input', e => { zoom = +e.target.value; pintarLienzo(); });
      $('#b-otra-imagen').addEventListener('click', () => $('#f-retrato').click());
      $('#b-quitar-retrato').addEventListener('click', () => {
        pj.foto = null; img = null;
        $('#d-retrato').close();
        guardarYa(); pintar();
      });
      $('#b-poner-retrato').addEventListener('click', () => {
        if (!img) { $('#d-retrato').close(); return; }
        const { W, H, pw, ph } = medidas();
        const out = document.createElement('canvas');
        out.width = Math.round(pw * 3); out.height = Math.round(ph * 3);
        const ctx = out.getContext('2d');
        ctx.scale(out.width / W, out.height / H);
        dibujar(ctx, W, H);
        pj.foto = out.toDataURL('image/jpeg', 0.86);
        $('#d-retrato').close();
        guardarYa(); pintar();
      });
    }
    return { abrir, enlazar, olvidar: () => { img = null; } };
  })();

  // ------------------------------------------------------------ lista, copia de seguridad
  function abrirPj(p) {
    if (pj && !vacio(pj)) guardarYa();
    else if (pj && vacio(pj) && pj.id !== p.id) delete almacen.personajes[pj.id];
    pj = p;
    Retrato.olvidar();
    guardarYa();
    pintar();
  }
  function lista() {
    const ul = $('#lista-personajes');
    ul.textContent = '';
    const todos = Object.values(almacen.personajes).sort((a, b) => b.actualizado - a.actualizado);
    if (!todos.length) ul.append(el('li', 'gen-nota', 'Todavía no hay ninguno.'));
    for (const p of todos) {
      const li = el('li', p.id === pj.id ? 'actual' : '');
      const t = el('div', 'gen-lista-texto');
      t.append(el('strong', null, p.campos['Nombre'] || 'Sin nombre'));
      t.append(el('span', null, [p.campos['Ocupación'], FICHAS[p.ficha].titulo,
        new Date(p.actualizado).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })].filter(Boolean).join(' · ')));
      const acc = el('div', 'gen-lista-acc');
      const b = (txt, fn) => { const x = el('button', 'gen-boton', txt); x.type = 'button'; x.addEventListener('click', fn); acc.append(x); };
      b('Abrir', () => { abrirPj(p); $('#d-lista').close(); });
      b('Duplicar', () => {
        const q = JSON.parse(JSON.stringify(p));
        Object.assign(q, { id: nuevoPj(p.ficha).id, creado: Date.now(), actualizado: Date.now() });
        if (q.campos['Nombre']) q.campos['Nombre'] += ' (copia)';
        almacen.personajes[q.id] = q;
        guardarYa(); lista();
      });
      b('Borrar', () => {
        if (!confirm(`¿Borrar a ${p.campos['Nombre'] || 'este personaje'}? No se puede deshacer.`)) return;
        delete almacen.personajes[p.id];
        if (p.id === pj.id) { pj = Object.values(almacen.personajes)[0] || nuevoPj('coc'); pintar(); }
        guardarYa(); lista();
      });
      li.append(t, acc);
      ul.append(li);
    }
  }
  function exportar() {
    guardarYa();
    const datos = { formato: 'rpg.nephei.org/generador', version: 1, personajes: Object.values(almacen.personajes) };
    bajar(new Blob([JSON.stringify(datos)], { type: 'application/json' }),
          `personajes-${new Date().toISOString().slice(0, 10)}.json`);
  }
  function importar(f) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        const ps = (d.personajes || []).filter(p => p && p.id && FICHAS[p.ficha] && p.campos);
        if (!ps.length) throw new Error('no hay personajes en el archivo');
        for (const p of ps) almacen.personajes[p.id] = Object.assign({ auto: {}, tam: {}, foto: null }, p);
        guardarYa(); lista();
        alert(`Recuperados: ${ps.length}.`);
      } catch (e) { alert('Ese archivo no es una copia de seguridad del generador: ' + e.message); }
    };
    r.readAsText(f);
  }

  // ------------------------------------------------------------ arranque
  function enlazar() {
    $('#b-pdf').addEventListener('click', descargar);
    $('#b-lista').addEventListener('click', () => { guardarYa(); lista(); $('#d-lista').showModal(); });
    $('#b-nuevo').addEventListener('click', () => $('#d-nuevo').showModal());
    document.querySelectorAll('#d-nuevo [data-ficha]').forEach(b => b.addEventListener('click', () => {
      $('#d-nuevo').close();
      abrirPj(nuevoPj(b.dataset.ficha));
    }));
    $('#b-exportar').addEventListener('click', exportar);
    $('#b-importar').addEventListener('click', () => $('#f-importar').click());
    $('#f-importar').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importar(f); });
    $('#b-retrato').addEventListener('click', () => { $('.gen-mas').open = false; Retrato.abrir(); });
    $('#b-vaciar').addEventListener('click', () => {
      if (!confirm('¿Vaciar toda la ficha, retrato incluido?')) return;
      Object.assign(pj, { campos: {}, auto: {}, tam: {}, foto: null });
      Retrato.olvidar();
      guardarYa(); pintar();
    });
    const o = almacen.opciones;
    $('#o-moneda').value = o.moneda;
    $('#o-epoca').value = o.epoca;
    $('#o-auto').checked = o.auto;
    const cambio = () => {
      o.moneda = $('#o-moneda').value; o.epoca = $('#o-epoca').value; o.auto = $('#o-auto').checked;
      if (o.auto) recalcular();
      guardarYa();
    };
    ['#o-moneda', '#o-epoca', '#o-auto'].forEach(s => $(s).addEventListener('change', cambio));
    document.querySelectorAll('.gen-dialogo').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
    window.addEventListener('beforeunload', () => { if (espera) guardarYa(); });
    Retrato.enlazar();
  }

  const listo = (async () => {
    leer();
    FICHAS = await (await fetch('/generador/fichas.json?v=1')).json();
    pj = almacen.personajes[almacen.actual] || Object.values(almacen.personajes)[0] || nuevoPj('coc');
    pintar();
    enlazar();
  })();

  // Para el asistente: crea un personaje nuevo con estos campos y lo abre.
  function crear(ficha, datos) {
    const p = nuevoPj(ficha);
    Object.assign(p.campos, datos.campos || {});
    Object.assign(p.tam, datos.tam || {});
    p.foto = datos.foto || null;
    abrirPj(p);
    recalcular();
    pintar();
    guardarYa();
    $('#hojas').scrollIntoView({ behavior: 'smooth' });
  }

  return {
    listo, crear, ancho,
    ficha: clave => FICHAS[clave],
    opciones: () => almacen.opciones,
    importe,
  };
})();
