# Contrato de combate con varios participantes

Estado consolidado: X ya publica el campo para sencillo, doble y horda. Black
conserva la ruta individual. La [guía de uso y extensión](multi-battle.md) resume
el soporte actual; la [validación](multi-battle-validation.md) distingue fixtures
y lecturas reales. Las secciones por pasos conservan el historial de implementación.

`src/games/core/combat.ts` define el campo normalizado; `FieldPokemon` reutiliza
`CombatParticipant` y sustituye `slot` por `partySlot`. Las reglas y capacidades
pertenecen a cada juego y lector. `CombatReading` y el ciclo individual siguen
vigentes para Black y para puentes antiguos de X.

## Formato y campo

- `single`: un puesto por bando.
- `double`: dos puestos por bando.
- `horde`: un puesto propio y cinco rivales.
- `special`: identificador acompañado por `gameId`. No anuncia soporte de un
  lector ni implementa triples o rotatorios; sus reglas llegarán con el adaptador.

El formato es confirmado por el adaptador o desconocido. No cambia al disminuir
los supervivientes. Los puestos tienen identificadores estables dentro del bando
y estados explícitos: `occupied`, `empty` y `unknown`. Un debilitado puede seguir
ocupando su puesto con cero PS hasta que el lector confirme que quedó vacío.
Un hueco de lectura nunca significa que desapareció el ocupante.

Cada ocupante conserva identidad propia y `ownerId`, independientemente de especie,
posición y espacio en el equipo. Los propietarios distinguen jugador, aliado,
entrenador rival y salvaje. Un aliado pertenece al bando del jugador pero no a su
equipo. `partySlot` se interpreta dentro del equipo del propietario.

`rosterTotal` cuenta el equipo inicial completo del bando, incluidas reservas,
sin enumerar especies; no representa supervivientes ni puestos activos. Puede
ser desconocido y no se limita globalmente a seis, pues puede haber varios
entrenadores. Su presentación en Poké Balls se implementará en otro paso.

## Lectura y validación

`FieldCombatReading` separa conexión (`ready`, `waiting`, `error`) de actividad
(`active`, `inactive`, `unknown`). Una salida confirmada tiene campo nulo; una
lectura parcial puede tener campo o carecer de él. `messageCode` contiene un
identificador de protocolo, nunca texto traducido. Salud, nivel y etapas mantienen
los valores desconocidos del modelo compartido.

`validCombatField` comprueba la coherencia de un campo ya normalizado: capacidades
de puestos generales, propietarios, posiciones e identidades únicas por bando,
ausencia de huevos y totales compatibles. No es un parser de JSON no confiable.
La validación de entrada, límites de equipo, especies y formas pertenece al
adaptador del juego. Las reglas de formatos especiales y la conservación de
sesiones ante lecturas parciales se implementarán en los pasos correspondientes.

## Capacidades por juego y lector

`GameCombatCapabilities` declara los formatos del juego y
`CombatReaderCapabilities` los que un lector concreto tiene implementados y
validados. `combatFormatAvailability` resuelve `readable`, `pending` o
`unavailable`: primero consulta el juego y después el lector. Un lector de otro
juego, una fuente sin lectura de combate o la ausencia de lector no habilitan
formatos. `readable` describe implementación, no conexión ni la confirmación de
una lectura actual; se mantiene el estado experimental de los perfiles locales.

| Formato | Black | X | Lectores actuales |
| --- | --- | --- | --- |
| Sencillo | Disponible | Disponible | Implementado |
| Doble | Disponible | Disponible | Pendiente |
| Horda | No disponible | Disponible | Pendiente |
| Triple | Especial de Black | Especial de X | Pendiente |
| Rotatorio | Especial de Black | Especial de X | Pendiente |

Las declaraciones están en `src/games/black/combat-capabilities.ts` y
`src/games/x/combat-capabilities.ts`. Manual y save no reciben capacidades de
memoria por compartir juego. Estas declaraciones aún no sustituyen el booleano
`battle` del protocolo ni se conectan a la pantalla individual: se consumirán al
migrar lectores y presentación. No se infiere el formato actual de esta lista.

`CombatPresentation` define la extensión opcional para la futura pantalla:
`SpecialCombatPresentation` identifica el formato por juego y puede aportar
`renderField`, `renderControls` y `renderDetails` desde el workspace. El contrato
React está separado del contrato de datos. No se han implementado ni registrado
renderizadores especiales; declarar uno tampoco concede soporte de lectura.
Para añadir un formato especial se declara en el juego, se implementa su lectura
y se incorpora al lector solo tras validarla; si necesita presentación distinta,
se suministra su extensión desde la composición del juego.

