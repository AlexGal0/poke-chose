# Cierre del rediseño visual y exclusivos de X/Y

Entrega del 10 de noviembre de 2026.

## Objetivo y alcance

PokéChose acompaña la partida, normalmente en una ventana lateral al emulador y a veces en un segundo monitor. Esta entrega mejora jerarquía, identidad y acceso a la información sin eliminar funcionalidades ni revelar sprites aún no descubiertos. Los estilos y componentes compartidos benefician a Black, X e Y donde consumen esas pantallas; las reglas, lectores y capacidades siguen perteneciendo a sus adaptadores.

La comparación de exclusivos se incorpora a X/Y mediante un contrato opcional compartido. Black conserva su comportamiento: no recibe una lista especulativa de exclusivos. No hay dependencias nuevas, migraciones de almacenamiento ni escrituras a partidas o memoria del emulador.

## Cambios entregados

| Área | Resultado |
| --- | --- |
| Workspace y equipo | Navegación fija, herramientas secundarias que se incorporan como pestañas según el ancho, preferencias visibles, conexión reconocible y reconexión accesible. Resumen del equipo con sprites, género, objetos, nivel, PS y EXP; distribución ampliada sin cruces de contenido. |
| Capturas por zona | Tarjetas alineadas con anchos contenidos; identidad y estados de captura más claros. Wiki y evolución en la esquina, con evolución accesible también para especies no poseídas. Se conservan métodos, probabilidades, niveles, acceso y detalles del encuentro. |
| Catálogo | Estadísticas, movimientos y evoluciones permanecen visibles. Lupa para Wiki, «?» para obtención y vías que abren el mismo detalle. Tooltips legibles y paginación adaptada a filas completas. |
| Colección | Cabecera sin textos redundantes, actualización junto al título, filtros y navegación por cajas conservados. Fichas con identidad, ubicación y datos propios del ejemplar; sin huecos reservados para datos ausentes. |
| Fichas de conocimiento | Cabecera y pestañas consistentes, estadísticas y movimientos más legibles, adaptación de tablas a tarjetas en ancho pequeño. Árbol evolutivo mantiene la disposición de ramas acordada y las reglas de descubrimiento. |
| Evoluciones pendientes | Motivos visuales conservados y refinados, inventario con estados suficientes/faltantes/desconocidos sin confundir antigüedad con confirmación actual. Resúmenes alineados y sin panel redundante. |
| Balance de tipos | Resumen, riesgos compartidos, inspector defensivo, cobertura STAB y alternativas con jerarquía clara. Reglas y cálculo existentes conservados. |
| Tabla de tipos | Filtro múltiple de columnas defensoras; filas atacantes completas. Primera columna de 110 px y columnas de 80 px, sin estirar el espacio restante. Sin scroll vertical interior; navegación por teclado y selección de cruce. Resaltados neutros, marca de filtros y contraste reforzado. |
| Combate | Entrada al inicio del panel bajo la navegación fija y retorno a la posición anterior. Activos y sus datos tienen prioridad; reserva después. Sprites e información de individuales más visibles; tarjetas alineadas en dobles, tipos y cambios de estadísticas también en hordas. Se conserva lectura parcial y reconexión. |
| Guardería | Se elimina la superficie duplicada dentro del workspace, sin alterar sus funciones. |

## Exclusivos y obtención independiente

Catálogo y Capturas muestran una insignia y el filtro «Solo exclusivos» cuando el adaptador aporta una lista completa confirmada. El filtro se aplica antes de paginar y se combina con búsqueda, tipos, Pokédex y estado de captura. Su selección dura la sesión.

Exclusivo significa obtenible sin ayuda externa en esta edición y no en la contraparte; no significa exclusividad global. X e Y declaran 19 especies cada uno, incluyendo cría, evoluciones locales y fósiles. No se consideran exclusivas las formas Mega ni se presentan Slurpuff/Aromatisse como obtenibles sin intercambio de otro jugador. Safari Amistad permanece en el detalle completo con sus condiciones externas, pero no se anuncia como vía independiente ni aparece en el selector de zonas. Los datos desconocidos no se convierten en ausencia confirmada.

El contrato y sus límites están en [disponibilidad y exclusivos](acquisition-availability.md). La lista de X/Y vive en el adaptador; los componentes compartidos no importan tablas de una edición concreta.

## Validación y evidencia

- Suite final: `npm test` (557 pruebas), `npm run lint`, `npm run build` y `git diff --check`. Build correcto con aviso de tamaño de un chunk.
- Revisión general con Pokémon Y real: colección de 70, equipo de seis, pantallas principales, herramientas y fichas. Horda real de Lucario contra cinco Mareep verificada. Dobles y estados controlados de PS bajos, debilitados, nombres largos, objetos y puestos no confirmados se comprobaron con datos sintéticos.
- Ventana lateral de 560 × 900, amplia de 1600 × 900 y comprobaciones adicionales a 320 × 844. Original, Pokémon claro/oscuro y muestra en inglés, restaurando preferencias y viewport. No es una auditoría exhaustiva de todos los temas o estados de cada juego.
- Exclusivos: sesión manual separada de X/Y con datos públicos; Pinsir en X y Heracross en Y, comparación con contraparte, Safari en detalle y filtro combinado. Ver el registro específico para distinguir esta prueba de la lectura real de Y.
- Se conservaron descubrimiento, reglas Gen V/VI, funciones y separación de fuentes. No se modificaron saves ni memoria. Queda pendiente la comprobación visual exhaustiva de estados particulares de Black y X y de dobles reales.

Capturas representativas: [workspace](../../artifacts/workspace-refresh-desktop.jpg), [catálogo](../../artifacts/catalog-redesign-desktop.jpg), [colección](../../artifacts/collection-heading-refresh.jpg), [balance](../../artifacts/balance-redesign-desktop.jpg), [tabla](../../artifacts/type-chart-colors.jpg), [horda real](../../artifacts/final-review-real-horde.jpg), [exclusivos](../../artifacts/xy-exclusive-filter-mobile.jpg).

## Decisiones aceptadas y fuera de este cierre

El usuario revisó y aceptó mantener estos tres puntos sin cambios por ahora. No bloquean la entrega y no requieren otro rediseño general:

1. Los botones flotantes pueden superponerse a contenido en la esquina inferior derecha.
2. El resumen del equipo ocupa bastante altura antes del contenido principal en ventanas laterales.
3. Algunos objetos de zona conservan notas en inglés y métodos sin clasificar.

## Registros por pantalla

- [Workspace](visual-workspace-experiment.md) y [Capturas](captures-visual-redesign.md).
- [Catálogo](catalog-visual-redesign.md), [Colección](collection-visual-redesign.md) y [fichas de conocimiento](knowledge-visual-redesign.md).
- [Evoluciones pendientes](pending-evolutions-visual-redesign.md), [Balance](type-balance-visual-redesign.md) y [Tabla](type-chart-visual-followup.md).
- [Combate](battle-visual-followup.md), [revisión final](final-visual-review.md) y [exclusivos](acquisition-availability.md).

Los registros conservan sus fechas y pasos de validación; un pendiente histórico no equivale a una comprobación real realizada en esta entrega. Este cierre y la revisión final resumen el estado aceptado.
