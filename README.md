# nephei-rpg

[rpg.nephei.org](https://rpg.nephei.org): aventuras de La llamada de Cthulhu ambientadas en la España de los años veinte.

- **La Marca del Estrecho** (Pulp Cthulhu, Ceuta, 1921). En desarrollo. El material del Guardián vive en el repositorio privado `ttrpg-resources-private`.
- **La maldición del Palacio de Linares** (La llamada de Cthulhu 7.ª ed., Madrid, 1920). Completa.

## Estructura

| Ruta | Qué es |
|---|---|
| `public/` | Todo lo público, servido tal cual como assets estáticos. La URL espeja la ruta: `/la-marca-del-estrecho/players` es `public/la-marca-del-estrecho/players.html`. |
| `public/style.css` | La hoja única del sitio, también la del Libro del Guardián. Si cambias el bloque «SITIO», sube el `?v=` de las páginas de `public/` y la constante `HOJA` de `src/worker.js`. |
| `src/worker.js` | Solo atiende `/la-marca-del-estrecho/keepers/…`: lee las páginas del repo privado, verifica el token de Cloudflare Access y guarda el libro desde su modo edición. |
| `wrangler.jsonc` | Configuración del Worker `nephei-rpg`. |

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
