# Combate — prototipos 1, 2, 3 y 5, solo modo en vivo

La pestaña «Combate» aparece únicamente al seleccionar melonDS en vivo. Identifica al rival y a tu ejemplar activo, muestra sus PS y la salud del equipo completo. Las dos fichas y sus paneles de debilidades comparten columnas y alturas; las coincidencias con tipos del oponente se resaltan. La ficha propia conserva el mote. Los PS usan números y barras animadas, con color según la vida restante. El equipo incluye iconos de ventaja por tipos frente al rival. Los metadatos reutilizan el adaptador Gen V de PokéAPI; la referencia de tipos no incluye movimientos, STAB, habilidades, objetos ni cambios de tipo por efectos del combate. Los estados se pospusieron y la sincronización adicional de «Tu equipo» quedó fuera del alcance por decisión del usuario. La pestaña se conserva al recargar en vivo; al pasar a Manual o Save se selecciona el catálogo.

## Ejecutar

Desde la raíz del proyecto, con Node 22.15 o posterior y GDB activado en melonDS:

```powershell
npm run dev
node --experimental-strip-types experiments/melonds-live/watch-enemy.mjs --battle
```

El segundo comando usa los dos parámetros de campo configurados en `enemyBattleAddresses`, siguiendo sus punteros al rival activo sin depender de copias exclusivas de encuentros salvajes. Usa ARM9 3333 por defecto; `MELONDS_GDB_PORT` permite cambiarlo. Mantiene la misma conexión y realiza lecturas pequeñas, sin volcado inicial de RAM ni consulta de cajas. La conexión ARM7 del servicio principal es independiente; no deben ejecutarse dos lectores sobre el mismo puerto. Sin argumentos se usa también este modo. Los modos antiguos con informe o `--discover <especie>` se conservan únicamente para investigación y mantienen las limitaciones del detector de copias salvajes.

Si se pierde GDB, la pestaña distingue «Lector de combate desconectado» de «Sin rival confirmado» y ofrece «Reconectar combate». POST `/enemy-api/connect` vuelve a conectar utilizando las direcciones ya descubiertas; solicitudes simultáneas comparten el mismo intento y una conexión saludable se reutiliza. El servidor HTTP permanece disponible incluso si la negociación inicial falla. Si melonDS acepta TCP pero no responde a GDB, puede seguir siendo necesario Reset y cargar la partida o un savestate antes de reconectar. La reconexión no garantiza que las direcciones conserven su validez tras otra sesión.

El servicio experimental publica GET `/enemy-api/snapshot` en `127.0.0.1:3003`, con proxy de Vite en desarrollo y preview. La lectura tarda lo que necesiten las peticiones GDB más dos segundos entre ciclos. Los archivos privados de descubrimiento y observación están ignorados por Git. No se escriben RAM ni saves.

`activeBattleAddresses` y `activeSlotAddress` del ejemplo corresponden únicamente a la ROM de referencia. El lector de combate relee estas opciones locales durante cada muestra para permitir ajustar la investigación sin cerrar GDB; esto no cambia la configuración del bridge principal, que requiere reinicio. `--wait` inicia el HTTP sin conectar GDB hasta pulsar Reconectar combate. POST `/enemy-api/research` permite capturar una región fija de 128 KiB para investigación local, serializando esa lectura con el muestreo sobre la misma conexión; no es parte del ciclo automático ni consulta cajas.

Para investigación con el detector anterior, limitado a las copias del encuentro salvaje, se puede reutilizar un informe del mismo estado de RAM:

```powershell
node --experimental-strip-types experiments/melonds-live/watch-enemy.mjs experiments/melonds-live/artifacts/ram-1791130345646.bin.enemy.json
```

También se puede analizar un volcado completo ya disponible sin conectarse al emulador:

```powershell
node --experimental-strip-types experiments/melonds-live/find-enemy.mjs <volcado.bin> <especie>
```

Se validan PK5 cifrados, checksum, especie, nivel y coherencia de PS para localizar candidatos. Una coincidencia no demuestra que sea el rival; podría estar en el equipo, PC o una copia antigua. El buscador acepta identidades del equipo para excluirlas, pero el descubrimiento interactivo todavía no elimina automáticamente todos los ejemplares propios.

