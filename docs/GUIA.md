# Guía de uso

## Primer arranque

Pandora's Box arranca sola, sin pulsar nada. Busca LaunchBox en las ubicaciones comunes (`C:\Users\<tú>\LaunchBox`, `Documentos`, `Escritorio` y `X:\LaunchBox` en cada unidad). Si no lo encuentra, o encuentra varios, te pide que elijas la carpeta: puedes escribir la ruta o buscarla. La ruta se guarda en `datos/config.json`.

Pandora's Box **solo lee** LaunchBox: nunca modifica sus archivos. Juegos, imágenes, videos, música y emuladores se siguen administrando en LaunchBox.

Tus favoritos, estadísticas y ajustes están en `datos/`. Si un juego no se abre al frente o no se cierra con el atajo, revisa `datos/registro.txt`: ahí queda anotado qué pasó al abrir y cerrar cada juego.

## Control (Xbox o Switch)

Las letras de la tabla son las de un control de Xbox. Si usas uno de Switch (por ejemplo, con Moonlight), en Ajustes › Control › «Distribución de botones» elige «Como en Switch»: A y B, X y Y se intercambian y las ayudas en pantalla lo muestran así.

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

En las desarrolladoras, **X** abre el menú del logo: quitarlo si está mal, buscar otro o usar tu propia imagen.

En un manual: ← → cambian de página, LB / RB saltan 10 páginas, LT / RT acercan (×1,5, ×2, ×3) y con la palanca derecha o ↑ ↓ te mueves por la página. Cada manual recuerda la última página que viste.

Al abrir un juego, Pandora's Box espera a que aparezca su ventana, la pone al frente con prioridad alta y se minimiza. Al cerrarlo, vuelve sola. Mientras no está al frente, pausa videos, música y sonido. Si el emulador se cierra con error en los primeros segundos, Pandora's Box avisa que el juego no abrió bien.

## Con el dedo (pantalla táctil o Moonlight)

Lo táctil solo se activa cuando tocas la pantalla; el control y el teclado siguen igual.

- **Tocar** algo lo elige; tocarlo otra vez lo abre.
- **Deslizar** en el inicio mueve como las flechas del control, en todos los temas: hacia la izquierda pide lo de la derecha, hacia arriba baja en la lista. Cada tramo del arrastre es un paso, y si sueltas con impulso avanza unos pasos más. Si un paso abre otra pantalla, el resto del deslizamiento ya no cuenta.
- Deslizar solo recorre; para entrar a una sección o abrir algo se toca. En Disco, Esfera, Luna y Naranja el dedo ya no entra solo aunque el deslizamiento sea largo.
- En las listas, en el cubo y en los temas con fila o rueda (Barra, Mosaicos, Alas, Vapor, Vitrina, Monolito, Manzana, Paneles, Órbita y Volumen), el contenido va **pegado al dedo**: lo que pasa por el centro queda elegido y suena. Al soltar con impulso sigue girando con inercia, sonando en cada elemento que pasa, y se detiene en uno. Si detienes el dedo antes de soltar, se queda donde lo dejaste. Más allá del primero o del último, la fila se estira y regresa.
- **Tocar algo que va girando** lo detiene ahí, sin abrir nada.
- En el cubo: a los lados gira las caras; arriba o abajo lo inclina hacia Espectador o Ajustes (un golpe corto basta). En Barra, a los lados cambian las categorías y arriba/abajo sus elementos. En Monolito y Manzana, a los lados la fila y arriba/abajo las filas. En Mosaicos la fila se desplaza sin cambiar el cuadro elegido, como en Switch. En Paneles, deslizar a los lados cambia de panel y arriba/abajo desplaza su lista.
- **Dejar el dedo quieto** sobre un juego de la lista lo marca o desmarca como favorito.
- Abajo quedan visibles «Ajustes», «Audio» y, en las listas, «Buscar»; arriba a la izquierda, el botón para regresar. Todos tienen tamaño de dedo.

## Ajustes (botón Menú)

Están en pestañas (LB / RB). Debajo de cada opción hay una explicación corta.

| Pestaña | Contenido |
|---|---|
| (orden fijo) | Las pestañas son siempre las mismas y se abre en Apariencia; desde una lista o una ficha el cursor cae en su acomodo. Izquierda/derecha cambia un valor por pulsación y se aplica solo al dejar de moverte (como el tema); A abre la lista completa |
| Apariencia | Tema, estilo de botones, acomodo de lista y ficha |
| Sonido | Volumen, audio de fondo, ambiente y efectos |
| Videos | Reproducir videos, modo cine y modo espectador |
| Inicio | Qué secciones se muestran en el inicio |
| Listas | Búsqueda, barra de letras y qué datos se muestran |
| Control | Distribución de botones (Xbox o Switch), atajo para cerrar un juego y registro detallado del control |
| Biblioteca | Carpeta de LaunchBox, logos, modo depuración (en la ficha muestra qué datos o medios le faltan al juego), borrar datos y salir |

## Recientes

La sección **Recientes** del inicio muestra los últimos juegos que jugaste, del más reciente al más viejo (máximo 20). Sale solo de tus estadísticas de Pandora (`datos/estadisticas.json`), así que abre al instante.

