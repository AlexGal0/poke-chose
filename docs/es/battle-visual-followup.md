# Rediseño de combate

10 de noviembre de 2026. Fichas detalladas con identidad, tipos, nivel, PS, objetos, estadísticas y cambios de etapas conservados. Se reduce el espaciado y se retira el relleno duplicado del contenedor para alinear el panel con la navegación. El equipo general se oculta solo al visualizar combate, donde existe el equipo contextual. La explicación experimental se conserva en un desplegable. Colores mediante variables del tema. Sin límites de altura ni scroll interior.

Validación: combate real Y Lucario/Slowpoke durante la iteración inicial; lectura perdida durante el cierre. Prueba final aislada sintética de combate sencillo a 560 × 900 y 1280 × 720, con seis miembros, debilitado y PS bajos: panel completo visible y sin desbordamiento horizontal. Capturas battle-dashboard-narrow.jpg y battle-dashboard-wide.jpg. El armazón completo de navegación se revisó para igualdad de ancho; no se afirma que todas las cabeceras más el panel quepan simultáneamente en ventana lateral. Dobles/hordas conservan sus componentes y pendientes de comprobación visual final. Lectura parcial/sin conexión conserva avisos y acceso a controles. 554 pruebas correctas, lint y build.


## Prioridad del combate activo

La entrada manual, automática y la apertura inicial de Combate alinean el principio del panel bajo la navegación fija. Se conserva el retorno a la posición previa. Se da altura mínima al contenedor exterior para que esta alineación también sea posible sin lectura. Las fichas de combates sencillos usan sprites de 112 px en ancho amplio y 96 px en ventana lateral, con identidad y PS más legibles. La reserva sigue debajo sin imponer que todo el equipo quepa en pantalla.

Verificación actual: navegación por el atajo y retorno en la aplicación real sin conexión; panel a 90 px y navegación terminando a 82,4 px en 560 × 900. Fichas con datos sintéticos a 560 × 900 y ventana amplia: sprites, identidad, tipos, PS y etapas visibles; reserva bajo los cruces. No se verificó entrada automática con un nuevo combate real en esta pasada. 557 pruebas, lint y build correctos. Capturas `battle-priorities-narrow.jpg` y `battle-priorities-wide.jpg`.


## Dobles y hordas

Validación sintética de 2 contra 2 y 1 contra 5 a 560 × 900 y 1280 × 720. Se alinearon alturas de tarjetas por fila y en ambos lados del combate doble (225,2 px en la muestra amplia). Se añadieron tipos a las fichas pequeñas y etapas a las fichas de horda; se mantuvieron las debilidades de dobles. Sin desbordamiento horizontal a 560 px, ni en dobles a 390 × 844 (allí se apilan y se requiere scroll). Los activos se ven antes de la reserva. Se revisaron nombres largos, objeto con tooltip, etapas positivas/negativas/desconocidas, debilitado y puesto no confirmado. Se corrigió una altura fija de la reserva que cruzaba nombres largos con su cabecera. No se ha validado un encuentro múltiple real en el lector. 557 pruebas, lint y build correctos.

Capturas de datos sintéticos: `battle-double-narrow.jpg`, `battle-double-wide.jpg`, `battle-horde-narrow.jpg` y `battle-horde-wide.jpg`.
