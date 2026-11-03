# Cierre de la entrega de Pokémon X

## Base y organización

Revisión del 3 de noviembre de 2026. La rama original era `codex/multi-battle-and-reader-polish`, en `6104226`. Sus dos commits ya estaban integrados por squash en `master` mediante el PR #29 (`0bf69d7`); ambos árboles coincidían. La entrega pendiente se organiza en `codex/close-pokemon-x`, desde ese master, sin repetir aquellos commits.

El cierre incorpora inventario save/live de X, requisitos de evolución compartidos, enlaces de objetos, objetos equipados en combate, filtros de generación y capturas pendientes, y la migración de Black a `GameWorkspace`. Se retiran los componentes y proveedores de presentación sustituidos. Los lectores, reglas, índices, APIs históricas y normalización específicos siguen en los adaptadores; no se unifican los formatos de partida.

## Validación de esta revisión

- `npm test`: 515/515 correctas fuera del aislamiento. Dentro del aislamiento hubo 24 fallos de acceso a servidores locales y archivos de las pruebas; no se cambió código para ocultarlos.
- `npm run lint` y `npm run build`: correctos.
- Navegador sobre Vite existente en 15300: X conectado mostró seis miembros, colección de 256 y requisitos con 22 especies, 16 intercambios y 12 objetos. Roca del Rey mostró una unidad en bolsa y una equipada. Es observación de la fuente existente, no una nueva validación del protocolo de memoria ni de cada cantidad.
- Black Save cargó seis miembros y colección de 95; catálogo regional y marcas históricas de captura visibles. Se corrigió el aviso del catálogo compartido que mencionaba Kalos también en Black: ahora recibe la región del perfil en ambos idiomas.
- Se intentó un override móvil de 390×844; el navegador produjo un ancho CSS efectivo de 313 px y scrollWidth de 320 px, por debajo del mínimo global de 320 px. La captura no prueba un layout real de 390 px; queda registrada esta limitación. Se restauró el override.
- No se modificaron saves ni memoria ni se controlaron los emuladores. No se repitieron las verificaciones históricas de interacción y recuperación descritas en los otros documentos.

## Límites conservados

Los lectores siguen siendo experimentales. El inventario X publica el bolsillo Objetos y los equipados de una lectura conjunta; no toda la bolsa. No está contrastada en partida real la actualización inmediata de objetos tras consumo, robo o intercambio durante el turno. La validación completa de melonDS tras la migración de Black sigue pendiente. Véanse [inventario X](x-inventory.md), [objetos de combate](combat-held-items.md), [contrato evolutivo](evolution-requirements-contract.md) y [migración Black](black-migration.md).

Este PR cierra el conjunto de implementación pendiente de X; no declara soporte completo para todas las versiones, transformaciones o situaciones de combate, ni una validación exhaustiva de los emuladores.
