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

### Etapa 2: Táctil (versión 1.5.0) — modelo: Opus — EN CURSO (2a y 2b en la 1.4.1; 2c en la 1.4.2 y 1.4.3; repaso de pantallas en la 1.4.4)
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
- **Ficha, visor, teclado de búsqueda, espectador y selector:** auditados en el cuarto chat (ver «Estado», 1.4.4).

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
- 21 nov 2026 (cuarto chat): **2c, segunda tanda, hecha y en `main` como 1.4.3.** Con esto la 2c queda completa para los temas de fila o rueda.
  - Lo que dijo Wilo de la 1.4.2: el cubo «ya tiene peso» y todo funciona bien en todos los temas. No hubo que ajustar nada.
  - **`core.js › dragRow`**: dos opciones nuevas. `invert` (una perilla que va con el dedo en vez de contenido que se arrastra; con `maxFling: 0` se queda donde se suelta) y `paging` (páginas completas: un golpe de más de 250 px/s pasa una página aunque el dedo haya recorrido poco; si no, regresa o avanza según pase de la mitad).
  - **Tarjeta**: el abanico va pegado al dedo (paso 7,2 rem). `.tg-deck` ahora recibe el dedo en toda la pantalla (antes tenía `pointer-events: none`), así se arrastra desde cualquier parte.
  - **Lavanda**: la fila de cartuchos va pegada al dedo (11,6 rem). El interruptor de secciones se arrastra arriba/abajo con `invert` y `maxFling: 0`: la perilla va con el dedo. `pickSec` cambia de sección sin el sonido de error.
  - **Plaza**: el semicírculo gira con el dedo (12,9 rem, lo que mide un paso cerca del centro). La tira de íconos de abajo es `free` (se desplaza sin cambiar lo elegido); su Spring `strip` ahora guarda directamente el primer ícono visible (`lead()`), y si el dedo la dejó en otro lugar, se queda ahí mientras lo elegido siga a la vista.
  - **Canales**: la página va pegada al dedo con `paging`; se queda la misma casilla en la página nueva. No se mueve con la vista previa abierta. `.wii-pages` ahora mide toda la pantalla para recibir el dedo entre canales. Arriba/abajo sigue a pasos (filas).
  - **Torres**: la lista de secciones va pegada al dedo en vertical (4,2 rem); para entrar se toca. Los cubos son `free` en vertical por filas (16,2 rem), con la misma regla que plaza (`rowLead()`).
  - **Doble**: los botones de abajo van pegados al dedo (15,4 rem).
  - **Relieve**: los íconos son `free` en horizontal por columnas (9,6 rem), misma regla (`lead()`). El deslizador «3D» se arrastra con el dedo (código propio, no `dragRow`; marca `data-own-touch="y"`): suena en cada cuarto y al soltar queda en el cuarto más cercano, igual que LT/RT, y se guarda.
  - **Anillo**: se queda con pasos. Es una lista con cursor; cada paso del dedo (4,5 rem) mide casi un renglón (4,2 rem), y sus pestañas son una franja de 3 rem donde un arrastre 1:1 casi no tendría dónde agarrar.
  - `docs/GUIA.md` («Con el dedo») actualizada. `package.json` en 1.4.3.
- **Qué se probó (cuarto chat) y cómo:** `npm test` pasa (5 de 5). Chrome sin pantalla (1920×1080, 1 rem = 20 px) con toques de dedo por DevTools contra el servidor real y una biblioteca falsa de 132 juegos en 22 plataformas (16 consolas, para tener filas largas). Arnés fuera del repo, en puppeteer-core:
  - Tarjeta, lavanda, plaza (semicírculo), doble: arrastre lento de dos elementos elige el segundo; lanzar recorre hasta el final; lanzar de regreso y tocar lo detiene a medio camino sin abrir; teclado y cambio de sección siguen.
  - Plaza (tira), torres (cubos), relieve (íconos): el contenido sigue al dedo (266/276, 476/486 y 278/288 px; la diferencia son los 10 px del umbral); soltar quieto deja una columna o fila exacta; lanzar avanza más; lo elegido no cambia hasta tocar, y al tocar la cuadrícula no salta.
  - Lavanda (perilla): arrastrar dos renglones cambia dos secciones; un golpe corto cambia solo una (sin inercia); tocar una etiqueta sigue funcionando.
  - Canales: la página sigue al dedo (290 de 300 px); soltar quieto antes de la mitad regresa; arrastrar más de la mitad pasa; un golpe corto de 120 px pasa de página; en la última página no pasa; con la vista previa abierta el dedo no mueve páginas.
  - Torres (lista): arrastrar dos renglones cambia dos secciones sin entrar. Relieve (deslizador): abajo del todo = 0 y se guarda; a la mitad queda en 0,5.
  - Los 30 temas: gestos lentos y lanzados en los dos ejes en tres alturas de pantalla, **sin errores de JavaScript** y sin salir del inicio (el cubo va a Espectador con un golpe vertical, como antes).
  - Teclado: la misma secuencia de 15 teclas en los 8 temas de la tanda, contra `main` sin los cambios: mismo elemento elegido y misma posición (solo difieren 1 px de animaciones en curso, también en anillo, que no se tocó). «Derecha, abajo, izquierda, arriba» no regresa al punto de partida en disco, esfera, luna, manzana, mosaicos y naranja, **igual que en `main`**: no es de esta tanda.
