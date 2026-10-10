# Investigación de guardería BW

Trabajo del issue #15, rama `codex/investigacion-guarderia`. Primero se establece una referencia desde el save; después se contrastará con RAM. No se modifica el save, RAM ni archivos del juego.

## Referencias y campos candidatos

Se consultaron [los bloques BW](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs) y [Daycare5](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/Gen5/Daycare5.cs). El lector es una implementación original usando el descifrado PK5 ya existente, sin copiar código de PKHeX.

| Campo | Offset relativo al bloque |
| --- | --- |
| Ocupación slot 1 (uint32) | 0 |
| PK5 slot 1 (220 bytes) | 4 |
| Experiencia ganada slot 1 (uint32) | 224 |
| Ocupación slot 2 (uint32) | 228 |
| PK5 slot 2 (220 bytes) | 232 |
| Experiencia ganada slot 2 (uint32) | 452 |
| Huevo disponible (bit 0) | 456 / 0x1C8 |

Bloque save `0x20E00`, longitud `0x1CC` (460 bytes), CRC local `0x20FCE` y espejo `0x23F64`. Para backup se suma `0x24000`. Se exige coincidencia de ambos CRC y ocupación 0 o 1. Un slot libre no se interpreta a partir de contenido residual del PK5.

El byte de nivel del PK5 se registra como `storedLevelByte`, no como nivel actual confirmado. Se recoge también experiencia del PK5 y experiencia ganada separada. Debe contrastarse con el juego antes de decidir cómo mostrar el nivel. No se aplican reglas de experiencia al resultado de investigación todavía.

## Lectura reproducible

`node --experimental-strip-types experiments/daycare-save.mjs`

Usa la ruta local de configuración (o `MELONDS_SAVE_PATH`) y una lectura estable de solo lectura. Presenta principal y backup por separado; un checksum inválido genera error, nunca una guardería vacía. Esta herramienta valida el bloque de guardería y los PK5 ocupados; no reemplaza la selección/validación global del parser de save.

## Protocolo de comparación real

1. Guardería vacía: guardar en el juego y leer ocupación/huevo.
2. Depositar un Pokémon: anotar especie y nivel previo, guardar y leer ambos slots, nivel almacenado y experiencia. No exigir experiencia ganada cero, pues desplazarse para guardar puede incrementarla.
3. Caminar hasta que el juego informe una subida de nivel: anotar el nivel que informa la guardería, guardar y comparar los tres campos. No retirar todavía si se quiere aislar el comportamiento durante depósito.
4. Retirar y guardar: comprobar ocupación y nivel/experiencia del Pokémon ya retirado.
5. Dos depósitos: registrar qué ejemplar ocupa cada slot; usar una pareja que el juego indique que puede producir huevos si está disponible.
6. Huevo listo: guardar antes de recoger, contrastar flag con el aviso del personaje; recoger y volver a guardar para comprobar que el flag se limpia. No inferir especie ni características del huevo a partir de ese flag.
7. Validar límite de nivel 100 con fixtures; prueba real si el usuario dispone de un ejemplar adecuado, sin obligar a modificar su partida para obtenerlo.

Los resultados agregados se documentan aquí. No versionar saves, copias de partidas ni volcados de memoria. En live se comparará la misma situación después de guardar sin caminar y, posteriormente, cambios todavía no guardados.

## Resultados actuales

Lectura inicial real: principal y backup tienen CRC local/espejo válidos, ambos slots libres y huevo disponible false.

Después del depósito y guardado del usuario (2026-10-10, 19:33 UTC), ambas entradas coinciden y conservan CRC válidos:

| Slot | Especie | Byte de nivel almacenado | Experiencia PK5 | Experiencia ganada |
| --- | --- | --- | --- | --- |
| 1 | Drilbur (529) | 30 | 27000 | 4 |
| 2 | Tynamo (602) | 27 | 24603 | 4 |

El flag de huevo sigue desactivado. El usuario confirmó que los niveles coinciden con los previos al depósito y los que informa el encargado: Drilbur 30 y Tynamo 27. Sigue pendiente observar crecimiento y huevo listo; esta lectura no confirma que el byte almacenado represente el nivel actual tras caminar.

Para acelerar la prueba de crecimiento, el usuario retiró ambos y depositó un Lillipup de nivel 4. Lectura tras guardar (2026-10-10, 14:40 America/Bogota): ambas entradas válidas y coincidentes, slot 1 con especie 506, nivel almacenado 4, experiencia PK5 96 y experiencia ganada 0; slot 2 libre y sin huevo disponible. Esta es la nueva referencia previa al crecimiento. La retirada de los dos anteriores queda observada en la ocupación, sin validar todavía sus datos de nivel tras recuperarlos.

