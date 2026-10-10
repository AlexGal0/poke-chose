# Investigación del contador de repelente — issue #13

Objetivo: leer los pasos reales del juego en el lector general y mostrarlos en un indicador flotante superior izquierdo. Esta etapa prepara la investigación; no añade todavía el indicador ni confirma una dirección.

## Referencias y corrección

El [accesor BW de PKHeX](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Access/SaveBlockAccessor5BW.cs) identifica el bloque de encuentros en save `0x21B00`, longitud `0x34`. Su comentario atribuye pasos a `+0x2D` y tipo a `+0x2E`, pero [Encount5BW](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/Gen5/Encount5.cs) usa `+0x2C`–`+0x2F` para estados de Pokémon errantes y `+0x30` para enjambre. Por tanto el comentario no confirma los campos del repelente.

[PKSM-Scripts BW](https://github.com/FlagBrew/PKSM-Scripts/blob/master/dev/docs/gen5/bw.txt) propone tipo en `0x21B31?` y pasos en `0x21B32?`, expresamente con interrogantes. La dirección de repelente de [Notable Breakpoints](https://projectpokemon.org/docs/other/notable-breakpoints-r31/) pertenece a B2W2 japonés y no debe trasladarse a Black español.

En la configuración local, las direcciones previamente validadas de equipo, cajas y Pokédex coinciden con la base hipotética `0x0221BB6C` más sus offsets BW. Esto propone un bloque de encuentros en `0x0223D66C`; no demuestra que sea su estado activo. Dos volcados históricos contienen ceros en los posibles campos y no prueban activación ni descenso de pasos. No se han modificado ni el save ni los volcados.

## Herramienta y protocolo

`node --experimental-strip-types experiments/melonds-live/watch-repel.mjs`, ejecutado desde la raíz, sustituye temporalmente al bridge general en el puerto 3002. El lector normal debe estar detenido: la herramienta y la app comparten una única conexión ARM7, manteniendo el lector de combate independiente. La herramienta no conecta hasta solicitarlo desde la app. No abrir un segundo cliente sobre ARM7.

La herramienta infiere la región únicamente si concuerdan las tres direcciones conocidas y comprueba que esté dentro de RAM. Lee el bloque de 52 bytes dos veces, registra cambios y estabilidad, y nunca convierte una coincidencia en una dirección confirmada. Añade 104 bytes y dos solicitudes GDB por intervalo de lectura general, sin escanear los 4 MiB. Los informes locales se guardan en `experiments/melonds-live/artifacts/`, excluido de Git. No hay comandos de escritura, interrupciones ni breakpoints.

1. Sin repelente activo y sin caminar, conectar y capturar la muestra inicial.
2. Marcar `label repelente-aplicado`, usar el objeto, cerrar su mensaje y detenerse. Registrar el objeto exacto.
3. Caminar un paso, detenerse y marcar `label un-paso`; repetir con varios pasos contados. No deducir el contador a partir del movimiento: los pasos contados sirven solo para contrastar lecturas.
4. Esperar sin moverse, abrir menús y contrastar que el candidato no sea un reloj o un dato obsoleto.
5. Caminar hasta el mensaje de agotamiento y contrastar cero. Repetir con los otros tipos disponibles.
6. Solo después de confirmar activación, descenso y agotamiento, investigar la estabilidad al cambiar de zona, reconectar, Reset y savestate. No efectuar estas acciones sin coordinar con el usuario para preservar su progreso.

Comandos de terminal: `label <acción realizada>`, `sample` (fuerza un registro en la próxima lectura del equipo), `quit`. Al terminar, restaurar el bridge normal; su recuperación puede requerir reconectar desde la app o Reset del juego.

## Estado

Referencias revisadas y herramienta preparada. La dirección, el byte concreto y la codificación del tipo siguen pendientes de validación con acciones reales del usuario. Pruebas sintéticas verifican concordancia de anclas, límites, cambios e inestabilidad; no sustituyen esa validación.

Validación de esta preparación: `npm test` (241 pruebas correctas), `npm run lint` y `npm run build` correctos, con el aviso existente de tamaño del bundle. El arranque y cierre con `quit` se comprobaron en el puerto temporal 3004 sin conectar a GDB.

El usuario confirmó repelentes máximos disponibles y ningún efecto activo. Se sustituyó temporalmente el bridge general por la herramienta en 3002, conservando los otros servicios; la solicitud de conexión devolvió 202 pero la fuente terminó en `connectFailed`. No se obtuvo una muestra inicial. Se pidió al usuario guardar su progreso, hacer Reset y volver a la partida antes de reintentar. Las comprobaciones con repelente real siguen pendientes.

Tras el Reset, el rechazo inmediato desde la app se diagnosticó como ausencia de Vite y servicios auxiliares: habían terminado al salir el launcher anterior. Se restauraron con `npm run dev:save`, que reutilizó la herramienta en 3002. El lector general pasó a `ready` y Vite/servicio de combate respondieron HTTP 200. La lectura inicial sin repelente fue estable; los bytes `+0x2C`–`+0x33` dieron `[0,0,0,0,7,0,0,0]`. Eso confirma acceso a la región, pero todavía no identifica el contador. El informe local es `repel-research-1791595928540.jsonl`; ninguna dirección se ha configurado como contador definitivo.

El usuario aplicó un repelente máximo y confirmó que permaneció quieto. El byte `+0x31` (`0x0223D69D`) cambió de 0 a 250; el resto de la cola permaneció igual. Una muestra posterior volvió a dar 250, estable en las dos lecturas. Es un candidato fuerte al contador, pendiente de comprobar descenso por pasos y agotamiento. El byte `+0x32` permaneció en cero; no se ha identificado ningún campo de tipo y no se deduce el objeto a partir del número de pasos restantes.

Después de que el usuario caminara una sola casilla, el mismo byte pasó de 250 a 249 y permaneció en 249 en la muestra posterior. Quedan comprobados activación y descenso de un paso para repelente máximo en esta sesión. Agotamiento, otros objetos y recuperación siguen pendientes.

El usuario confirmó el mensaje de agotamiento y se detuvo sin usar otro objeto. La captura registró descenso progresivo hasta 4 → 0 y una muestra posterior estable en cero. El ciclo real 0 → 250 → 249 → … → 0 confirma el contador de pasos como byte en `0x0223D69D` para esta sesión de Black español. Los saltos entre muestras corresponden al intervalo de sondeo mientras se camina; la app no calcula valores intermedios. El tipo de objeto se conoce por la acción del usuario, no por un campo leído. La recuperación y las otras variedades no están verificadas todavía.

Un segundo repelente máximo después del agotamiento volvió a cambiar el contador de 0 a 250. El usuario abrió el menú sin caminar; la muestra con el menú abierto permaneció en 250 y fue estable. Se verifica nuevo uso tras agotamiento y conservación del valor en el menú. No equivale a comprobar bicicleta, cambio de zona, combate, Reset con efecto activo ni savestate.

Después el usuario salió del Castillo Ancestral al desierto. El contador descendió durante el desplazamiento (250 → 222 → 218 → 198 → 197) y una captura posterior en destino permaneció estable en 197 en la misma dirección. Esto valida conservación del contador a través de ese cambio de zona; no demuestra el consumo exacto en el punto de transición ni permite distinguir caminar de correr sin más evidencia del usuario.

El usuario confirmó haber realizado la prueba solicitada en bicicleta. La región registró 197 → 184 → 175: 22 pasos consumidos entre capturas, frente a las diez casillas solicitadas. Se observa que el contador sigue cambiando durante el desplazamiento indicado, pero no se considera validada una correspondencia exacta de diez casillas ni se atribuye esa diferencia a una regla del juego sin una prueba adicional controlada.

El usuario indicó después que probablemente se había pasado en el recorrido anterior. Intentó avanzar una única casilla en bicicleta y la lectura registró 175 → 173. Queda verificado que el contador reacciona al desplazamiento en bicicleta y se estabiliza al parar; no se concluye si la diferencia de dos corresponde a entradas adicionales o al funcionamiento del movimiento. El producto mostrará el byte leído, sin convertir casillas o estimar pasos. No se solicitan más repeticiones de precisión en bicicleta para evitar depender del control manual.

El usuario guardó sin moverse, hizo Reset y volvió a entrar con el efecto activo. Se solicitó reconexión del lector general; la región volvió a producir 173 estable en la misma dirección. Queda comprobada la conservación del valor a través de este Reset y reconexión; aún falta contrastar movimiento nuevo posterior, reapertura completa y savestate.

Tras crear un savestate nuevo en una ranura libre, el usuario se bajó de la bicicleta y corrió unas casillas. La lectura cambió de 173 a 170 y permaneció estable al detenerse. Esto valida actualización por movimiento nuevo tras Reset y descenso al correr; no se está viendo únicamente un valor guardado obsoleto. La restauración del savestate aún está pendiente.

El usuario cargó ese savestate sin moverse. El mismo byte pasó de 170 a 173 y la muestra posterior fue estable en 173. La restauración se reflejó en el lector existente, sin reconexión adicional ni estimación de pasos. Queda comprobada recuperación del contador ante savestate en esta sesión.

La reapertura completa de melonDS también conservó 173 en la misma dirección. El bridge definitivo sustituyó la herramienta de investigación y recuperó la lectura tras Reset y reconexión. Se verificó en la aplicación que ambos lectores estaban conectados y que el indicador mostraba 173. Después de caminar, el usuario confirmó haberse detenido y la interfaz mostró 162: queda validada la actualización real con el lector definitivo.

## Integración del producto

La ubicación final solicitada es la esquina superior derecha. Los detalles se abren hacia la izquierda; se verificó con lecturas reales de 173 pasos en escritorio y 320 × 740, tema Windows XP. Las capturas de esta revisión son `artifacts/repel-right-desktop.jpg` y `artifacts/repel-right-mobile.jpg`. Las menciones anteriores a la esquina izquierda describen la primera versión.

El contador es optativo: `repelStepsAddress` queda en `null` en la configuración de ejemplo. Solo la configuración local de esta ROM usa `0x0223D69D`. No se aplica automáticamente a otras versiones. Si cambia la ROM o la dirección, se debe repetir la validación antes de configurar otra dirección.

El lector general realiza dos lecturas de un byte por sondeo, sobre la conexión ARM7 existente. Exige igualdad entre ellas y un valor entre 0 y 250. Una muestra inválida o inestable produce `repel: null` sin descartar el equipo; cero es un resultado válido que confirma agotamiento. No se calcula un contador a partir de tiempo o movimiento. No se ha instrumentado todavía la latencia adicional de estas dos solicitudes.

El adaptador conserva la última lectura al perder conexión o recibir una muestra no disponible, y la marca como desactualizada. El indicador también considera desactualizada una lectura con más de diez segundos de antigüedad. Solo se muestra en modo en vivo; el modo save y el manual no descuentan pasos. El tipo del objeto no está identificado, por lo que los detalles usan el término genérico repelente.

Se comprobó la interfaz con datos reales en escritorio y a 320 × 740, en tema Windows XP. Con una vista temporal de datos sintéticos se verificaron agotamiento, nueva activación, pérdida de conexión, recuperación, detalles mediante foco/toque, cierre con Escape e inglés en tema Pokémon oscuro. Se ajustó el margen móvil para separar el contador de los selectores. La vista temporal fue eliminada. No se realizó una prueba de hover físico ni del contador durante combate. Las capturas `artifacts/repel-real-desktop.jpg` y `artifacts/repel-real-mobile.jpg` muestran datos reales.

El usuario caminó hasta agotar el efecto, cerró el aviso del juego y se detuvo sin aplicar otro repelente. El lector definitivo publicó cero y la interfaz retiró el indicador. Cinco muestras reales posteriores mantuvieron cero, con intervalos de 3354, 3375, 3373 y 3369 ms (3,35–3,38 s). Esto mide la cadencia completa de publicación con el sondeo existente, no la latencia aislada de las dos solicitudes adicionales ni el tiempo exacto desde un paso hasta el cambio visual. No se modificó el intervalo.

Siguen pendientes las otras dos variedades de repelente (el usuario solo dispone de máximos) y el comportamiento en combate. El ciclo de activación, descenso y agotamiento se verificó con datos reales; la activación inicial se observó con la herramienta de investigación, y el descenso y agotamiento finales en la interfaz definitiva.

Validación final de la integración: `npm test` (245 pruebas correctas), `npm run lint` y `npm run build` correctos. Permanece el aviso existente de bundle superior a 500 kB.

El usuario aplicó otro repelente máximo y se quedó quieto. El indicador definitivo reapareció con 250, completando también la comprobación de nueva activación. Se revisaron visualmente los diez temas existentes a 320 × 740; se amplió el margen móvil a 64 px para separar los selectores en los temas con cabecera más compacta. El contador se oculta al abrir el diálogo de estadísticas de Klink y en modo save, y vuelve al regresar a live. Se restauraron el tema Windows XP y la vista de combate. El usuario confirmó que no dispone ahora de un combate accesible; esa comprobación se mantiene pendiente, sin sustituirla por una afirmación de validación real.

## Pruebas de otras variedades

El usuario consiguió repelentes normales y superrepelentes. Con el lector definitivo conectado y una lectura inicial de cero, aplicó un repelente normal y permaneció quieto: dos muestras consecutivas marcaron 100 pasos. Tras caminar unas casillas y detenerse, la lectura dio 86. Se verifica activación y descenso del repelente normal; agotamiento y superrepelente todavía pendientes en este punto. El tipo del objeto sigue identificado por la acción del usuario, no por un campo de RAM.

El usuario agotó el repelente normal, cerró el aviso y se detuvo sin aplicar otro: el lector publicó cero. Después aplicó un superrepelente y permaneció quieto; dos muestras consecutivas marcaron 200. Al caminar unas casillas y detenerse, la lectura descendió a 191. Quedan verificados el ciclo completo del normal y la activación/descenso del superrepelente; el agotamiento de este último está pendiente en este punto.

El usuario agotó el superrepelente, cerró el aviso y se detuvo sin aplicar otro: el lector definitivo publicó cero. Quedan comprobadas las tres variedades en esta ROM: normal 0 → 100 → 86 → 0, super 0 → 200 → 191 → 0 y máximo con el ciclo previamente documentado. No hubo cambios de código ni de dirección para estas pruebas. El contador ocupa un byte y admite valores de 0 a 250; las cantidades iniciales no permiten identificar el objeto después de caminar. No se ha confirmado un campo de tipo, así que la interfaz mantiene la etiqueta genérica. Sigue pendiente la comprobación durante combate.

## Prueba reversible de sondeo rápido

Se añadió una opción experimental desactivada por defecto (`repelPollMs: null`). `npm run repel:fast` activa un intervalo de 500 ms solo para el contador; `npm run repel:normal` restaura el sondeo general sin reconectar. Ambos comandos cambian únicamente la sesión del bridge mediante un endpoint local con validación de origen y de intervalo (500–3000 ms o null). Reiniciar el bridge vuelve al valor de configuración, null en el ejemplo.

Las lecturas generales y de repelente comparten una cola y la misma conexión GDB. Las cajas pueden retrasar el contador durante una lectura larga. Los eventos SSE `repel` transportan solo la lectura y no vuelven a resolver el equipo ni alteran su fecha de actualización. Pausar, perder conexión o cerrar el bridge detiene el temporizador adicional. No se calcula un descenso intermedio.

Pruebas sintéticas verificaron activación, evento pequeño, cero, reversión, conservación de una conexión y ausencia de solicitudes simultáneas. `npm test`: 246 correctas; lint/build correctos. Los servicios se reiniciaron para cargar la opción; melonDS rechazó inicialmente ambas conexiones. Se pidió guardar, hacer Reset y volver a entrar. La cadencia y fluidez reales de esta opción están pendientes en este punto.

Tras el Reset, ambos lectores aceptaron la conexión. Cinco eventos rápidos reales con contador cero llegaron con intervalos de 525, 525, 515 y 526 ms. Se ejecutó `repel:normal` sin reconectar: cesaron los eventos separados (cero eventos `repel` observados) y las publicaciones generales mantuvieron intervalos de 3350 y 3359 ms. Después se reactivó `repel:fast` para evaluación visual del usuario. La reversión queda comprobada con el lector real; el impacto percibido en la fluidez todavía está pendiente de esa evaluación.

El usuario probó el contador rápido mientras caminaba y confirmó buena fluidez del emulador y actualización satisfactoria. Observó avisos amarillos breves que se recuperaban; pueden corresponder a muestras no disponibles/inestables y no demuestran una pausa del emulador. A su petición, el valor final por defecto de `repelPollMs` es 500, tanto al omitirlo como en el ejemplo y su configuración local. `null` continúa permitiendo volver de forma persistente al sondeo general. La sesión actual ya estaba en 500 ms, por lo que no fue necesario reiniciar los servicios. El sondeo sigue activo cuando el contador es cero para detectar nuevos usos automáticamente. Se mantuvieron las 246 pruebas correctas.
