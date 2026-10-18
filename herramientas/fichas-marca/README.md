# Fichas de La Marca del Estrecho

Este generador coge la ficha oficial de *Pulp Cthulhu* (Edge) y le pone encima, ya rellenos, los datos de los seis investigadores pregenerados. Añade además una tercera hoja de trasfondo propia: quién es cada uno, por qué le escribía Paco Guerrero y a quién conoce en el barco. Los PDF llevan campos de formulario que se editan con Adobe Reader, el navegador o cualquier lector de PDF. El generador también rehace la página web `/la-marca-del-estrecho/fichas`.

**Regla de oro: ni los PDF ni `fichas.html` se tocan a mano.** Se cambia `personajes.py` y se vuelve a ejecutar `generar.py`, que lo rehace todo.

| Archivo | Qué es |
|---|---|
| `personajes.py` | Los datos de los seis investigadores y la descripción de los talentos. **Es lo único que se edita.** |
| `generar.py` | El programa. También contiene el texto y el diseño de `fichas.html` y de la hoja de trasfondo. |
| `pulp-cthulhu-ficha.pdf` | La ficha oficial en blanco, sin campos. No se modifica. |
| `../formulario.py` | Código común con las fichas de Linares. |

Lo que sale va a `public/la-marca-del-estrecho/`:

- `fichas.html`: la página web con las vistas previas.
- En `investigadores/`:
  - un PDF de tres hojas por investigador (`ahmed-ben-hassan.pdf`, `elvira-soler.pdf`…)
  - `todos.pdf`, con los seis
  - `ficha-en-blanco.pdf`, solo las dos caras oficiales
  - tres JPG de vista previa por investigador (`ahmed-ben-hassan-1.jpg`, `-2.jpg` y `-3.jpg`)

---

## 1. Preparar el ordenador (solo la primera vez)

