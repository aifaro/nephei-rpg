# Generador de personajes

[rpg.nephei.org/generador](https://rpg.nephei.org/generador): rellenar la ficha oficial de *La llamada de Cthulhu* 7.ª edición (años 20) o de *Pulp Cthulhu* en el navegador, con un asistente de creación paso a paso, y descargarla en PDF rellenable.

**Todo pasa en el navegador.** No hay servidor detrás: los personajes se guardan en el `localStorage` del navegador de cada cual (clave `nephei-generador-v1`; el asistente, en `nephei-generador-asistente-v1`), y el PDF se rellena en el propio navegador con [pdf-lib](https://pdf-lib.js.org/). El worker no interviene: son assets estáticos de `public/`.

## Archivos

| Archivo | Qué es | ¿Se edita a mano? |
|---|---|---|
| `public/generador.html` | La página (barra, diálogos, textos de ayuda). | Sí |
| `public/generador/generador.css` | Estilos del generador; usa las variables de `/style.css`. | Sí |
| `public/generador/editor.js` | El editor: dibuja la ficha, calcula lo derivado, guarda en el navegador, retrato y descarga del PDF. | Sí |
| `public/generador/asistente.js` | El asistente de creación (7.ª edición y Pulp). | Sí |
| `public/generador/datos.js` | Reglas, habilidades, ocupaciones y tablas de trasfondo sacadas del *Manual del Guardián* (Edge), con la página de cada cosa. | Sí |
| `public/generador/datos-pulp.js` | Arquetipos, talentos, ocupaciones y tablas de trasfondo de *Pulp Cthulhu* (Edge, capítulo 2). | Sí |
| `public/generador/pdf-lib.min.js` | pdf-lib 1.17.1, copiada de cdnjs. Se carga solo al descargar. | No |
| `public/generador/coc.pdf`, `pulp.pdf` | Las fichas en blanco con campos de formulario. | **No: las genera `preparar.py`** |
| `public/generador/coc-1.jpg` … `pulp-2.jpg` | El fondo de cada cara, sin campos. | **No: `preparar.py`** |
| `public/generador/fichas.json` | Posición, letra y alineación de cada campo, el hueco del retrato y qué campo es cada habilidad. | **No: `preparar.py`** |
| `herramientas/generador/preparar.py` | Saca todo lo anterior de los generadores de pregenerados. | Solo si cambia la geometría |

## Cómo encaja con las fichas de los pregenerados

Las fichas en blanco del generador son exactamente las de `herramientas/fichas-linares` (7.ª edición) y `herramientas/fichas-marca` (Pulp): `preparar.py` importa sus `generar.py` y llama a su `rellenar(…, None)`. Si se toca la geometría de una ficha allí (posiciones, nombres de campos), hay que volver a ejecutar:

```
cd herramientas/generador
python preparar.py
```

y subir los archivos que cambien en `public/generador/`. El programa se para si encuentra dos campos con el mismo nombre (pdf-lib y los lectores de PDF los tratarían como uno solo).

Después de cambiar un `.js` o el `.css`, sube su `?v=` en `generador.html` para que los navegadores no usen la copia vieja.

## Qué calcula el editor

Con la casilla «Calcular solo…» del menú «Más» activada (lo normal):

- Mitad y quinto de cada característica, habilidad y arma.
- Puntos de Vida: (CON+TAM)/10, o /5 en Pulp. Puntos de Magia: POD/5. Cordura inicial: POD; máxima: 99 − Mitos de Cthulhu.
- MOV (con el descuento por edad), Bonificación al daño y Corpulencia, Esquivar = DES/2, Lengua propia = EDU.
- Desarmado = Combatir (Pelea); Esquivar del recuadro de combate = Esquivar.
- Nivel de gasto, dinero y bienes según el Crédito (tabla de los años 20 o actual, en dólares o en pesetas a 5 por dólar).
- Rodea en las pistas los PV, PM y la Cordura iniciales.

Un valor calculado se recalcula mientras nadie lo toque; si se escribe a mano algo distinto, se respeta (el editor recuerda el último valor que puso él, en `auto`).

## El asistente

Primero se elige el juego. Lo que se haya escrito en el trasfondo se conserva al cambiar de juego; las tiradas y elecciones, no.

**La llamada de Cthulhu 7.ª edición** sigue el capítulo 3 del *Manual del Guardián*: edad, características (tiradas o método rápido, opción 5), ajustes por edad con las tiradas de mejora de EDU y la Suerte, atributos derivados, ocupación (las 25 ocupaciones de ejemplo de las págs. 42-43), puntos de ocupación o valores del método rápido (con el exceso de Crédito), intereses particulares, trasfondo con las tablas de las págs. 45-48, retrato, dinero y equipo.

**Pulp Cthulhu** sigue el capítulo 2 de su manual: arquetipo (22, con su característica principal, que se tira con 1D6+13×5 o vale 90 en la creación rápida), edad sin modificadores, Suerte 2D6+6×5, dos talentos (elegidos o al azar, con los obligatorios de Despiadado y Místico), PV = (CON+TAM)/5, MOV sin descuento por edad, las 68 ocupaciones pulp (págs. 26-36), 100 puntos de arquetipo, intereses particulares y las tablas de trasfondo de Pulp. El manual de Pulp en español no trae tabla de Lugares significativos: se usa la del *Manual del Guardián*. Las reglas opcionales del Pulpómetro (PV /10, más o menos talentos) no están.

Al final crea un personaje nuevo en el editor. Las especialidades que no vienen impresas van a las líneas en blanco de su familia y, si no caben, a las líneas libres del final de la tercera columna; lo que tampoco cabe se apunta en Notas. En Pulp, los talentos van a su recuadro.

Pendiente, si se quiere: la tabla de armas del manual para elegirlas de una lista.
