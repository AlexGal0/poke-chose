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

## Pestaña Guardería en modo save

Dos espacios muestran sprite, especie o apodo y nivel derivado de experiencia original + ganada, con las tablas cacheadas existentes. Si falla PokéAPI, conserva la identidad y ofrece reintento; nunca usa el nivel inicial como sustituto. Los slots libres y estados desconocidos se presentan por separado. El estado del huevo distingue disponible, ninguno y desconocido; el aviso de lectura desactualizada acompaña los datos retenidos. Manual y live muestran instrucciones para consultar save (live queda pendiente de investigación).

Revisión actual con save real: Lillipup nivel 20 y 17, sin huevo pendiente. Verificado en escritorio 1280×900 y móvil 390×844, temas Windows XP y Original, español/inglés, cambio de origen manual/save/live y navegación entre pestañas con flechas del teclado. Capturas `artifacts/daycare-save-desktop.jpg` y `artifacts/daycare-save-mobile.jpg`. La pantalla no añade depósitos a equipo/cajas ni modifica la checklist. No se probaron visualmente con fixtures los estados de espacio libre/huevo pendiente; esos datos están cubiertos por las pruebas del parser.

## Inicio de investigación live

`experiments/daycare-live.mjs` mantiene una sola conexión GDB de solo lectura para capturas manuales (`sample`, `quit`). No debe ejecutarse mientras otro lector general use el mismo puerto. La hipótesis inicial usa dirección Pokédex configurada menos 0x800, por diferencia relativa de bloques del save: candidato 0x0223C96C en esta configuración. No es una dirección confirmada ni se añade al lector definitivo. Lee dos veces 460 bytes y exige igualdad, valida PK5/ocupación mediante el parser y compara con el último save. No exige CRC de archivo en RAM ni guarda volcados personales.

Primer intento: TCP conecta, pero GDB no responde a `qSupported` antes del timeout y no devuelve ACK. No se obtuvo una muestra de RAM; se solicitó guardar y Reset para restablecer GDB. No se puede concluir nada sobre el candidato hasta obtener una lectura real.

Después del Reset del usuario, primera captura estable (2026-10-10, 15:16 America/Bogota) en 0x0223C96C: los dos ejemplares Lillipup coinciden por identidad con el save, experiencia original 2384/9, ganada 3449/3449 y huevo false. La comparación completa de estructuras coincide. Esto confirma correspondencia inicial tras Reset; falta observar cambios sin guardar para descartar una copia estática del save. La conexión de investigación permanece abierta para no sustituirla entre capturas.

Tras caminar sin guardar (15:18 America/Bogota), captura estable por la misma conexión: experiencia ganada 3545/3545 en RAM frente a 3449/3449 en save; identidades y experiencia original se conservan, huevo false. Confirma que el candidato refleja crecimiento no guardado, no una copia estática del archivo. Se continúa con huevo pendiente y recogido sin guardar antes de dar por validado el flag en RAM.

Huevo pendiente sin guardar (15:21 America/Bogota): RAM estable con huevo true y experiencia ganada 4915/4915; save conserva huevo false y experiencia ganada 3449/3449. Ambos padres conservan su identidad. La aparición del huevo se observa en vivo antes de cualquier guardado; pendiente comprobar su recogida.

Recogida sin guardar (15:22 America/Bogota): RAM estable cambia huevo true → false, conservando los dos padres y experiencia ganada 4915/4915. El archivo sigue con experiencia ganada 3449/3449. El ciclo de huevo queda validado en memoria por una única conexión, sin depender del guardado. La dirección 0x0223C96C queda validada para crecimiento y huevo en esta sesión/ROM; faltan retirada/ocupación y recuperación adicional antes de integrarla como dirección configurable definitiva.

Retirada de uno sin guardar (15:23 America/Bogota): RAM contiene solo el segundo ejemplar original (identidad 3812990582, experiencia 9 + 4935), ahora en slot 1; slot 2 libre, huevo false. El juego compacta la ocupación al retirar el primer ejemplar. Save conserva ambos depósitos anteriores. Quedan contrastados identidad/ocupación y retirada en vivo. La futura presentación debe actualizar identidad y experiencia al cambiar el ocupante, sin tratar el número de slot como identidad del Pokémon.

Recuperación tras guardar y Reset (15:25 America/Bogota): nueva conexión, captura estable en la misma dirección; RAM y save coinciden completamente: un Lillipup (identidad 3812990582), experiencia original 9, ganada 4935, slot 2 libre y huevo false. Se cerró la conexión mediante detach al terminar ambas sesiones. Dirección validada para Pokémon Black español IRBS rev 0 / melonDS 1.1 en las acciones descritas; no extrapolar a otras ROM. No se probaron reapertura completa ni savestate de guardería en esta etapa, para reducir las acciones del usuario; quedan como cobertura pendiente, sin marcar el check conjunto de recuperación como completo.

La implementación live reutilizará `parseDaycareBlock`, con dos capturas idénticas y PK5/ocupación válidos. El CRC local/espejo es validación exclusiva del archivo, no un requisito sobre el bloque RAM. El script de investigación conserva `confirmedLive: false` en cada salida como advertencia de que la herramienta genérica deriva un candidato de la configuración, no certifica direcciones nuevas por ejecutarse.

## Integración live

