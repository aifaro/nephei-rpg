# Fichas de La maldición del Palacio de Linares

Este generador coge la ficha oficial de *La llamada de Cthulhu* 7.ª edición (Edge, años 20) y le pone encima, ya rellenos, los datos de los cinco investigadores pregenerados. El resultado son PDF con campos de formulario que se editan con Adobe Reader, el navegador o cualquier lector de PDF.

**Regla de oro: los PDF no se tocan a mano.** Se cambia `personajes.py` y se vuelve a ejecutar `generar.py`, que lo rehace todo.

| Archivo | Qué es |
|---|---|
| `personajes.py` | Los datos de los cinco investigadores. **Es lo único que se edita.** |
| `generar.py` | El programa que hace los PDF. Solo hay que tocarlo si cambia la ficha oficial. |
| `coc-7ed-1920.pdf` | La ficha oficial en blanco, sin campos. No se modifica. |
| `../formulario.py` | Código común con las fichas de La Marca del Estrecho. |

Lo que sale va a `public/la-maldicion-de-linares/investigadores/`:

- `elena-arrieta.pdf`, `julia-ortega.pdf`… (uno por investigador)
- `todos.pdf` (los cinco en un archivo)
- `ficha-en-blanco.pdf`
- `elena-arrieta-1.jpg`, `elena-arrieta-2.jpg`… (las vistas previas de la web)

---

## 1. Preparar el ordenador (solo la primera vez)

