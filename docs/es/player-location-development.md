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

## Herramienta de comparación de candidatos

Ejecutar desde la raíz:

```sh
node --experimental-strip-types experiments/melonds-live/track-map.mjs
```

Utiliza `live.config.local.json` y una única conexión GDB. No usar mientras el bridge
en vivo u otro depurador estén conectados al mismo puerto. Tras entrar a Ruta 6:

1. `scan 331`: busca valores uint16 LE alineados en los 4 MiB de RAM. Mantenerse
   en la zona durante la lectura, que no es atómica y puede afectar la fluidez.
2. `sample ruta6`: lee dos veces las páginas que contienen candidatos y marca
   estabilidad por valor, no por toda la página.
3. Cambiar a Ciudad Fayenza sin guardar; ejecutar `sample fayenza`.
4. Volver a Ruta 6 sin guardar; ejecutar `sample ruta6-regreso`.
5. `quit`: desconexión GDB ordenada.

Los cambios se comparan contra la última muestra estable de cada dirección.
Los registros JSONL quedan ignorados en `experiments/melonds-live/artifacts/`;
no contienen un volcado RAM. Todos los resultados se marcan como candidatos,
sin asignar automáticamente zonas ni modificar configuración.
La búsqueda de uint16 es una hipótesis de investigación: no detectará campos
codificados de otra forma o estructuras creadas solo después de la transición.
Las pruebas sintéticas cubren alineación, subarrays, límites, agrupación de lecturas
e inestabilidad independiente de candidatos. Total: 194 pruebas, lint y build correctos.

## Resultado del primer ciclo sin guardar

El escaneo real encontró 78 coincidencias de 331. La muestra inicial en Ruta 6
fue estable en todas. Tras entrar al exterior de Ciudad Fayenza sin guardar,
22 direcciones cambiaron: 20 a 96 y dos a cero. Al regresar a Ruta 6 sin guardar,
las 22 volvieron a 331. El usuario confirmó ambas transiciones. Todas las muestras
comparadas tuvieron cero valores inestables.

Los 20 candidatos con ciclo `331 → 96 → 331` incluyen `0x021e4bc2`,
`0x0224f8cc`, `0x0224ffa0`, `0x022584be`, `0x02259272`, `0x02259274`,
`0x0225928c`, `0x02275844` y doce campos desde `0x022521ae` hasta
`0x02252cae`, separados por `0x100`. Es evidencia de datos que siguen la zona,
pero no determina cuál es la fuente autoritativa ni garantiza estabilidad tras Reset.
Los valores 96 y los mapas interiores aún no se incorporan a la tabla de zonas:
faltan contrastes adicionales. No se activa ninguna dirección en configuración.

Al entrar sin guardar al laboratorio de estaciones de Ruta 6, confirmado por el
usuario, 12 de esos 20 candidatos pasaron a 332: `0x021e4bc2`, `0x0224f8cc`,
`0x0224ffa0`, los cinco campos desde `0x022521ae` a `0x022525ae`,
`0x022584be`, `0x02259272`, `0x0225928c` y `0x02275844`.
Otros siete campos pasaron a cero y `0x02259274` conservó el valor anterior.
Esto reduce los candidatos compatibles con las tres ubicaciones a doce; sigue
pendiente comprobar retorno al exterior y estabilidad tras Reset.

El lector opcional admite ahora `mapAddress` para un uint16 LE independiente,
alternativo a `positionBlockAddress`, nunca ambos. Hace dos lecturas estables de
dos bytes y devuelve únicamente `{ mapId }`; no inventa coordenadas. El modelo
de transporte acepta mapa solo o las tres coordenadas completas, pero rechaza
coordenadas parciales. Las pruebas de bridge comprueban la publicación del mapa
aislado y la recuperación de muestras inestables sin perder el equipo.
Validación: 196 pruebas, ESLint y build correctos. Pendiente comprobar persistencia
de direcciones tras reiniciar.

## Validación tras Reset y configuración inicial

Al salir del laboratorio los doce candidatos volvieron a 331. El usuario guardó
en el exterior de Ruta 6 e hizo Reset. La conexión GDB anterior se cerró durante
el reinicio; una nueva conexión leyó 331 en las mismas doce direcciones. Tras entrar
de nuevo al laboratorio sin guardar, todas pasaron a 332. Se observaron valores
distintos entre candidatos durante la transición, aunque cada lectura individual
fuera estable; no son una instantánea atómica de la transición.

Se seleccionó `mapAddress: "0x0224f8cc"` para esta configuración local y la plantilla
de Pokémon Negro español IRBS rev 0 con melonDS 1.1. Es uno de los campos que
siguió todas las ubicaciones y conservó su dirección tras Reset; esta prueba no
establece que sea la única fuente autoritativa. Reapertura completa del emulador,
otras revisiones/regiones, combate, menús y sesiones largas siguen pendientes.

La tabla incorpora 96 → Ciudad Fayenza (PokéAPI 352) y 332 → Ruta 6 (PokéAPI 361),
agrupando el laboratorio con el exterior. Identificar el laboratorio no significa
que haya encuentros salvajes dentro: la checklist continúa agrupada por zona.
La muestra de Ruta 6 del save y las observaciones en vivo mantienen sus fuentes
separadas. Pruebas de correspondencia actualizadas; 197 pruebas, ESLint y build correctos.

Se reiniciaron los bridges con el código/configuración nuevos. Después de recuperar
GDB mediante Reset, POST `/live-api/connect` devolvió 202 y el SSE real publicó
`readyActive` con `{ mapId: 331 }`. En navegador, fuente «melonDS en vivo» y
«Seguir ubicación» mostraron «Ruta 6 · memoria en vivo» y selector 361.
Captura: `artifacts/location-follow-live.png`. El lector de aplicación permanece
activo; el observador experimental se cerró antes de conectarlo. La prueba de cambio
a Ciudad Fayenza sin guardar mediante el bridge real está pendiente de confirmación.

Próximo paso: ampliar las correspondencias y documentar versión/región. La búsqueda
de dirección RAM se hará por separado: no se presupone que el offset del archivo
corresponda a una dirección estable del emulador.