El usuario informó que el encargado muestra nivel 15. Lectura posterior (2026-10-10, 14:43 America/Bogota): ambas entradas válidas y coincidentes; el mismo Lillipup conserva nivel almacenado 4 y experiencia PK5 96, mientras que la experiencia ganada pasó de 0 a 2288. Segundo slot libre y sin huevo. Esto confirma que el byte de nivel permanece desactualizado durante este depósito. No mostrar el byte almacenado como nivel actual en la futura pestaña.

Tras retirarlo y guardar, ambos slots están libres y el mismo ejemplar aparece en el equipo con nivel 15 y experiencia 2384: coincide exactamente con 96 + 2288. Queda confirmado para este caso que la experiencia ganada se incorpora a la original al retirar. Para mostrar el nivel durante depósito se usará la experiencia total con la curva de la especie, reutilizando el mecanismo existente de niveles de colección; quedan pendientes el contraste de esa tabla, los límites y la prueba de huevo disponible.

Referencia de pareja para huevo (2026-10-10, 14:48 America/Bogota): principal y backup válidos y coincidentes, dos Lillipup ocupan los slots. El ejemplar anterior conserva nivel almacenado 15 y experiencia 2384; el segundo tiene nivel almacenado 2 y experiencia 9. Ambos registran experiencia ganada 7. Huevo disponible false. Se solicita caminar hasta el aviso de huevo y guardar antes de recogerlo para aislar el cambio del flag.

El usuario rechazó un primer huevo sin guardar el estado pendiente; ese caso no permite validar el flag. En el siguiente guardado previo a recibir un huevo (2026-10-10, 14:56 America/Bogota), principal y backup son válidos y muestran `eggAvailable: true`. Ambos depósitos siguen ocupados con los mismos ejemplares y experiencia ganada 3448 cada uno. Se confirma la transición de flag false a true frente al aviso real del juego. Falta leer después de recogerlo para comprobar su limpieza.

Después de recoger y guardar (2026-10-10, 14:58 America/Bogota), ambas entradas válidas muestran `eggAvailable: false` y conservan los mismos dos padres depositados. La experiencia ganada es 3449 en ambos slots. Queda validado el ciclo real sin huevo → huevo pendiente → huevo recogido, sin modificar el save ni RAM.

Los tests sintéticos cubren slots libres/ocupados, separación de experiencia, bit de huevo, CRC corrupto, ocupación inválida y PK5 inválido. No sustituyen los contrastes con el juego.

Se consultó PokéAPI para especie 506: curva `medium-slow`. La tabla pública se conserva como fixture en `tests/helpers/medium-slow-experience.json`, con URL de origen. Umbrales: nivel 4 = 96, nivel 15 = 2035, nivel 16 = 2535, nivel 100 = 1059860. Los 2384 puntos observados corresponden a nivel 15 con el conversor existente. Los tests pasan por el parser de investigación con PK5 sintético y verifican experiencia inicial + ganada, límites inmediatos de nivel 16 y 100, y exceso de experiencia sin superar 100. No se pidieron más acciones en el juego para estas comprobaciones.

Validación de esta etapa: `npm test` (242 tests), `npm run lint` y `npm run build` pasan. La suite completa requiere permiso para sus servidores locales; la ejecución restringida falló y la ejecución con ese permiso pasó. El build conserva el aviso de tamaño de bundle. No se hicieron cambios de interfaz en esta etapa.

## Integración de referencia save

El parser definitivo expone `daycare` con dos slots (null significa libre confirmado), identidad PK5, experiencia original y ganada y flag de huevo. No expone el nivel de depósito como actual. `daycare: null` significa bloque no disponible o inválido; el dato es opcional para compatibilidad con lectores anteriores. Valida CRC local/espejo y PK5 sin usar los campos obsoletos de estadísticas del depósito. La selección de principal/backup se hace con el núcleo del save; no mezcla guardería de otra entrada si el bloque opcional falla.

Watcher y snapshots publican cambios exclusivos de guardería sin reemplazar equipo/cajas. El adaptador conserva la última lectura válida con `daycareStale` ante dato no disponible, error o desconexión. El dato de guardería no se añade a la colección ni a la checklist. La conversión al nivel actual y la resolución de sprites se harán en la pestaña usando las tablas ya contrastadas.

El parser definitivo se contrastó contra el lector de investigación sobre el último save real: identidad y experiencias de ambos slots y estado de huevo coinciden. Tests sintéticos cubren corrupción aislada, respaldo seleccionado, recuperación del watcher y adaptación sin rehidratar equipo. Validación: 245 tests, lint y build pasan. No se pidieron más acciones al usuario ni se modificó su partida.
