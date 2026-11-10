# Evoluciones pendientes: composición y color

Se conservan los motivos de intercambio y piedras, los retratos circulares, el objeto de transición y los degradados adaptados al tema. Cada grupo ahora utiliza el ancho del contenido y una cuadrícula propia, evitando reservar una columna completa para un solo intercambio.

El resumen de objetos alinea Necesarios, En bolsa y Equipados. Los faltantes usan ámbar; las cantidades suficientes, verde/turquesa. Los errores del lector conservan sus avisos originales. No se modifican los cálculos de demanda, asignación ni compatibilidad.

Cada ruta indica la cantidad del objeto en el inventario, o su estado desconocido/antiguo. Esta cantidad no confirma que se cumplan todos los requisitos de evolución ni asigna el mismo objeto a varias rutas. La ayuda de planificación conserva las explicaciones de asignación y sincronización; la introducción se abrevia. Se mantienen el filtro por Pokédex, enlaces, árbol, reintentos y descubrimiento.

## Validación

- 545 pruebas aprobadas; lint y build aprobados.
- Pokémon Y, datos reales de solo lectura: cantidades conservadas, Spritzee y rutas por piedras. Verificado el botón Ver requisitos y árbol, que abre Spritzee.
- El lector se desconectó durante la revisión: las rutas mostraron cantidades de última lectura sin confirmar y el estado de color neutral. No se presentan como inventario vigente.
- Original y Pokémon oscuro; español e inglés; 320 px sin desbordamiento. Se mantuvieron nueve destinos ocultos por descubrimiento.
- Arnés temporal ignorado con el componente real y datos sintéticos: objeto disponible, faltante, inventario antiguo y desconocido. Confirmados ámbar y verde en los estados válidos y etiquetas neutrales en los no confirmados. No se alteró la partida.
- Sin validación visual nueva de Black ni del modo manual. Preferencias de idioma, tema y tamaño restauradas.

`pending-evolutions-redesign.jpg` muestra Original, español, datos reales conservados y explícitamente sin confirmar tras desconectarse el lector.

Ajuste del resumen: se elimina la clase panel interior; solo queda el panel del espacio de trabajo. Los tres motivos del resumen usan SVG de 24 px en lugar de caracteres dependientes de la fuente. Medidos centrados (desviación horizontal/vertical 0 px); 320 px sin desbordamiento. pending-summary-aligned.jpg muestra Original y datos reales de solo lectura con el lector conectado.
