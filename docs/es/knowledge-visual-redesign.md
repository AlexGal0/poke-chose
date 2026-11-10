# Rediseño de Estadísticas, Movimientos y Evoluciones

La prioridad es la claridad visual, no comprimir el contenido. Las tres vistas comparten una cabecera fija con identidad, cierre y navegación segmentada. Las pestañas secundarias de movimientos utilizan una presentación distinta para diferenciar la jerarquía.

Estadísticas agrupa naturaleza y habilidad en superficies equivalentes, alinea barras y valores y da al radar una superficie propia. Las barras conservan sus escalas y valores, con estilos del tema en lugar del aspecto nativo del navegador. Los datos no disponibles siguen indicándose sin calcularlos.

Movimientos reúne PP, potencia y precisión antes de la descripción en la tabla de movimientos conocidos. A 760 px o menos, ambas tablas se presentan como bloques con etiquetas traducidas, conservando todas las columnas. Las descripciones y sus notas de idioma permanecen completas.

Las familias con más de una rama colocan el origen arriba y distribuyen las alternativas en una cuadrícula. Cada alternativa conserva todos sus requisitos y condiciones. Las cadenas simples mantienen su árbol; las reglas de descubrimiento y compatibilidad no cambian. Los cambios afectan presentación compartida, sin modificar contratos, reglas de generación ni lectores.

## Validación actual

- 545 pruebas, lint y build aprobados.
- Y en navegador, con datos reales de solo lectura: Sr. Puerró (estadísticas actuales y movimientos), Eevee (estadísticas de caja, movimientos y ocho ramas) y Bulbasaur del catálogo (estadísticas base y cadena simple).
- Original y Pokémon oscuro, español e inglés; movimientos conocidos y por nivel comprobados a 320/520 px sin desbordamiento horizontal dentro del diálogo.
- Cabecera fija medida tras desplazamiento: scrollTop 491 px; cabecera y borde superior del diálogo coinciden, y cerrar permanece visible.
- Eevee conserva ocho marcadores de imágenes no descubiertas. Bulbasaur conserva su imagen, Ivysaur y Venusaur permanecen ocultos.
- Las capturas knowledge-stats-redesign.jpg, knowledge-evolution-redesign.jpg y knowledge-moves-narrow.jpg muestran Original, español, datos reales de solo lectura. No se modificó la partida ni se verificaron errores de lector, Black o recuperación en esta revisión.
- Se restauraron idioma español, tema Original, Mi colección y el tamaño normal del navegador.

## Ajuste solicitado después de la revisión

Se eliminan la introducción de estadísticas individuales y la nota sobre la barra de PS. Se retira aria-describedby cuando esa introducción no se renderiza. En la prueba amplia, estadísticas midió clientHeight=scrollHeight=829 px, sin desplazamiento vertical. Se restaura el árbol anterior de familias ramificadas (origen a la izquierda, ramas a la derecha) y se mantienen las superficies y tipografía nuevas. Las capturas de estadísticas y evoluciones se actualizaron; la descripción inicial de cuadrícula corresponde a la revisión anterior. Eevee mantiene ocho imágenes ocultas por descubrimiento.