1. Instala **Python 3.10 o posterior** desde [python.org](https://www.python.org/downloads/). En Windows, marca «Add Python to PATH» durante la instalación.
2. Abre una terminal (PowerShell en Windows) e instala PyMuPDF:
   ```
   pip install pymupdf
   ```
3. Comprueba que funciona: `python -c "import pymupdf; print(pymupdf.VersionBind)"` debe escribir un número de versión (se ha probado con la 1.28).

## 2. Hacer un cambio, paso a paso

Supongamos que quieres subir el Descubrir de Elena de 60 a 65.

**Paso 1. Trae lo último del repositorio.** El repo también se edita desde la web de GitHub, así que empieza siempre por aquí:
```
cd ruta/a/nephei-rpg
git pull
```

**Paso 2. Edita `herramientas/fichas-linares/personajes.py`.** Busca a Elena y cambia `'Descubrir': 60` por `'Descubrir': 65`. Más abajo, en «Qué hay en personajes.py», está qué significa cada campo.

**Paso 3. Genera las fichas:**
```
cd herramientas/fichas-linares
python generar.py
```
El programa escribe cada archivo según lo va creando y termina sin errores en unos segundos:
```
   public\la-maldicion-de-linares\investigadores\elena-arrieta.pdf
   ...
   public\la-maldicion-de-linares\investigadores\ficha-en-blanco.pdf
```
Si en vez de eso sale un mensaje de error, consulta la sección 5.

**Paso 4. Revisa el resultado.** Abre `public/la-maldicion-de-linares/investigadores/elena-arrieta-1.jpg` (o el PDF) y comprueba que pone 65, y que la mitad (32) y el quinto (13) se han recalculado.

**Paso 5. Cambia lo mismo en las páginas de la aventura**, que se mantienen a mano (sección 4).

**Paso 6. Publica:**
```
cd ../..
git add -A
git commit -m "Linares: Descubrir de Elena a 65"
git push
```
Cada push a `main` se despliega solo en rpg.nephei.org en un par de minutos.

`git status` mostrará modificados **todos** los PDF, no solo el de Elena: llevan la fecha de creación dentro. Es normal y se pueden subir todos.

## 3. Qué hay en `personajes.py`

Cada investigador es un bloque `{ ... }` dentro de la lista `PERSONAJES`:

| Campo | Ejemplo | Dónde sale |
|---|---|---|
| `slug` | `'elena-arrieta'` | Nombre de los archivos (`elena-arrieta.pdf`). Sin tildes, espacios ni mayúsculas. |
| `nombre`, `ocupacion`, `genero`, `edad`, `residencia`, `nacimiento` | | Cabecera de la ficha. Las líneas son cortas: si no cabe, la letra se encoge, así que mejor abreviar («Calle del Pez, Madrid»). |
| `car` | `{'FUE': 45, 'CON': 55, ...}` | Las ocho características. Se necesitan las ocho. |
| `suerte` | `60` | Queda rodeada con un círculo en la pista de Suerte. |
| `hab` | `{'Descubrir': 60, ...}` | **Solo las habilidades que no tienen el valor de base.** Las demás las pone el programa. |
| `armas` | `[('Porra', 65, '1D6+BD', 'Contacto', '1', '—', '—')]` | Tabla de armas, en este orden: nombre, %, daño, alcance, ataques, munición y avería. Desarmado ya viene impreso; caben 4 armas más. |
| `equipo` | `['Bolso', 'Una lupa']` | Una línea de «Equipo y posesiones» por elemento. Caben 14. |
| `descripcion`, `ideologia`, `allegados`, `lugares`, `posesiones`, `rasgos` | | Los recuadros del reverso. Cada uno tiene 3 líneas; si el texto es largo, la letra se encoge. |
| `trasfondo`, `motivo` | | El recuadro de Notas del reverso («Por qué está aquí: …»). |

### Cómo se escriben las habilidades

Con el nombre exacto que trae la ficha. Las especialidades van entre paréntesis:

```python
'Ciencia (Química)': 50, 'Otras lenguas (Latín)': 50, 'Arte/Artesanía (Fotografía)': 45,
'Armas de fuego (Arma corta)': 55, 'Combatir (Pelea)': 65,
```

- **Lengua propia:** siempre sale «Español» con el valor de EDU, así que no se pone.
- **Esquivar:** si no se pone, vale DES/2.
- **Crédito:** de él salen el nivel de gasto, el dinero y los bienes (tabla de los años 20, a 5 pesetas por dólar).
- **Huecos para especialidades:** 3 de Arte/Artesanía, 3 de Ciencia, 3 de Otras lenguas, 2 de Combatir (además de Pelea), 1 de Armas de fuego (además de Arma corta y Fusil/Escopeta), 1 de Pilotar y 1 de Supervivencia. Se rellenan por orden alfabético.

### Lo que calcula el programa (no lo escribas)

- ½ y ⅕ de todo.
- Puntos de vida: (CON+TAM)/10.
- Puntos de magia: POD/5.
- Cordura inicial: POD. Cordura máxima: 99 − Mitos de Cthulhu.
- MOV, con el descuento por edad.
- Bonificación al daño y Corpulencia.
- Dinero según Crédito.
- Los círculos de las pistas.
- Los «Compañeros investigadores» del reverso: los demás pregenerados.

## 4. Otros sitios donde aparecen los pregenerados

Estas páginas se escriben a mano y el generador no las toca. Si cambia un dato que se ve en ellas, cámbialo también allí:

| Página | Qué hay |
|---|---|
| `public/la-maldicion-de-linares/aventura.html`, sección `id="pregenerados"` | El resumen de cada investigador (características, habilidades, trasfondo). |
| `public/la-maldicion-de-linares/aventura.pdf` | El PDF de la aventura. **Hay que regenerarlo después de cambiar `aventura.html`** (ver abajo). |
| `public/la-maldicion-de-linares/sinopsis.html` | La presentación de cada investigador para los jugadores. |
| `public/la-maldicion-de-linares/fichas.html` | La galería de fichas: nombre, ocupación y una frase de cada uno. |
| `public/la-maldicion-de-linares/players.html` | Dice «los cinco investigadores»: cámbialo si cambia el número. |

**Regenerar `aventura.pdf`** (necesita Google Chrome). Desde la raíz del repo, en PowerShell:
```powershell
$raiz = (Get-Location).Path -replace '\\','/'
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --no-pdf-header-footer --virtual-time-budget=30000 `
  --print-to-pdf="$PWD\public\la-maldicion-de-linares\aventura.pdf" "file:///$raiz/public/la-maldicion-de-linares/aventura.html?paginar"
```
Tarda unos 20 segundos. Chrome escribe varias líneas `ERROR:...` que no importan; lo que cuenta es la última: `... bytes written to file ...`. El `?paginar` del final es imprescindible, porque activa la maquetación por hojas.

### Añadir o quitar un investigador

1. Añade o borra su bloque en `personajes.py`. Caben hasta 9, por los 8 huecos de «Compañeros investigadores».
2. Ejecuta `python generar.py`.
3. Si lo has quitado, borra sus archivos viejos: `git rm public/la-maldicion-de-linares/investigadores/<slug>*`.
4. En `fichas.html`, copia o borra su `<article class="pj">…</article>`. Cada uno enlaza `<slug>.pdf`, `<slug>-1.jpg` y `<slug>-2.jpg`, así que cambia el slug en todos los enlaces. Cambia también «cinco» en el texto y en el botón «Descargar las cinco fichas».
5. Haz lo mismo en las páginas de la tabla de arriba.

Si cambias el `slug` de alguien, pasa lo mismo: salen archivos con el nombre nuevo, los viejos se quedan y hay que borrarlos y corregir los enlaces de `fichas.html`.

## 5. Si algo falla

| Mensaje | Qué pasa | Solución |
|---|---|---|
| `ModuleNotFoundError: No module named 'pymupdf'` | Falta PyMuPDF. | `pip install pymupdf` |
| `No caben en la ficha de X: Ciencia (Física), ...` | Hay más especialidades que huecos (sección 3), o una habilidad mal escrita (`'Descubir'`, `'Otras Lenguas (Latín)'`…). | Corrige el nombre, o quita una especialidad. |
| `KeyError: 'FUE'` (u otra clave) | Le falta un campo a un investigador. | Compara su bloque con el de otro investigador. |
| `SyntaxError` | Falta una coma, una comilla o un corchete en `personajes.py`. | Mira la línea que indica el error, o la anterior. |
| El texto sale diminuto | No cabe en sus 3 líneas y el programa ha encogido la letra. | Acórtalo. |

Una comprobación rápida: abre los JPG de la carpeta `investigadores/`, que muestran el aspecto final.
