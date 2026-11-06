# nephei-rpg

[rpg.nephei.org](https://rpg.nephei.org): aventuras y utilidades para juegos de rol. La portada solo enlaza a las dos secciones: `/aventuras` (`public/aventuras.html`) y `/utilidades` (`public/utilidades.html`); cada aventura o utilidad nueva es una tarjeta `article.aventura` en su página de sección.

- **La Marca del Estrecho** (Pulp Cthulhu, Ceuta, 1921). En desarrollo. El material del Guardián vive en el repositorio privado `ttrpg-resources-private`.
- **La maldición del Palacio de Linares** (La llamada de Cthulhu 7.ª ed., Madrid, 1920). Adaptación de *La Casa Corbitt*. Aquí solo está lo de los jugadores (`players`, `sinopsis`, `fichas`); el texto de la aventura es privado, en `cuaderno/la-maldicion-de-linares.html` del repo `ttrpg-resources-private`, porque la política de fans de Chaosium no cubre reescribir sus aventuras.
- **Vieja Escuela** (`/vieja-escuela`): resumen de reglas y comparación con D&D 2024, y la aventura *La Bestia de Farton*, con jugadores (`/players`) y cuaderno del máster público (`/master`, `/aventura`). El cuaderno se monta con `herramientas/bestia-farton/montar.py` desde `cuerpo.html`; `cuaderno.css` y `paginador.js` se editan directamente en `public/`. Si cambia el cuaderno, regenerar `aventura.pdf` con `python montar.py pdf` (servidor en `public/` en el puerto 8765).
- **Generador de personajes** (`/generador`): la ficha oficial de 7.ª edición o de Pulp rellenable en el navegador, con asistente de creación (7.ª edición y Pulp) y descarga en PDF. Todo en el navegador, sin servidor. Ver [herramientas/generador/README.md](herramientas/generador/README.md).

## Estructura

| Ruta | Qué es |
|---|---|
| `public/` | Todo lo público, servido tal cual como assets estáticos. La URL espeja la ruta: `/la-marca-del-estrecho/players` es `public/la-marca-del-estrecho/players.html`. |
| `public/style.css` | La hoja única del sitio, también la del Libro del Guardián. Si cambias el bloque «SITIO», sube el `?v=` de las páginas de `public/` y la constante `HOJA` de `src/worker.js`. |
| `public/generador.html`, `public/generador/` | El generador de personajes. Las fichas en blanco, sus fondos y `fichas.json` los genera `herramientas/generador/preparar.py`. |
| `src/worker.js` | Solo atiende las zonas privadas, `/la-marca-del-estrecho/keepers/…` y `/cuaderno/…`: lee las páginas del repo privado, verifica el token de Cloudflare Access y guarda el libro desde su modo edición. |
| `wrangler.jsonc` | Configuración del Worker `nephei-rpg`. |

## Las fichas de los pregenerados

Los investigadores pregenerados de las dos aventuras están en las fichas oficiales de Edge, en PDF rellenable (se editan con Adobe Reader o el navegador). Los PDF, sus vistas previas y, en La Marca, la página `fichas.html` **los genera un programa a partir de un archivo de datos: no se editan a mano.**

| Aventura | Ficha | Datos | Instrucciones |
|---|---|---|---|
| La Marca del Estrecho | Pulp Cthulhu, más una hoja de trasfondo propia | `herramientas/fichas-marca/personajes.py` | [herramientas/fichas-marca/README.md](herramientas/fichas-marca/README.md) |
| La maldición del Palacio de Linares | 7.ª edición, años 20 | `herramientas/fichas-linares/personajes.py` | [herramientas/fichas-linares/README.md](herramientas/fichas-linares/README.md) |

En los dos casos el ciclo es el mismo: `git pull`, cambiar `personajes.py`, ejecutar `python generar.py` en su carpeta, revisar las vistas previas JPG y hacer push. Los README de cada carpeta lo explican paso a paso, con lo que hay que instalar, qué significa cada campo, qué otras páginas hay que cambiar a mano y qué hacer si sale un error.

`herramientas/` no se sirve: el worker solo publica `public/`. Las piezas comunes de los dos generadores están en `herramientas/formulario.py`.

## Licencias de lo que no es nuestro

El código del repositorio es GPL 3, pero el material de Vieja Escuela conserva sus licencias, que no son la misma para todo:

| Qué | Licencia |
|---|---|
| Manual, y lo derivado de él: `public/vieja-escuela.html`, `public/generador/datos-ve.js`; la hoja: `herramientas/fichas-ve/vieja-escuela.pdf`, `public/generador/ve*` | CC BY-SA 4.0 (el manual es también OGL 1.0a; se usa la CC) |
| Texto de *La Bestia de Farton* y de su cuaderno (`public/vieja-escuela/la-bestia-de-farton/`, `herramientas/bestia-farton/cuerpo.html`) | **OGL 1.0a, sin CC**. Exige llevar copia de la licencia (está al final del cuaderno) y no indicar compatibilidad con marcas ajenas: en esas páginas no se nombra D&D |
| Portada y mapas de la aventura, incluidos los modificados (`.../img/`), y el término «Vieja Escuela» | CC BY-NC-SA 4.0: el sitio tiene que seguir sin ánimo de lucro para usarlos |

## El área del Guardián

`/la-marca-del-estrecho/keepers/…` está detrás de Cloudflare Access y, además, el worker comprueba la firma del token de Access: sin él no sirve nada privado.

Las páginas se leen del repo privado en cada visita, así que lo que se edita allí (en local, desde la web de GitHub o con el botón «Guardar» del libro) se ve al recargar, sin desplegar nada.

Necesita, en *Settings → Variables and Secrets* del worker:

- `GITHUB_PAT` (secreto): token *fine-grained* con **Contents: Read and write** sobre `ttrpg-resources-private`.
- `EDITORES` (opcional): correos que pueden guardar el libro, separados por comas. Por defecto, solo el del autor.

## El Cuaderno del Guardián (`/cuaderno`)

Notas privadas y aventuras publicadas por otros, reescritas para uso personal (por ejemplo, *Azul miedo, rojo nival*, de *La Piel de Toro 1936*, o el texto de *La maldición del Palacio de Linares*). **No se publica nunca**: vive en la carpeta `cuaderno/` del repo privado y el worker la sirve solo con sesión de Access, aunque `GUARDIAN_PUBLICO` valga `"si"`. Ni el contenido ni los mapas pasan por este repo público.

- `/cuaderno/` es `cuaderno/index.html` (fragmento con la cáscara del sitio); `/cuaderno/<nombre>` es `cuaderno/<nombre>.html`.
- Cloudflare Access debe cubrir `rpg.nephei.org/cuaderno`. Lo más sencillo es añadirlo como destino a la aplicación de Access que ya protege `/keepers`. Si se crea una aplicación aparte, su AUD se añade a `ACCESS_AUD` en `wrangler.jsonc`, separada por una coma: el worker rechaza cualquier token cuya AUD no esté en esa lista.
- `public/robots.txt` lo excluye y las páginas llevan `noindex`.

## Abrir el área del Guardián

Cuando La Marca del Estrecho esté lista para publicarse, el área del Guardián se puede abrir igual que la de Linares sin mover nada de sitio: las páginas siguen leyéndose del repo privado y el libro se sigue guardando desde la web.

1. En `wrangler.jsonc`, `"GUARDIAN_PUBLICO": "si"`. Sin sesión solo se leen la portada, el libro, las ayudas y las características (la lista `PUBLICAS` de `src/worker.js`; el manuscrito archivado y `imagenes/` quedan fuera hasta añadirlos ahí). Guardar sigue pidiendo sesión (token de Access válido y correo en la lista de editores). Las páginas con la cáscara del sitio dejan de llevar `noindex`, pero el libro lo lleva escrito en su `<head>` y hay que quitárselo a mano.
2. En Cloudflare Access, la aplicación «La Marca del Estrecho Keepers Section» pasa a cubrir solo `rpg.nephei.org/la-marca-del-estrecho/keepers/_guardar` y `…/keepers/_entrar`, en vez de todo `/keepers`.
3. En `public/robots.txt`, quitar la línea `Disallow`.
4. Quitar el candado del botón «Keeper's area» de la portada.

Con el área abierta, para editar el libro se entra primero por `/la-marca-del-estrecho/keepers/_entrar`: pide la sesión de Access y vuelve al libro con ella iniciada, de modo que «Guardar» funciona como siempre.

## Despliegue

El repositorio está conectado al Worker `nephei-rpg` con Workers Builds: cada push a `main` lo despliega.