- Aparece en el inicio de todos los temas, justo después de «Todo». Si todavía no has jugado nada desde Pandora, no aparece.
- Se oculta o se muestra desde Ajustes › Inicio › Recientes.
- Cuenta lo que juegas desde Pandora (no lo que juegas desde LaunchBox). Al cerrar un juego sube al primer lugar.
- Las partidas anteriores a la 1.4.0 solo guardan el día; entre dos del mismo día se ordenan por el orden en que se registraron. Desde la 1.4.0 se guarda también la hora.
- La lista conserva el orden por recencia: no se reordena de la A a la Z ni pone los favoritos primero.

## Series

La sección **Series** del inicio junta los juegos de una misma saga sin importar la consola (Zelda, Metal Slug, Mario…). Sale del campo «Series» de LaunchBox; si un juego tiene varias separadas por punto y coma (`Mario Kart; Mario`), aparece en todas.

- En el inicio salen tus series favoritas y las que tienen 8 juegos o más. Al final está **Todas las series**, de la A a la Z (LT/RT saltan de letra).
- Con **clic del stick izquierdo** sobre una serie la marcas como favorita: sale primero y con una estrella. Se guarda en `datos/favoritos.json`, junto con tus juegos favoritos.
- En la ficha de un juego, el botón **Serie** abre los demás juegos de su serie.
- Solo se muestran las series con 2 juegos o más. Se oculta desde Ajustes › Inicio.

## Temas

Arcade, Dreamcast, Game Boy, Game Boy Advance, GameCube, Genesis, MS-DOS, MSX, NES, Nintendo 3DS, Nintendo 64, Nintendo DS, Playnite, PS1, PS2, PS3, PS5, Saturn, Super Nintendo, Switch, TurboGrafx-16, Virtual Boy, Wii, Wii U, Windows XP, Xbox, Xbox 360 y Xbox Series X.

- Son temas inspirados en cada consola; no usan sus logos ni sus sonidos.
- Si quieres usar logos o sonidos que tengas tú, ponlos en `datos/marcas/<tema>/`: `logo.png` (sale al arrancar) y `startup`, `move`, `select`, `back`, `open`, `error`, `launch` (`.ogg`, `.mp3` o `.wav`). Lo que falte se queda sintetizado. Esa carpeta es tuya: no viene con la app. Se apaga en Ajustes › Sonido › «Logos y sonidos originales».
- **Aleatorio** (primera opción de la lista): cada vez que abres la app sale otro tema; debajo eliges con interruptores cuáles pueden salir.
- Los efectos de sonido siguen al tema (o elige otros en Ajustes › Sonido). La música de ambiente solo suena si eliges «Ambiente» como audio de fondo.

## Vistas de la lista y de la ficha

«Del tema» (predeterminada): cada tema trae su propia forma de mostrar la lista de juegos y la ficha. Puedes cambiarla con RS en la lista, Y en la ficha o en Ajustes.

Vistas que sirven en cualquier tema:

- **Lista**: Repisa, Carrusel, Rejilla, Lista, Rueda y Biblioteca (rejilla con panel del juego).
- **Ficha**: Clásica, Cine, Póster, Galería y Héroe (fondo completo con tarjetas).

## Logos de las desarrolladoras

LaunchBox no los trae, así que la app los busca una sola vez en Wikidata y Wikipedia (necesita internet) y los guarda en `datos/logos/desarrolladoras`. Solo acepta un logo si el artículo es de una empresa y el nombre coincide completo. Si alguno sale mal, ponte sobre esa desarrolladora y presiona **X**: lo quitas (va a `datos/logos/papelera`, no se borra) o buscas otro. También puedes poner tu propia imagen con el nombre exacto de la empresa (`.png`, `.svg`, `.jpg` o `.webp`). Ajustes › Biblioteca › «Buscar logos de desarrolladores» vuelve a buscar los que faltan.

En el inicio salen las desarrolladoras con 10 juegos o más, y al final «Todas las desarrolladoras», de la A a la Z (LT / RT saltan de letra).

## Actualización automática

Pandora se actualiza sola desde GitHub (`msrwilo/pandoras-box`, rama `main`): lo que subes a GitHub llega a la app sin descargar zips.

- Al minuto de abrir y luego cada 30 minutos pregunta a GitHub si hay un commit nuevo. Si lo hay, descarga **solo los archivos que cambiaron**, comprueba que llegaron completos y que el código del programa no tenga errores de escritura.
- Cuando ya está descargada, espera a que Pandora esté al frente y nadie toque el control **3 minutos**; avisa y se reinicia. Nunca se reinicia mientras juegas. Si cierras Pandora antes, se instala al abrirla.
- Lo que se reemplaza queda en `datos/actualizacion/respaldo`; lo que se quita va a `datos/actualizacion/papelera` (no se borra).
- Si después de actualizarse no arranca, regresa sola a la versión anterior y no vuelve a intentar ese commit hasta que subas uno nuevo.
- Nunca toca `datos/` (favoritos, ajustes, estadísticas, logos, marcas) ni `node_modules`.
- Si el cambio necesita otras dependencias o otra versión de Electron, no se instala sola: avisa que hay que descargar el zip de la versión nueva.
- Ajustes › Biblioteca › Pandora’s Box: **Actualizarse sola** (se puede apagar) y **Buscar actualización ahora**, que muestra la versión y el commit instalados.
- Todo queda anotado en `datos/registro.txt` con la palabra «Actualización».

Funciona porque Pandora se distribuye con el código suelto en `resources/app` (sin `app.asar`); si algún día se empaqueta en `.asar`, este método deja de servir.

## Compartir la app

Copia la carpeta **sin** `datos/`. En la otra PC, la bienvenida pedirá la carpeta de LaunchBox.
