# Validación del combate múltiple — paso 9

Se revisó el recorrido del lector, el protocolo del puente, la sesión y las
vistas generales. Esta etapa no amplía los formatos ni el alcance del perfil
experimental de X.

## Correcciones encontradas

- Se movió el contador del equipo rival sobre ambos bandos para que no desplace
  solo las tarjetas rivales. En escritorio, los primeros puestos quedaron en la
  misma coordenada vertical (396,9 píxeles en la página sintética de comprobación).
- Una lectura desconocida conserva ahora un puesto vacío confirmado, siempre
  que permanezcan los mismos propietarios. Al cambiar de propietarios se
  descartan las ausencias y el total heredados del otro equipo.

## Cobertura automática

- `multi-battle-pipeline.test.ts`: memoria sintética → lector → controlador del
  puente → snapshots JSON serializados → validación del cliente → normalizador
  → sesión. Incluye lectura nula, error, payload inválido descartado, sustitución
  de ambos activos, rival reordenado, salida confirmada y nueva horda. Este test
  simula el transporte de eventos; las pruebas HTTP/SSE existentes de la suite
  cubren las conexiones locales, controles y reconexión.
- `field-combat-session.test.ts`: regresión de puestos vacíos durante huecos y
  cambio de propietarios sin heredar contadores o puestos vacíos anteriores.
- `x-battle-field.test.ts`: punteros duplicados, identidad propia ajena al equipo,
  copias con PS discordantes y cambio de PS entre pasadas completas. Estos casos
  no publican participantes inventados ni una muestra inestable.
- La suite existente vuelve a cubrir KO, cinco identidades de la misma especie,
  etapas discordantes, formatos generales, límites del payload, protocolos
  antiguos, reglas V/VI y conservación del flujo individual de Black.

## Interfaz comprobada en esta etapa

Todos estos casos utilizaron datos sintéticos en una página temporal con los
componentes reales. La página se retiró al terminar.

| Comprobación | Resultado |
| --- | --- |
| Doble: alineación de los primeros puestos propios y rivales | Misma altura tras mover el contador |
| Detalle del segundo activo y Escape | El título recibe el foco; cierre por teclado correcto |
| Lectura parcial y lectura ausente | Cuatro tarjetas conservadas con sus PS confirmados |
| Puesto vacío seguido de lectura desconocida | Conserva el vacío confirmado |
| Comparación Mienfoo/Pansear durante desconexión | Mantiene ambos selectores |
| Sustitución de los seleccionados | Recalcula los selectores disponibles |
| Salida y nueva sesión con PS no disponibles | No hereda los PS anteriores |
| Pantalla individual de Black con Magnemite/Gengar | Conserva resistencia a Fantasma de 0,5× con reglas V |
| Sencillo, doble y horda a 320 px con apodos largos | Sin desbordamiento horizontal; 2, 4 y 6 puestos |
| Horda a 768 px | Dos columnas rivales, sin desbordamiento horizontal |
| Cambio ES/EN | Encabezado de horda traducido |

Se inspeccionó visualmente `artifacts/battle-validation-desktop.png` (captura histórica retirada al preparar el PR; evidencia final en `artifacts/battle-simplified-synthetic.png`).
La herramienta no pudo generar la captura móvil; la verificación móvil se hizo
mediante el DOM, dimensiones y contenido, sin afirmar inspección visual móvil.
El tamaño temporal del navegador se restauró y la pestaña se cerró.

## Lectura real y límites

En esta etapa se volvió a comprobar la huella del ejecutable y una lectura real
de Citra: equipo de un miembro y estado fuera de combate confirmado. No se
modificaron memoria, saves ni el juego, y no se pidió al usuario preparar otra
pelea. Las comprobaciones reales de sencillo, doble y horda posterior a KO se
realizaron en el paso 8 y constan en [x-battle.md](x-battle.md); no se contabilizan
como combates nuevos de esta etapa. Black se verificó con datos sintéticos, sin
una pelea real de melonDS.

Continúan fuera del alcance los aliados de otro entrenador, transformaciones,
triples, rotatorios y otras revisiones del ejecutable. Las sustituciones rivales
con reservas tienen cobertura sintética y requieren contraste real adicional.
Los puestos de la horda conservan el orden normalizado de la tabla; su número no
representa una coordenada visual del juego. La separación entre dos peleas del
mismo formato sigue requiriendo una salida confirmada del lector.

## Resultado automático final

`npm test`: 481/481 correctas. `npm run lint` y `npm run build`: correctos.
`git diff --check`: sin errores de espacios. La suite completa se ejecutó con
los puertos locales de prueba habilitados. No se añadieron dependencias.