- **Qué NO se probó:** nada con la pantalla táctil real ni por Moonlight; la sensación solo la juzga Wilo. El gamepad (no hay uno aquí; su código no se tocó). No se revisaron con el dedo los temas de lista con cursor (basic, símbolo, gris, pantalla, ficha, rojo, índigo): siguen a pasos como en la 1.4.1.
- **Pendiente de Wilo:** «Buscar actualización ahora» (1.4.3). Probar con el dedo al menos tarjeta, lavanda (fila y perilla), canales (pasar página con golpe corto) y relieve (cuadrícula y deslizador 3D). Decir si algo se siente raro.
- 21 nov 2026 (cuarto chat, después de la 1.4.3): **repaso con el dedo de ficha, visor, teclado de búsqueda, espectador y selector, en `main` como 1.4.4.**
  - **Auditoría** (biblioteca falsa con capturas, caja, manual PDF de 8 páginas y videos de 4 s en Sega Genesis):
    - Ficha: los botones miden 88 px o más y se tocan; la descripción se desplaza nativa con el dedo (160 px en un arrastre de 175). Sin cambios.
    - Selector («Más» → Manual, Serie, Favorito): filas de 60 px, tocar elige. Sin cambios.
    - Teclado de búsqueda: la pista «Buscar» (55 px) lo abre; teclas de 102×72 px; tocar escribe, «Borrar» borra, «Listo» cierra. Sin cambios en el teclado.
    - **Espectador: el dedo no hacía nada** (solo el botón volver). **Visor de imágenes y manual: deslizar no hacía nada** (tocar las mitades sí pasaba).
    - **Deslizar a los lados sacaba al navegador de la página** (gesto de «atrás» de Chrome) en las pantallas sin `touch-action: none`: teclado, ficha y, en el arnés, también el cubo. En Pandora instalada probablemente no pasa (la ventana de Electron carga una sola dirección y no tiene página anterior), pero no se pudo comprobar aquí.
  - **Arreglos:**
    - `core.js › swipeActions`: opción `once` (un solo paso por deslizamiento).
    - `app.js`: `swipeActions` en `#spectator` (a los lados = video siguiente/anterior; arriba/abajo = filtro; `once`, sin inercia) y en `#viewer` (a los lados = imagen o página; arriba/abajo solo en el manual por páginas; nada en video, que usa sus controles). Tocar el espectador (dedo, no ratón) abre la ficha. Ninguno responde si hay encima un menú, el teclado, el selector o el visor (`overlayOpen()`).
    - `cubo/theme.css`: `html, body { overscroll-behavior: none; }` (sin gestos del navegador); `#spectator, #viewer { touch-action: none; }` y `#viewer .pdf-scroll { touch-action: pan-y; }` (el manual a lo ancho conserva su desplazamiento nativo).
  - `docs/GUIA.md` («Con el dedo») actualizada. `package.json` en 1.4.4.
- **Qué se probó (1.4.4):** `npm test` pasa (5 de 5). Con toques de DevTools: en el espectador, a los lados cambia de video en las dos direcciones, un golpe largo vertical cambia el filtro una sola vez, tocar abre la ficha. En el visor: a los lados pasa una imagen (un golpe largo también solo una), tocar la mitad derecha o izquierda sigue funcionando, el botón volver lo cierra. En el manual (doble página): a los lados y hacia arriba pasa de página. Deslizar sobre el teclado ya no sale de la app ni escribe. Los 30 temas, otra vez sin errores y sin salir del inicio.
  - Nota del arnés: «derecha, abajo, izquierda, arriba» en monolito a veces regresa y a veces no, **también en `main`** (3 de 3 corridas en `main`, 1 de 3 en la 1.4.4): sale de la inercia medida en un Chrome sin tarjeta gráfica. Solo con teclado, monolito es igual a `main`.
- **Qué NO se probó (1.4.4):** nada con pantalla táctil real ni Moonlight; el gamepad. Un toque justo después de deslizar (menos de ~0,4 s) se ignora a propósito (`swallowClick`), así que tocar muy rápido tras pasar una imagen puede no contar. Con el dedo no hay acercar ni mover el manual acercado (solo con LT/RT y la palanca): no se hizo.
- **Pendiente de Wilo:** «Buscar actualización ahora» (1.4.4) y probar con el dedo la 1.4.3 (tarjeta, lavanda, canales, relieve…) y el espectador, el visor de imágenes y el de manuales. Si todo va bien, el siguiente chat cierra la etapa 2 como 1.5.0.
- **Cómo sigue la etapa 2:** solo falta el visto bueno de Wilo. Con él: ajustar lo que reporte, poner `package.json` en 1.5.0, anotar el cierre aquí y en `GUIA.md`, subir a `main`, y pasar a la etapa 3 (motor de recomendados, Opus).
- Pendiente aparte: anotar Pandora en la bóveda de Obsidian (Wilo debe decir en qué carpeta van sus notas de Pandora).
