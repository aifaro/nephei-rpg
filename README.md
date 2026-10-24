# nephei-rpg

[rpg.nephei.org](https://rpg.nephei.org): aventuras y utilidades para juegos de rol. La portada solo enlaza a las dos secciones: `/aventuras` (`public/aventuras.html`) y `/utilidades` (`public/utilidades.html`); cada aventura o utilidad nueva es una tarjeta `article.aventura` en su página de sección.

- **La Marca del Estrecho** (Pulp Cthulhu, Ceuta, 1921). En desarrollo. El material del Guardián vive en el repositorio privado `ttrpg-resources-private`.
- **La maldición del Palacio de Linares** (La llamada de Cthulhu 7.ª ed., Madrid, 1920). Completa.
- **Generador de personajes** (`/generador`): la ficha oficial de 7.ª edición o de Pulp rellenable en el navegador, con asistente de creación (7.ª edición y Pulp) y descarga en PDF. Todo en el navegador, sin servidor. Ver [herramientas/generador/README.md](herramientas/generador/README.md).

## Estructura

| Ruta | Qué es |
|---|---|
| `public/` | Todo lo público, servido tal cual como assets estáticos. La URL espeja la ruta: `/la-marca-del-estrecho/players` es `public/la-marca-del-estrecho/players.html`. |
| `public/style.css` | La hoja única del sitio, también la del Libro del Guardián. Si cambias el bloque «SITIO», sube el `?v=` de las páginas de `public/` y la constante `HOJA` de `src/worker.js`. |
| `public/generador.html`, `public/generador/` | El generador de personajes. Las fichas en blanco, sus fondos y `fichas.json` los genera `herramientas/generador/preparar.py`. |
| `src/worker.js` | Solo atiende `/la-marca-del-estrecho/keepers/…`: lee las páginas del repo privado, verifica el token de Cloudflare Access y guarda el libro desde su modo edición. |
| `wrangler.jsonc` | Configuración del Worker `nephei-rpg`. |

## Las fichas de los pregenerados

Los investigadores pregenerados de las dos aventuras están en las fichas oficiales de Edge, en PDF rellenable (se editan con Adobe Reader o el navegador). Los PDF, sus vistas previas y, en La Marca, la página `fichas.html` **los genera un programa a partir de un archivo de datos: no se editan a mano.**

| Aventura | Ficha | Datos | Instrucciones |
|---|---|---|---|
| La Marca del Estrecho | Pulp Cthulhu, más una hoja de trasfondo propia | `herramientas/fichas-marca/personajes.py` | [herramientas/fichas-marca/README.md](herramientas/fichas-marca/README.md) |
| La maldición del Palacio de Linares | 7.ª edición, años 20 | `herramientas/fichas-linares/personajes.py` | [herramientas/fichas-linares/README.md](herramientas/fichas-linares/README.md) |

En los dos casos el ciclo es el mismo: `git pull`, cambiar `personajes.py`, ejecutar `python generar.py` en su carpeta, revisar las vistas previas JPG y hacer push. Los README de cada carpeta lo explican paso a paso, con lo que hay que instalar, qué significa cada campo, qué otras páginas hay que cambiar a mano y qué hacer si sale un error.

`herramientas/` no se sirve: el worker solo publica `public/`. Las piezas comunes de los dos generadores están en `herramientas/formulario.py`.

## El área del Guardián

`/la-marca-del-estrecho/keepers/…` está detrás de Cloudflare Access y, además, el worker comprueba la firma del token de Access: sin él no sirve nada privado.

Las páginas se leen del repo privado en cada visita, así que lo que se edita allí (en local, desde la web de GitHub o con el botón «Guardar» del libro) se ve al recargar, sin desplegar nada.

Necesita, en *Settings → Variables and Secrets* del worker:

- `GITHUB_PAT` (secreto): token *fine-grained* con **Contents: Read and write** sobre `ttrpg-resources-private`.
- `EDITORES` (opcional): correos que pueden guardar el libro, separados por comas. Por defecto, solo el del autor.

## Abrir el área del Guardián

Cuando La Marca del Estrecho esté lista para publicarse, el área del Guardián se puede abrir igual que la de Linares sin mover nada de sitio: las páginas siguen leyéndose del repo privado y el libro se sigue guardando desde la web.

1. En `wrangler.jsonc`, `"GUARDIAN_PUBLICO": "si"`. Leer deja de pedir sesión; guardar la sigue pidiendo (token de Access válido y correo en la lista de editores), y las páginas dejan de llevar `noindex`.
2. En Cloudflare Access, la aplicación «La Marca del Estrecho Keepers Section» pasa a cubrir solo `rpg.nephei.org/la-marca-del-estrecho/keepers/_guardar` y `…/keepers/_entrar`, en vez de todo `/keepers`.
3. En `public/robots.txt`, quitar la línea `Disallow`.
4. Quitar el candado del botón «Keeper's area» de la portada.

Con el área abierta, para editar el libro se entra primero por `/la-marca-del-estrecho/keepers/_entrar`: pide la sesión de Access y vuelve al libro con ella iniciada, de modo que «Guardar» funciona como siempre.

## Despliegue

El repositorio está conectado al Worker `nephei-rpg` con Workers Builds: cada push a `main` lo despliega.