## Evidencia real de esta sesión, 4 de octubre de 2026

melonDS 1.1, Pokémon Negro español IRBS revisión 0. El usuario mantuvo un encuentro salvaje individual con Trubbish, confirmó nivel 19 y después un encuentro con Minccino nivel 22. Se leyó RAM real por ARM9, sin modificar el save.

| Dirección candidata | Trubbish abierto | Tras huir | Minccino abierto | Tras huir |
| --- | --- | --- | --- | --- |
| `0x02259d98` | Trubbish 19 | Conserva Trubbish | Minccino 22 | Conserva Minccino |
| `0x0225a408` | Trubbish 19 | Conserva Trubbish | Minccino 22 | Conserva Minccino |
| `0x0226acb4` | Trubbish 19 | PK5 inválido | Minccino 22 | PK5 inválido |
| `0x0226b214` | Trubbish 19 | PK5 inválido | Minccino 22 | PK5 inválido |

Las cuatro copias compartían identidad, especie, forma y nivel durante cada encuentro. Las dos primeras conservan datos antiguos fuera del combate. Por eso la ficha exige que **todas** las direcciones observadas contengan el mismo ejemplar; no utiliza la parte válida como alternativa. Al perderse la concordancia muestra «Sin rival confirmado». Esto evita el rival antiguo en las dos huidas observadas, pero todavía no es un detector general del inicio/final del combate.

El intento de reconectar ARM9 tras el volcado falló por timeout. El usuario creó un savestate, hizo Reset y lo cargó; una nueva conexión leyó las mismas direcciones con Trubbish 19. Durante las huidas y el encuentro posterior no fue necesario reconectar. El modo `--discover` evita cerrar la conexión entre descubrimiento y seguimiento, pero no se volvió a ejecutar el volcado completo con ese comando en esta sesión.

Validación automática: 118 pruebas, lint y build aprobados. Hay pruebas sintéticas para búsqueda, checksum corrupto, exclusión de identidades propias, desacuerdo y copias antiguas tras huir. El endpoint y su proxy de Vite respondieron correctamente con RAM real. La comprobación automática de escritorio/móvil no se completó: Chrome headless terminó por un fallo de su proceso GPU en este entorno. No se atribuyen al prototipo capturas ni verificaciones visuales históricas.

El usuario confirmó ver la sección en modo en vivo y «Sin rival confirmado» al salir. Señaló que el estado se confundía con el texto explicativo; se le dio un recuadro independiente con título, borde y fondo. La ficha con nombre/imagen/tipos y el ajuste visual posterior no se verificaron automáticamente en navegador.

Tras mover la sección a «Combate», el servicio seguía abierto pero devolvía `status: error`, «GDB no conectado» y ningún candidato. La pérdida era de GDB, no del proxy o de la pestaña: ambos endpoints devolvían el mismo error. Se sustituyó el proceso experimental por el lector con reconexión; la conexión ARM9 respondió y, al entrar el usuario en un nuevo encuentro, las cuatro direcciones coincidieron con Trubbish nivel 21. El servicio actualizado quedó activo. Se añadieron pruebas sintéticas de pérdida, eliminación de datos antiguos, recuperación, solicitudes concurrentes, reutilización de conexión e inicio fallido sin cerrar HTTP. No se comprobó el botón de reconexión en navegador.

## Límites observados en el detector inicial

- No se han validado combates de entrenador, cambios del rival, captura, debilitamiento, dobles, triples o rotación.
- Las direcciones se han observado en estos encuentros, no se localizaron punteros estables para distintas sesiones o asignaciones de memoria.
- No se ha validado que la concordancia de copias siempre implique combate activo; puede haber ventanas transitorias de desacuerdo o coincidencias ajenas.
- El prototipo no está incluido en el lanzador: se inicia por separado y requiere un servicio disponible en el puerto 3003.
- Falta medir rendimiento y latencia; tampoco se ha verificado la ficha en móvil.

El siguiente trabajo dentro del punto 1 es validar el ciclo de vida y localizar una señal explícita de combate activo antes de integrarlo como lector definitivo.