Validación de esta etapa: pruebas sintéticas de capacidades Black/X, aislamiento
entre juegos y fuentes, nombres especiales y extensión con un juego de prueba.

## Contador del equipo rival

La pantalla individual compartida muestra el total con Poké Balls, sin especies
ni indicadores de debilitados. El lector X publica `opponentRosterTotal` a partir
del tamaño coincidente de sus dos tablas rivales, dentro de las dos pasadas
estables existentes. El campo opcional conserva compatibilidad con puentes
anteriores. El validador de este protocolo X exige entre uno y seis y que el
espacio del rival esté dentro del total; este límite no se traslada al contrato
general de varios entrenadores.

La normalización y la sesión individual conservan el total durante cambios,
debilitados, lecturas incompletas y desconexión; una salida confirmada lo limpia.
Si se conserva sin lectura actual se indica «Último total confirmado». Sin dato
confirmado aparece «Total sin confirmar»; Black todavía no publica este dato.
No se deduce un total de uno a partir del único participante visible.

Acoplamiento transitorio: el contador utiliza un campo opcional de la sesión
individual actual. Al migrar el campo completo se usará `CombatSide.rosterTotal`.
El contador representa el equipo completo y no disminuye con los debilitados.

Validación del 26 de octubre de 2026: fixtures de X salvaje y entrenador con tres
miembros, reemplazos, datos inválidos y ciclo de sesión. Interfaz con datos
sintéticos: seis Poké Balls, cambio ES/EN, desconexión, salida y nueva pelea sin
total. Comprobación DOM móvil a 320 píxeles efectivos sin desbordamiento horizontal;
la captura móvil falló en la herramienta. Captura de escritorio en
`artifacts/opponent-roster-synthetic-desktop.png` (captura histórica retirada al preparar el PR; evidencia final en `artifacts/battle-simplified-synthetic.png`). No se validó una pelea real en
esta etapa. El proceso del puente X debe reiniciarse para publicar el campo nuevo.

## Paso 5: densidades reutilizables de la tarjeta

`BattlePokemon` admite `density: 'detailed' | 'semicompact' | 'compact'`;
la predeterminada sigue siendo `detailed`. Recibe `rules` explícitamente para
calcular debilidades con las reglas del juego seleccionado.

- `detailed`: conserva la tarjeta actual, los tipos, el acceso a estadísticas
  y la tabla completa de cambios. Los análisis de ataque y defensa siguen
  siendo responsabilidad de la pantalla actual.
- `semicompact`: identidad, nivel, PS, debilidades y fichas con las estadísticas
  modificadas. No incluye listas ofensivas ni resistencias. Distingue «Sin
  cambios» de «Sin datos confirmados»; los nombres completos de las estadísticas
  están disponibles para lectores de pantalla y en las ayudas de cada ficha.
- `compact`: identidad (incluido el nombre de especie si hay apodo), nivel y PS.
  Omite tipos, debilidades, estadísticas y herramientas.

Todas reutilizan la conservación de PS y etapas por identidad, el reinicio al
cambiar de Pokémon, la animación de daño y la preferencia de movimiento reducido.
Las variantes pequeñas mantienen nivel y salud disponibles mientras se resuelve
la especie. Los textos reutilizan claves ES/EN existentes.

Comprobación del 27 de octubre de 2026 con una vista temporal y datos sintéticos:
las tres densidades, daño de 90 a 25 PS, lectura parcial que conserva 25 PS,
cambio de identidad que los limpia, debilitado a 0 PS, etapas positivas y
negativas, etapas neutras, ES/EN y nombres largos. Comprobación DOM a 320 píxeles
sin desbordamiento horizontal. Captura de escritorio:
`artifacts/battle-card-densities-synthetic.png`. No se leyó Citra en esta etapa.
La vista temporal se retiró después de las comprobaciones.

Acoplamiento deliberado: la vista detallada conserva su marco y los estilos
actuales de la pantalla individual. Las variantes pequeñas y la barra de salud
llevan sus propios estilos. La pantalla de producción sigue usando la densidad
detallada; las distribuciones de dobles y hordas se conectarán en el paso 6.

Validación automática del paso 5: `npm test` (458/458), `npm run lint` y
`npm run build` correctos. La suite se ejecutó con permiso para abrir sus puertos
locales de prueba; la ejecución restringida no permitía esas comprobaciones.

## Paso 6: distribuciones del campo de combate

`FieldBattleScreen` recibe `FieldCombatReading`, `CombatService`, `TypeRules`
y opcionalmente `CombatPresentation`. `BattleScreen` permite pasar `fieldReading`
para usar esta pantalla; si no se pasa, mantiene el flujo individual anterior.
La pantalla no importa adaptadores, lectores ni direcciones del puente.

