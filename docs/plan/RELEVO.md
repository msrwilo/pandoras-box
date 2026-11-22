# Relevo de Pandora's Box: plan 1.4 a 1.6

Este archivo es la memoria de trabajo entre chats. Cada chat lo lee al empezar y lo actualiza al terminar.
No se instala en la app (el actualizador ignora `docs/` salvo `GUIA.md`).

## Reglas para cualquier chat

1. Hablar con Wilo en español, directo. No inventar: lo que no se probó se dice.
2. El código vive en GitHub (`msrwilo/pandoras-box`). La app instalada está en `E:\Pandora` y **se actualiza sola desde `main`** (lib/actualizar.js): lo que llega a `main` llega a su PC en menos de 30 minutos.
   - Trabajar cada etapa en una rama (`etapa-1-recientes`, etc.). Pasar a `main` solo cuando `npm test` pase y la etapa esté completa.
   - Para probar, Wilo usa Ajustes › Biblioteca › «Buscar actualización ahora». No copiar archivos a mano a `E:\Pandora`: el actualizador los regresaría a lo que hay en `main`.
   - Si cambian dependencias o la versión de Electron, la app no se actualiza sola: hay que armar zip. Evitarlo.
3. Nunca tocar `E:\Pandora\datos` (favoritos, estadísticas, marcas privadas) ni `E:\LaunchBox`. No borrar archivos: lo que sobre va a una carpeta papelera.
4. Pandora tiene reglas de diseño propias: cada tema respeta el estilo de su consola. No aplicar la guía de La Fortaleza.
5. La versión pública no lleva logos ni sonidos originales de consolas.
6. Todo cambio se anota en `docs/GUIA.md` (cómo se usa) y en este archivo (qué se hizo, qué falta). Subir la versión en `package.json` al cerrar cada etapa.
7. Al terminar el chat, o antes de quedarse sin espacio, actualizar la sección «Estado» de este archivo, subirlo, y darle a Wilo el **prompt exacto para el siguiente chat** y el modelo que conviene. Si la etapa no terminó, el prompt dice en qué punto quedó.
8. Antes de empezar, decirle a Wilo cuánto tiempo se calcula y cuánto de ese tiempo lo necesita presente.

## Datos que ya existen (no hay que buscarlos fuera)

- `lib/meta.js` ya lee de LaunchBox, por juego: `community` (calificación de la comunidad de LaunchBox, 0 a 5), `votes` (cuántos votos), `stars` (calificación del propio Wilo), `genres`, `developer`, `series`, `modes`, `maxPlayers`, `year`, `platform`.
- `datos/estadisticas.json` guarda por juego `{ plays, seconds, last }` (`last` = última vez jugado).
- `public/core.js` ya tiene entrada táctil base (`pointerdown`, `draggable`, clase `touch` en el body). De 29 temas con `home.js`, 23 mencionan puntero o clic; no se ha auditado cuáles funcionan de verdad.

## Etapas

### Etapa 0 (5 min, dentro del primer chat): confirmar que el actualizador funciona — HECHA (parcial: ver «Estado»)
La 1.3.0 se probó con un GitHub simulado, nunca contra el real. Revisar en `E:\Pandora\datos\registro.txt` las líneas «Actualización» o pedirle a Wilo que pulse «Buscar actualización ahora». Si falla, arreglar eso primero: todo lo demás depende de ello.

### Etapa 1: Recientes (versión 1.4.0) — modelo: Sonnet — HECHA, ver «Estado»
- Sección nueva «Recientes» en el inicio y su lista: los juegos jugados, del más reciente al más viejo, máximo 20. Sale de `estadisticas.json` (`last`), sin leer nada más, para que sea instantánea.
- Se puede mostrar u ocultar en Ajustes › Inicio, como las demás secciones. Si no hay partidas, la sección no aparece.
- Debe verse en los 30 temas (revisar cómo cada `home.js` pinta las secciones; lo ideal es que salga del mecanismo común, no tema por tema).
- Prueba en `test/pandora.test.js`: orden y límite de 20.