## Paso 2: identificación de tu Pokémon activo

La investigación mostró que `0x0226d670` y `0x0226e56c` son el primer elemento de dos arrays de parámetros, con separación `0x224` entre integrantes. Leer únicamente ese elemento devolvía al Pokémon inicial incluso después de cambiarlo: se descartó esa hipótesis.

El byte de selección del cliente de combate en `0x02272488` pasó de 1 con Marty (Blitzle) a 2 con Dewott. En las dos capturas, el puntero del cliente en `0x02272434` también pasó de `0x0226d888` a `0x0226daac`, apuntando al parámetro correspondiente. Los punteros iniciales de las tablas en `0x022697f8` y `0x022698e0` cambiaron al mismo integrante; el orden del equipo real permaneció `[507, 522, 502, 520, 532, 536]`.

El lector usa el índice seleccionado para elegir el elemento de cada array. Dentro de cada elemento, el puntero a PK5 está 12 bytes antes de la especie; la especie es uint16 y el nivel está 12 bytes después de ella. Lee cada registro y PK5 dos veces, valida checksum e identidad, y contrasta PID, entrenador y especie contra el equipo actual. Comprueba que el selector no cambie durante la muestra. Devuelve identidad, mote, forma, nivel, índice de combate y ubicación real en el equipo; no transporta PS ni estado en este paso.

La interfaz exige concordancia de ambas copias propias y un rival consistente. Si faltan datos, muestra «Por confirmar»; nunca elige el primer integrante como alternativa y no conserva una ficha propia fuera de un combate reconocido.

### Evidencia de esta sesión

- El usuario confirmó a Herdier en el campo. La lectura inicial de los arrays mostró Herdier 25; el cambio posterior demostró que eso todavía no identificaba la selección activa.
- El usuario cambió a Marty 23 y luego a Dewott 30. Capturas privadas de RAM, leídas sin modificar el juego, contienen selectores 1 y 2 respectivamente. Ejecutar el lector final sobre ambas capturas produjo Marty 23, PID 1417950787, espacio 2; y Dewott 30, PID 2674383559, espacio 3. La comprobación usa las copias de party presentes en la región capturada, no una lectura posterior del save.
- El endpoint real y su proxy de Vite devolvieron las dos copias concordantes de Dewott 30, índice 2 y espacio 3, frente a Trubbish 21. El servicio quedó activo en la misma conexión.
- La primera herramienta de investigación cerró su conexión antes de capturar el segundo estado. Se trasladó la captura al propio servicio y el usuario recuperó GDB mediante Reset y savestate; las capturas posteriores se realizaron en la misma conexión.
- 128 pruebas, lint y build aprobados. Las pruebas sintéticas cubren selección distinta del primer slot, cambio sin reordenar el equipo, identidad individual, selección inestable, punteros inválidos, separación de índices de combate y equipo, falta de configuración, fallo de la lectura propia sin perder al rival y serialización de capturas con muestreo.
- La interfaz se preparó para dos fichas y una columna en móvil. La revisión automática en navegador no se realizó en esta sesión.
- El usuario confirmó en la pestaña Combate las fichas de su Dewott 30, con mote, y Trubbish. Se verificó además el render inicial de ambos participantes mediante Vite y React con datos sintéticos; no equivale a una comprobación responsive en navegador.

El paso 2 queda limitado a este prototipo de combate individual y ROM de referencia. Aún faltan debilitamiento con sustitución forzada, formas durante el combate, entrenadores, varios participantes y estabilidad de estas direcciones en otras sesiones. PS y estados son pasos posteriores.

## Paso 3: PS reales de ambos participantes

Los parámetros de campo guardan PS máximos y actuales como uint16 a +2 y +4 desde la especie. El lector propio reutiliza sus registros seleccionados. El rival usa `enemyBattleAddresses`, observadas en `0x0226e348` y `0x0226f244` para esta ROM. Valida puntero, PK5, identidad del rival y estabilidad de cada registro; ambas copias deben coincidir en identidad y PS. Estas direcciones se releen desde la configuración local durante cada muestra.

