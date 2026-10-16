// Worker de rpg.nephei.org.
//
// Lo público (portada, recursos de los jugadores, las aventuras) son assets
// estáticos de public/ y no pasan por aquí. Este código solo atiende el área del
// Guardián de La Marca del Estrecho, que vive en el repo privado
// aifaro/ttrpg-resources-private (wrangler.jsonc manda aquí esas rutas con
// run_worker_first):
//
//   /la-marca-del-estrecho/keepers/            -> keepers.html del repo privado
//   /la-marca-del-estrecho/keepers/<ruta>      -> la misma ruta (+ .html si no lleva extensión)
//   POST /la-marca-del-estrecho/keepers/_guardar -> commit del Libro del Guardián
//
// Doble cerrojo: Cloudflare Access protege esas rutas y, además, este worker
// comprueba la firma del token de Access. Sin un token válido no sirve nada
// privado, aunque Access se desconfigure o el worker se publique en otro dominio.
//
// Configuración (Settings -> Variables and Secrets del worker):
//   GITHUB_PAT  secreto. Token fine-grained con Contents: Read and write en
//               ttrpg-resources-private (leer las páginas y guardar el libro).
//   EDITORES    opcional. Correos que pueden guardar el libro, separados por comas.
// ACCESS_TEAM y ACCESS_AUD están en wrangler.jsonc.

const GITHUB_USER = 'aifaro';
const PRIVATE_REPO = 'ttrpg-resources-private';
const GITHUB_BRANCH = 'main';

const PREFIJO = '/la-marca-del-estrecho/keepers';
const PORTADA = PREFIJO + '/keepers.html';

// El único fichero que se puede escribir desde la web, y la ruta que lo guarda.
const LIBRO = PREFIJO + '/la-marca-del-estrecho.html';
const RUTA_GUARDAR = PREFIJO + '/_guardar';

// Versión de /style.css que enlaza la cáscara de las páginas del Guardián.
// Súbela junto con la de las páginas de public/ cuando cambie la hoja.
const HOJA = '20261016';

const EDITORES_POR_DEFECTO = 'jesuspalfaro@gmail.com';