### Etapa 2: Táctil (versión 1.5.0) — modelo: Opus — EN CURSO (2a y 2b en la 1.4.1; 2c, primera tanda, en la 1.4.2)
Wilo usa una laptop 2K táctil y también toca la pantalla a través de Moonlight.
- 2a. Auditoría: lista escrita aquí de qué no responde al tacto, por pantalla (inicio de cada tema, listas, ficha, ajustes, teclado de búsqueda, visor de manuales, modo espectador, menús) y por tema. Preguntarle a Wilo qué funciones notó rotas y en qué temas.
- 2b. Lo común primero: tocar = elegir, deslizar = moverse, un «volver» y un acceso a Ajustes y Buscar visibles solo en modo táctil, favorito con toque largo, áreas de toque de buen tamaño.
- 2c. Temas, en tandas de unos 10 por chat. Cada tanda se sube y Wilo la prueba con el dedo antes de seguir.
- No romper control ni teclado. Lo táctil solo aparece cuando se toca la pantalla.

### Etapa 3: Recomendados (versión 1.6.0) — motor: Opus; pantalla: Sonnet
Solo recomienda juegos **instalados** que Wilo no ha jugado (o casi no).
- Fuente de calificación: la de la comunidad de LaunchBox, que ya está en la biblioteca. Metacritic no ofrece API pública. Si se quiere una segunda fuente (IGDB o RAWG, gratis con registro), el chat debe verificar en internet su estado y condiciones actuales antes de proponerla; va como mejora opcional, no como requisito.
- 3a. Motor en `lib/recomendar.js`, con pruebas. Puntaje = parecido (género, serie, desarrolladora, plataforma, época) × calificación ponderada por número de votos. Sin repetir sagas enteras: máximo 2 por serie en cada fila.
- 3b. Pantalla «Recomendados» con filas:
  1. Porque jugaste *(último juego)*
  2. Para ti (según todo tu historial, pesando el tiempo jugado)
  3. Para jugar acompañado (multijugador y cooperativo)
  4. En 3D
  5. En 2D
  6. Joyas que no has tocado (mejor calificados sin ninguna partida)
  7. Más de tus series favoritas
  8. Partidas cortas (arcade y similares), si los datos alcanzan
- 2D/3D no existe como dato en LaunchBox: se deduce de plataforma y género, con una lista de excepciones corregible. Decirle a Wilo que habrá errores al principio.
- Con poco historial, las filas 1 y 2 se apoyan en favoritos y en la calificación.

### Cierre
Zip de la versión final para Releases (partiendo del zip anterior, cambiando solo lo modificado) y notas del release.

## Auditoría táctil (2a), 21 nov 2026

Lo que dijo Wilo: nada está roto; el toque por Moonlight cae directo donde pone el dedo (la app recibe un dedo, no un ratón); lo siente poco fluido **en el inicio** y en general.

Lo que encontré en el código (antes de la 1.4.1):
- **Inicio, 29 de 30 temas:** no se podía deslizar. Solo había clics: tocar elige y tocar otra vez abre. Cambiar de sección o recorrer una lista larga pedía muchos toques. Solo el cubo tenía arrastre.
- **Arrastre común** (`core.js › draggable`, lo usan el cubo, la fila de plataformas y la lista de juegos): (1) al pasar el umbral de 10 px el contenido daba un salto de 10 px; (2) la velocidad salía de los últimos 6 eventos sin importar su edad, así que si el dedo se detenía antes de soltar, igual lanzaba; (3) no leía los puntos intermedios del movimiento.
- **Favorito:** solo con el botón LS; no había gesto.
- **Botón volver** de 34 px y pistas tocables de 28 px: chicos para el dedo. El resaltado `:hover` se quedaba pegado tras tocar.
- **Ajustes:** la lista ya se desplaza con el desplazamiento nativo del navegador (tiene inercia propia). No se tocó.
- **No auditado con el dedo todavía:** ficha, visor de manuales, teclado de búsqueda, modo espectador, selector (picker). Quedan para la 2c o para un repaso.

## Estado

- 21 nov 2026 (segundo chat): **etapa 2 en curso. 2a y 2b hechas y en `main` como 1.4.1.** Falta la 2c (temas en tandas) y cerrar la etapa como 1.5.0.
  - Se subió a `main` antes de cerrar la etapa porque el actualizador solo baja `main` y el plan pide que Wilo pruebe con el dedo antes de seguir. La 1.5.0 se pone al terminar la 2c.
  - Wilo confirmó que la actualización real a la 1.4.0 funcionó: **etapa 0 probada completa.** Recientes funciona y no reportó fallas.