No se utilizan los PS del PK5 como alternativa: en las capturas privadas del paso 2, Dewott seguía con 91/91 en PK5 mientras ambas estructuras de campo mostraban 80/91. Si los PS no son válidos o no coinciden, se muestra «PS por confirmar» sin ocultar una identidad válida. Los datos desaparecen al dejar de confirmar el combate o perder la conexión. Cero PS es válido y activa el aspecto de debilitado. No se leen cajas ni se añade una conexión GDB; las lecturas se serializan con el muestreo existente. La actualización usa el ciclo de lectura y la consulta de la interfaz, por lo que no es instantánea ni atómica entre participantes.

Validación del 4 de octubre de 2026: el usuario indicó Marty con 10/62 PS y Trubbish 19 con vida completa. Una captura de RAM y después el endpoint real, incluyendo el proxy de Vite, devolvieron dos copias de Marty 24 con 10/62 y de Trubbish 19 con 53/53. Tras reiniciar el servicio para cargar el paso 3, GDB dejó de responder; el usuario hizo Reset y cargó el savestate, y se restableció la lectura manteniendo la nueva conexión. No se pidió recibir daño ni avanzar turnos. La actualización durante un cambio de PS en este combate está pendiente de validación real.

Las pruebas sintéticas cubren PS de campo distintos del PK5, cero PS, rangos inválidos, identidades ajenas, lecturas inestables, falta de concordancia y actualización/eliminación de PS ante fallos del servicio. El renderizado con React y Vite verificó números, barra roja con 10/62, datos pendientes y debilitado; no equivale a una comprobación visual en navegador. Estados, salud del equipo y sincronización de «Tu equipo» siguen siendo pasos posteriores.

El usuario confirmó que en «Combate» se ven Marty 10/62, Trubbish 53/53 y ambas barras. Validación final: 134 pruebas aprobadas, ESLint y build correctos. No se comprobó el diseño móvil en navegador.

La ficha conserva los últimos PS confirmados durante lecturas intermedias del mismo ejemplar, y conserva la identidad propia durante muestras inestables mientras el mismo rival sigue confirmado. Un cambio de ejemplar o de combate limpia la retención; perder la confirmación del rival sigue ocultando el combate. La barra anima su anchura durante 420 ms. La ficha tiembla únicamente al perder PS, con amplitud proporcional a PS perdidos / PS máximos (2–20 px); curación, primera lectura y cambios de PS máximos no disparan golpe. Se respeta la preferencia de movimiento reducido. Pruebas sintéticas verifican retención, pérdidas repetidas, curación, cero PS y cambio de ejemplar. La animación no se ha verificado visualmente en navegador.

## Paso 5: salud del equipo completo en Combate

Los estados del paso 4 se pospusieron por decisión del usuario. Bajo los participantes aparece «Salud de tu equipo», con una tarjeta compacta por integrante: imagen, mote/especie, nivel, PS actuales/máximos y barra animada. Se identifica el activo y se distinguen reservas, debilitados y huevos. El diseño usa seis columnas, tres en pantallas intermedias y dos en móvil. No modifica la sección principal «Tu equipo», que corresponde al paso 6.

El muestreo recorre los integrantes de ambos arrays propios, reutilizando el selector y la lectura del equipo una vez por ciclo. Cada registro y PK5 se comprueban dos veces, y se identifica al integrante por PID, entrenador y especie, independientemente del orden de los arrays. Solo PS de campo concordantes se publican; los del PK5 no se usan como alternativa. Un error de un integrante no elimina los demás. Los huevos se mantienen en la lista sin barra de PS. Las lecturas son pequeñas, secuenciales y usan la misma conexión GDB; no consultan cajas ni ejecutan un volcado automático. Solo se recorre el equipo completo mientras las copias del rival confirman el combate.

La interfaz retiene la lista y los PS confirmados durante muestras intermedias del mismo combate, y los limpia al cambiar de rival o dejar de confirmar el combate. Las tarjetas se identifican por ejemplar para conservar su vida al reordenarse. La actualización sigue dependiendo del tiempo del ciclo GDB y de los dos segundos entre consultas de la interfaz; no es una lectura atómica del turno.

