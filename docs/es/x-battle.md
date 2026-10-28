# Combate experimental de Pokémon X

Integración múltiple del 27 de octubre de 2026: el lector de producción del perfil
local de X ya publica sencillo, doble y horda. La investigación que sustenta las
direcciones y las limitaciones está en [x-multi-battle-research.md](x-multi-battle-research.md).
La implementación y la validación actuales se describen al final de este documento.

Las secciones siguientes conservan el historial de la integración individual.

Primera integración del 23 de octubre de 2026. Lectura local y de solo lectura para el perfil de X ya validado con Citra Nightly 2104.

La pantalla y el ciclo actuales son compartidos con Black. Las secciones de validación conservan la secuencia de entregas, incluidas comprobaciones de la pantalla inicial luego sustituida. Véase la [guía de arquitectura y decisiones](architecture.md) para las responsabilidades y límites vigentes.

## Alcance de la integración individual inicial

La pestaña Combate está disponible en la fuente en vivo cuando el puente anuncia la capacidad `battle`. Muestra activo, rival, PS, resistencias, debilidades y comparación STAB potencial del equipo. Las reglas se inyectan en el motor compartido: Black mantiene generación V y X utiliza VI. Las especies se resuelven localmente y su presentación respeta la Pokédex de la fuente.

El nivel del rival se obtiene de su EXP leída y de la curva de crecimiento de su especie, con datos públicos locales. Las siete etapas se leen de dos copias de combate, se normalizan de 0–12 a −6…+6 y se muestran bajo los PS. La pantalla compartida conserva la última lectura válida del mismo ejemplar durante transiciones; al cambiar su identidad se reinicia esa referencia. Transformaciones y combates dobles quedan expresamente como deuda, fuera de esta entrega. No se calculan daños de movimientos ni efectos de habilidades u objetos. La validación real realizada corresponde a encuentros individuales salvajes; otras modalidades requieren investigación adicional.

## Perfil y comprobaciones de memoria iniciales

