# Detección de ubicación — primera entrega

Trabajo del issue #5 en `codex/5-detect-player-location`.

El parser devuelve `position` con el identificador interno de mapa y coordenadas
del último guardado. No representa una ubicación de PokéAPI ni una lectura en vivo.
Se publica mediante SSE y se expone en el estado de la fuente, pero todavía no
cambia el selector de capturas. Los bridges anteriores y el bridge en vivo pueden
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

Próximo paso: observar mapas en ubicaciones conocidas, documentar versión/región
y construir correspondencias verificadas con las zonas existentes. Después extender
el seguimiento opcional en la interfaz. La búsqueda
de dirección RAM se hará por separado: no se presupone que el offset del archivo
corresponda a una dirección estable del emulador.
