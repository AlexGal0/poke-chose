# Rediseño de Balance de tipos

## Plan implementado

La pantalla se organiza como una vista de decisiones: resumen del equipo, debilidades compartidas seleccionables, inspector por tipo, referencia defensiva completa, cobertura STAB y alternativas de la colección. Se elimina el panel interior redundante. La cabecera con degradado y los bloques de cifras construyen identidad propia sin cambiar las reglas de análisis.

El inspector permite elegir cualquier tipo del adaptador y muestra los multiplicadores de todos los miembros incluidos, con sprite sujeto a descubrimiento, nombre y estado. Las debilidades compartidas muestran cantidad y proporción de miembros afectados. El color se acompaña de texto y cifras; resistencias e inmunidades mantienen sus tratamientos distintos.

La matriz completa permanece disponible en pantalla amplia. A 760 px o menos, cada tipo se presenta como un desplegable con los cuatro totales y todos los multiplicadores individuales, sin perder información. La cobertura añade un filtro opcional de huecos. Las alternativas conservan búsqueda, posición, generación, límite de seis opciones y clasificación original; sus beneficios se agrupan como tipos defensivos y ofensivos.

Se conservan exclusión de huevos, opción de debilitados, avisos de lecturas antiguas, límites de STAB, datos desconocidos y las reglas de cada generación. Los cambios son de presentación; no modifican cálculos, selección de adaptadores ni contratos.

## Validación

- `npm test`: 545 pruebas aprobadas; lint y build aprobados.
- Y con datos reales de solo lectura conservados: seis miembros, Eléctrico con tres débiles, cobertura 14/18. Filtro de huecos: Agua, Eléctrico, Volador y Dragón. Accesos de sección e inspector verificados.
- A 320 px, defensa de Eléctrico despliega Débil 3, Neutral 3, Resiste 0 e Inmune 0 y los seis multiplicadores. Sin desbordamiento horizontal.
- Original y Pokémon oscuro, español e inglés. Filtro de alternativas con cero coincidencias y restauración de búsqueda. Los seis candidatos iniciales conservan sus tipos y ubicación.
- Arnés temporal ignorado con Analysis real: un Magnemite debilitado y un huevo. El huevo se excluye siempre; al excluir debilitados aparece el estado vacío. Cambiar reglas de V a VI cambia 17 a 18 filas. Fantasma contra Magnemite muestra 0,5× en V y 1× en VI. No representa datos reales de la partida.
- El lector estaba desconectado en parte de la revisión real y los avisos de lectura conservada permanecieron visibles. Sin modificaciones de equipo, colección, guardado ni memoria. Sin revisión visual nueva de todos los temas ni de Black con una partida real.
- Se restauraron español, Original, búsqueda vacía, filtro de huecos desactivado y tamaño normal del navegador.

`balance-redesign-desktop.jpg` muestra el inspector y la matriz; `balance-defense-narrow.jpg`, la defensa desplegable a 320 px. Ambas usan Y, español, Original y datos reales de solo lectura conservados.
