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

### Etapa 2: Táctil (versión 1.5.0) — modelo: Opus
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

## Estado

- 21 nov 2026: **etapa 0 y etapa 1 hechas; la 1.4.0 (Recientes) está en `main`.** Falta empezar la etapa 2 (táctil) y la 3 (recomendados).
- **Etapa 0.** `datos/actualizacion/estado.json` de `E:\Pandora` tenía el commit de `main` (c7be841) como instalado, con revisión de ese mismo día. Eso confirma que el actualizador sí habló con el GitHub real y no tenía nada pendiente. El registro no muestra líneas «Actualización:» porque solo escribe cuando descarga, instala o falla; «al día» no deja línea. **Lo que aún no se ha visto con GitHub real es la descarga y la instalación**: se prueba con la 1.4.0 (ver «Pendiente de Wilo»).
- **Etapa 1 (1.4.0), qué se hizo:**
  - `server.js`: `recentIds()` toma de `estadisticas.json` los juegos con `last`, que existan en la biblioteca, del más nuevo al más viejo, máximo 20. `/api/library` trae `recent: { count }`, `/api/recent` da solo el conteo y `/api/games?mode=recent` da la lista. Al cerrar un juego se guarda también `lastAt` (fecha y hora) para ordenar bien dos partidas del mismo día; las partidas viejas solo tienen `last` y, si empatan el día, gana la que se registró después en el archivo.
  - `public/app.js`: sección «Recientes» después de «Todo» en el cubo y en `api.sections()` (de ahí la toman 25 temas). `api.recent` y `api.openRecent()` para los temas que arman su inicio a mano: se agregó a mano en `barra`, `canales`, `mosaicos` y `paneles`. La lista de Recientes conserva el orden por recencia (no la ordena de la A a la Z ni pone favoritos primero) y no se guarda en caché. Se refresca al cerrar un juego y al borrar estadísticas. Interruptor en Ajustes › Inicio › Recientes. Se restaura como última vista. Ícono nuevo `recent`.
  - `docs/GUIA.md` tiene la sección «Recientes». `package.json` en 1.4.0.
  - `test/pandora.test.js`: la biblioteca de prueba ahora tiene 26 juegos; se prueba orden, límite de 20, empate de día, juegos fuera de la biblioteca y partidas sin fecha.
- **Qué se probó y cómo:** `npm test` pasa (5 de 5). Con un navegador sin pantalla (Chrome) contra el servidor real y una biblioteca de LaunchBox de 30 juegos de mentira (25 con partidas), en los **30 temas**: aparece «Recientes» en el inicio, se abre, y el primer juego es el más reciente. En relieve, simbolo y torres hubo que abrirlo a mano porque mi script no sabía navegar sus secciones; abrió bien. También: no aparece si no hay partidas, no aparece si se oculta en Ajustes, y el interruptor sale en Ajustes › Inicio. Sin errores de JavaScript en ninguna prueba.
- **Qué NO se probó:** (1) jugar un juego de verdad desde Pandora y ver que sube al primer lugar (necesita Electron, emuladores y LaunchBox reales). (2) La descarga e instalación de la actualización contra el GitHub real. (3) Táctil, que es de la etapa 2. (4) Con tu biblioteca real, que es más grande.
- **Pendiente de Wilo:** en Ajustes › Biblioteca › «Buscar actualización ahora», esperar el reinicio, abrir Recientes, jugar algo unos segundos, volver y ver que subió al primer lugar. Si la actualización falla, el registro dirá por qué («Actualización: …») y eso se arregla antes que la etapa 2.
- Una sola cosa rara y esperada: como se agrega una sección al inicio, la primera vez puede quedar enfocada otra sección distinta de la que dejaste.
- Pendiente aparte: anotar Pandora en la bóveda de Obsidian (Wilo debe decir en qué carpeta van sus notas de Pandora).
