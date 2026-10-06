# Validación de la integración en vivo

## Actualizaciones posteriores

Se implementaron ciclos separados de 3 segundos para equipo/Pokédex y 30 segundos para cajas. Las pruebas con RAM sintética verifican la reutilización del PC, su revisión periódica y la actualización anticipada por cambios de integrantes o capturas. No se midió el rendimiento de estos intervalos en una sesión real prolongada. Los detalles están en [lectura en vivo](live-reading.md).

Se añadieron PS y experiencia al parser y barras exclusivamente en las tarjetas del equipo; posteriormente se sustituyeron los IDs visibles de objetos, habilidades y movimientos por el nombre del objeto equipado. Última validación de código previa al cierre documental: 116 pruebas aprobadas, lint y build aprobados. El navegador se verificó con fixtures y caché sintética; el save real se leyó únicamente para comprobar PS y experiencia. Consulta [validación de barras y objetos](team-vitals-validation.md).

El lanzador también reutiliza servicios compatibles que ya ocupan sus puertos, evitando arrancar otro bridge sobre 3002. Cerrar un lanzador no detiene los servicios que reutilizó. La lectura de combate se [evaluó](battle-feasibility.md), pero no se implementó ni validó en RAM real.

## Comprobaciones de esta sesión

Se integraron tres orígenes: manual, save y melonDS en vivo. El servicio local inicia sin conectar GDB y requiere acción explícita. Configuración real: melonDS 1.1, Pokémon Negro español IRBS revisión 0, ARM7 3334. La configuración local permanece excluida de Git.

El botón Conectar del navegador conectó al emulador real después de Reset. Se mostraron seis miembros y una colección de 29 ejemplares (equipo y PC), y la Pokédex mostró 38 capturadas y 52 vistas. Las identidades, niveles, movimientos y flags procedieron de RAM real. Para verificar el renderizado en el navegador aislado se cargaron fixtures de nombres/tipos en su caché; PokéAPI había fallado en ese perfil. No se modificó el almacenamiento del navegador del usuario ni su save. Los sprites no se validaron en estas comprobaciones.

La prueba inicial de cerrar TCP y reconectar agotó el timeout real de GDB. Se cambió la acción a Pausar lectura, manteniendo TCP. Después de Reset, se verificó en navegador pausa con seis miembros retenidos y aviso de datos desactualizados, seguida de reanudación mediante Reconectar sin otro Reset. La última lectura cambió de 00:30:31 a 00:30:47 (hora local de esta sesión).

Se comprobaron selector, controles, persistencia del origen tras recarga y vista a 390 px sin desbordamiento horizontal. La selección manual mostró un miembro sintético (Pikachu) conservado en su almacenamiento aislado; save mostró los seis miembros del save real y live los seis de RAM, sin mezclar la selección manual. Capturas actuales en `artifacts/live-integration-desktop.png`, `artifacts/live-integration-mobile.png` y `artifacts/live-integration-stale.png`. Las capturas de tarjetas emplean la caché estática de prueba indicada arriba.

Las pruebas automáticas del servicio usan RAM sintética y HTTP/SSE real en localhost. Cubren conexión explícita, rechazo de controles desde origen externo, muestras válidas, pérdida de conexión con retención, reconexión y pausa/reanudación que reutiliza el cliente GDB. Las pruebas del adaptador comprueban que la resolución asíncrona de especies no oculte una desconexión y que fuentes parciales no inventen colección o Pokédex.

## Límites

No se detecta automáticamente la ROM ni se garantiza la dirección para otras revisiones. La última caja real no estuvo disponible para comprobarla. No se midió el rendimiento en sesiones largas. La muestra completa requiere varios segundos y no es atómica; se descartan cambios detectados entre lecturas y duplicados simultáneos de equipo/PC. Cerrar el servicio libera TCP y puede requerir Reset antes de reconectar. Las pruebas previas de savestate, Reset y reapertura están documentadas en `experiments/melonds-live/VALIDATION.md`.
