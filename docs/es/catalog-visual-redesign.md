# Rediseño de Explorar catálogo

El catálogo conserva Estadísticas, Movimientos y Evoluciones como tres botones visibles con texto, incluso en una ventana estrecha. Sus superficies son neutras; hover y foco utilizan el acento del tema. La acción Wiki muestra una lupa. El sprite sigue abriendo la obtención y ahora existe además el botón explícito Cómo obtener. Las vías conservan sus iconos y ayudas y se agrupan con una etiqueta propia.

La búsqueda y los tipos se presentan junto al alcance regional/nacional y el filtro de pendientes. La ayuda sobre búsqueda y alcance permanece disponible en un desplegable. La paginación aparece arriba y abajo, compartiendo el mismo estado. Se mantienen carga, errores y reintentos, lectura de Pokédex, reglas de descubrimiento y edición manual.

Las tarjetas conservan el fondo neutral cuando están capturadas. El estado se distingue con texto verde y borde, sin teñir toda la superficie. Los botones utilizan el texto principal y los iconos el texto secundario del tema; tipos y sprites no cambian. Todos los estilos nuevos se limitan al catálogo y usan las variables existentes. No se cambiaron reglas ni contratos de los adaptadores.

## Validación

- `npm test`: 543 pruebas aprobadas; `npm run lint` y `npm run build` aprobados.
- Navegador: Pokémon Y, vista amplia y 320 px CSS, temas Original y Pokémon oscuro. Español e inglés sin desbordamiento horizontal; etiquetas de los tres botones visibles.
- Paginación superior avanza a página 2 y la inferior vuelve a página 1; ambas reflejan el mismo número. Búsqueda de Bulbasaur reduce a una página y se limpió al terminar.
- El botón Cómo obtener abre Bulbasaur y sus instrucciones de regalo. Estadísticas abre la ficha de Bulbasaur.
- Bulbasaur descubierto conserva su sprite; Ivysaur y Venusaur no descubiertos siguen sin imagen.
- Datos reales de solo lectura previamente recibidos. El lector dejó de estar conectado durante las comprobaciones y se mostraron los avisos de datos conservados. No se modificó la colección, el equipo ni el guardado. No se hizo una revisión visual nueva de Black ni de edición manual.
- Se restauraron español, tema Original y tamaño normal del navegador. Las capturas `catalog-redesign-desktop.jpg` y `catalog-redesign-narrow.jpg` documentan el tema Pokémon oscuro; la estrecha mide 320 px CSS.

## Ajuste de obtención y tooltips

Cómo obtener se presenta como botón ? junto a la lupa. El sprite ya no tiene acción. Las vías se centran sin etiqueta visual y cada vía abre el mismo detalle; el grupo conserva su nombre accesible. La acción de reintentar errores permanece independiente. Los tooltips antes calculaban su ancho sobre una fila de iconos estrecha; ahora miden hasta 220 px con un límite relativo al viewport. Verificados el botón ?, las vías Regalo y Cría, foco de teclado y tooltips a 320 px (izquierda 50, derecha 270), sin desbordamiento. Captura catalog-tooltip-fixed.jpg: Original, 520 px CSS, datos reales conservados de Y en solo lectura. Pruebas: 543, lint y build aprobados.

## Paginación según columnas

Cada página redondea las 12 especies iniciales al siguiente múltiplo de las columnas reales de la cuadrícula: cinco columnas muestran 15 especies, siete muestran 14. ResizeObserver mide el contenedor; al cambiar el tamaño se conserva la página que contiene la primera posición anterior. Las consultas de obtención usan exactamente el mismo segmento visible. Se permiten filas incompletas al terminar los resultados. Verificado a 2500 px: cinco columnas y 15 tarjetas, 31 páginas para 457 especies. A 320 px vuelve a 12, conserva la especie anterior, no desborda y buscar Bulbasaur reinicia a una página. Captura catalog-pagination-wide.jpg: Original, Y, datos reales de solo lectura conservados. 545 pruebas, lint y build aprobados.