- **2b, qué se hizo (1.4.1):**
  - `core.js › draggable`: el contenido arranca en 0 al pasar el umbral (sin salto); la velocidad sale solo de los últimos 100 ms (si el dedo se detiene, no lanza); usa `getCoalescedEvents`; ignora un segundo dedo.
  - `core.js › swipeActions` (nuevo): en el inicio de los temas que solo entienden acciones, deslizar emite izquierda/derecha/arriba/abajo, un paso cada 7 rem en horizontal y 4,5 rem en vertical (el primero a media distancia), y al soltar con impulso hasta 6 pasos más, espaciados. Se corta si un paso abre otra pantalla. Solo dedo o lápiz; el ratón no. Un tema que haga su propio arrastre 1:1 debe declarar `ownTouch: true` y se apaga este.
  - `core.js › longPress` (nuevo) y un atajo global del clic: tras un deslizamiento o un toque largo, el clic de soltar no cuenta, aunque lo que estaba bajo el dedo se haya redibujado.
  - `app.js`: `swipeActions` en `#homeTheme` (todos menos el cubo); toque largo = favorito en la lista de juegos.
  - `cubo/theme.css` (es la hoja base de todos): `#homeTheme` con `touch-action: none`; en modo táctil las pistas tocables y el botón volver miden al menos 2,75 rem y el `:hover` no se queda pegado.
  - `docs/GUIA.md`: sección «Con el dedo». `package.json` en 1.4.1.
- **Qué se probó y cómo:** `npm test` pasa (5 de 5). Chrome sin pantalla, con toques simulados de dedo (DevTools, `Input.dispatchTouchEvent`) contra el servidor real y una biblioteca falsa de 30 juegos:
  - En los 30 temas: deslizar hace lo mismo que la flecha del teclado en cada eje (si la flecha mueve, el dedo mueve; si no, tampoco). Sin errores de JavaScript.
  - Arrastre medido: el primer movimiento tras el umbral es de 2 px, no de 12. Soltar tras 250 ms quieto da velocidad 0; soltar en movimiento sí lanza.
  - Toque largo marca y desmarca favorito sin abrir la ficha. Botones de 39 px de alto.
  - En disco, esfera, luna y naranja, «derecha» entra a la sección (así lo hace también la flecha) y, si la sección tiene un solo elemento, abre su lista. Con el dedo pasa igual: un deslizamiento largo hacia la izquierda puede terminar abriendo una lista. Revisar en la 2c si conviene que en esos temas el dedo no entre solo.
- **Qué NO se probó:** con la pantalla táctil real de la laptop ni por Moonlight; la sensación (si los pasos de 7 y 4,5 rem se sienten bien) solo la puede juzgar Wilo; ficha, manuales, teclado de búsqueda y espectador con el dedo.
- **Pendiente de Wilo:** actualizar («Buscar actualización ahora»), y con el dedo en el inicio de su tema: deslizar a los lados y arriba/abajo, soltar con impulso, dejar el dedo quieto en un juego de una lista. Decir qué tema usa y si los pasos se sienten muy cortos, muy largos o bien.
- **2c, cómo seguir:** en los temas cuyo inicio es una fila o rueda (donde el contenido debería ir pegado al dedo, no a pasos), cambiar a arrastre 1:1 con `draggable` + `Spring` + `project`, como el cubo, y declarar `ownTouch: true`. Tandas de unos 10 temas por chat, empezando por el que Wilo usa.
- 21 nov 2026 (tercer chat): **2c, primera tanda, hecha y en `main` como 1.4.2.** Misma razón que la 1.4.1 para subir a `main` antes de cerrar la etapa.
  - Lo que dijo Wilo de la 1.4.1 (probada con el dedo en la laptop y por Moonlight): usa el **cubo**; los pasos se sienten bien, pero «le falta un poquito de inercia para que se sienta el peso». Pidió que en disco, esfera, luna y naranja el dedo no entre solo.
  - **Cubo** (`app.js › cubeHome.initDrag`): al soltar lanza mucho más (`project(v, 0.996)` en vez de 0.99; antes un deslizamiento normal no pasaba de una cara), hasta 8 caras; cada cara que pasa suena; el título cambia en vivo mientras arrastras; el eje (girar o inclinar) se fija al empezar; inclinar respeta el impulso y se estira con resistencia en los extremos; tocar mientras gira lo detiene sin abrir; un toque siempre termina de llegar a una cara (antes podía quedar a medio giro).
  - **`core.js › dragRow`** (nuevo, en `api.dragRow` para los temas): fila o rueda pegada al dedo en un eje, lo elegido cambia en vivo, al soltar sigue con inercia (`0.996`, máximo 12 elementos) sonando en cada elemento, banda elástica en los extremos, tocar detiene. Modo `free` (la fila se mueve sin cambiar lo elegido, como Switch). Marca su elemento con `data-own-touch="x|y"`: `swipeActions` le deja ese eje y sigue atendiendo el otro (revisa la ruta del evento, porque algunas filas rehacen sus elementos a media gesto). Solo dedo o lápiz. Escucha el soltar en la ventana para no quedarse trabada.
  - `draggable` ahora también se traga el clic de soltar tras arrastrar.
  - `swipeActions` acepta `allow(acción)`; un tema declara `noSwipe(a)` para los pasos que no se dan con el dedo.
  - **Temas con arrastre 1:1** (10): barra (categorías a los lados y elementos arriba/abajo, en un escenario nuevo `.xmb-stage`), mosaicos (`free`), alas, vapor, vitrina, monolito (cada fila y las filas), manzana (cada fila y las filas), paneles (cada panel; su lista ahora tiene `touch-action: pan-y` y se desplaza nativa), órbita (`.sa-moons` ya recibe el dedo y va antes que la barra), volumen. En vapor, vitrina, monolito y manzana la fila ahora se ve estirarse antes del primer elemento.
  - **Disco, esfera, luna y naranja:** `noSwipe` impide que el dedo entre a una sección o abra algo; para eso se toca.
  - `docs/GUIA.md` («Con el dedo») actualizada. `package.json` en 1.4.2.
