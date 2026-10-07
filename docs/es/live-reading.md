*English version: [../live-reading.md](../live-reading.md)*

# Lectura en vivo: configuración y funcionamiento

## Estado implementado

Manual, Save y melonDS en vivo mantienen datos separados. El servicio live usa GDB de solo lectura, publica snapshots por SSE y no modifica RAM ni saves. Se validaron direcciones con melonDS 1.1, Pokémon Negro español IRBS revisión 0, usando ARM7 en el puerto 3334. Otra ROM requiere localizar y validar sus direcciones.

`live.config.local.json` contiene la configuración privada; `live.config.example.json` sirve de plantilla. El servicio escucha en `127.0.0.1:3002` y Vite hace proxy de `/live-api`. `LIVE_BRIDGE_PORT` debe coincidir en ambos procesos. La conexión GDB se inicia desde el botón de la aplicación.

## Intervalos y consistencia

### Ubicación del jugador

`mapAddress` permite leer el mapa actual como uint16 LE estable (dos lecturas)
en cada ciclo rápido, sin exigir cambios del equipo ni consultar el save.
La plantilla usa `0x0224f8cc`, contrastada con Pokémon Negro español IRBS rev 0
en melonDS 1.1 mediante Ruta 6, Ciudad Fayenza y el laboratorio de estaciones,
incluyendo transiciones sin guardar y un Reset. Otras versiones requieren localizar
sus direcciones. La reapertura completa del emulador todavía no se ha validado.

No combinar `mapAddress` con `positionBlockAddress` (lector experimental de bloque).
Sin dirección configurada o con muestra inválida, la ubicación es no disponible;
los datos válidos del equipo pueden seguir actualizándose. No se inventan coordenadas.
«Seguir ubicación» es opcional en Capturas por zona. El catálogo extraído de la
ROM española IRBS revisión 0 resuelve 388 mapas en 71 zonas, incluidos interiores
que comparten nombre de zona. Los 39 mapas sin correspondencia conservan la
selección; una selección manual pausa el seguimiento. Véase
[extracción y límites del catálogo](rom-locations.md).

| Datos | Configuración | Valor por defecto |
| --- | --- | --- |
| Equipo, PS, experiencia y Pokédex | `fastPollMs` | 3000 ms |
| Las 24 cajas | `boxesPollMs` | 120000 ms (2 minutos) |

`fastPollMs` y el antiguo `pollMs` admiten enteros entre 1000 y 60000 ms. `boxesPollMs` admite entre 1000 y 600000 ms. `pollMs` solo sirve como alternativa al intervalo rápido; no reduce el intervalo de cajas. Cambiar el JSON requiere reiniciar el servicio; no hay recarga automática de configuración.

El primer ciclo y cada reanudación revisan las cajas. Después se leen cada dos minutos o al pulsar «Actualizar colección» en Mi colección, en modo en vivo. Los cambios de integrantes, capturas, orden, PS y experiencia no adelantan la lectura del PC. Depósitos, liberaciones y cambios entre cajas pueden tardar hasta la siguiente revisión en aparecer.

Entre revisiones, cada snapshot incluye las últimas cajas válidas. `updatedAt` fecha la muestra publicada; no representa una nueva lectura de todos los datos del PC. El adaptador exige equipo y cajas disponibles para resolver la colección y conserva su último resultado válido ante errores.

Las regiones se leen repetidamente para comprobar estabilidad. Tras leer cajas se vuelve a comprobar el equipo; si cambia o un individuo aparece simultáneamente en una lectura nueva de equipo y PC, la muestra se descarta y se conserva la anterior. Entre revisiones, las ubicaciones antiguas del PC de integrantes que ahora están en el equipo se omiten del snapshot, evitando duplicados sin releer cajas ni bloquear la salud del equipo. Esto no convierte las lecturas en una instantánea atómica de toda la RAM.

