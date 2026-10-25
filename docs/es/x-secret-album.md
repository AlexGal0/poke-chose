# Álbum secreto de Kalos

Adaptado del álbum de Teselia de `codex/unova-album-and-evolutions`, commit `919ab33`. Ese componente aún no estaba presente en la rama de X. Se recuperaron su presentación y gestos sin integrar los cambios ajenos de esa rama.

## Reglas conservadas

| Regla del original | Comportamiento en X |
| --- | --- |
| Apertura secreta | Mantener la Poké Ball 750 ms; Intro o Espacio con teclado. Cancelación al soltar, salir, perder foco o cancelar el puntero. |
| Mosaico regional | Lista regional del adaptador de X: 457 especies, incluidas las especies de evento que ya contempla el catálogo. Orden nacional, número nacional en la ficha para evitar confundir las tres numeraciones regionales de Kalos. |
| Descubrimiento | Unión de vistos y capturados de la Pokédex de la fuente activa. Los desconocidos muestran `?`, sin nombre, imagen ni acceso a ficha. |
| Captura | Capturados a color; vistos sin capturar en gris, también en la ficha ampliada. Se usan flags históricos, no la presencia actual en cajas/equipo. |
| Manual | La colección manual determina las cartas conocidas y capturadas. No se mezcla con Save o En vivo. Cambiar de fuente cierra el álbum. |
| Pokédex ausente | Ninguna especie queda revelada. |
| Presentación | Mosaico completo sin scroll, imágenes estáticas, inclinación y brillo con ratón. 24 columnas en horizontal y 13 en vertical; filas redondeadas hacia arriba. |
| Ficha | Nombre, tipos de Gen VI (incluido Hada), número, ilustración y descripción. Se amplía desde su casilla y vuelve a ella. |
| Animación | Reutiliza el mapa local de animaciones existente; vuelve al sprite estático si falta o falla la animación o se solicita movimiento reducido. No usa rutas exclusivas de Negro/Blanco. |
| Descripción | Primero idioma activo; dentro de él X, Y y otra edición disponible; después inglés con la misma prioridad. Normaliza espacios y saltos de página. Caché separada por juego, idioma y especie. |
| Cierre | Escape vuelve al mosaico; otro Escape cierra. Pulsación de 900 ms en el mosaico cierra el álbum. Pulsar el fondo de la ficha vuelve al mosaico. |
| Accesibilidad | Dialog modal, bloqueo del scroll de fondo, mosaico inerte al ampliar, foco en título de ficha y restauración al regresar/cerrar. Respeta movimiento reducido. Foco visible en la Poké Ball. |
| Errores | Reintento de cartas y descripciones, cancelación de cargas al salir. La ficha permite scroll interno si una descripción larga no cabe. |

La UI compartida recibe `AlbumService`; los IDs, datos y preferencias de edición pertenecen al adaptador X. Las descripciones se consultan en PokéAPI al abrir una carta conocida y se cachean; los sprites y tipos se resuelven localmente. La integración del álbum original en Black queda fuera de este cambio.

## Validación de esta sesión

- `npm test`: 361/361. Se repitió fuera del aislamiento porque este bloqueaba conexiones locales y renombrados de fixtures sintéticos.
- `npm run lint` y `npm run build`: correctos.
- Vite y navegador: selección de X, añadir Bulbasaur a una colección de prueba, apertura con Intro, ficha y descripción real en español, Escape y restauración de foco.
- Fixture visual `artifacts/x-album-check.html`: 4 capturados, 3 vistos y 450 bloqueados; pulsación larga de apertura y cierre, ficha vista en gris y mosaico de 457 cartas sin scroll a 1280×720. Comprobación de mosaico y ficha mediante iframe de 390×844 y 390×640. Cambio a inglés y descripción inglesa comprobados.
- No se usaron saves reales ni lecturas del emulador. Los gestos táctiles físicos y la preferencia del sistema de movimiento reducido no se probaron manualmente; se conservaron sus ramas del original.

Capturas: `artifacts/x-album-desktop.png`, `artifacts/x-album-card-desktop.png`, `artifacts/x-album-mobile.png` y `artifacts/x-album-card-mobile.png`.
