# Tabla de tipos: filtro y navegación

Se elimina el panel interior redundante. Los tags filtran únicamente columnas defensoras, con selección múltiple y Todos los tipos para restaurarlas. Sin selección se muestran todas las columnas del adaptador, conservando todas las filas atacantes.

La matriz tiene desplazamiento interno con cabecera superior y primera columna fijas. Cada cruce puede fijarse con clic o Intro y liberarse con otro clic, Esc o Liberar selección. El resaltado de fila y columna responde también al foco del teclado; las flechas recorren las celdas, Inicio/Fin cambian de extremo de la fila. Una sola celda entra en el recorrido Tab para evitar cientos de paradas. La selección incluye una descripción textual del atacante, defensor y multiplicador.

Al ocultar la columna de un cruce fijado, este se libera. No cambian cálculos, colores de efectividad, leyenda ni reglas generacionales. El desplazamiento horizontal se conserva para la matriz completa.

## Validación del 10 de noviembre de 2026

- 545 pruebas aprobadas, lint y build aprobados.
- Y en navegador: Fuego y Agua dejan dos columnas y 18 filas (36 celdas). Todos los tipos restaura 18 columnas.
- Clic Agua contra Fuego fija 2×. Flecha derecha mueve el foco a Agua contra Agua; Intro fija ½× y Esc libera la selección.
- Ocultar una columna seleccionada elimina su cruce fijado. El resaltado fijado no se mezcla con el hover de otra fila.
- Con scrollTop de 258 px, la cabecera queda a menos de un píxel del borde del contenedor: permanece fija.
- 320 px sin desbordamiento de página; español/inglés y Original/Pokémon oscuro. Preferencias y tamaño normal restaurados, filtros y selección limpiados.
- Datos de reglas de generación VI; el equipo lateral procede de lecturas reales de solo lectura. No se alteró el equipo, colección, guardado ni memoria. El lector estuvo conectado y desconectado durante la revisión; la tabla no depende de esa lectura. Sin nueva comprobación visual de Black.

`type-chart-filter-desktop.jpg` y `type-chart-filter-narrow.jpg` muestran el filtrado y la selección en Original, español; la segunda mide 320 px CSS.

Ajuste de ancho: la tabla deja de ocupar el 100 % del contenedor. Columna principal de 110 px y columnas defensoras de 80 px; con Fuego y Agua mide 270 px y deja libre el resto del panel. La matriz completa mide 1550 px en Gen VI y mantiene el desplazamiento dentro del contenedor, sin desbordar la página a 320 px. Captura type-chart-fixed-width.jpg: Original, español, Y con datos reales conservados en el lateral.

Altura completa: se elimina max-height del contenedor. En Gen VI se midieron clientHeight y scrollHeight de 745 px: no hay desplazamiento vertical interior. Se conserva el horizontal para las columnas que no caben. La tabla y su encabezado se desplazan verticalmente con la página; la descripción anterior de cabecera fija durante scroll interior corresponde a la revisión previa. Captura type-chart-full-height.jpg.


### Ajuste de colores (10 de noviembre)

Resaltados de fila y columna con superficie neutra del tema; acento reservado al borde del cruce y detalle del resumen. El valor neutral usa el texto principal para reforzar contraste. Los filtros activos muestran una marca adicional. Se conservaron las paletas de tipos y efectividad.

Validación actual: revisión visual en Original, Pokémon oscuro y Pokémon claro, selección de cruce y filtrado de columnas. 548 pruebas, lint y build correctos. Captura: `artifacts/type-chart-colors.jpg`.