Validación real del 4 de octubre de 2026: la captura privada `active-research-1791134993711/capture-1.bin` produjo, en orden, Marty 62/62, Herdier 53/68, Dewott 94/94, Tranquill 84/84, Palpitoad 92/92 y Venipede 35/35. El usuario indicó esos seis valores y a Marty como activo; coincidieron. La ejecución sobre esta captura usa la copia del equipo contenida en ella. Las pruebas sintéticas cubren reservas debilitadas, selección activa, cambio de activo, reordenación del equipo y fallo/desacuerdo de un integrante sin usar PS antiguos del PK5. El renderizado con React y Vite comprobó seis barras, activo, debilitado y huevo. No se comprobó el diseño responsive en navegador.

El servicio actualizado se reconectó después de Reset y savestate. El endpoint real y su proxy de Vite devolvieron los seis PS concordantes, y el usuario confirmó las seis tarjetas y Marty activo en la interfaz. Cinco muestras consecutivas mantuvieron seis integrantes, con ciclos observados de aproximadamente 2,7 segundos (incluyen la espera configurada de dos segundos; no es una medición general de rendimiento). Validación final: 140 pruebas, lint y build aprobados. Sustitución forzada, huevos reales y actualización de una reserva durante un cambio siguen pendientes de validación real.

## Distribución compacta de Combate

Al seleccionar la pestaña Combate se ocultan la introducción, el equipo superior duplicado y el pie de página. El origen y los controles de conexión se mantienen en un desplegable; el botón flotante lo abre antes de desplazarse a sus controles. Las demás pestañas conservan su distribución habitual.

Las fichas de escritorio colocan imagen y datos en dos columnas; en pantallas pequeñas se mantienen ambos participantes lado a lado y la efectividad ocupa una fila debajo con flechas horizontales. Se conserva el espacio reservado para mote/especie y los PS animados. Las seis tarjetas del equipo combinan imagen pequeña y nombre en una fila y vida debajo. Se reducen márgenes y el estado de detección, y la explicación de lectura/multiplicadores queda en un desplegable.

Validación: 140 pruebas, lint y build correctos. El render de React/Vite con almacenamiento sintético verificó el modo compacto, el equipo superior oculto, los controles desplegables y la distribución normal en Manual. No se verificó el diseño responsive visualmente en navegador en esta comprobación.

El usuario confirmó que la vista compacta cabe fácilmente en una pantalla. A petición suya, los sprites del equipo se ampliaron de 48 a 72 px en escritorio y a 64 px en móvil, conservando imagen y nombre lado a lado. Lint y build correctos tras este ajuste; el tamaño final de los sprites no se verificó visualmente en navegador.

## Ataques y debilidades en recuadros separados

La efectividad se divide en dos paneles: «Tu ataque / Tus debilidades» debajo de tu Pokémon y «Ataque rival / Debilidades del rival» debajo del enemigo. Los participantes y paneles usan las mismas dos columnas de CSS Grid y filas compartidas. Los paneles tienen altura reservada durante carga y actualización (160 px en escritorio, 212 px en móvil), con desplazamiento interno para listas largas; no desplazan las tarjetas del equipo al variar el contenido.

El ataque muestra la efectividad de cada tipo del atacante frente a los tipos del oponente. Las debilidades defensivas recorren los 17 tipos de Generación V y muestran multiplicadores mayores que uno, incluyendo 4× por doble tipo y casos sin debilidades. No dependen de que el rival posea ese tipo. Se conservan las resistencias de Acero de Generación V y no se incluye Hada ni efectos de habilidades, movimientos u objetos.

Validación: 141 pruebas, lint y build aprobados. React/Vite verificó cada panel con datos sintéticos Blitzle/Trubbish, sus debilidades independientes, carga pendiente y ausencia de debilidades de Fantasma/Siniestro en Generación V. La alineación responsive no se verificó visualmente en navegador en esta comprobación.