1. Instala **Python 3.10 o posterior** desde [python.org](https://www.python.org/downloads/). En Windows, marca «Add Python to PATH» durante la instalación.
2. Abre una terminal (PowerShell en Windows) e instala PyMuPDF:
   ```
   pip install pymupdf
   ```
3. Instala **Google Chrome**, que imprime la hoja de trasfondo. Si está en una ruta poco habitual, díselo al programa antes de ejecutarlo:
   ```powershell
   $env:CHROME = "D:\otra\ruta\chrome.exe"
   ```
4. **Hace falta conexión a internet** al generar, porque la hoja de trasfondo descarga sus letras de Google Fonts. Sin ellas sale con otra letra y descuadrada.

## 2. Hacer un cambio, paso a paso

Supongamos que quieres subir el Descubrir de Ahmed de 70 a 75.

**Paso 1. Trae lo último del repositorio.** El repo también se edita desde la web de GitHub, así que empieza siempre por aquí:
```
cd ruta/a/nephei-rpg
git pull
```

**Paso 2. Edita `herramientas/fichas-marca/personajes.py`.** Busca a Ahmed y cambia `'Descubrir': 70` por `'Descubrir': 75`. Más abajo, en «Qué hay en personajes.py», está qué significa cada campo.

**Paso 3. Genera las fichas:**
```
cd herramientas/fichas-marca
python generar.py
```
Tarda alrededor de un minuto, porque Chrome se abre (sin ventana) una vez por cada hoja de trasfondo. Al terminar, la lista de archivos escritos acaba así:
```
   fichas.html
   public\la-marca-del-estrecho\investigadores\ahmed-ben-hassan.pdf
   ...
   public\la-marca-del-estrecho\investigadores\ficha-en-blanco.pdf
```
Si solo has cambiado el texto de la página web y no los datos, `python generar.py --sin-pdf` rehace solo `fichas.html`, al instante.

Si sale un mensaje de error, consulta la sección 6.

**Paso 4. Revisa el resultado.** Abre las vistas previas de `public/la-marca-del-estrecho/investigadores/` (o el PDF):

- `ahmed-ben-hassan-1.jpg`: comprueba que pone 75, y que la mitad (37) y el quinto (15) se han recalculado.
- **Si has tocado algún texto, mira siempre también la hoja 3** (`ahmed-ben-hassan-3.jpg`). Es de tamaño fijo: si el texto es demasiado largo, el final se corta sin avisar (sección 4).

**Paso 5. Cambia lo mismo en los demás sitios que se mantienen a mano** (sección 5).

**Paso 6. Publica:**
```
cd ../..
git add -A
git commit -m "Marca: Descubrir de Ahmed a 75"
git push
```
Cada push a `main` se despliega solo en rpg.nephei.org en un par de minutos.

`git status` mostrará modificados **todos** los PDF, no solo el de Ahmed: llevan la fecha de creación dentro. Es normal y se pueden subir todos.

## 3. Qué hay en `personajes.py`

Cada investigador es un bloque `{ ... }` dentro de la lista `PERSONAJES`.

### Página 1 de la ficha

| Campo | Ejemplo | Dónde sale |
|---|---|---|
| `id` | `'ahmed-ben-hassan'` | Nombre de los archivos (`ahmed-ben-hassan.pdf`). Sin tildes, espacios ni mayúsculas. |
| `nombre`, `ocupacion`, `arquetipo`, `edad`, `sexo`, `nacimiento`, `residencia` | | Cabecera. Las líneas son cortas: si no cabe, la letra se encoge, así que mejor abreviar («El Atalayón, Melilla»). |
| `car` | `dict(FUE=50, CON=60, ...)` | Las ocho características. Se necesitan las ocho. |
| `suerte` | `55` | Queda rodeada con un círculo en la pista de Suerte. |
| `lengua` | `'Árabe'` | Lengua propia. Su valor es EDU. |
| `hab` | `{'Descubrir': 70, ...}` | Habilidades. Se pueden poner todas, pero basta con las que no tienen el valor de base. |
| `armas` | `[('Navaja', 'Combatir (Pelea)', '1D4+BD', '—', '1', '—', '—')]` | Tabla de armas, en este orden: nombre, **habilidad con que se usa**, daño, alcance, ataques, munición y avería. El porcentaje sale de la habilidad. Desarmado ya viene impreso; caben 4 armas más. |

### Página 2 de la ficha

| Campo | Ejemplo | Dónde sale |
|---|---|---|
| `talentos` | `['Vista aguda', 'Memoria fotográfica']` | Recuadro de Talentos, con su efecto. **Cada nombre tiene que estar en el diccionario `TALENTOS`** del final de `personajes.py`. Hay 5 líneas para todos; si no caben, la letra se encoge. |
| `equipo` | `['Trípode', 'Magnesio']` | Una línea de «Equipo» por elemento. Caben 14. |
| `dinero` | `'Acomodado. Lleva 200 pesetas.'` | Hay que mantener la forma **«Nivel. Lleva lo que sea.»**: lo de antes del primer punto va a «Nivel de gasto» (con las pesetas de Crédito al lado) y lo de detrás de «Lleva» a «Dinero». Los bienes los calcula el programa. |
| `rasgos` | `{'Descripción': '...', 'Allegados': '...'}` | Los recuadros del reverso. Valen estas claves: `Descripción`, `Ideología y creencias`, `Allegados`, `Lugares significativos`, `Posesiones preciadas`, `Rasgos`, `Lesiones y cicatrices`, `Fobias y manías`, `Tomos arcanos, hechizos y artefactos`, `Encuentros con entidades extrañas`. Las que no se ponen quedan en blanco. Cada recuadro tiene 3 líneas. |

### Hoja 3, de trasfondo

| Campo | Qué es |
|---|---|
| `quien` | Lista de párrafos: quién es. Va a dos columnas al principio de la hoja. La primera frase del primer párrafo es además el resumen de su tarjeta en `fichas.html`. |
| `guerrero` | Un párrafo: «Por qué te escribía Paco Guerrero». |
| `conoce` | Lista de pares `('Nombre', 'qué relación tienen.')`: «A quién conoces en el barco». Los nombres también salen en las Notas de la página 2 («Conoce en el barco a…»). Si el nombre empieza por «El» o «La», el programa lo pone en minúscula ahí. |

### Cómo se escriben las habilidades

Con el nombre exacto que trae la ficha. Las especialidades van entre paréntesis:

```python
'Ciencia (Química)': 41, 'Otras lenguas (Francés)': 35, 'Arte/Artesanía (Fotografía)': 75,
'Armas de fuego (Arma corta)': 60, 'Combatir (Pelea)': 40, 'Pilotar (Aeroplano)': 70,
```

- **Esquivar:** si no se pone, vale DES/2.
- **Crédito:** de él salen las pesetas del nivel de gasto y los bienes (tabla de los años 20, a 5 pesetas por dólar).
- **Huecos para especialidades:** 2 de Arte/Artesanía, 3 de Ciencia, 2 de Otras lenguas, 2 de Combatir (además de Pelea), 1 de Armas de fuego (además de Arma corta, Fusil/Escopeta y Subfusil), 1 de Pilotar y 1 de Supervivencia. Los ocupan las especialidades de valor más alto.
- **Lo que no tiene línea propia:**
  - Lo que sobra de cada familia, y las habilidades que la ficha de Pulp no trae (como Antropología), va a las **4 líneas libres** del final de la tercera columna.
  - Ahí sale con nombre corto: «Lengua: Inglés», «Antropología».
  - Si tampoco caben ahí, el programa se para y avisa.
- **Supervivencia sin especialidad** (`'Supervivencia': 30`) sale como «General».

### Lo que calcula el programa (no lo escribas)

- ½ y ⅕ de todo.
- Puntos de vida de Pulp: (CON+TAM)/5.
- Puntos de magia: POD/5.
- Cordura inicial: POD. Cordura máxima: 99 − Mitos de Cthulhu.
- MOV, con el descuento por edad.
- Bonificación al daño y Corpulencia.
- Los valores de base de las habilidades que no se ponen.
- Los bienes según Crédito.
- Los círculos de las pistas.
- Los «Compañeros héroes»: los demás pregenerados.

## 4. Cuánto texto cabe en la hoja 3

La hoja de trasfondo mide lo mismo que la ficha (210 × 273 mm) y no crece. Los textos de `quien`, `guerrero` y `conoce` empujan hacia abajo el recuadro de Notas, que se va haciendo más pequeño. Si te pasas, lo último se corta.

**Después de alargar cualquiera de esos textos, mira el JPG de la hoja 3:**

- La hoja tiene que acabar con el recuadro de **Notas**, con varias líneas en blanco.
- «Por qué no le contestaste» tiene que tener sus 4 líneas.
- Si las Notas han desaparecido o quedan una o dos líneas, acorta el texto.

## 5. Otros sitios donde aparecen los pregenerados

Estos se escriben a mano y el generador no los toca. Si cambia un dato que se ve en ellos, cámbialo también allí:

| Dónde | Qué hay |
|---|---|
| Libro del Guardián, capítulo 7 («Investigadores de ejemplo»). Está en el repo privado `ttrpg-resources-private`, en `keepers/la-marca-del-estrecho.html`. | La versión del Guardián de cada investigador. |
| `public/la-marca-del-estrecho/sinopsis.html` y `synopsis.html` (la versión en inglés) | La presentación para los jugadores. |
| `public/la-marca-del-estrecho/players.html` | Dice «seis personas» y «Descargar las seis»: cámbialo si cambia el número. |

### Añadir o quitar un investigador

1. Añade o borra su bloque en `personajes.py`. Caben hasta 9, por los 8 huecos de «Compañeros héroes». Si trae un talento nuevo, añade su descripción a `TALENTOS`.
2. Revisa los `conoce` de los demás, por si alguno lo nombraba.
3. En `generar.py`, cambia «seis» en el texto de la página web. Sale tres veces: en la `description`, en el párrafo de entrada y en el botón «Descargar los seis». Búscalo con Ctrl+F.
4. Ejecuta `python generar.py`. La tarjeta de `fichas.html` se crea sola.
5. Si lo has quitado, borra sus archivos viejos: `git rm public/la-marca-del-estrecho/investigadores/<id>*`.
6. Cámbialo en los sitios de la tabla de arriba.

Si cambias el `id` de alguien, pasa lo mismo: salen archivos con el nombre nuevo, los viejos se quedan y hay que borrarlos con `git rm`.

## 6. Si algo falla

| Mensaje | Qué pasa | Solución |
|---|---|---|
| `ModuleNotFoundError: No module named 'pymupdf'` | Falta PyMuPDF. | `pip install pymupdf` |
| `No encuentro Chrome: indica la ruta con la variable CHROME.` | Chrome no está instalado o está en otra carpeta. | Instálalo, o haz `$env:CHROME = "ruta\chrome.exe"` antes de `python generar.py`. |
| `No caben en la ficha de X: ...` | Hay más especialidades y habilidades sueltas que huecos (sección 3), o una habilidad mal escrita. | Corrige el nombre, o quita alguna. |
| `KeyError: 'Nombre de talento'` | Ese talento no está en `TALENTOS`. | Añádelo, o corrige cómo está escrito. |
| `KeyError: 'lengua'` (u otra clave) | Le falta un campo a un investigador. | Compara su bloque con el de otro investigador. |
| `No cabe: <texto>` | Un texto del reverso no entra en sus 3 líneas ni con la letra al mínimo. | Acórtalo. |
| `La hoja de trasfondo de X ocupa 2 páginas.` | La hoja 3 se ha desbordado. | Acorta `quien`, `guerrero` o `conoce`. |
| `SyntaxError` | Falta una coma, una comilla o un corchete en `personajes.py`. | Mira la línea que indica el error, o la anterior. |

Si cambias el diseño de la hoja de trasfondo (`CSS_TRASFONDO` en `generar.py`), el programa encuentra solo las rayas en blanco para ponerles campos. Las reconoce por ser azuladas: los filetes rojos de los títulos no reciben campo. Mantén esa diferencia de color.