const MIME = {
  css: 'text/css;charset=UTF-8',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!esPrivado(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const quien = await identidadAccess(request, env);
    if (!quien) {
      return pagina(403, 'Solo para el Guardián',
        '<main class="perdido"><p class="numero">403</p><h1>Solo para el Guardián</h1>'
        + '<p>Esta parte del sitio necesita iniciar sesión.</p>'
        + '<p><a href="/la-marca-del-estrecho/players">&laquo; Recursos de los jugadores</a></p></main>');
    }

    if (url.pathname === RUTA_GUARDAR) {
      return guardar(request, env, url, quien);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    if (!env.GITHUB_PAT) {
      return new Response('Worker secret GITHUB_PAT is not set.', { status: 500 });
    }

    const ext = url.pathname.split('/').pop().split('.').pop().toLowerCase();
    if (MIME[ext]) {
      return servirFichero(url.pathname, ext, env);
    }
    return servirPagina(url.pathname, env);
  },
};

function esPrivado(path) {
  return path === PREFIJO || path.startsWith(PREFIJO + '/');
}

// ---------------------------------------------------------------- Access

let claves = null;
let clavesHasta = 0;

async function clavesAccess(env, forzar) {
  if (claves && !forzar && Date.now() < clavesHasta) return claves;
  const r = await fetch(`https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`certs de Access: ${r.status}`);
  const { keys } = await r.json();
  const nuevas = {};
  for (const k of keys) {
    nuevas[k.kid] = await crypto.subtle.importKey(
      'jwk', { kty: k.kty, n: k.n, e: k.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  }
  claves = nuevas;
  clavesHasta = Date.now() + 60 * 60 * 1000;
  return claves;
}

function base64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

// Devuelve el correo de quien ha pasado por Access, o null si el token falta,
// no es de esta aplicación, ha caducado o la firma no cuadra.
async function identidadAccess(request, env) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return null;
  const partes = jwt.split('.');
  if (partes.length !== 3) return null;
  let cabecera, carga;
  try {
    cabecera = JSON.parse(new TextDecoder().decode(base64url(partes[0])));
    carga = JSON.parse(new TextDecoder().decode(base64url(partes[1])));
  } catch (err) {
    return null;
  }
  if (cabecera.alg !== 'RS256') return null;

  let clave = (await clavesAccess(env))[cabecera.kid];
  if (!clave) clave = (await clavesAccess(env, true))[cabecera.kid]; // Access ha rotado claves
  if (!clave) return null;

  const firmaOk = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', clave, base64url(partes[2]),
    new TextEncoder().encode(partes[0] + '.' + partes[1]));
  if (!firmaOk) return null;

  const auds = Array.isArray(carga.aud) ? carga.aud : [carga.aud];
  if (!auds.includes(env.ACCESS_AUD)) return null;
  if (carga.iss !== `https://${env.ACCESS_TEAM}`) return null;
  if (typeof carga.exp !== 'number' || carga.exp * 1000 < Date.now()) return null;
  return carga.email || carga.sub || null;
}

function puedeGuardar(env, email) {
  const lista = env.EDITORES ? String(env.EDITORES) : EDITORES_POR_DEFECTO;
  return lista.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    .includes(String(email).trim().toLowerCase());
}

// ---------------------------------------------------------------- lectura

function cabecerasGitHub(env, extra) {
  return { 'User-Agent': 'nephei-rpg', 'Authorization': `token ${env.GITHUB_PAT}`, ...extra };
}

// Imágenes, PDF y CSS del repo privado.
async function servirFichero(path, ext, env) {
  const r = await fetch(
    `https://raw.githubusercontent.com/${GITHUB_USER}/${PRIVATE_REPO}/${GITHUB_BRANCH}${path}`,
    { headers: cabecerasGitHub(env) });
  if (!r.ok) {
    return new Response(`Not found: ${path}`, { status: 404 });
  }
  return new Response(r.body, {
    headers: {
      'Content-Type': MIME[ext],
      // Fuera de cachés compartidas, pero sí en la del navegador: un mapa pesa lo
      // suyo y se abre desde varios capítulos.
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

// Las páginas se leen por la API de contenidos y no por raw.githubusercontent:
// la CDN de raw tarda unos minutos en ver un commit, y el libro que se acaba de
// guardar desde la web tiene que verse al recargar.
async function servirPagina(path, env) {
  let ruta = path;
  if (ruta === PREFIJO || ruta === PREFIJO + '/') {
    ruta = PORTADA;
  } else if (!ruta.endsWith('.html')) {
    ruta = ruta.replace(/\/$/, '') + '.html';
  }

  const r = await fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${PRIVATE_REPO}/contents${ruta}?ref=${GITHUB_BRANCH}`,
    { headers: cabecerasGitHub(env, { 'Accept': 'application/vnd.github.raw' }) });

  if (r.status === 404) {
    return pagina(404, 'Página no encontrada',
      '<main class="perdido"><p class="numero">404</p><h1>Aquí no hay nada</h1>'
      + '<p>Esa página no existe en el área del Guardián.</p>'
      + `<p><a href="${PREFIJO}/">&laquo; Área del Guardián</a></p></main>`);
  }
  if (!r.ok) {
    return pagina(502, 'Error', `<main><h1>Error</h1><p>No se pudo leer la página de GitHub (estado ${r.status}).</p></main>`);
  }

  const bytes = new Uint8Array(await r.arrayBuffer());
  let html = new TextDecoder().decode(bytes);
  const cabeceras = {
    'content-type': 'text/html;charset=UTF-8',
    'Cache-Control': 'private, no-cache',
  };

  // Un HTML completo (el libro) se sirve tal cual. Al libro se le añade la
  // versión de la que sale: el modo edición la manda al guardar, y si en GitHub
  // hay otra, el commit se rechaza en vez de pisarla. El serializador la quita.
  const t = html.trimStart().toLowerCase();
  if (t.startsWith('<!doctype html') || t.startsWith('<html')) {
    if (ruta === LIBRO) {
      html = html.replace('<head>', `<head>\n<meta name="git-sha" content="${await shaBlob(bytes)}">`);
    }
    return new Response(html, { headers: cabeceras });
  }

  // Un fragmento (portada del Guardián, ayudas, características) va dentro de la
  // cáscara del sitio, la misma que llevan escrita las páginas de public/.
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const titulo = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : 'Área del Guardián';
  return pagina(200, titulo, html);
}

function pagina(status, titulo, contenido) {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · La Marca del Estrecho</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#16130f">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/style.css?v=${HOJA}">
</head>
<body class="sitio">
<nav class="barra"><a class="marca" href="/">rpg<span>·</span>nephei</a><a href="https://nephei.org">nephei.org</a></nav>
<div class="container">
${contenido}
</div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html;charset=UTF-8', 'Cache-Control': 'private, no-cache' },
  });
}

// SHA de git de un fichero (el de su objeto blob), el mismo que da la API.
async function shaBlob(bytes) {
  const cabecera = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const todo = new Uint8Array(cabecera.length + bytes.length);
  todo.set(cabecera);
  todo.set(bytes, cabecera.length);
  const digest = await crypto.subtle.digest('SHA-1', todo);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- guardado

function base64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json;charset=UTF-8', 'Cache-Control': 'no-store' },
  });
}

// Guarda el libro: un commit en el repo privado con el HTML que manda el modo
// edición. Solo escribe LIBRO, y solo si la versión de GitHub es la que se
// editó (sha); si no, 409 y el navegador descarga los cambios para no perderlos.
async function guardar(request, env, url, quien) {
  if (request.method !== 'POST') {
    return json({ error: 'Solo POST.' }, 405);
  }
  // Access deja leer a quien la política permita; guardar, solo a los editores.
  if (!puedeGuardar(env, quien)) {
    return json({ error: 'Esta cuenta puede leer el libro, pero no guardarlo.' }, 403);
  }
  // Contra formularios de otras webs que intenten usar la sesión del Guardián.
  if (request.headers.get('Origin') !== url.origin) {
    return json({ error: 'Origen no permitido.' }, 403);
  }
  if (!env.GITHUB_PAT) {
    return json({ error: 'Worker secret GITHUB_PAT is not set.' }, 500);
  }

  let datos;
  try {
    datos = await request.json();
  } catch (err) {
    return json({ error: 'La petición no es JSON.' }, 400);
  }
  const { contenido, sha, mensaje } = datos || {};
  // Una red mínima para no vaciar el libro por un error del navegador.
  if (typeof contenido !== 'string' || !/^\s*<!doctype html/i.test(contenido)
      || !contenido.includes('id="editor-texto"') || contenido.length < 100000) {
    return json({ error: 'El contenido no parece el libro entero.' }, 400);
  }
  if (typeof sha !== 'string' || !/^[0-9a-f]{40}$/.test(sha)) {
    return json({ error: 'Falta la versión de partida (sha).' }, 400);
  }

  const asunto = (typeof mensaje === 'string' && mensaje.trim())
    ? mensaje.trim().replace(/\s+/g, ' ').slice(0, 120)
    : 'Libro: retoques de texto desde el modo edición';
  const respuesta = await fetch(
    `https://api.github.com/repos/${GITHUB_USER}/${PRIVATE_REPO}/contents${LIBRO}`,
    {
      method: 'PUT',
      headers: cabecerasGitHub(env, {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        message: `${asunto}\n\nGuardado desde el modo edición del libro por ${quien}.`,
        content: base64(new TextEncoder().encode(contenido)),
        sha,
        branch: GITHUB_BRANCH,
      }),
    }
  );

  if (respuesta.ok) {
    const r = await respuesta.json();
    return json({ ok: true, sha: r.content.sha, commit: r.commit.html_url }, 200);
  }
  if (respuesta.status === 409) {
    return json({ error: 'El libro ha cambiado en GitHub desde que abriste la página.' }, 409);
  }
  if (respuesta.status === 403 || respuesta.status === 404) {
    return json({ error: 'El token del worker no tiene permiso para escribir en el repo privado.' }, 502);
  }
  return json({ error: `GitHub respondió ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}` }, 502);
}