Los paneles muestran ahora únicamente debilidades. Una debilidad coincidente con un tipo del oponente se resalta con borde, fondo y estrella: verde en debilidades del rival aprovechables por tu Pokémon, rojizo en tus debilidades aprovechables por el rival. Las alturas permanecen reservadas e iguales. Se capitalizan las especies del equipo mediante estilos, conservando intactos los motes. El número Pokédex de las fichas principales queda fijo en la esquina superior izquierda y se elimina el texto de espacio del equipo. Validación: 141 pruebas, lint y build correctos; React/Vite verificó resaltados en ambos sentidos, ausencia de resaltado sin coincidencia y ficha sin texto de espacio. No se verificó visualmente en navegador este ajuste.

Cada integrante del equipo muestra junto a su nivel un icono de enfrentamiento frente al rival: ↑ verde para ventaja, ↓ rojo para desventaja, ↕ amarillo cuando ambos tienen un tipo supereficaz y = gris para neutral. El detalle accesible y el tooltip indican el mejor multiplicador de cada lado. Se comparan por separado los tipos de cada atacante contra los tipos defensivos completos; una resistencia defensiva también puede dar ventaja. Las coincidencias supereficaces mutuas se muestran como riesgo compartido en lugar de asumir que hay un ganador. Es una referencia de tipos Gen V, sin movimientos, habilidades, objetos ni estadísticas; los huevos no muestran icono y los datos pendientes muestran ?. Validación: 142 pruebas, lint y build correctos, incluyendo daño en ambos sentidos, inmunidad, resistencia y tipos dobles. No se verificó el icono visualmente en navegador.

En modo en vivo hay un acceso flotante a Combate encima del indicador de conexión. Es verde únicamente cuando las copias del rival confirman un encuentro, y gris si no hay combate confirmado; permanece utilizable para consultar Combate o volver. La primera pulsación conserva la pestaña y el scroll; la segunda regresa a ese punto. Una selección manual de pestaña o cambio de origen elimina el punto de retorno. Si se está en Combate por selección manual o restauración, el botón dirige a Capturas por zona. Se oculta durante modales. La detección reutiliza el muestreo existente y no abre otra conexión. Validación: 144 pruebas, lint y build aprobados; pruebas de destinos y render de colores/etiquetas de entrada y salida correctos. No se verificó en navegador la interacción ni la restauración del scroll.

## Corrección de detección en combate de entrenador

El detector original exigía cuatro PK5 concordantes: dos del encuentro salvaje y dos del campo. En la pelea de entrenador observada, los dos primeros no tenían checksum válido, mientras los dos PK5 del campo contenían Palpitoad 23. El usuario confirmó ese rival. Por eso se descartaba el combate aunque GDB seguía conectado.

El modo `--battle` confirma el rival mediante los dos registros `enemyBattleAddresses`: comprueba sus punteros, especie y nivel contra el PK5, checksum, identidad en dos lecturas y concordancia entre ambas copias. Sigue los punteros activos en vez de asumir una dirección fija de PK5; los datos del encuentro salvaje no intervienen. Durante un cambio de PS con identidad estable se conserva la confirmación del rival y se omiten solo los PS transitorios. No se usa una copia válida aislada como alternativa ni un PK5 antiguo después de invalidarse los registros del campo. La interfaz y el botón flotante reciben la misma confirmación.

Evidencia del 4 de octubre de 2026: la captura privada `active-research-1791136109626/capture-1.bin` contiene ambos registros apuntando a las copias de Palpitoad 23, identidad concordante y 67/67 PS. Ejecutar el lector corregido sobre esa captura lo reconoció. También reconoció un rival salvaje en una captura previa. Pruebas sintéticas cubren cambio del rival por puntero, fin del combate con PK5 antiguo retenido, registro corrupto, transición de PS sin ocultar identidad y servicio sin direcciones de encuentro salvaje. Validación automática: 147 pruebas, lint y build correctos. Cambios reales del rival y salida de la pelea de entrenador quedan pendientes de comprobación.

Después de Reset y cargar el savestate, el nuevo servicio se conectó y el endpoint real y el proxy de Vite devolvieron las dos copias concordantes de Palpitoad 23 con 67/67 PS. La identificación del equipo propio se reactivó en la misma conexión. Este encuentro de entrenador quedó reconocido en vivo; el seguimiento del siguiente rival y el fin de la pelea no se comprobaron aún con RAM real.

