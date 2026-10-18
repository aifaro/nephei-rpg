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

## Las fichas de La Marca del Estrecho

`/la-marca-del-estrecho/fichas` enseña los seis investigadores pregenerados y `/la-marca-del-estrecho/investigadores/` guarda sus PDF: uno por personaje, `todos.pdf`, `ficha-en-blanco.pdf` y las vistas previas JPG. Cada PDF tiene tres hojas: las dos caras de la ficha oficial de Pulp Cthulhu (Edge) con campos de formulario ya rellenos, y una hoja de trasfondo propia (quién es, por qué le escribía Guerrero, a quién conoce en el barco) con campos en sus líneas en blanco.

No se editan a mano. Los datos están en `herramientas/fichas-marca/personajes.py`; lo derivado (½ y ⅕, puntos de vida de Pulp, movimiento, bonificación al daño, puntos de magia, Cordura, bienes según Crédito) lo calcula el generador. La ficha original, sin campos, está en `herramientas/fichas-marca/pulp-cthulhu-ficha.pdf`. Necesita PyMuPDF y, para la hoja de trasfondo, Google Chrome:

```
cd herramientas/fichas-marca
python generar.py            # página, PDF y vistas previas
python generar.py --sin-pdf  # solo la página
```

Si cambia un pregenerado, cámbialo también en el Libro del Guardián (capítulo 7, «Investigadores de ejemplo») y en las dos sinopsis. `herramientas/` no se sirve: el worker solo publica `public/`. Las piezas comunes de las dos fichas (campos, círculos de las pistas, tabla de Crédito) están en `herramientas/formulario.py`.

## Las fichas de La maldición del Palacio de Linares

`/la-maldicion-de-linares/fichas` enseña los cinco pregenerados sobre la ficha oficial de 7.ª edición (Edge, años 20) y `/la-maldicion-de-linares/investigadores/` guarda sus PDF rellenables: uno por personaje, `todos.pdf`, `ficha-en-blanco.pdf` y las vistas previas JPG.

La ficha original, sin campos, está en `herramientas/fichas-linares/coc-7ed-1920.pdf`. El generador le pone encima campos de formulario ya rellenos (con lo derivado calculado: ½ y ⅕, PV, PM, MOV, BD, Corpulencia, dinero según Crédito a 5 pesetas por dólar) y una casilla sobre cada número de las pistas que, marcada, lo rodea con un círculo. Necesita PyMuPDF:

```
cd herramientas/fichas-linares
python generar.py
```

Si cambia un pregenerado, cámbialo en `personajes.py`, en la aventura (`#pregenerados`) y en la sinopsis.

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
