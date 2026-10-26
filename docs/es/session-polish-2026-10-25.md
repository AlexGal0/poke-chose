# Ajustes de sesión, capturas y conexión

## Preferencias y pantallas

Los filtros de capturas se guardan en `poke-chose:<juego>:capture-filters:v1`. Progreso de Pokédex y búsqueda de zonas son preferencias del juego; búsqueda de especies/tipos y método se guardan por zona. Se conservan también los ajustes existentes de acceso y seguimiento. Datos inválidos o almacenamiento bloqueado usan valores seguros; un fallo al guardar un cambio se comunica en pantalla.

La pantalla conserva fuentes, estados de lectura, avisos de Safari Amistad/hordas y condiciones de obtención. Se eliminan introducciones y ayudas repetidas. Los módulos pendientes de X aparecen solo en la pestaña «En desarrollo».

## Conexión

`ConnectionActions` amplía el contrato de presentación con una operación de reconexión y su estado ocupado. El panel flotante no conoce endpoints. Negro proporciona sus controles general/combate; X añade una reconexión explícita que invalida la lectura anterior y vuelve a conectar.

La investigación identificó que los lectores general y de combate de Negro dejaban de programar trabajo al perder el socket. Ahora reintentan a los tres segundos (los tests usan intervalos menores), sin conectar antes del primer permiso de lectura. Pausar el lector general y cerrar el servicio cancelan sus reintentos.

El controlador de Citra ya reintentaba errores de lectura, pero el servidor desactiva el lector al quedarse sin clientes SSE. El cliente conserva la intención de conexión y vuelve a activarlo al recuperar SSE después de un corte o reinicio. No reactiva una desconexión manual; al cambiar de fuente se cancelan los reintentos del suscriptor. En Negro también se restaura el lector general cuando el canal SSE vuelve tras un reinicio del servicio. La recuperación de procesos de combate reiniciados sigue requiriendo el control de reconexión; los cortes de su socket sí se recuperan automáticamente.

No se escriben memoria, saves ni comandos de juego. Las pruebas de caída usan lectores simulados y saves sintéticos.

## Crianza en evoluciones

El icono de huevo consulta el adaptador a través de `AcquisitionService.breedingOnly`. Se muestra en preevoluciones cuando hay evidencia de cría y no existe una vía local directa registrada (captura, regalo, encuentro fijo, fósil o intercambio con NPC). El tooltip expresa ese alcance; no es una prueba de exclusividad frente a cualquier evento histórico ni un dato de la partida.

Las crías que no pueden reproducirse todavía también se consideran: por ejemplo, [Pichu en X](https://www.serebii.net/pokedex-xy/172.shtml) se obtiene criando su familia, y [Munchlax en X](https://www.serebii.net/pokedex-xy/446.shtml) requiere criar Snorlax. Se mantienen los requisitos de incienso y padres compatibles en la explicación. Una consulta fallida no genera un marcador.

## Validación realizada

- `npm test`: 427 pruebas correctas; `npm run lint` y `npm run build`: correctos.
- Recuperación simulada de los lectores general y de combate de Negro (handshake fallido y socket perdido), cancelación de reintentos al pausar/cerrar y restauración de X después de perder SSE, sin reactivar una desconexión manual.
- Persistencia sintética con aislamiento de juego/zona, almacenamiento corrupto o bloqueado y reglas de crianza con vías directas que impiden el marcador.
- Navegador con save real leído: filtros de tipo, método y progreso conservados tras recarga, fuentes presentes y contenido pendiente visible solo en su pestaña.
- Citra real, solo lectura: acción «Reconectar» desde el panel flotante y vuelta a estado conectado con equipo y cajas válidos. No se provocó una caída artificial del emulador real.
- Familia de Pikachu en X: marcador de huevo visible en Pichu y ausente en Pikachu/Raichu. Datos públicos/caché de adquisición, no derivados del estado de la partida.
- Servicios locales reiniciados para activar el endpoint nuevo; una sola instancia web continúa en 15300. Capturas: `artifacts/session-reconnect-x.png` y `artifacts/evolution-breeding-badge-x.png`.
