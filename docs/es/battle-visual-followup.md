> Revisión documental: 14 de noviembre de 2026. [Índice](README.md) · [Estado actual](project-status.md) · [Contratos vigentes](adapter-contracts.md).
>
> **Registro técnico o histórico:** se conserva la investigación, implementación o validación original. Las afirmaciones de soporte, tareas pendientes, conteos y capturas describen ese momento; consulta el estado actual para cambios posteriores. Esta revisión no repite las pruebas ni amplía compatibilidad de ROM/emulador.

# Rediseño de combate

10 de noviembre de 2026. Fichas detalladas con identidad, tipos, nivel, PS, objetos, estadísticas y cambios de etapas conservados. Se reduce el espaciado y se retira el relleno duplicado del contenedor para alinear el panel con la navegación. El equipo general se oculta solo al visualizar combate, donde existe el equipo contextual. La explicación experimental se conserva en un desplegable. Colores mediante variables del tema. Sin límites de altura ni scroll interior.

Validación: combate real Y Lucario/Slowpoke durante la iteración inicial; lectura perdida durante el cierre. Prueba final aislada sintética de combate sencillo a 560 × 900 y 1280 × 720, con seis miembros, debilitado y PS bajos: panel completo visible y sin desbordamiento horizontal. Capturas battle-dashboard-narrow.jpg y battle-dashboard-wide.jpg. El armazón completo de navegación se revisó para igualdad de ancho; no se afirma que todas las cabeceras más el panel quepan simultáneamente en ventana lateral. Dobles/hordas conservan sus componentes y pendientes de comprobación visual final. Lectura parcial/sin conexión conserva avisos y acceso a controles. 554 pruebas correctas, lint y build.


## Prioridad del combate activo

La entrada manual, automática y la apertura inicial de Combate alinean el principio del panel bajo la navegación fija. Se conserva el retorno a la posición previa. Se da altura mínima al contenedor exterior para que esta alineación también sea posible sin lectura. Las fichas de combates sencillos usan sprites de 112 px en ancho amplio y 96 px en ventana lateral, con identidad y PS más legibles. La reserva sigue debajo sin imponer que todo el equipo quepa en pantalla.

Verificación actual: navegación por el atajo y retorno en la aplicación real sin conexión; panel a 90 px y navegación terminando a 82,4 px en 560 × 900. Fichas con datos sintéticos a 560 × 900 y ventana amplia: sprites, identidad, tipos, PS y etapas visibles; reserva bajo los cruces. No se verificó entrada automática con un nuevo combate real en esta pasada. 557 pruebas, lint y build correctos. Capturas `battle-priorities-narrow.jpg` y `battle-priorities-wide.jpg`.


## Dobles y hordas

Validación sintética de 2 contra 2 y 1 contra 5 a 560 × 900 y 1280 × 720. Se alinearon alturas de tarjetas por fila y en ambos lados del combate doble (225,2 px en la muestra amplia). Se añadieron tipos a las fichas pequeñas y etapas a las fichas de horda; se mantuvieron las debilidades de dobles. Sin desbordamiento horizontal a 560 px, ni en dobles a 390 × 844 (allí se apilan y se requiere scroll). Los activos se ven antes de la reserva. Se revisaron nombres largos, objeto con tooltip, etapas positivas/negativas/desconocidas, debilitado y puesto no confirmado. Se corrigió una altura fija de la reserva que cruzaba nombres largos con su cabecera. No se ha validado un encuentro múltiple real en el lector. 557 pruebas, lint y build correctos.

Capturas de datos sintéticos: `battle-double-narrow.jpg`, `battle-double-wide.jpg`, `battle-horde-narrow.jpg` y `battle-horde-wide.jpg`.

## Aprovechamiento de pantallas amplias

14 de noviembre de 2026. A partir de 1280 × 850 px, la presentación compartida aprovecha la altura disponible bajo la navegación. Crecen los sprites activos, identidad, PS y etapas; las comparaciones y las reservas ganan legibilidad. Los dobles distribuyen cuatro fichas en paralelo y las hordas mantienen una columna propia y una cuadrícula rival. No se cambian contratos, reglas, lectores ni datos de combate. Por debajo del umbral se conservan los estilos existentes.

Validación de esta sesión: montaje temporal aislado con datos sintéticos usando los componentes reales. Sencillo, doble y horda a 1920 × 1080; doble a 1280 × 900; sencillo con la lectura usada por Black y reglas Gen V a 1920 × 1080; desconexión tras una lectura válida con datos retenidos. Sin desbordamiento horizontal en dobles y hordas a 390 × 844 ni en sencillo a 560 × 900 y 1280 × 720. Se incluyeron PS bajos, debilitados y etapas positivas/negativas. No se comprobó un combate real ni se accedió al escritorio o a partidas. Se retiró el montaje temporal tras la revisión.

## Adaptación por ancho real y renovación del combate individual

14 de noviembre de 2026. Se sustituye el corte de ventana 1280 × 850 por una consulta al ancho real del contenedor de combate (900 px), con escalas fluidas para retratos, tipografía y reserva y un mínimo de altura de ventana de 640 px. Por debajo se conserva la presentación pequeña. La cabecera agrupa formato y equipo rival; la ficha individual mantiene identidad y tipos juntos, separa nivel/PS en una franja completa y agrupa las etapas en un bloque propio. Las dos rutas de combate comparten la presentación; no hay selección de estilos por juego. No se alteran las lecturas ni las reglas.

Se validó con un montaje temporal sintético que pasó por YBattle y XBattle y por BattleScreen con reglas Gen V para la ruta de Black. Se revisaron individuales a 1360 × 1232 (referencia de la captura del usuario), 1100 × 800, 1024 × 768, 1280 × 720, 1920 × 1080 y 390 × 844; dobles y hordas de Y a 1024 × 768 y 1920 × 1080. Sin desbordamiento horizontal en las muestras; en ventanas bajas el contenido continúa en el scroll normal. Incluidos nombre largo, PS bajos, debilitado, etapas modificadas y desconexión tras lectura válida. Temas Pokémon claro y oscuro comprobados. Se retiró el montaje temporal y se restauró el viewport. 571 pruebas, lint y build correctos. No se presenta esta revisión como validación de un combate real del emulador.
