# Combates dobles con aliado

## Contrato compartido

El contrato en `src/games/core/combat.ts` representa un doble con aliado como
`format: { kind: 'general', id: 'double' }`, con dos puestos por bando y varios
`CombatOwner`. No requiere un identificador de X/Y ni un formato especial:

- Bando jugador: propietario `control: 'player'` y propietario `control: 'ally'`.
- Bando rival: uno o varios propietarios `control: 'opponent'`.
- Cada participante referencia su propietario mediante `ownerId`. `partySlot`
  pertenece al equipo de ese propietario y es `null` si no se conoce.
- `playerTeam` solo contiene el equipo controlado; los aliados no se añaden a él.
- `rosterTotal` cuenta reservas de todos los propietarios del bando; puede
  superar seis. El validador de protocolo XY limita seis por propietario, sin
  imponer ese límite en el modelo de topología compartido.
- Los estados desconocidos, puestos vacíos y ocupantes debilitados permanecen
  diferenciados. Un compañero no se deduce de una identidad propia desconocida.

`BattleField` renderiza los roles normalizados, identifica al aliado y muestra
sus debilidades sin llamarlo Pokémon del jugador. Otros juegos pueden publicar
el mismo contrato con su lector; no tienen que utilizar los formatos de memoria
ni los adaptadores de XY.

## Lector XY

En el combate real de Y observado el 10 de noviembre de 2026, el selector era
`0x006BB8EC`, distinto de los handlers de sencillo/doble/horda existentes. La
rutina de inicialización contiene el mapa de cuatro propietarios. Se contrastó
su código mediante lecturas acotadas y las tablas duplicadas:

| Propietario | Tabla copia 1 | Tabla copia 2 |
| --- | --- | --- |
| Jugador | `0x081FB284` | `0x081FB624` |
| Primer rival | `0x081FB2A0` | `0x081FB640` |
| Aliado | `0x081FB2BC` | `0x081FB65C` |
| Segundo rival | `0x081FB2D8` | `0x081FB678` |

Se valida el selector y las instrucciones del perfil local, cada contador, las
referencias PK6 y sus checksums, identidad/forma, PS y las dos copias. Se vuelve
a leer la cabecera y las tablas, y se comparan dos pasadas completas. No se
clasifica por contar supervivientes o por especies. Los puestos activos son las
entradas líderes de cada tabla de orden del campo; las reservas solo aportan
el contador. El puesto original del jugador se resuelve contra su equipo; no
se inventan índices de equipo para los demás propietarios.

Este perfil se comparte entre las revisiones locales de X/Y con comprobación
independiente de edición. La validación real actual corresponde a Y con aliado
de historia frente a dos entrenadores. No declara soporte para todos los modos
multijugador, triples, rotaciones ni otras revisiones de ejecutable.

## Validación actual

- Y real, lectura RPC sin escrituras: Lucario 53, 154/154 PS; Meowstic aliado 37,
  109/109; Manectric rival 41, 118/118; Liepard rival 41, 109/109. Coincide con
  los rivales confirmados por el usuario. Equipo propio de seis, aliado de tres
  y un miembro por entrenador rival. Hash del archivo de guardado sin cambios
  durante la lectura. No se guardaron dumps ni bytes de ROM.
- Se reinició la pila local de PokéChose y se reconectó el lector de Y. La UI
  muestra los cuatro participantes y mantiene solo seis miembros en el equipo
  controlado, con etiqueta «Aliado» y estadísticas/debilidades independientes.
- Navegador móvil 390 × 844: ancho efectivo y scrollWidth de 375 px, sin
  desbordamiento horizontal. Se restauró el viewport de escritorio.
- Pruebas sintéticas: contrato sin juego específico, cuatro propietarios,
  reservas por propietario, sustitución del aliado, corrupción, código o
  contadores discrepantes y regresiones de sencillo, doble ordinario y horda.

`npm run probe:y-memory` resume los propietarios y participantes actuales sin
publicar sus identificadores individuales ni guardar memoria en bruto.