El usuario confirmó que Palpitoad aparece en Combate y que el botón flotante se pone verde en esta pelea de entrenador.

## Tablas de participantes en combates con varios Pokémon de reserva

En otra pelea individual, el usuario confirmó Pansear 23 frente a Herdier 27. Las direcciones fijas del rival devolvían Pansear y un Palpitoad del equipo propio: la segunda copia se desplazó al aumentar los integrantes del entrenador. También se desplazó el selector propio. No era una desconexión GDB.

La configuración `battlePointerTables` identifica dos tablas de la ROM de referencia, en `0x022697f8` y `0x022698e0`. Sus primeros seis punteros corresponden al equipo propio, ordenado con el participante activo primero; el puntero a +28 corresponde al rival activo. Los punteros apuntan al comienzo del parámetro de campo, 12 bytes antes de la especie. El lector sigue cada puntero, verifica PK5 e identidad en ambas copias y confirma que las tablas no cambien durante el muestreo. La posición real del integrante propio se resuelve por identidad contra el equipo, independientemente del orden de las tablas. Sin esta configuración se conserva el lector anterior con direcciones fijas.

La captura privada de esta pelea reconoció ambas copias de Pansear 23 con 51/58 PS y Herdier 27 con 73/73 PS mediante el lector corregido. La lectura del equipo para reproducir la captura utilizó los PK5 guardados en esa misma RAM. Pruebas sintéticas verifican desplazamiento, sustitución del rival, reordenamiento del equipo propio, punteros inválidos, tablas inestables e invalidación al terminar. Resultado: 152 pruebas, lint y build aprobados. No hubo comprobación visual del navegador. Tras reiniciar el servicio para cargar el cambio, el intento real de reconexión volvió a agotar el tiempo de GDB sin recibir ACK; la comprobación en vivo del nuevo lector queda pendiente de recuperar GDB en melonDS. No se escribieron RAM ni saves.

## Tabla de aumentos y reducciones

Las dos tarjetas incluyen una tabla de Ataque, Defensa, Ataque especial, Defensa especial, Velocidad, Precisión y Evasión. Solo se muestran niveles de cambio, con flechas y signo: las subidas son verdes y las bajadas rojas. Una raya representa un nivel neutral confirmado; `?` y «Cambios por confirmar» representan datos ausentes o incoherentes. La tabla no conserva cambios anteriores cuando las copias discrepan ni al sustituirse un participante.

`battleStatStagesOffset` configura el bloque de siete bytes desde el comienzo del parámetro de campo. La captura de Pansear/Herdier contiene `06 06 06 06 06 06 06` en ambas copias, a +0xfc (252), compatible con siete niveles neutrales codificados con sesgo 6. El lector toma dos muestras del bloque entre las comprobaciones de identidad del campo y del PK5; descarta bytes fuera de 0–12 y muestras inestables. La interfaz exige que ambas copias pertenezcan al participante y coincidan en las siete estadísticas. Sin el offset configurado no se publican cambios. El orden Ataque/Defensa/Ataque especial/Defensa especial/Velocidad/Precisión/Evasión es una interpretación del bloque experimental; falta contrastarlo con cambios conocidos en una pelea real. No se deducen niveles del daño ni de valores de PokéAPI.

Validación actual: 156 pruebas aprobadas, lint y build correctos. Las pruebas sintéticas cubren límites ±6, valores neutrales, identificación, cambios independientes de cada participante, restauración a neutral, copias discrepantes, bytes inválidos y transiciones durante el muestreo. Se revisaron las tarjetas reales en Chrome servido por Vite, con datos sintéticos a 1280 y 390 px: dos tablas de siete filas, sin desbordamiento horizontal, flechas y colores visibles. También se verificó el estado sin datos a 390 px. Evidencia: [escritorio](../../artifacts/battle-stages-1280.png), [móvil](../../artifacts/battle-stages-390.png) y [sin datos](../../artifacts/battle-stages-390-unknown.png). El arnés está en `artifacts/battle-stages-check.html` y `node artifacts/check-battle-stages.mjs` reproduce esos controles con Vite en 5173 y Chrome instalado en su ruta estándar de Windows. La lectura real de cambios sigue pendiente: al reiniciar el lector actualizado, GDB volvió a agotar el saludo sin recibir ACK. No se modificaron RAM ni saves.

