# Rediseño de Mi colección

La colección conserva búsqueda por etiquetas, generación, tipos, cajas y movimientos de campo. Se retiran el texto informativo de sincronización normal, la hora de última lectura y la ayuda genérica de búsqueda. Actualizar colección y los estados de espera, lectura, error o datos antiguos permanecen disponibles. Los cambios de sincronización se aplican a los controles existentes de X e Y.

Las fichas agrupan sprite, mote/especie, nivel y objeto. No se reservan líneas vacías para especie ni condición, ni espacio de PS/EXP en ejemplares de caja. Género, naturaleza, progreso evolutivo y lupa de Wiki permanecen arriba. Estadísticas, Movimientos y Evoluciones conservan etiquetas visibles. Ubicación y generación comparten el pie. El huevo conserva su información de eclosión y el debilitado su tratamiento visual.

La paginación aparece arriba y abajo y redondea el tamaño de página al número de columnas mediante la misma función de presentación que el catálogo. Los filtros siguen reiniciando la página. Las reglas, contratos, fuentes y guardados permanecen sin cambios; los estilos están acotados para no cambiar el equipo lateral.

## Validación

- 545 pruebas aprobadas; lint y build aprobados.
- Pokémon Y: búsqueda de Panpour, consulta de sus movimientos conocidos, selector Caja 1 y regreso a Todas las cajas y equipo, avance de página y sincronización de ambos paginadores.
- Vista amplia de tres y cuatro columnas; 320 px sin desbordamiento en español e inglés, con etiquetas de los tres botones visibles. Temas Original y Pokémon oscuro. Preferencias y tamaño normal restaurados.
- Panpour sin PS/EXP mide 276 px de alto en la medición amplia. Los controles de sincronización listos muestran únicamente Actualizar colección; no se forzó una lectura ni un error del lector.
- Datos reales de solo lectura de Y, seis miembros y 67 ejemplares. Sin modificaciones de colección, equipo, guardados ni memoria.
- Arnés temporal con SavedRosterCard real y datos sintéticos: salud crítica, debilitado, PS desconocidos y huevo con eclosión. El arnés queda ignorado, sin ruta productiva. No representa estados de la partida real.
- Sin revisión visual nueva de Black ni del modo manual.

`collection-redesign-desktop.jpg` muestra Pokémon oscuro y la colección completa; `collection-redesign-narrow.jpg` muestra Caja 1 en Original a 320 px. Ambas usan datos reales de solo lectura.
