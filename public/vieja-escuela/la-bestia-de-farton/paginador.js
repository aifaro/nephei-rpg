/* Paginador del libro: con ?paginar en la URL, recompone la aventura en páginas A4
   de dos columnas, con cabecera corrida y folio. Se usa para imprimir y para el PDF. */
(function () {
  if (!/[?&#]paginar/.test(location.href)) return;
  document.documentElement.classList.add('paginado');
  const pg = document.createElement('style');
  pg.textContent = '@page{size:A4;margin:0}@page :left{margin:0}@page :right{margin:0}@page :first{margin:0}';
  document.head.appendChild(pg);

  const MM = 96 / 25.4;
  const ALTO_PAG = 297, M_SUP = 15, M_INF = 16, M_LAT = 14, HUECO = 7;
  const AREA_H = (ALTO_PAG - M_SUP - M_INF) * MM;
  const CABECERAS = ['VIEJA ESCUELA', 'LA BESTIA DE FARTON'];
  const NUEVA_PAGINA = new Set(['portada', 'inicio', 'bosque', 'colina', 'pregenerados', 'control', 'creditos']);
  const MIN_PAL = 6;

  const div = (c) => { const d = document.createElement('div'); d.className = c; return d; };

  /* ---------------------------------------------------------- utilidades */
  function textos(raiz) {
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const r = []; let n;
    while ((n = w.nextNode())) r.push(n);
    return r;
  }
  function contarPalabras(el) {
    let c = 0;
    for (const t of textos(el)) { const m = t.data.match(/\S+/g); if (m) c += m.length; }
    return c;
  }
  function recortar(raiz, k, cabeza) {
    let cont = 0;
    for (const t of textos(raiz)) {
      let out = '';
      for (const p of t.data.split(/(\s+)/)) {
        if (p === '') continue;
        if (/\S/.test(p)) { if ((cont < k) === cabeza) out += p; cont++; }
        else if (cabeza ? cont < k && cont > 0 : cont > k) out += p;
      }
      t.data = out;
    }
  }
  function cortarTexto(el, k) {
    const a = el.cloneNode(true), b = el.cloneNode(true);
    recortar(a, k, true); recortar(b, k, false);
    b.removeAttribute('id'); b.classList.remove('capital'); b.classList.add('cont');
    a.classList.add('sigue');
    return [a, b];
  }
  const esTexto = (el) => el.matches('p, li');
  const esContenedor = (el) => el.matches('ul, ol, .leer, .nota, .dados, .historia, .locura, .control, .ficha, .piel, .voces');
  const esTitulo = (el) => el.matches('h3, h4, .subtitulo-loc, .ambiente') ||
    (el.matches('p') && /:\s*$/.test(el.textContent.trim()));

  /* Coloca en `destino` (dentro de `col`) la mayor parte posible de `el` que quepa en alto H.
     Devuelve el resto (desprendido) o null si no cabe nada razonable. */
  function partir(el, destino, col, H) {
    if (el.tagName === 'TABLE') return partirTabla(el, destino, col, H);
    if (esTexto(el)) return partirTexto(el, destino, col, H);
    if (esContenedor(el)) return partirContenedor(el, destino, col, H);
    return null;
  }
  function partirTexto(el, destino, col, H) {
    const total = contarPalabras(el);
    if (total < 2 * MIN_PAL) return null;
    let lo = MIN_PAL - 1, hi = total - MIN_PAL;
    if (hi < MIN_PAL) return null;
    let mejor = null;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi + 1) / 2);
      const [a] = cortarTexto(el, mid);
      destino.appendChild(a);
      const cabe = col.offsetHeight <= H;
      a.remove();
      if (cabe) { lo = mid; mejor = mid; } else hi = mid - 1;
    }
    if (!mejor || mejor < MIN_PAL) return null;
    const [a, b] = cortarTexto(el, mejor);
    destino.appendChild(a);
    return b;
  }
  function partirContenedor(el, destino, col, H) {
    const hijos = [...el.children];
    const parte = el.cloneNode(false);
    destino.appendChild(parte);
    let k = 0;
    for (; k < hijos.length; k++) {
      const h = hijos[k].cloneNode(true);
      parte.appendChild(h);
      if (col.offsetHeight > H) { h.remove(); break; }
    }
    let restoHijo = null;
    if (k < hijos.length) restoHijo = partir(hijos[k], parte, col, H);
    if (restoHijo && restoHijo.completo) { restoHijo = null; k++; }
    const algo = k > 0 || restoHijo;
    if (!algo || (k === hijos.length)) {
      if (k === hijos.length) return { completo: true };
      parte.remove(); return null;
    }
    // si solo queda la etiqueta (p. ej. .rot de los dados), no vale la pena
    if (k === 1 && !restoHijo && hijos[0].matches('.rot, h4')) { parte.remove(); return null; }
    parte.classList.add('sigue');
    const resto = el.cloneNode(false);
    resto.removeAttribute('id'); resto.classList.add('cont');
    if (restoHijo) resto.appendChild(restoHijo);
    for (let i = restoHijo ? k + 1 : k; i < hijos.length; i++) resto.appendChild(hijos[i].cloneNode(true));
    if (el.tagName === 'OL') {
      const ini = parseInt(el.getAttribute('start') || '1', 10);
      resto.setAttribute('start', ini + k);
    }
    return resto;
  }
  function partirTabla(el, destino, col, H) {
    const filas = [...el.rows];
    const cab = filas[0] && filas[0].querySelector('th') ? filas[0] : null;
    const cuerpo = cab ? filas.slice(1) : filas;
    const t = el.cloneNode(false); const tb = document.createElement('tbody'); t.appendChild(tb);
    if (cab) tb.appendChild(cab.cloneNode(true));
    destino.appendChild(t);
    let k = 0;
    for (; k < cuerpo.length; k++) {
      const f = cuerpo[k].cloneNode(true); tb.appendChild(f);
      if (col.offsetHeight > H) { f.remove(); break; }
    }
    if (k < 2 || k === cuerpo.length) { t.remove(); return k === cuerpo.length ? { completo: true } : null; }
    const r = el.cloneNode(false); const rb = document.createElement('tbody'); r.appendChild(rb);
    if (cab) rb.appendChild(cab.cloneNode(true));
    for (let i = k; i < cuerpo.length; i++) rb.appendChild(cuerpo[i].cloneNode(true));
    return r;
  }

  /* ----------------------------------------------------- páginas y bandas */
  let libro, pagina, area, usado = 0, n = 0, pendientes = [];
  function nuevaPagina() {
    n++;
    pagina = div('pagina ' + (n % 2 ? 'impar' : 'par'));
    if (n > 1) { const c = div('cab'); c.innerHTML = '<span>' + CABECERAS[n % 2] + '</span>'; pagina.appendChild(c); }
    const f = div('fol'); f.textContent = n > 1 ? n : ''; pagina.appendChild(f);
    area = div('area'); pagina.appendChild(area);
    libro.appendChild(pagina);
    usado = 0;
    const p = pendientes; pendientes = [];
    for (const el of p) colocarAncho(el, true);
  }
  const libre = () => AREA_H - usado;

  function colocarAncho(el, desdePendientes) {
    const b = div('banda ancha'); b.appendChild(el); area.appendChild(b);
    const h = b.offsetHeight;
    const reserva = esTitulo(el) || el.matches('p, .tijeras, .marco-titulo') ? 32 * MM : 0;
    if (h + reserva <= libre() + 1 || usado === 0) { usado += h; return; }
    b.remove();
    if (el.matches('figure') && !desdePendientes) { pendientes.push(el); return; }
    nuevaPagina();
    colocarAncho(el, true);
  }

  function maquetarColumnas(bloques, H, aPlena) {
    const banda = div('banda columnas'); banda.style.height = H + 'px';
    const cols = [div('col'), div('col')]; cols.forEach((c) => banda.appendChild(c));
    area.appendChild(banda);
    const cola = bloques.slice();
    let ci = 0;
    while (cola.length && ci < 2) {
      const col = cols[ci];
      const el = cola[0];
      const nodo = el.cloneNode(true);
      col.appendChild(nodo);
      if (col.offsetHeight <= H) {
        if (esTitulo(nodo) && cola.length > 1 && col.children.length > 1) {
          // que el título no se quede solo al pie: lo siguiente tiene que poder empezar aquí
          const sig = cola[1].cloneNode(true); col.appendChild(sig);
          let empieza = col.offsetHeight <= H;
          sig.remove();
          if (!empieza) {
            const r = partir(cola[1], col, col, H);
            if (r) { col.lastElementChild.remove(); empieza = true; }
          }
          if (!empieza) { nodo.remove(); ci++; continue; }
        }
        cola.shift();
        continue;
      }
      nodo.remove();
      const resto = partir(el, col, col, H);
      if (resto && resto.completo) { cola.shift(); continue; }
      if (resto) { cola[0] = resto; ci++; continue; }
      if (col.children.length === 0 && aPlena) { col.appendChild(el.cloneNode(true)); cola.shift(); }
      ci++;
    }
    return { banda, cols, resto: cola };
  }

  function colocarGrupo(grupo) {
    let resto = grupo;
    while (resto.length) {
      let H = libre();
      if (H < 28 * MM) { nuevaPagina(); H = libre(); }
      const aPlena = usado === 0;
      const r = maquetarColumnas(resto, H, aPlena);
      if (r.resto.length === 0) {
        r.banda.remove();
        let lo = 0, hi = H;
        while (hi - lo > 3) {
          const mid = (lo + hi) / 2;
          const t = maquetarColumnas(resto, mid, false);
          t.banda.remove();
          if (t.resto.length === 0) hi = mid; else lo = mid;
        }
        const fin = maquetarColumnas(resto, hi, aPlena);
        const alto = Math.max(fin.cols[0].offsetHeight, fin.cols[1].offsetHeight);
        fin.banda.style.height = alto + 'px';
        usado += fin.banda.offsetHeight;
        resto = [];
      } else {
        usado += H;
        resto = r.resto;
        nuevaPagina();
      }
    }
  }

  /* ---------------------------------------------------------- montaje */
  function paginar() {
    const secciones = [...document.querySelectorAll('section.hoja')];
    const items = [];
    for (const sec of secciones) {
      if (NUEVA_PAGINA.has(sec.id)) items.push({ t: 'salto' });
      for (const ch of [...sec.children]) {
        if (ch.classList.contains('folio')) continue;
        if (sec.id === 'inicio' && ch.classList.contains('marco-titulo')) continue;
        if (ch.classList.contains('cols') || ch.classList.contains('pregens')) {
          for (const c of [...ch.children]) items.push({ t: 'col', el: c });
        } else items.push({ t: 'ancho', el: ch });
      }
    }
    secciones.forEach((s) => s.remove());
    document.querySelectorAll('.barra').forEach((b) => b.remove());

    libro = div('libro'); document.body.appendChild(libro);
    nuevaPagina();
    let grupo = [];
    const vaciar = () => { if (grupo.length) { colocarGrupo(grupo); grupo = []; } };
    for (const it of items) {
      if (it.t === 'col') { grupo.push(it.el); continue; }
      vaciar();
      if (it.t === 'salto') { if (usado > 0 || n > 1 && area.children.length) nuevaPagina(); continue; }
      colocarAncho(it.el, false);
    }
    vaciar();
    while (pendientes.length) nuevaPagina();
    // quitar una última página vacía
    if (!area.children.length && n > 1) { pagina.remove(); n--; }

    // índice con las páginas reales
    for (const li of libro.querySelectorAll('.indice li')) {
      const a = li.querySelector('a'), s = li.querySelector('span');
      const id = a && a.getAttribute('href').slice(1);
      const obj = id && libro.querySelector('#' + CSS.escape(id));
      const pag = obj && obj.closest('.pagina');
      if (pag && s) s.textContent = [...libro.children].indexOf(pag) + 1;
    }
    const boton = document.createElement('button');
    boton.className = 'imprimir'; boton.textContent = 'Imprimir';
    boton.onclick = () => window.print();
    document.body.appendChild(boton);
    document.documentElement.classList.add('paginado-listo');
  }

  async function empezar() {
    const familias = ['Oranienbaum', 'IM Fell English', 'Marcellus SC', 'Alegreya Sans SC', 'Special Elite', 'UnifrakturMaguntia'];
    const variantes = ['400 16px "Crimson Pro"', 'italic 400 16px "Crimson Pro"', '700 16px "Crimson Pro"',
      '400 16px "Alegreya Sans"', 'italic 400 16px "Alegreya Sans"', '700 16px "Alegreya Sans"', '700 16px "Alegreya Sans SC"',
      '400 16px "Courier Prime"', 'italic 400 16px "Courier Prime"', '700 16px "Courier Prime"'];
    try {
      await Promise.all(familias.map((f) => document.fonts.load('16px "' + f + '"')).concat(variantes.map((v) => document.fonts.load(v))));
      await document.fonts.ready;
    } catch (e) { /* se pagina igual */ }
    paginar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', empezar);
  else empezar();
})();