Si falla una lectura de cajas, se conservan las últimas válidas y el equipo y la Pokédex pueden seguir actualizándose. El siguiente intento automático espera el intervalo de cajas; el botón permite reintentar antes. GET/SSE siguen siendo de solo lectura. POST `/live-api/refresh-boxes` solicita la lectura en la conexión existente, espera a que termine y devuelve éxito o error; no reanuda un lector pausado. Solicitudes manuales simultáneas comparten una lectura y reinician el plazo de dos minutos. El botón muestra «Actualizando cajas…» mientras espera; los metadatos de PokéAPI pueden seguir cargándose después.

## Retardo y rendimiento

Las peticiones GDB son secuenciales. El intervalo rápido empieza tras terminar la muestra: la duración de lectura se suma a los 3 segundos, y una revisión de cajas puede retrasar ese ciclo. La revisión periódica del PC ocurre en el primer ciclo que encuentra vencidos sus dos minutos desde el final del último intento; no garantiza una actualización exacta a los 120 segundos.

Las cajas representan aproximadamente 192 KiB de memoria por revisión con la separación actual y las dos lecturas de estabilidad, antes del transporte hexadecimal GDB. Reutilizarlas evita ese trabajo en la mayoría de los ciclos rápidos. La reducción de lecturas se comprobó con RAM sintética; no se midieron CPU, FPS, latencia real con estos intervalos ni impacto durante sesiones largas. Fast forward y las animaciones pueden alterar el tiempo disponible y la estabilidad: su efecto no está cuantificado.

## Pausa, reconexión y puertos ocupados

**Pausar lectura** cancela los ciclos y espera la lectura en curso, manteniendo TCP abierto. **Reconectar lector** reutiliza esa conexión si continúa disponible y vuelve a revisar cajas. No es necesario reiniciar el lector por cada cambio del juego. Después de Reset, reapertura o pérdida de conexión puede ser necesario reconectar manualmente.

Cerrar o reiniciar el servicio sí cierra TCP. Se observó que melonDS puede aceptar la nueva conexión y dejar de responder a GDB; en ese caso conserva el progreso deseado, haz Reset, entra a la partida y pulsa Reconectar. No ejecutar dos lectores en el mismo puerto GDB.

El lanzador reutiliza bridges compatibles ya activos y solo detiene los procesos que creó. `/live-api/health` y `/save-api/health` identifican aplicación, servicio y carpeta; para bridges antiguos se admite una comprobación de su snapshot SSE inicial. Si otro programa ocupa el puerto, se informa del conflicto sin cerrarlo. Un servicio reutilizado conserva el código con el que se inició: reinícialo para cargar cambios del lector.

## Verificación y límites

Las pruebas automatizadas cubren conexión explícita, pausa/reanudación sin cerrar TCP, pérdida y recuperación, rechazo de muestras incoherentes, reutilización de cajas, ausencia de revisión anticipada por traslados/capturas, actualización manual, solicitudes concurrentes, omisión de ubicaciones antiguas al retirar del PC y recuperación manual tras fallos sin relectura continua. La integración y los depósitos/capturas originales se comprobaron con melonDS real; las reglas nuevas de actualización se comprobaron con RAM sintética.

La modificación del intervalo a dos minutos y el botón pasó 119 pruebas, lint y build. Las pruebas de periodicidad usan intervalos reducidos y RAM sintética, no una espera real de dos minutos. Un render de React mediante Vite verificó el botón visible en modo en vivo, deshabilitado sin conexión y ausente en modo Save. No se comprobó el clic ni el diseño responsive en navegador en esta sesión. El servicio real anterior no pudo reiniciarse desde el entorno por acceso denegado; debe reiniciarse para cargar el código nuevo.

Los PS y la experiencia del save real se extrajeron mediante acceso de solo lectura. Su actualización durante cada turno de un combate real sigue pendiente. La caja 24 real no estuvo disponible para validación. Consulta los registros en [validación de integración](live-integration-validation.md), [barras y objetos](team-vitals-validation.md) y [validación del experimento](../../experiments/melonds-live/VALIDATION.md).
