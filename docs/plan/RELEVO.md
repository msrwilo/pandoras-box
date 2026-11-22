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

### Etapa 0 (5 min, dentro del primer chat): confirmar que el actualizador funciona
La 1.3.0 se probó con un GitHub simulado, nunca contra el real. Revisar en `E:\Pandora\datos\registro.txt` las líneas «Actualización» o pedirle a Wilo que pulse «Buscar actualización ahora». Si falla, arreglar eso primero: todo lo demás depende de ello.

### Etapa 1: Recientes (versión 1.4.0) — modelo: Sonnet
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

- 21 nov 2026: 1.3.0 en `main` (actualización automática). Plan escrito. Falta todo lo demás; empieza la etapa 0 y 1.
- Pendiente aparte: anotar Pandora en la bóveda de Obsidian (Wilo debe decir en qué carpeta van sus notas de Pandora).
