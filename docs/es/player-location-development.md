# Detección de ubicación — primera entrega

Trabajo del issue #5 en `codex/5-detect-player-location`.

El parser devuelve `position` con el identificador interno de mapa y coordenadas
del último guardado. No representa una ubicación de PokéAPI ni una lectura en vivo.
Se publica mediante SSE y se expone en el estado de la fuente. El control opcional
«Seguir ubicación» cambia el selector de capturas para mapas verificados.
Los bridges anteriores y el bridge en vivo pueden
omitir el campo; el adaptador lo convierte a `null` sin reutilizar una posición ajena.

La implementación propia usa el bloque BW `0x19500`, longitud `0x9c`, CRC local
`0x1959e` y espejo `0x23f38`. Lee mapa como uint32 LE en `+0x80` y coordenadas
uint16 LE: X en `+0x86`, Z en `+0x8a`, Y en `+0x8e`. La referencia lee mapa
como int32 y lo escribe como uint16: se conservan los cuatro bytes sin interpretar
ni asignar rangos de mapas hasta contrastar datos reales.

Referencias consultadas:
- https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs
- https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/Gen5/PlayerPosition5.cs

Si falla el CRC de posición, devuelve `null` y conserva los datos principales
válidos. Nunca busca una posición alternativa en el respaldo. Si el parser usa
el respaldo por fallo de los datos principales, también lee posición de ese respaldo.
La validación global de la tabla de checksums sigue siendo obligatoria.

Las pruebas automáticas usan exclusivamente fixtures sintéticos. La observación
manual siguiente utiliza una partida real, leída sin escritura. No se ha comprobado
todavía la interpretación de las coordenadas ni una dirección RAM.

## Correspondencias observadas

| Fecha | Mapa interno | Zona PokéAPI | Evidencia |
| --- | --- | --- | --- |
| 2026-10-06 | 331 | 361, unova-route-6 | Dos lecturas estables del guardado principal; el usuario confirmó haber guardado en el exterior de Ruta 6. |

El archivo observado tenía fecha de modificación 2026-10-06T23:52:23.044Z.
La primera lectura comprobó que su mtime no cambió. Los checksums de posición y
los bloques principales pasaron en ambas lecturas. No se almacena el save ni su
ruta personal en el repositorio. Región/revisión del juego pendientes de identificar:
esta observación no demuestra compatibilidad universal entre versiones o ROM hacks.

`resolveBlackMapLocation` resuelve únicamente el mapa verificado y devuelve `null`
para los demás. No se extrapolan mapas adyacentes, interiores o plantas.

Un cambio exclusivo de posición actualiza el snapshot y su fecha sin volver a
resolver los Pokémon. Una posición corrupta se publica como `null`; la desconexión
conserva el último snapshot y su estado de error/conexión indica que no es actual.
Las pruebas cubren publicación, SSE, validación de transporte y recuperación con fixtures.

## Seguimiento en la interfaz

Desactivado inicialmente, con preferencia persistida aparte de la última zona
manual. Seleccionar una zona o navegar con las flechas pausa el seguimiento.
Desactivar el control recupera la selección manual. Mapas desconocidos o muestras
desactualizadas conservan la última zona reconocida durante esta sesión y fuente;
cambiar de fuente descarta esa zona para evitar mezclar ubicaciones.
La búsqueda conserva visible la zona seguida. La carga existente cancela solicitudes
anteriores y solo muestra resultados cuyo identificador coincide con la selección.

Validación de esta entrega: 188 pruebas automáticas, ESLint y build correctos.
Se ejecutó `npm run dev:save` con SAVE_BRIDGE_PORT=3011 (Vite eligió 5174) para no
interrumpir los servicios que ya estaban abiertos. Se usó el guardado real de Ruta 6,
sin modificarlo. Se verificaron seguimiento, pausa manual, restauración manual,
persistencia tras recarga, búsqueda que excluye Ruta 6, traducción inglesa y cambio
a fuente en vivo sin posición. Se revisó el control en vistas ancha y estrecha con
overrides de viewport 1280x900 y 390x844; el navegador embebido mostró un ancho
CSS efectivo diferente al solicitado. No se afirma una validación exacta de esos
breakpoints. Capturas: artifacts/location-follow-desktop.png y
artifacts/location-follow-mobile.png. La vista estrecha presenta un pequeño
desbordamiento horizontal general; el texto del control se ajusta y sigue accesible.
No se han simulado en navegador mapas desconocidos ni desconexiones en esta entrega.

Para usarlo, reiniciar el bridge si estaba ejecutándose antes de estos cambios;
un bridge anterior no envía posición y la interfaz muestra «no disponible».

## Lector opcional en vivo

`positionBlockAddress` permite leer un bloque de posición en RAM durante cada
ciclo rápido. No tiene valor predeterminado: sin configuración publica `null`.
Dos lecturas consecutivas del bloque deben coincidir; si la muestra es inestable
o la dirección no es válida, la ubicación queda no disponible y los demás datos
válidos siguen publicándose. La pérdida de TCP conserva el manejo de desconexión
del bridge. No se valida CRC de save en RAM, donde esos checksums pueden ser antiguos.

Pruebas sintéticas: lectura opcional, límites de dirección, muestras incompletas,
inestabilidad, publicación SSE de cambios exclusivos de posición y recuperación
sin descartar equipo. Total: 192 pruebas, ESLint y build correctos.

La configuración local existente identifica melonDS 1.1 y Pokémon Negro español
IRBS revisión 0. A partir de la disposición observada de cajas/equipo/Pokédex se
calculó el candidato `0x0223506c`. Tras Reset, dos lecturas reales estables devolvieron
mapa 331 y coordenadas coincidentes con el guardado de Ruta 6. Eso todavía puede
ser una copia del último guardado: falta observar movimiento sin guardar, cambio
de mapa y estabilidad tras reiniciar. No se activa ni se añade a la plantilla como
dirección validada. Dos reconexiones posteriores no recibieron respuesta a qSupported;
la siguiente prueba debe mantener una sola conexión abierta después del Reset.

Con una conexión mantenida abierta después de otro Reset se observó el mismo mapa
331 y X=148, Y=406, Z=0. El usuario confirmó caminar sin guardar; el lector no
publicó cambios de esos campos (sí descartó algunas muestras de bloque inestables).
Por tanto, este candidato no está validado como posición actual y su comportamiento
es compatible con una copia del último guardado. Después el usuario confirmó haber
entrado en Ciudad Fayenza sin guardar: el observador mantuvo mapa 331 y las mismas
coordenadas, sin publicar cambios. Se descarta `0x0223506c` como dirección para
seguimiento en vivo. No se habilita `positionBlockAddress` localmente.

La siguiente investigación debe buscar el estado actual del mapa fuera de esta
copia persistida, contrastando Ruta 6 y Ciudad Fayenza en una única conexión GDB.
No basta encontrar el número 331 en RAM: habrá múltiples coincidencias que pueden
ser constantes o copias; deben seguir transiciones sin guardar y sobrevivir reinicios.

Próximo paso: ampliar las correspondencias y documentar versión/región. La búsqueda
de dirección RAM se hará por separado: no se presupone que el offset del archivo
corresponda a una dirección estable del emulador.