`BattleField` representa los lados y puestos del contrato, conservando sus IDs.
En sencillo muestra una tarjeta detallada por lado y el análisis de tipos;
en doble, dos tarjetas semicompactas por lado; en horda, una tarjeta muy compacta
propia y cinco rivales. No deduce el formato de los Pokémon vivos. Los puestos
vacíos y los desconocidos tienen estados explícitos, y los debilitados mantienen
su tarjeta con 0 PS. El número de puesto es el orden normalizado del adaptador;
no promete reproducir coordenadas de pantalla del emulador.

En doble y horda, cada puesto ocupado permite abrir un panel de detalle completo.
La selección incluye lado, puesto, propietario, identidad y forma; se descarta
si ya no coincide o cambia el formato. Al abrirlo, el foco pasa al título del
panel; al cerrar con su botón o Escape, vuelve al botón de origen. Las columnas
se reducen progresivamente hasta una por lado en móvil. El contador de Poké Balls
sigue representando el total inicial, no el número vivo.

Los formatos especiales buscan un registro por `gameId` e `id` y usan sus
funciones de campo, controles y detalle. Si no existe una vista, aparece un aviso
traducido; no se los representa como sencillo por defecto. No se implementan
triples ni rotatorios en esta etapa. Los textos nuevos están en ES y EN.

Validación del 27 de octubre de 2026 con datos sintéticos en una página temporal:
sencillo con dos tarjetas y dos análisis de tipos; doble con cuatro tarjetas;
horda con seis puestos incluso después de un KO; selección, sustitución y cierre
de detalle por teclado; puestos vacíos/desconocidos; desconexión y último total;
ES/EN; extensión especial de prueba con campo, controles y detalle. Comprobaciones
DOM en móvil a 320 píxeles sin desbordamiento para los tres formatos, y detalle
del quinto rival de horda. Las capturas sintéticas iniciales de las distribuciones se retiraron en el
cierre documental por estar sustituidas. La evidencia final de interfaz está en
`artifacts/battle-validation-desktop.png` (captura histórica retirada al preparar el PR; evidencia final en `artifacts/battle-simplified-synthetic.png`); las observaciones de memoria reales
se conservan por separado en las capturas del paso 8. La página temporal se retiró.
No se leyó Citra ni se verificaron combates reales en este paso.

Límite deliberado: el ciclo de sesión múltiple y la publicación del campo por
los lectores siguen pendientes de los pasos 7 y 8. Los adaptadores actuales
siguen entrando por la pantalla individual; no se cambia su capacidad declarada
ni se activa detección múltiple en producción solo por existir estas vistas.

Verificación automática del paso 6: `npm test` (458/458), `npm run lint` y
`npm run build` correctos; `git diff --check` sin errores de espacios.

## Paso 7: sesión múltiple y comparaciones

`advanceFieldCombatSession` mantiene el último campo confirmado por puesto e
identidad. Las lecturas pendientes, desconectadas o ausentes no finalizan el
combate. Solo una salida confirmada en estado `ready` limpia el campo, las
reservas y las selecciones. Un nuevo combate o cambio confirmado de formato
incrementa la revisión para desmontar las selecciones anteriores.

Un puesto desconocido conserva su ocupante anterior; un puesto vacío confirmado
lo elimina. Nivel, espacio del equipo, PS, etapas y apodo ausente pueden conservarse
para la misma identidad, propietario, especie y forma. Un cambio en cualquiera
de esos identificadores impide heredar esos datos. Un participante que aparece
en otro puesto no queda duplicado en su puesto anterior desconocido. El KO no
cambia el formato ni reduce los puestos o el total inicial de Poké Balls.
Los campos inválidos o las topologías parciales incompatibles conservan el
último campo válido con aviso de lectura incompleta. Si un total antiguo resulta
incompatible con nuevos ocupantes confirmados, pasa a desconocido.

`FieldCombatReading.playerTeam` es opcional y normaliza el equipo controlado,
con reservas y huevos: ausente/null es lectura no disponible; `[]` confirma un
equipo vacío. La sesión retiene el equipo entre lecturas y actualiza sus activos
con los datos de campo. Los datos de campo tienen prioridad para esos activos.
No se impone un tamaño universal del equipo en la pantalla nueva; la pantalla
individual anterior continúa pasando explícitamente su capacidad de seis.

