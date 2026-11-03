# Migración de Black al workspace compartido

## Alcance y paridad

Black y X deben componer `GameWorkspace` con servicios de juego y lecturas normalizadas. Se conservan los formatos de Black, 24 cajas, tipos Gen V, índices de objetos, formas y separación manual/save/live. Ningún lector escribe en partidas o memoria.

| Área | Integración |
|---|---|
| Catálogo y colección manual | `blackCatalog`, `blackManualStorage`; clave histórica `poke-chose:bw:v1` |
| Equipo y cajas | `blackSavedRosterService` y componentes comunes; equipo disponible aunque no haya lectura de cajas |
| Fichas | `blackKnowledge`; estadísticas y movimientos históricos, formas, evoluciones filtradas para Black |
| Capturas | `blackEncounters` y atlas compartido; orden Teselia, subzonas, intercambios, temporadas y acceso conservados |
| Guardería y requisitos globales | Servicios Black, componentes comunes y contexto de conocimiento |
| Análisis y tipos | Reglas Gen V inyectadas, huevos excluidos, alternativas y datos obsoletos |
| Combate | `BlackBattle` normaliza la lectura y usa la pantalla compartida |
| Álbum, conexión y repelente | Servicios existentes e integración por composición |

## Compatibilidad

- Las preferencias manuales, pestaña, fuente, zona, seguimiento y Surf/Supercaña conservan sus claves y formatos anteriores.
- Las APIs históricas permanecen como implementación interna de adaptadores, con sus cachés. No se amplían los límites de Black para otros juegos.
- La planificación de inventario Black sigue usando la última lectura conjunta de bolsa y equipados del save, también al visualizar live. Su texto y antigüedad lo explicitan; no se mezcla la bolsa de un snapshot con objetos equipados de otro.
- El atlas carga los datos públicos al abrir Capturas. Errores permiten reintentar; no se deduce capturabilidad del catálogo regional ni captura histórica del equipo/cajas.
- Datos desconocidos se mantienen distintos de listas vacías. Retención y errores parciales no deben presentar una lectura anterior como vigente.

## Validación

Validación realizada el 30 de octubre de 2026:

- Suite completa: 506 pruebas, lint y build correctos. Las pruebas de HTTP/SSE local y reemplazo de archivos sintéticos se ejecutan fuera del aislamiento.
- Nuevas pruebas de persistencia histórica, diferencias entre datos desconocidos/vacíos, equipo sin cajas, fallos parciales del resolver, snapshots detenidos y de respaldo, requisitos especiales de evolución, etiquetas ES/EN y movimientos Gen V con potencia histórica y huecos de slots.
- Pruebas de arquitectura: ambos juegos montan `GameWorkspace` y no los proveedores retirados; las pantallas de core no importan APIs ni adaptadores concretos.
- Save configurado de 512 KiB: 6 miembros, 89 ejemplares en cajas, 314 vistos y 142 capturados, sin usar respaldo. Hash SHA-256 y mtime iguales antes/después de la lectura. No se escribieron partidas.
- Navegador sobre Vite existente: Black Save mostró equipo de seis y colección de 95. Se contrastaron PS/naturaleza/habilidad de Samurott, movimientos conocidos (Surf 95 e Hidrobomba 120), 24 cajas y caja vacía, requisitos evolutivos e inventario, guardería vacía y carga del atlas de 81 localidades.
- Modo manual inicialmente vacío: alta de Snivy, selección para el equipo y persistencia tras recarga; se retiró únicamente ese ejemplar de prueba y se restauró la colección vacía y la fuente Save.
- Colección con override móvil 390×844: ancho CSS efectivo 375 px, panel 347 px y scrollWidth 346 px, sin desbordamiento interno del panel. Se restauró el viewport. Se comprobó el cambio a inglés y se restauró español.
- X conserva las evoluciones de Kalos con sus avisos de obsolescencia y la tabla Gen VI de 18 tipos. Se restauró X en la pestaña inicial de evoluciones pendientes.

### Validación final pendiente de melonDS

Se intentó abrir la instalación existente de melonDS después de las pruebas de archivo, interfaz y automatizadas. La herramienta de control rechazó el acceso con «Computer Use was not approved to use melonds». No se lanzó por otro mecanismo ni se alteró su configuración. Quedan pendientes la conexión real, cambios de equipo/cajas/ubicación, guardería, repelente, entrada/salida de combate y pausa/reconexión desde el emulador. No se presentan las pruebas sintéticas ni registros históricos como evidencia de esas interacciones.

Las pantallas y contratos están migrados; esta limitación corresponde a la comprobación en vivo. Los lectores y validadores específicos siguen siendo fronteras intencionales. Las APIs históricas se conservan como servicios internos de Black, no como proveedores de presentación.
