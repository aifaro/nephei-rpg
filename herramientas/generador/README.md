# Generador de personajes

Rellenar en el navegador una ficha oficial, con un asistente de creación paso a paso, y descargarla en PDF rellenable. Tres pestañas, cada una con su página y su estilo:

- [/generador](https://rpg.nephei.org/generador): *La llamada de Cthulhu* 7.ª edición (años 20) y *Pulp Cthulhu*.
- [/generador/delta-green](https://rpg.nephei.org/generador/delta-green): agentes de *Delta Green* (hoja de Devir en español), con aire de expediente clasificado.
- [/generador/dnd](https://rpg.nephei.org/generador/dnd): *Dungeons & Dragons* 5.ª edición (hoja de 2014 en español), en pergamino y rojo dragón.

**Todo pasa en el navegador.** No hay servidor detrás: los personajes se guardan en el `localStorage` del navegador de cada cual (clave `nephei-generador-v1`, compartida por las tres pestañas: cada una enseña solo los suyos y recuerda el último abierto en `actuales`; los asistentes, en `nephei-generador-asistente-v1`, `-asistente-dg-v1` y `-asistente-dnd-v1`), y el PDF se rellena en el propio navegador con [pdf-lib](https://pdf-lib.js.org/). El worker no interviene: son assets estáticos de `public/`.

## Archivos

| Archivo | Qué es | ¿Se edita a mano? |
|---|---|---|
| `public/generador.html` | La pestaña de Cthulhu (barra, diálogos, textos de ayuda). | Sí |
| `public/generador/delta-green.html`, `dnd.html` | Las pestañas de Delta Green y D&D. Cada página dice su juego en `body[data-familia]` (`cthulhu`, `dg`, `dnd`) y su tema en la clase (`tema-dg`, `tema-dnd`). | Sí |
| `public/generador/generador.css` | Estilos del generador; usa las variables de `/style.css`. | Sí |
| `public/generador/editor.js` | El editor: dibuja la ficha, calcula lo derivado, guarda en el navegador, retrato y descarga del PDF. | Sí |
| `public/generador/asistente.js` | El asistente de creación (7.ª edición y Pulp). | Sí |
| `public/generador/asis-comun.js` | Piezas comunes de los asistentes de Delta Green y D&D (marco del diálogo, pasos, dados). | Sí |
| `public/generador/asistente-dg.js`, `datos-dg.js` | El asistente de Delta Green y sus datos: profesiones, las 14 agencias del *Agent's Handbook* con sus unidades, paquetes de bonificación, veteranos, Lazos y armas. | Sí |
| `public/generador/asistente-dnd.js`, `datos-dnd.js` | El asistente de D&D 5.ª (nivel 1) y sus datos: razas, clases, trasfondos, trucos y conjuros de nivel 1, armas, armaduras y paquetes. | Sí |
| `public/generador/datos.js` | Reglas, habilidades, ocupaciones y tablas de trasfondo sacadas del *Manual del Guardián* (Edge), con la página de cada cosa. | Sí |
| `public/generador/datos-pulp.js` | Arquetipos, talentos, ocupaciones y tablas de trasfondo de *Pulp Cthulhu* (Edge, capítulo 2). | Sí |
| `public/generador/pdf-lib.min.js` | pdf-lib 1.17.1, copiada de cdnjs. Se carga solo al descargar. | No |
| `public/generador/coc.pdf`, `pulp.pdf`, `dg.pdf`, `dnd.pdf` | Las fichas en blanco con campos de formulario. | **No: las genera `preparar.py`** |
| `public/generador/coc-1.jpg` … `dnd-3.jpg` | El fondo de cada cara, sin campos. | **No: `preparar.py`** |
| `public/generador/fichas.json` | Posición, letra y alineación de cada campo, el hueco del retrato y qué campo es cada habilidad. | **No: `preparar.py`** |
| `herramientas/generador/preparar.py` | Saca todo lo anterior de los generadores de pregenerados. | Solo si cambia la geometría |

## De dónde salen las fichas

Las fichas en blanco de Cthulhu son exactamente las de `herramientas/fichas-linares` (7.ª edición) y `herramientas/fichas-marca` (Pulp); las de Delta Green y D&D salen de `herramientas/fichas-dg` y `herramientas/fichas-dnd`, que solo existen para el generador. `preparar.py` importa sus `generar.py` y llama a su `rellenar(…, None)`. Si se toca la geometría de una ficha (posiciones, nombres de campos), hay que volver a ejecutar:

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

## Delta Green

La ficha es `herramientas/fichas-dg/delta-green.pdf`: la hoja de personaje de Devir sin su primera cara (la apaisada, que repite lo de las otras dos) y con una casilla de mejora dibujada en la segunda línea de cada habilidad con especialidad. La saca `fichas-dg/generar.py` del original de Descargas; `python generar.py prueba` rellena un agente de ejemplo para ver la geometría. Los campos van en Courier, como a máquina. No tiene hueco para retrato.

El editor calcula el ×5, los PS ((FUE+CON)/2 redondeando hacia arriba), los PV (POD), la COR (POD×5; máximo 99 − Antinatural), el Punto de Ruptura (COR − POD) y el valor de cada Lazo con nombre (CAR).

El asistente sigue el capítulo «Agents» del *Agent's Handbook* (Arc Dream, 2024), con los nombres de *Delta Green: Confidencial* y de la hoja española: agencia y unidad (con lo que pueden detener, gastar y pedir, págs. 104-163), profesión (las 6 básicas, las 12 adicionales y las propias de unidades como el HRT, los SEAL o el SAD/SOG), características (4D6 quitando el menor, conjuntos fijos o 72 puntos) y rasgos distintivos, ocho bonificaciones de +20 o un paquete, el trasfondo de veterano, Lazos, motivaciones, datos personales, equipo de serie y armas. Donde *Confidencial* y el *Agent's Handbook* no coinciden (HUMINT base 0 % o 10 %, el segundo idioma del antropólogo 30 % o 40 %), manda el *Agent's Handbook*.

## D&D 5.ª edición

La ficha es `herramientas/fichas-dnd/dnd-5e.pdf`, la hoja oficial española de 2014 (tres caras de imagen, sin vectores: las posiciones se midieron sobre una rejilla en puntos). Los campos van en Helvetica. El retrato va en «Aspecto del personaje», en la segunda cara.

El editor calcula los modificadores, el bonificador por competencia con la suma de los números de «Clase y nivel», las salvaciones y habilidades marcadas como competentes (el círculo), la Percepción pasiva, la iniciativa y, con la aptitud mágica (FUE…CAR o el nombre), la CD y el ataque de conjuros. La pericia no se calcula: el asistente la escribe a mano y el editor la respeta.

El asistente crea personajes de nivel 1 con el *Player's Handbook* de 2014 (hay un PDF en inglés en Descargas): 9 razas con subrazas y la variante humana, 12 clases con los dominios, patrones y orígenes de nivel 1, estilos de combate, enemigo predilecto y pericia, conjunto estándar, compra de puntos o tiradas, 13 trasfondos (las sugerencias de personalidad son propias, no las tablas del libro), habilidades, idiomas, trucos y conjuros de nivel 1, equipo inicial con la CA y los ataques calculados, y personalidad. Los nombres de los conjuros siguen el índice en español de aidedd.org.

Pendiente, si se quiere: niveles por encima del 1 en D&D; las dotes, con su efecto; el oro inicial en vez del equipo de clase.