El panel de comparación permite elegir un participante de cada lado. Los
selectores identifican puesto y nombre, conservan la elección en lecturas
parciales y pasan al primer participante disponible si se elimina o reemplaza
el seleccionado. Los análisis usan exclusivamente las reglas del juego y los
tipos de esa pareja. La salud del equipo y sus indicadores de ventaja usan el
rival de referencia, señalado también cuando el panel está cerrado. Se marcan
todos los activos propios y los huevos quedan excluidos del análisis. El análisis
no simula movimientos, habilidades ni objetos, igual que la pantalla anterior.

Validación del 27 de octubre de 2026: diez pruebas nuevas de sesión, posiciones,
identidad, forma, propietario, cambio de formato, KO, datos inválidos, selección,
reservas y limpieza. Interfaz con datos sintéticos: selección Mienfoo/Gulpin,
lectura parcial, desconexión, reemplazo, salida y nueva pelea sin PS heredados;
horda con cinco rivales y lectura ausente; equipo con dos activos, reserva y
huevo; cambio de rival actualiza sus indicadores; ES/EN; comprobación DOM a
320 píxeles sin desbordamiento. Captura de escritorio inspeccionada en
`artifacts/battle-field-comparison-synthetic.png` (captura histórica retirada al preparar el PR; evidencia final en `artifacts/battle-simplified-synthetic.png`). La página temporal se retiró.
No se leyó Citra en este paso.

Acoplamiento deliberado: `BattleTeam` conserva su modelo de participante y su
estilo de la pantalla anterior; el campo adapta el espacio del equipo al entrar.
Los lectores actuales siguen usando la ruta individual hasta la integración del
paso 8. El contrato necesita una salida confirmada para separar dos peleas del
mismo formato; no se intenta deducir una nueva pelea a partir de cambios de PS.

Validación final del paso 7: `npm test` (468/468), `npm run lint` y
`npm run build` correctos; `git diff --check` sin errores de espacios.

## Paso 8: lector conectado

El puente X publica el campo de combate y el adaptador de X lo conecta con
`FieldBattleScreen`, incluidas las reservas. Véanse los detalles, alcance del
perfil y las comprobaciones reales de sencillo, doble y horda en
[x-battle.md](x-battle.md#integración-múltiple-fase-8-27-de-octubre-de-2026).
Black conserva la ruta individual. Esta integración sustituye el límite del
paso 7 de que los lectores todavía no publicaban el campo completo.

## Paso 9: validación final

La matriz de comprobaciones, las correcciones encontradas y la distinción entre
memoria real y fixtures están en
[multi-battle-validation.md](multi-battle-validation.md). No se amplía el alcance
del perfil ni se implementan los formatos especiales en esta etapa.

## Paso 10: cierre documental

Se consolidaron las guías de uso y extensión en español e inglés, los README y
la arquitectura, con soporte por juego, arranque de X independiente de Black,
recuperación, lectura de las tarjetas y límites de la entrega. La evidencia
real se mantiene separada de los fixtures y del diseño final corregido.

Se comprobaron 171 rutas de enlaces locales en nueve documentos, cinco comandos
contra `package.json`, seis capturas conservadas y las capacidades declaradas de
ambos lectores. Se corrigieron dos enlaces antiguos a la investigación de
Guardería y se retiraron dos capturas sintéticas de distribución sustituidas.
No se tocaron las capturas ajenas a esta entrega ni se creó un commit.

La última suite del código sigue siendo la del paso 9: 481 pruebas, lint y build
correctos. El paso 10 solo modifica documentación y la selección de evidencia;
no vuelve a ejecutar pruebas de emulador, instalación o código sin cambios.

## Ajuste posterior: retirar detalle por puesto

Se retiraron los botones «Ver detalle del puesto» y el panel de expansión de los
formatos generales, junto con su estado, estilos y traducciones ES/EN. Las tres
densidades de tarjeta y las comparaciones permanecen. Las descripciones de ese
panel en los pasos anteriores documentan el estado histórico de la entrega.
La extensión de detalles para futuros formatos especiales permanece disponible.
Se comprobó con datos sintéticos: cero botones de detalle en doble y horda,
cuatro y seis tarjetas respectivamente y ambos selectores de comparación.

## Ajuste posterior: retirar comparación seleccionable

Se retiraron el panel «Comparar Pokémon», sus selectores y la referencia de equipo
en los formatos generales. Dobles y hordas conservan sus tarjetas, debilidades
compactas cuando corresponden, salud del equipo y marcas de activos; no muestran
indicadores contra un rival elegido automáticamente. Sencillo conserva su
análisis habitual. Las comprobaciones anteriores de selectores son históricas.
La comprobación sintética confirmó cero selectores en doble/horda, seis tarjetas
en horda y dos paneles de tipos en sencillo.