- **Qué se probó (tercer chat) y cómo:** `npm test` pasa (5 de 5). Chrome sin pantalla con toques de dedo por DevTools contra el servidor real y una biblioteca falsa de 72 juegos en 12 plataformas (arnés fuera del repo):
  - Cubo: arrastre lento avanza una cara con título en vivo; lanzar avanza varias; tocar mientras gira lo detiene en una cara y no abre; golpe corto hacia arriba va a Espectador; arrastre vertical corto regresa sin cambiar nada.
  - Barra, alas, vapor, vitrina, monolito, manzana, órbita, volumen: arrastre lento elige en vivo, lanzar recorre varios y regresa, tocar detiene a medio camino, deslizar en el otro eje sobre la fila sigue cambiando de sección. Mosaicos: la fila se desplaza y lo elegido no cambia hasta tocar.
  - Disco, esfera, luna, naranja: deslizar largo o lanzar en cualquier dirección ya no sale del inicio.
  - Los 30 temas: gestos en los dos ejes y flechas del teclado, **sin errores de JavaScript**; el teclado sigue moviendo igual. En Órbita, tocar pestañas y opciones sigue funcionando.
- **Qué NO se probó:** nada con la pantalla táctil real ni por Moonlight; la sensación de peso e inercia solo la puede juzgar Wilo. En **paneles** no se pudo medir el lanzamiento: el Chrome sin tarjeta gráfica entrega un movimiento cada 200-350 ms con ese tema; el arrastre lento sí se probó. El control con gamepad no se probó (no hay uno aquí), aunque su código no se tocó.
- **Pendiente de Wilo:** «Buscar actualización ahora» (1.4.2). En el cubo: girar lento, lanzar fuerte, tocar mientras gira, inclinar con un golpe corto. Decir si la inercia ya tiene peso, si lanza demasiado o poco. Si puede, probar uno o dos temas de la tanda (por ejemplo Barra o Manzana) y uno de los cuatro que ya no entran solos.
- **2c, siguiente tanda:** temas que quedan con pasos y cuyo diseño puede pedir arrastre 1:1: **tarjeta** (abanico), **lavanda** (cartuchos en fila), **plaza** (semicírculo), **canales** (cuadrícula por páginas: deslizar de página pegado al dedo), **torres**, **doble**, **relieve**, **anillo**. Los de texto o lista con cursor (basic, símbolo, gris, pantalla, ficha, rojo, índigo) probablemente se quedan con pasos; decidirlo al revisar cada uno. Usar `api.dragRow` (ver el uso en vapor, monolito o mosaicos). Después: repaso con el dedo de ficha, visor de manuales, teclado de búsqueda, espectador y selector; luego cerrar la etapa como 1.5.0.
- Pendiente aparte: anotar Pandora en la bóveda de Obsidian (Wilo debe decir en qué carpeta van sus notas de Pandora).
