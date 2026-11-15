# Documentación de PokéChose

Revisada el **14 de noviembre de 2026**. [English](../README.md) · [README e instalación](../../README.es.md).

Empieza por el estado actual para saber qué soporta cada edición. Para crear un adaptador, lee contratos y después la guía inicial. Los registros técnicos conservan evidencia y límites de su propia fecha; no son instrucciones actuales de instalación.

## Guías vigentes

- [Estado actual del proyecto](project-status.md)
- [Arquitectura y límites de integración](architecture.md)
- [Contratos para adaptadores de juego](adapter-contracts.md)
- [Añadir un adaptador de juego desde cero](new-game-adapter.md)
- [Fuentes de datos y semántica de las lecturas](data-sources.md)
- [Lectura en vivo: Black, X y Y](live-reading.md)
- [Conexiones de lectores y diagnóstico](reader-connections.md)
- [Combates individuales, dobles, hordas y aliados](multi-battle.md)

## Referencias de implementación e investigación

- [Contrato de obtención sin ayuda externa](acquisition-availability.md)
- [Contrato de obtención](acquisition-contract.md)
- [Iconos de obtención y descubrimiento](acquisition.md)
- [Migración de Black al workspace compartido](black-migration.md)
- [Memoria de Pokémon X en Citra Nightly 2104](citra-2104-memory.md)
- [Contrato de combate con varios participantes](combat-contract.md)
- [Investigación de guardería BW](daycare-research.md)
- [Investigación: porcentaje de aparición por género](encounter-gender-research.md)
- [Contrato de evoluciones pendientes: Black y X](evolution-requirements-contract.md)
- [Selección de juego y separación de versiones](game-workspaces.md)
- [Bolsa para evoluciones (Pokémon Black)](inventory-research.md)
- [Megapiedras](mega-evolutions.md)
- [Combates dobles con aliado](partner-battles.md)
- [Investigación: adaptadores de save y memoria para Pokémon X/Y](pokemon-xy-adapters-research.md)
- [Ubicaciones desde la ROM de Pokémon Negro](rom-locations.md)
- [Lectura de saves Black/White](save-format.md)
- [Objetos por zona en X/Y](zone-items.md)

## Registros históricos y validación

- [Revisión documental y comprobaciones de este bloque](documentation-review-2026-11-14.md)

- [Animaciones y alcance del catálogo](battle-artwork-and-regional-catalog.md)
- [Viabilidad de lectura de combate](battle-feasibility.md)
- [Rediseño de combate](battle-visual-followup.md)
- [Capturas: motor compartido y preparación del seguimiento](capture-zone-preparation.md)
- [Rediseño de capturas por zona](captures-visual-redesign.md)
- [Nombres y enlaces del catálogo](catalog-names-validation.md)
- [Rediseño de Explorar catálogo](catalog-visual-redesign.md)
- [Guardería, huevos, géneros y conexión](changes-2026-10-25.md)
- [Cajas, obtención y recuperación de lectores](changes-2026-10-26.md)
- [Entrega de colección, recuperación y combate múltiple](changes-2026-10-28.md)
- [Mi colección: primera extracción funcional](collection-functional-parity.md)
- [Rediseño de Mi colección](collection-visual-redesign.md)
- [Objetos equipados en combate](combat-held-items.md)
- [Indicador compartido de conexión](connection-indicator.md)
- [Preparación de la guardería compartida](daycare-preparation.md)
- [Combate — prototipos 1, 2, 3 y 5, solo modo en vivo](enemy-prototype.md)
- [Contador de evolución](evolution-countdown.md)
- [Evoluciones pendientes y obtención en Negro](evolution-requirements.md)
- [Revisión visual final](final-visual-review.md)
- [Preparar el repositorio para GitHub](github-preparation.md)
- [Rediseño de Estadísticas, Movimientos y Evoluciones](knowledge-visual-redesign.md)
- [Validación de la integración en vivo](live-integration-validation.md)
- [Validación del combate múltiple — paso 9](multi-battle-validation.md)
- [Evoluciones pendientes: composición y color](pending-evolutions-visual-redesign.md)
- [Detección de ubicación — primera entrega](player-location-development.md)
- [Investigación del contador de repelente — issue #13](repel-research.md)
- [Ajustes de sesión, capturas y conexión](session-polish-2026-10-25.md)
- [Orden del equipo y avisos compactos](team-order-and-capture-notices.md)
- [Animación de orden del equipo](team-reorder-animation.md)
- [Barras del equipo — validación de esta sesión](team-vitals-validation.md)
- [Temas: comportamiento y validación](themes-validation.md)
- [Rediseño de Balance de tipos](type-balance-visual-redesign.md)
- [Tabla de tipos: filtro y navegación](type-chart-visual-followup.md)
- [Cierre del rediseño visual y exclusivos de X/Y](visual-refresh-closeout.md)
- [Experimento visual — 9 de noviembre de 2026](visual-workspace-experiment.md)
- [Botones e iconos de capturas y equipo de X](x-actions-visual-validation.md)
- [Combate experimental de Pokémon X](x-battle.md)
- [Revisión de tarjetas y paridad de capturas X / Black](x-black-capture-parity.md)
- [Cierre de la entrega de Pokémon X](x-closeout.md)
- [Guardería de Pokémon X](x-daycare.md)
- [Vista de evoluciones de X](x-evolution-visual-validation.md)
- [Fichas del ejemplar y alineación](x-individual-details.md)
- [Inventario de Pokémon X](x-inventory.md)
- [Recorrido y obtenciones de X](x-itinerary.md)
- [Seguimiento de ubicación de Pokémon X](x-location.md)
- [Investigación de dobles y hordas en X](x-multi-battle-research.md)
- [Pokémon X en modo Save: Pokédex, equipo y cajas](x-save-pokedex.md)
- [Álbum secreto de Kalos](x-secret-album.md)
- [Análisis del equipo de X](x-team-analysis.md)
- [Combate individual contra entrenadores en X](x-trainer-battle.md)
- [Pokémon Y: adaptador y fuentes](y-adapter.md)

La [auditoría de idiomas](../doc-translation-audit.md) distingue guías bilingües y registros en su idioma original. Los documentos generales solo disponibles en inglés están en el [índice inglés](../README.md).

## Evidencia y mantenimiento

[artifacts/README.md](../../artifacts/README.md) describe capturas conservadas y retención. Los nombres históricos no garantizan que el archivo siga disponible. Al cambiar una función, actualiza su guía vigente, matriz de soporte y contratos afectados; registra aparte las comprobaciones realizadas y si usaron fixtures o emulador real.
