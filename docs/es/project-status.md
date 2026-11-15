# Estado actual del proyecto

Referencia funcional: **14 de noviembre de 2026**. [English](../project-status.md) · [Índice](README.md) · [Contratos](adapter-contracts.md).

Esta página describe el producto actual. Las notas de investigación y cierres anteriores conservan sus fechas y no sustituyen esta matriz. El desarrollo acordado de X/Y está cerrado en este bloque; eso no convierte sus lectores experimentales en compatibles con cualquier revisión del emulador o ROM.

## Soporte por juego

| Función | Black | X | Y |
| --- | --- | --- | --- |
| Workspace compartido y Manual | Sí | Sí | Sí |
| Reglas de tipos | Gen V, 17 tipos | Gen VI, 18 tipos | Gen VI, 18 tipos |
| Save de solo lectura | RAW Black, 512 KiB | `main` de X | `main` de Y |
| Equipo y cajas | 6 / 24 cajas | 6 / 31 cajas | 6 / 31 cajas |
| Live experimental | melonDS/GDB | Citra/RPC | Citra/RPC |
| Pokédex vista/capturada | Separadas | Separadas | Separadas |
| Catálogo, colección, análisis y fichas | Sí | Sí | Sí |
| Capturas y obtención | Datos de Black | Datos de X | Datos de Y |
| Objetos por zona y MT/MO | Sin servicio de guía de zona | Sí | Sí |
| Evoluciones pendientes e inventario | Sí | Sí | Sí |
| Guardería | Según fuente/configuración | Save y Live | Save y Live |
| Progreso de eclosión | Sin contador expuesto | Sí | Sí |
| Combate individual | Lector propio | Sí | Sí |
| Doble / horda | Doble pendiente; horda no disponible | Sí / sí | Sí / sí |
| Doble con aliado de historia | Sin lector implementado | Contrato y lector XY | Contrato y lector XY |
| Megapiedras y comparación mega | No aplicable | Servicio opcional implementado | Servicio opcional implementado |
| Repelente | Según lectura/configuración | No se implementará en este bloque | No se implementará en este bloque |

Save y Manual no leen un combate en curso. Las rutas de adquisición y atlas son información de guía; no certifican progreso de historia, Safari de un amigo ni acceso efectivo a cada zona.

## Experiencia actual

- Selección independiente de Black/X/Y, portadas propias, idioma ES/EN y temas persistentes. El juego seleccionado se conserva durante el día local.
- Estado manual y preferencias separados por edición. Una colección sincronizada conserva ejemplares duplicados, orden y apodos. Los lectores no escriben en partidas ni memoria.
- Capturas usa `caught`; las imágenes pueden descubrirse por `seen` o `caught`. La propiedad actual de una especie se muestra por separado.
- Catálogo regional/nacional, búsqueda y vías de obtención; X/Y añaden exclusivos independientes confirmados. El género se oculta solo en el catálogo de Black. Se retiró la insignia regional de las fichas compartidas.
- Guía de objetos X/Y con marcas manuales por punto y edición, categorías, requisitos y fuentes. Los títulos MT/MO incluyen movimiento. La consulta inversa de objeto a ubicaciones tiene contrato, pero no pantalla global implementada. El cambio Pokémon/Objetos conserva la posición sin el parpadeo anterior.
- Megapiedras X/Y: inventario de bolsa/equipados y colección actual, Pokémon oculto si falta, vista mega habilitada solo con datos vigentes y requisitos cumplidos, comparación de estadísticas base históricas. No simula una mega durante una pelea.
- Equipo compacto flotante cuando está en la columna derecha; en ventanas pequeñas permanece en flujo normal. Ampliar usa todo el ancho y la altura disponible. Las fichas sincronizadas amplias tienen motivo por tipo principal, gris al debilitarse; los sprites del equipo amplio se animan en modo manual y sincronizado con respaldo estático y movimiento reducido. Black conserva arte animado BW; X/Y sus modelos. Los debilitados sincronizados no animan.
- Indicador Furret en cargas compartidas. Almacenamiento durable reintenta tras desalojar cachés desechables si se llena la cuota; no es almacenamiento ilimitado y los fallos siguen notificándose.
- Combate con entrada automática, atajo flotante, retorno a la vista previa y conservación ante lecturas parciales. El diseño usa ancho real del contenedor, con individuales renovados y densidades de dobles/hordas. Las reglas siguen siendo de tipos/STAB: no hay simulación completa de movimientos, habilidades, clima, objetos o daño.
- Los aliados de historia y rivales conservan propietarios independientes. Las formas mega activas XY se vinculan al ejemplar validado y a su piedra, sin confundir la forma normal retenida en el equipo con una lectura inválida.

## Ejecución y límites

La instalación y los puertos están en [README](../../README.es.md); operación en [lectura en vivo](live-reading.md), [conexiones](reader-connections.md) y [combate](multi-battle.md). X/Y tienen fuentes y configuración propias. Si se ejecutan dos Citra simultáneos, sus RPC deben usar puertos distintos y coincidir con cada variable de entorno. Cerrar un juego no garantiza que otra instancia que falló al abrir su socket vuelva a enlazarlo automáticamente.

No hay implementación de lectura/presentación especial de triples y rotatorios. Las guías de objetos y obtención pueden tener omisiones o notas en inglés; desconocido no significa ausente. Black mantiene APIs históricas detrás de adaptadores; XY reutiliza datos alojados en X. Esas dependencias no deben copiarse como contrato genérico de un juego futuro.

## Evidencia y validación

Última validación del código de este bloque: **573 pruebas, lint y build correctos**; el build mantiene un aviso de tamaño de bundle. Hay registros de combates reales de Y, aliados y Mega-Lucario enlazados en [aliados](partner-battles.md), [megas](mega-evolutions.md) y [cierre visual](visual-refresh-closeout.md). Las últimas revisiones responsive y de animación usaron montajes sintéticos; no certifican todas las variantes reales, fuentes, temas, revisiones y resoluciones. Esta actualización documental no constituye una nueva prueba en emulador. Cada registro conserva su fecha y alcance.
