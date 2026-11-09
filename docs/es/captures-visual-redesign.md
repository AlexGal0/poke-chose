# Rediseño de capturas por zona

## Ajuste de color

Las superficies de captura comparten la base neutral del tema. Capturado conserva el check y texto verde, con borde discreto, sin teñir toda la tarjeta ni el número de especie. Los porcentajes usan el texto principal; el acento permanece en Evoluciones. Los métodos mezclan un 35 % de superficie interior con la tarjeta y eliminan el borde visible. Niveles y condiciones pasan a 11 px. La barra de género conserva colores y proporciones con 3 px de altura y opacidad 0,5; sus etiquetas mantienen su contraste original. Tipos, sprites y reglas de descubrimiento no cambian.

Validación del ajuste: 543 pruebas, lint y build aprobados. Verificados en navegador los temas Original y Pokémon oscuro y un ancho de 384 px sin desbordamiento. Los estilos computados confirmaron porcentaje neutral, nivel de 11 px y barra de género de 3 px. `captures-colors-dark.jpg` muestra el ajuste oscuro con el lector desconectado y descubrimiento desconocido; no representa una lectura real nueva ni una comprobación visual del estado capturado. Contrastes calculados de nivel/fondo: Original 7,9:1 aproximadamente y oscuro 7,6:1; texto capturado/fondo: oscuro 10,2:1 aproximadamente y Pokémon claro 6,7:1. Son verificaciones de pares concretos, no una auditoría completa de accesibilidad.

La zona y su navegación encabezan la pantalla. Un resumen distingue especies accesibles, pendientes, capturadas y ocultas por los accesos configurados. La búsqueda, el método y el progreso permanecen disponibles; los accesos y su ayuda comparten un desplegable. El estado vacío permite abrir los accesos sin activarlos automáticamente.

Las fichas conservan tipos, género, identidad visual y las imágenes permitidas por descubrimiento. Cada método muestra su probabilidad, condiciones y niveles propios. La agrupación mantiene separadas áreas y condiciones, conserva los huecos entre intervalos y no inventa porcentajes para regalos o intercambios. Evoluciones queda como botón de icono en la esquina superior derecha; Estadísticas y Movimientos siguen disponibles en las pestañas de la ficha abierta. Los detalles completos, recomendaciones, enlaces, consulta de Pokédex y fuentes permanecen accesibles.

Objetos prioriza la ubicación y requisitos de obtención. Los datos del movimiento de una MT/MO se despliegan aparte. No se modificaron las marcas manuales, las existencias ni los lectores. Los estilos utilizan las variables del tema existente. No se extrajo un adaptador nuevo: la presentación sigue consumiendo los servicios y reglas del contrato compartido.

## Validación de esta revisión

- `npm test`: 543 pruebas aprobadas, incluidas tres nuevas para agrupación de métodos, condiciones, niveles y probabilidades en generaciones V y VI.
- `npm run lint` y `npm run build`: aprobados.
- Navegador local en Pokémon Y: Ruta 12 y Ciudad Yantra, fichas a 520 y 320 píxeles CSS y vista amplia. Sin contenido fuera del ancho a 320 píxeles.
- Verificados Evoluciones y Estadísticas de Mareep; Mareep, Flaaffy y Ampharos no descubiertos mantienen el marcador de imagen oculta. Wingull descubierto conserva su sprite.
- Verificados el acceso desde el estado vacío y el despliegue de Surf en Objetos. No se cambiaron casillas de acceso ni marcas de obtención.
- Datos reales de solo lectura previamente recibidos de Citra. Durante la revisión la conexión dejó de estar activa y la aplicación mostró correctamente los avisos de datos conservados. No se validó recuperación del lector ni combate. Black queda cubierto por las pruebas de agrupación, sin una revisión visual nueva en ese juego.

Las capturas `captures-redesign-desktop.jpg` y `captures-redesign-narrow.jpg` muestran Ruta 12 en español con el tema oscuro. Se restauraron Ciudad Yantra y el tamaño normal del navegador al terminar.

## Ajuste de alineación

Las tarjetas igualan su altura por fila y limitan su ancho a 360 px; un resultado único conserva ese límite. Se retiró Más datos. El icono de Evoluciones conserva nombre accesible y tooltip. Verificados un resultado único, filas con distintos métodos, la apertura de evoluciones de Mareep y 320 px sin desbordamiento del contenido. Las capturas se actualizaron con el lector conectado y datos reales de solo lectura. Pruebas: 543 aprobadas; lint y build aprobados.


Ajuste final de cabecera: se eliminan los 32 px de reserva superior y la identidad comienza a 14 px del borde. Los botones forman una columna a la derecha: Wiki arriba y Evoluciones debajo. La captura captures-header-compact.jpg documenta el orden anterior a esta última inversión. Las capturas siguen indicando su procedencia y las revisiones que representan.