Referencias iniciales: [punteros de estadísticas](https://github.com/Hartie95/PokemonCheatPlugin/blob/master/source/battle/statsModifier.c) y [copias PK6 del rival](https://github.com/Hartie95/PokemonCheatPlugin/blob/master/source/battle/wildModifier.c). Se consultaron como datos; no se ejecutó código de ese proyecto ni se implementaron escrituras.

Punteros candidatos: `0x081FB284`, `0x081FB624`, `0x081FB2A0`, `0x081FB640`. Dos lecturas de cada participante, especie en +12, PS máximos en +14 y actuales en +16. Copias PK6 del rival en `0x081FEBA0` y `0x081FF744`, idénticas y con checksum válido. Se comprueba la huella del ejecutable y se toman dos pasadas estables. La identificación del activo exige un único miembro del equipo que coincida en especie y PS máximos; los duplicados ambiguos se dejan sin confirmar.

En el mapa las copias secundarias quedan en cero y las posiciones primarias pueden contener valores reutilizados fuera del rango de RAM esperado (se observaron `0x20` y `0x597774`). No se exige que los cuatro valores sean cero. Lecturas parciales, copias discordantes y transiciones producen estado no confirmado; no reutilizan al rival anterior como activo.

La extensión opcional `battle` conserva el protocolo 3 del puente X. Un fallo parcial no bloquea equipo, Pokédex ni cajas. La pantalla compartida conserva la sesión ante lecturas incompletas o desconexiones y señala que la lectura no está actualizada; solo una salida confirmada limpia los participantes.

## Validación realizada

- Riolu contra Magikarp: Riolu 27/48 PS y rival 22/22, confirmados por ambas copias.
- Cambio realizado por el usuario a Budew: activo 37/37, distinto del primer miembro Riolu; Magikarp permaneció en 22/22.
- Salida al mapa: las copias del rival dejaron de ser válidas y los punteros dejaron de identificar participantes.
- Nueva pelea Riolu contra Budew: 27/48 y 26/26; la UI mostró participantes, PS y tablas de tipo. La orientación del equipo mostró ventaja de Fletchinder y Braixen frente al rival.
- Tras otro turno del usuario desaparecieron los participantes válidos; se corrigió la condición de estado inactivo por memoria reutilizada. No se verificó una transición de daño parcial entre dos valores positivos en una misma pelea.
- 335 pruebas automáticas correctas, lint y build correctos. Incluyen reglas V/VI, Hada, inmunidades, ambigüedad del activo, corrupción, salida, transiciones y validación de snapshots.

## Nivel, etapas y móvil: entrega completada

Validación real adicional del 23 de octubre de 2026:

- Azurill contra Flabébé nivel 7. El usuario utilizó Encanto dos veces: ambas copias del rival devolvieron Ataque −4 y las otras seis etapas neutras. Las dos copias PK6 devolvieron EXP correspondiente al nivel 7.
- Cambio a Budew y un Desarrollo: ambas copias del activo devolvieron Ataque +1 y Ataque Especial +1; Flabébé conservó Ataque −4. Salud observada: Budew 37/39 y rival 19/23, frente a 23/23 antes del turno.
- Etapas: offset relativo `0x104`, siete bytes en orden Ataque, Defensa, Ataque Especial, Defensa Especial, Velocidad, Precisión y Evasión. Valores 0–12, neutral 6. Referencia pública contrastada con cambios reales: [Gen6CTRPFrameworkOverhauled, Sources/Codes.cpp](https://github.com/samaBR85/Gen6CTRPFrameworkOverhauled/blob/main/Sources/Codes.cpp). No se ejecutó el código de escritura del proyecto.
- La curva EXP/nivel usa el catálogo local de X y `levelFromExperience`; no se envían datos del ejemplar a servicios externos. Los tests cubren los umbrales exactos de curvas diferentes y datos ausentes o inválidos.
- Se corrigió un bloqueo del lector de Pokédex: la firma ocupa los primeros cuatro bytes; los bytes 4–7 son indicadores variables. Exigir ceros rechazaba un bloque válido con `C0 7F 00 00`. Referencia: [PKHeX Zukan6](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Saves/Substructures/PokeDex/Zukan6.cs). Se mantienen las dos lecturas estables, la firma y las reglas originales de capturas; un test confirma que los indicadores no alteran visto/capturado.
- UI real en 390 × 844 y 320 × 780: participantes y reservas en una columna, siete columnas legibles sin desbordamiento horizontal. En 768 × 1024 se conservan dos participantes en paralelo. En escritorio PS y etapas tienen la misma coordenada vertical en ambas tarjetas. Cambio inmediato a inglés y vuelta a español comprobados.
- 339 pruebas correctas, lint y build correctos. Capturas de esta sesión en `artifacts/x-battle-stages/desktop.png`, `mobile-own.png` y `mobile-enemy.png`.

El puente local fue reiniciado para cargar los campos nuevos y la corrección de Pokédex. La extensión opcional de etapas conserva compatibilidad con snapshots anteriores y con el protocolo 3. El código y estas notas quedan guardados en el workspace; no se solicitó commit.

## Pantalla y ciclo compartidos con Black

`BattleScreen` sustituye la pantalla independiente de X. Black y X normalizan sus lecturas en `CombatReading`; cada adaptador aporta la resolución de especies, la acción de estadísticas y sus reglas de tipos. La presentación no importa APIs de un juego ni endpoints del puente.

La sesión de Black se extrajo a `battle-lifecycle.ts`: conserva participantes durante huecos de lectura y reemplazos, y se vacía únicamente ante una salida confirmada. `useBattleNavigation` comparte la apertura automática, el botón flotante, la pestaña de regreso y la restauración del scroll. En X se mantiene montada la sección anterior durante el combate para conservar sus filtros.

Las tarjetas de participantes, animación de PS, etapas, reservas y tablas de tipos usan los mismos componentes. `PokemonCardFrame` contiene la presentación antes integrada en `PokemonCard`; el contenedor de Black conserva sus acciones y contextos originales. Las diferencias V/VI permanecen en las reglas inyectadas. Otras pantallas de las aventuras conservan su composición actual: esta extracción se limita al combate.

Para distinguir una transición de una salida, el lector X comprueba también `0x081FB170`: el estado inactivo `0x40000` junto con los punteros inactivos confirma el final; tablas incompletas con estado activo no lo confirman. La lectura continúa siendo de solo lectura.

Validación automática de la extracción: 343 pruebas correctas, lint y build correctos. Incluye observaciones normalizadas de ambos adaptadores, huecos prolongados, reemplazos, desconexión, salida y reglas V/VI. Las comprobaciones históricas anteriores corresponden a la pantalla previa; la validación interactiva del nuevo flujo se registra por separado.

Validación interactiva del nuevo flujo, 23 de octubre de 2026:

- Citra real: desde Mi colección filtrada por `#280`, Riolu contra Ledyba nivel 7 abrió Combate automáticamente. El botón flotante volvió a la colección conservando el filtro y permitió regresar a la misma pelea.
- El usuario cambió a Fletchinder: se confirmó 58/58 PS, Riolu pasó a reserva y la sesión permaneció activa. La acción de estadísticas abrió la ficha de Fletchinder.
- Al terminar y volver al mapa se limpiaron los participantes y se volvió automáticamente a Mi colección, con el filtro y scroll originales (1054.4 px).
- En 390×844 y 320×780 no hubo desbordamiento horizontal; las reservas usan dos columnas. En escritorio ambos paneles de debilidades tuvieron igual posición y altura. Evidencia: `artifacts/shared-combat/desktop.png`.
- Black: se verificó acceso a la misma pantalla y su estado sin lector disponible; no se validó una pelea real de melonDS en esta sesión. Su ciclo y normalización se cubren con fixtures sintéticos.
- La suite completa necesita loopback y operaciones de reemplazo de archivos temporales sintéticos; se ejecutó correctamente fuera de la restricción que impedía esas operaciones. No se modificaron saves reales ni memoria del emulador.

Deuda acordada: transformaciones y combates dobles. La integración sigue siendo experimental para el perfil local de X y encuentros individuales; no constituye un simulador de daño ni incorpora habilidades u objetos.

## Encuadre y selección diaria

La entrada automática centra las tarjetas de los participantes, en lugar de desplazarse al final de toda la pantalla. Si no caben juntas verticalmente, comienza por el Pokémon activo. El punto de regreso conserva el scroll anterior. Se comprobó con Riolu contra Skitty en Citra: ambas tarjetas completas, entre 176.6 y 543.4 px dentro de una ventana de 720 px de alto.

La marca de debilitado se coloca arriba a la derecha, junto al botón de estadísticas y fuera del flujo de la tarjeta, para evitar que añada altura y desplace los PS en las disposiciones de una columna. Con Skitty a 0/28 PS se midieron ambas barras a la misma altura (469.8 px) en una ventana de 900 px de ancho; no se capturó esa situación en móvil antes de que terminara la pelea.

La selección de aventura se guarda con el día local del dispositivo. Recargar o reiniciar durante ese mismo día restaura el juego; en otra fecha vuelve el selector. Cambiar de juego borra la selección hasta elegir otra aventura. Se comprobó la recarga real de X; los tests cubren ambas aventuras, medianoche, datos inválidos y almacenamiento bloqueado. Suite: 344 pruebas correctas.

## Integración múltiple: fase 8 (27 de octubre de 2026)

`bridge/citra/x-session.ts` usa ahora `readXMemoryBattleField`. Se mantiene la
huella del ejecutable antes y después de la sesión. El lector consulta el estado
explícito, el selector de formato y las instrucciones de capacidad ya validadas.
Lee las primeras 1/1, 2/2 o 1/5 entradas del orden de batalla y confirma dos
copias por participante y dos pasadas completas, además de la estabilidad de
las tablas. Los registros siguientes son reservas y no se muestran como activos.

La identidad procede del enlace PK6 del registro, con validación de punteros,
checksum, especie y pertenencia al equipo correspondiente. Esto permite distinguir
rivales de la misma especie y PS máximos. El espacio original se resuelve por
identidad, aunque el orden de combate cambie. No se usa la heurística anterior
de especie/PS máximos para la ruta nueva. Un enlace inválido, copia discordante o
identidad propia ajena al equipo controlado deja ese puesto desconocido. Las
etapas discordantes dejan solo las etapas sin confirmar. No se interpreta un
puntero nulo como vacante confirmada.

`BattleReading.field` amplía el protocolo de forma opcional. El cliente valida
formato, topología, propietarios, especies, formas, niveles, salud, etapas y
límites de este perfil antes de consumirlo. Los payloads individuales antiguos
siguen siendo válidos. `normalizeXFieldBattle` aporta el campo y el equipo con
reservas; los apodos se enlazan por identidad. `XBattle` mantiene la ruta múltiple
una vez recibido el protocolo nuevo, incluso durante una lectura nula, una salida
o desconexión. Así no desmonta la sesión por un hueco temporal del puente.

Las capacidades de X anuncian sencillo, doble y horda para este lector local.
Black conserva su lector individual y sus reglas de generación V. No se
implementan triples, rotatorios, transformaciones ni propiedad de compañeros de
otro entrenador. Un selector desconocido se publica como formato no confirmado,
sin degradarlo a sencillo. Aliados, sustituciones rivales con reservas y otras
revisiones del ejecutable requieren validación adicional. Las fases de animación
pueden dar lecturas parciales; se conserva la última lectura confirmada.

### Comprobaciones realizadas con Citra real

- Perfil confirmado por huella; primera muestra completa del doble en unos 96 ms.
- Doble: Shelgon 40, 109/109 PS y Mienfoo 40, 99/99 PS contra Pansage y Pansear
  10, 30/30 PS. Cuatro puestos, dos activos propios, seis miembros en el equipo
  y dos Poké Balls rivales. Cambiar la referencia a Pansear actualizó el análisis.
- Horda: un Shelgon propio y cinco Scraggy de nivel 5, con máximos 20/21/21/20/21.
  Tras un KO, la entrada de combate 3 quedó en 0/20 PS; se conservaron los cinco
  puestos y el total de cinco Poké Balls. El orden mostrado es el orden normalizado
  de la tabla, no las coordenadas visuales del juego.
- Sencillo salvaje posterior: Shelgon 40, 102/109 PS contra Skiddo 10, 34/34 PS;
  dos puestos y un activo propio. El cambio de modalidad eliminó las selecciones
  del campo anterior.
- Datos reales a través de RPC, puente SSE, validación, adaptador y pantalla de
  producción; sin fixtures en esta comprobación. Se verificó DOM móvil a 320
  píxeles en doble y horda sin desbordamiento y se comprobó cambio ES/EN en sencillo.
- Capturas inspeccionadas: `artifacts/x-double-real-integrated.png`,
  `artifacts/x-horde-real-integrated.png` (posterior a KO) y
  `artifacts/x-single-real-integrated.png`.

Se reiniciaron los servicios locales para cargar el protocolo nuevo. No se
modificaron memoria, saves ni la ejecución del juego: los cambios de combate los
realizó el usuario. Los diagnósticos temporales se retiraron y no se guardaron
dumps ni muestras de memoria. El lector individual antiguo permanece para
compatibilidad y sus pruebas, pero el puente X actual usa el lector de campo.

Las pruebas sintéticas cubren los tres formatos, identidad con especies/PS
repetidos, dos sustituciones propias y rivales reordenados, KO, referencias
inválidas, etapas discordantes, selector desconocido, truncamiento, cambios entre
lecturas, validación de payload y normalización de apodos y reservas. Las
sustituciones sintéticas no se presentan como validación real de reemplazos
rivales con reservas.

Validación final de la fase 8: `npm test` (477/477), `npm run lint` y
`npm run build` correctos; `git diff --check` sin errores de espacios.