## Navegación automática, estadísticas horizontales y fortalezas

La tabla actual tiene siete columnas: ATK, DEF, SPA, SPD, SPE, ACC y EVA, con los nombres completos en las ayudas de cada encabezado. Conserva los últimos cambios confirmados para el mismo participante durante lecturas vacías o inestables. Un valor neutral confirmado actualiza la tabla; una identidad nueva elimina los niveles del participante anterior. Las tarjetas y el equipo también se conservan durante ataques y sustituciones del entrenador.

El servicio publica `battleActive` independientemente de la identificación del rival. Lee dos veces ambas tablas y comprueba los punteros al participante propio y al rival. Si ambas copias conservan los punteros propios, el combate sigue activo aunque no haya un rival confirmado. La liberación de todos esos punteros, estable entre las dos lecturas, confirma el fin; una lectura parcial o inestable publica `null` y conserva la sesión. Esto sigue siendo una señal experimental basada en la vida de las tablas, no un flag de escena de la ROM. El servidor continúa leyendo el equipo propio entre rivales. Al confirmar que acabó la pelea, descarta también cualquier copia antigua de participantes que aún tuviera identidad válida.

La primera detección de una pelea abre Combate y guarda la pestaña y el desplazamiento anteriores. El fin confirmado realiza el regreso del botón. Salir manualmente durante la misma pelea se respeta: otra muestra no vuelve a abrir Combate; una pelea nueva sí. Un error de conexión o un rival ausente no activan el regreso. Un lector antiguo sin `battleActive` permite la entrada automática, pero necesita actualizarse para confirmar la salida.

Debajo de las debilidades, «Fortalezas» muestra las resistencias e inmunidades defensivas de todos los tipos de Generación V, incluidos 0.25×, 0.5× y 0×. Se mantienen las resistencias de Acero a Fantasma y Siniestro. Las estrellas siguen indicando coincidencias con los tipos del contrincante.

Validación de este cambio: 165 pruebas aprobadas, lint y build correctos. En Chrome con Vite y datos sintéticos se verificaron las tablas horizontales a 1280 y 390 px, resistencias/inmunidades, conservación de niveles ante una lectura vacía, actualización neutral y cambio de identidad. Sobre la aplicación completa se comprobaron entrada automática, intervalo entre rivales, sustitución, pérdida de conexión, regreso manual, respeto al regreso durante la misma pelea, siguiente pelea y salida automática con restauración del desplazamiento. El arnés y las capturas enlazadas arriba se actualizaron a esta disposición; ahora cada tabla tiene una fila de valores.

La función de presencia devolvió `true` en la captura real de Pansear/Herdier y `false` en una captura posterior con las tablas liberadas y reutilizadas por objetos del campo. No se comprobó aún un ciclo completo con entrenador en vivo usando el servicio nuevo. Al actualizar el servicio, fuera de un combate confirmado, la reconexión volvió a agotar el saludo GDB sin ACK. El servicio actualizado queda disponible, pendiente de recuperar GDB en melonDS. No se escribieron RAM ni saves.

El ajuste posterior de espaciado eliminó las alturas fijas de los recuadros de debilidades y fortalezas. Sus filas y cada recuadro se adaptan al contenido, sin estirar el panel más corto ni recortar listas de tipos. Se comprobó en Chrome con los datos sintéticos del arnés a 1280 y 390 px, sin desbordamiento horizontal; las capturas anteriores se actualizaron. Las 165 pruebas, lint y build aprobaron nuevamente.

Al detectar una pelea nueva, la entrada automática desplaza la página hasta el final, incluso si Combate ya estaba abierto. El regreso sigue restaurando la posición anterior. Se comprobó en la aplicación completa con snapshots sintéticos y un viewport de 1280×420, tanto al entrar desde otra pestaña como al empezar una pelea dentro de Combate.