`bridge/live/daycare.mjs` lee dos bloques de 460 bytes secuencialmente sobre la conexión del lector general y reutiliza el parser validado. `daycareAddress` es opt-in, null en la configuración de ejemplo; la dirección validada se configuró solo en la configuración local ignorada. `daycarePollMs` vale 3000 por defecto y se evalúa dentro del ciclo general, por lo que la cadencia efectiva también depende de la duración/intervalo de ese ciclo. No añade un temporizador GDB concurrente ni cambia intervalos de cajas/equipo. Son 920 bytes, cuatro solicitudes de memoria con chunkSize 256, por intento de guardería.

Una muestra corrupta/inestable publica guardería no disponible sin invalidar el núcleo. El adaptador conserva la última válida marcada como desactualizada, y la pestaña usa los mismos niveles y sprites en modo live. La identidad se resuelve separadamente de equipo/cajas. Tests sintéticos de lectura estable, dirección acotada, ocupación corrupta y fallo aislado en el servicio pasan: 246 tests, lint y build. La validación de la pestaña con lector integrado real y medición de coste están pendientes: al sustituir la conexión de investigación, melonDS devuelve connectFailed; se solicitó Reset para activar el lector definitivo.

Después del Reset se conectó el lector definitivo y publicó guardería válida. Verificación visual real de escritorio/móvil: dos Lillipup, niveles actuales 21 y 19, huevo disponible; save conserva niveles 20/17 y sin huevo. Capturas en `artifacts/daycare-live-desktop.jpg` y `daycare-live-mobile.jpg`. La diferencia es estado live frente al último guardado, no un error de nivel. Intervalos observados de snapshots estables: 3271 y 3295 ms (la primera espera parcial de suscripción fue 1428 ms y no representa un ciclo completo). Coste de tráfico añadido: 920 bytes en cuatro solicitudes por captura; no se midió por separado el tiempo exclusivo de estas cuatro solicitudes ni FPS del emulador. No se abrió otra conexión GDB para medir. Reapertura completa/savestate específicos de guardería siguen pendientes.

El usuario confirmó posteriormente que durante estas pruebas utilizó savestates y cerró/reabrió la aplicación para cargar. Se registra como validación manual reportada por el usuario, sin repetir acciones ni atribuirla a observación directa del agente.

## Experiencia y pasos restantes

La pestaña añade progreso hacia el siguiente nivel y pasos aproximados restantes usando `experienceProgress` y experiencia total. Se aplica la regla documentada de [un punto de experiencia por paso en la guardería](https://bulbapedia.bulbagarden.net/wiki/Daycare); no se estima tiempo. La aproximación refleja la antigüedad de la captura (último guardado o ciclo live). Nivel 100 muestra barra completa y nivel máximo, sin pasos hacia un nivel inexistente. Las tablas/especies se resuelven por especie/forma y no vuelven al estado de carga por cada actualización de experiencia.

Revisión real escritorio 1280×900 y móvil 390×844: nivel 21 con 841/1119 EXP y 278 pasos; nivel 19 con 349/885 EXP y 536 pasos. Capturas `artifacts/daycare-experience-desktop.jpg` y `daycare-experience-mobile.jpg`. 246 tests, lint y build pasan; se reutilizan las pruebas existentes de umbrales y nivel máximo.

Indicador de evolución en esquina: flecha y niveles faltantes para la siguiente etapa por nivel simple. Excluye métodos por objeto, amistad u otras condiciones para no inventar un número aplicable. Si el umbral ya se alcanzó muestra 0; tooltip explica que no evoluciona en guardería y clic abre el árbol existente. Validación real escritorio/móvil con Lillipup 21/19 (umbral 16, ambos 0), apertura/cierre del árbol y test de selección de próxima etapa y exclusión de condiciones. 247 tests, lint y build pasan. Capturas `artifacts/daycare-evolution-desktop.jpg` y `daycare-evolution-mobile.jpg`.

## Alertas y revisión final

Alerta previa cuando falta exactamente un nivel hasta la evolución simple y quedan entre 1 y 50 pasos aproximados. Al alcanzar o superar el umbral, se muestra un aviso persistente para retirar al Pokémon y subir un nivel fuera de la guardería. Los límites de 1/50/51 pasos, niveles anteriores, datos desconocidos y umbral superado se validaron con tests sintéticos; no se solicitó otra prueba de crecimiento al usuario.

El botón flotante muestra el número de espacios con alerta y abre la pestaña desde cualquier sección. Comparte los datos del lector, sin nuevas consultas GDB; oculta el botón si no hay alertas, el dato está desactualizado o el origen es manual. Se coloca encima de combate y conexión: los tres miden 54×54 px, con 12 px entre ellos. Verificado en escritorio y móvil con los dos Lillipup reales ya por encima del umbral, navegación desde Balance de tipos y retorno por el botón. Capturas finales `artifacts/daycare-alert-right-desktop.jpg` y `artifacts/daycare-alert-right-mobile.jpg`. Validación final de implementación: 248 tests, lint y build pasan.

Se reinició Vite mediante `npm run dev:save` al detectar que el servicio de combate (3003) no estaba encendido. El lanzador reutilizó save/live (3001/3002); la interfaz confirmó ambos lectores conectados. Esta recuperación operativa no modifica el protocolo ni la configuración versionada.

Preparación del PR: `master` incorporó el contador de repelente (#14) durante el desarrollo. Se integró esa base conservando ambos campos opcionales, marcas de datos desactualizados, traducciones, indicadores y pruebas del servicio. Validación conjunta: 255 tests, lint y build correctos. Se reinició el lector general para cargar el protocolo combinado; melonDS rechazó la reconexión GDB y se solicitó Reset al usuario. El lector de combate siguió conectado. La recuperación final está pendiente de esa acción; no se presenta como una prueba live conjunta completada.
