# Combates individuales, dobles, hordas y aliados

Referencia vigente: 14 de noviembre de 2026. [English](../multi-battle.md) · [Índice](README.md) · [Contratos](adapter-contracts.md).

| Formato | Black · lector de combate | X/Y · Citra Live |
| --- | --- | --- |
| Individual | Implementado | Implementado |
| Doble | Existe en el juego; lector pendiente | Implementado |
| Horda | No disponible | Implementado |
| Doble con aliado de historia | Sin lectura implementada | Propietarios independientes del jugador y aliado |
| Triple / rotatorio | Sin lectura/vista especial implementada | Sin lectura/vista especial implementada |

Manual y Save no leen una batalla en curso. Las capacidades del juego y las del lector son distintas: declarar que existe un formato no demuestra que pueda leerse. Black conserva Gen V; X/Y aplica Gen VI. El análisis usa tipos y STAB potencial; no calcula daño real ni simula habilidades, clima, movimientos u objetos.

## Uso

Arranca `npm start` o el servicio de la edición (`npm run bridge:x-live` / `npm run bridge:y-live`) junto con `npm run dev`. Selecciona el juego y Live, y conecta desde sus controles. Para Black, el lector general y el de combate son procesos independientes. Configuración, puertos y diagnóstico: [Live](live-reading.md) y [conexiones](reader-connections.md).

El combate puede abrirse automáticamente y el acceso flotante permite regresar a él; al salir se recupera la vista anterior. El lector distingue no estar en combate de no poder confirmar temporalmente el campo. Una muestra incompleta conserva la última información confirmada y muestra el aviso; no obliga a reiniciar la sesión ni significa por sí sola que se perdió la conexión.

## Campo y presentación

El contrato modela propietarios, posiciones y participantes. El aliado de historia no se agrega al equipo del usuario; su posición y los rivales se mantienen separados. Las posiciones vacías/desconocidas no cambian un doble a individual por contar solo Pokémon vivos. La identidad del ejemplar impide aplicar una mega retenida a otro Pokémon.

El individual muestra información detallada de ambos lados, PS, tipos, cambios de estadísticas y debilidades/resistencias, con equipo de reserva. Dobles y hordas ajustan la densidad para varios participantes. La distribución usa el ancho real del contenedor —incluido el salto de 900 px cuando el viewport lo permite— y conserva la versión estrecha. No depende de que sea X o Y.

El botón de estadísticas y los objetos equipados dependen de datos/servicios disponibles. Si una lectura de nivel, PS, estadísticas o inventario es desconocida, no se inventa un valor para completar la ficha.

## Extender y validar

La referencia normativa es [contratos](adapter-contracts.md). El [contrato de campo](combat-contract.md) conserva el historial de su implementación. Para añadir un formato: confirmar reglas del juego, validar lector y normalización, declarar capacidades, y probar propietarios, posiciones, entradas/salidas, muestra parcial y cambio de fuente. Un renderer especial no habilita el lector.

Las [validaciones multibatalla](multi-battle-validation.md), [aliados de historia](partner-battles.md) y [Mega Evoluciones](mega-evolutions.md) distinguen fixtures y lecturas reales. Sus fechas, perfiles y resultados son históricos; no certifican cualquier revisión de ROM/Citra. Esta revisión documental no añadió pruebas en emulador.
