# Guía de uso

## Primer arranque

Pandora's Box arranca sola, sin pulsar nada. Busca LaunchBox en las ubicaciones comunes (`C:\Users\<tú>\LaunchBox`, `Documentos`, `Escritorio` y `X:\LaunchBox` en cada unidad). Si no lo encuentra, o encuentra varios, te pide que elijas la carpeta: puedes escribir la ruta o buscarla. La ruta se guarda en `datos/config.json`.

Pandora's Box **solo lee** LaunchBox: nunca modifica sus archivos. Juegos, imágenes, videos, música y emuladores se siguen administrando en LaunchBox.

Tus favoritos, estadísticas y ajustes están en `datos/`. Si un juego no se abre al frente o no se cierra con el atajo, revisa `datos/registro.txt`: ahí queda anotado qué pasó al abrir y cerrar cada juego.

## Control (Xbox)

| Botón | Acción |
|---|---|
| A | Abrir / elegir |
| X | Jugar directamente |
| B | Volver (en una búsqueda: quitar la búsqueda) |
| Y | Buscar en la lista (teclado en pantalla) |
| RS (clic) | Cambiar el acomodo de la lista |
| LS (clic) | Favorito |
| LB / RB | Saltar varios; en los temas con pestañas, cambiar de pestaña |
| LT / RT | Saltar a la letra anterior / siguiente |
| Vista | Audio de fondo: video, música del juego o ambiente |
| Menú | Ajustes |
| Cerrar juego | El mismo atajo que tengas en LaunchBox (por ejemplo, mantener RS y presionar B). En Ajustes › Control puedes grabar una combinación propia. |

Al abrir un juego, Pandora's Box espera a que aparezca su ventana, la pone al frente con prioridad alta y se minimiza. Al cerrarlo, vuelve sola. Mientras no está al frente, pausa videos, música y sonido.

## Ajustes (botón Menú)

Están en pestañas (LB / RB). Debajo de cada opción hay una explicación corta.

| Pestaña | Contenido |
|---|---|
| Esta lista / Esta ficha | Aparece primero si abres los ajustes desde una lista o una ficha |
| Apariencia | Tema, estilo de botones, acomodo de lista y ficha |
| Sonido | Volumen, audio de fondo, ambiente y efectos |
| Videos | Reproducir videos, modo cine y modo espectador |
| Inicio | Qué secciones se muestran en el inicio |
| Listas | Búsqueda, barra de letras y qué datos se muestran |
| Control | Atajo para cerrar un juego |
| Biblioteca | Carpeta de LaunchBox, logos, borrar datos y salir |

## Temas

Arcade, Dreamcast, Game Boy, Game Boy Advance, GameCube, Genesis, MS-DOS, MSX, NES, Nintendo 3DS, Nintendo 64, Nintendo DS, Playnite, PS1, PS2, PS3, PS5, Saturn, Super Nintendo, Switch, TurboGrafx-16, Virtual Boy, Wii, Wii U, Windows XP, Xbox, Xbox 360 y Xbox Series X.

- Son temas inspirados en cada consola; no usan sus logos ni sus sonidos.
- **Aleatorio** (primera opción de la lista): cada vez que abres la app sale otro tema; debajo eliges con interruptores cuáles pueden salir.
- Los efectos de sonido siguen al tema (o elige otros en Ajustes › Sonido). La música de ambiente solo suena si eliges «Ambiente» como audio de fondo.

## Vistas de la lista y de la ficha

«Del tema» (predeterminada): cada tema trae su propia forma de mostrar la lista de juegos y la ficha. Puedes cambiarla con RS en la lista, Y en la ficha o en Ajustes.

Vistas que sirven en cualquier tema:

- **Lista**: Repisa, Carrusel, Rejilla, Lista, Rueda y Biblioteca (rejilla con panel del juego).
- **Ficha**: Clásica, Cine, Póster, Galería y Héroe (fondo completo con tarjetas).

## Logos de las desarrolladoras

LaunchBox no los trae, así que la app los busca una sola vez en Wikidata y Wikipedia (necesita internet) y los guarda en `datos/logos/desarrolladoras`. Si alguno sale mal o no aparece, pon tu propia imagen ahí con el nombre exacto de la empresa (`.png`, `.svg`, `.jpg` o `.webp`). Ajustes › Biblioteca › «Buscar logos que faltan» vuelve a buscar.

## Compartir la app

Copia la carpeta **sin** `datos/`. En la otra PC, la bienvenida pedirá la carpeta de LaunchBox.
