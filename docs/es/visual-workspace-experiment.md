# Experimento visual — 9 de noviembre de 2026

## Estado vigente

- Preferencias visibles y conexión en una sola superficie, con estado por color y Reconectar disponible aun con controles cerrados si la fuente admite esa acción.
- Cuatro destinos frecuentes: Capturas por zona, Explorar catálogo, Mi colección y Evoluciones pendientes (cuando existe el servicio). Las otras herramientas van apareciendo una a una en la barra según su ancho disponible; cuando caben todas, desaparece el menú.
- Guardería, Balance de tipos, Tabla de tipos, Combate y En desarrollo permanecen en Herramientas mientras no quepan en la barra. Se conservan disponibilidad, IDs, selección persistida, contratos de panel y entrada/salida automática de combate. La herramienta activa aparece en el botón del desplegable.
- La navegación es sticky al borde superior. Elegir un destino sitúa el panel debajo de la navegación, sin exigir volver al inicio. El menú permite Escape con retorno de foco y cierre al pulsar fuera; se conserva navegación por flechas/Inicio/Fin dentro de los grupos.
- El equipo sigue usando una sola instancia de cada ficha, con densidades compacta y completa, sprites, género, objeto, nivel, tipos, PS y experiencia. Los tipos tienen una fila de ancho completo y el nivel queda junto al nombre. Se ocultan las líneas vacías de especie cuando no hay apodo y de objeto cuando se ha confirmado que no hay ninguno; errores o cargas pendientes no se tratan como ausencia.
- En el equipo compacto, PS y experiencia muestran sus valores junto a las barras. La vista completa conserva las etiquetas PS/EXP y el texto de experiencia restante. El tooltip y `aria-valuetext` siguen disponibles. Fuera del equipo se conserva el formato anterior. La generación comparte línea con la ubicación y el enlace Wiki del equipo usa una lupa, incluida la fuente manual.
- El equipo ampliado usa una, dos o tres columnas según el ancho de su contenedor, evitando fichas completas estiradas a todo el ancho de una ventana intermedia. La columna lateral conserva una sola ficha completa por fila.
- En pantallas grandes, el contenedor aprovecha el 92 % del ancho, con límite de 1920 px y cuatro columnas en la colección cuando el viewport supera 1600 px. La geometría sigue separada de los colores de temas.

## Validación de la última revisión

- `npm test`: 540 pruebas correctas (incluye dos nuevas pruebas de aparición progresiva de herramientas) fuera del aislamiento, necesario para las pruebas de bridge y archivos sintéticos. `npm run lint` y `npm run build`: correctos.
- Navegador con Pokémon Y, seis miembros y 67 ejemplares. En la última comprobación el lector ya estaba activo y conectado; se observó su estado sin pulsar Conectar/Reconectar. No se modificaron partidas ni memoria, ni se pulsó Reconectar contra un emulador real.
- En la comprobación precedente, acceso a las cinco herramientas: Guardería, Balance de tipos, Tabla de tipos, Combate sin lectura y En desarrollo. Se comprobó selección activa y regreso a Colección. Escape cierra el menú y devuelve foco al activador.
- En la comprobación precedente, después de desplazar una pantalla larga, navegación a y=0 con scrollY aproximado de 595 px; nueva comprobación a y=0 con scrollY aproximado de 1427 px. Seleccionar Guardería dejó el panel a 77 px, debajo de la navegación.
- A 320 CSS px, página con scrollWidth 320; navegación con clientWidth y scrollWidth 292. Menú completo accesible en ES y EN, sin scroll horizontal. En la última pasada: anchos efectivos 800, 960, 1100, 1280, 1500 y 1920, con respectivamente 0, 1, 2, 3, 4 y 5 herramientas promovidas a la barra. A 1920 están las nueve pestañas y no hay menú. Controles de cabecera comprobados: botón y ambos selectores con altura de 36 px. Párrafo de ayuda de X/Y En vivo retirado, preservando estado, fecha, controles y errores.
- A 1100 CSS px, equipo ampliado con dos columnas de 493 px; ambos tipos de las primeras fichas compartían la misma coordenada vertical. A 1920 CSS px, contenedor de aproximadamente 1755 px, frente al límite anterior de 1320 px.
- Fichas compactas y ampliadas en anchos estrechos, intermedios y amplios. En la última pasada: EXP completa visible, lupa visible, generación alineada con ubicación; en compacto a 320 px, etiqueta y número de PS con la misma coordenada vertical, y barra centrada entre ambos. Página con scrollWidth 320. Navegación sticky comprobada a y=0 con scrollY 960. Tema Pokémon oscuro inspeccionado; se restauró Original. Se restauraron español, tema Original y viewport normal. La aplicación queda en Y/Colección, equipo compacto y Herramientas cerrado.

## Evidencias actuales

- `artifacts/workspace-refresh-desktop.jpg`: distribución amplia con cuatro destinos principales, herramientas y equipo compacto.
- `artifacts/workspace-refresh-narrow.jpg`: navegación estrecha y fichas con tipos en una fila y experiencia simplificada.
- `artifacts/workspace-team-expanded-mobile.jpg`: ficha completa a 320 px.
- `artifacts/workspace-team-expanded-grid.jpg`: fichas completas distribuidas en dos columnas en ventana intermedia.
- `artifacts/workspace-navigation-sticky.jpg`: navegación y menú de herramientas durante el desplazamiento. La posición sticky se comprobó además mediante medidas; una captura aislada no demuestra el movimiento.

## Comprobaciones previas conservadas y límites

La entrega anterior comprobó los mismos componentes con un arnés local temporal y seis ejemplares sintéticos: 114/114 PS (verde), 42/105 (amarillo), 12/108 (rojo), 0/223 (debilitado), PS desconocidos y huevo. También comprobó reconexión simulada con éxito/fallo. `artifacts/workspace-team-states-synthetic.jpg` conserva esa evidencia histórica, anterior a la última simplificación de EXP; no es una lectura real ni una nueva prueba de salud de esta revisión.

No se validan enfrentamientos reales, cambios reales de PS, recuperación de servicios reales o todos los temas. Las reglas y adaptadores no cambian; filtros, tablas y fichas de conocimiento conservan sus funciones. Los botones flotantes todavía pueden superponerse a parte del contenido y requieren una revisión aparte. Los cambios previos de objetos de zona se conservan. El acoplamiento de estilos a clases de ficha sigue siendo de presentación y no introduce reglas de juego.

## Ajuste final de alineación

PS y EXP compactos conservan ambos sus etiquetas y usan las mismas columnas para etiqueta, barra y valor. Se midieron iguales bordes de ambas barras. La lupa forma parte del flujo de herramientas de la ficha; evolución, género, naturaleza y Wiki midieron 28 px y el mismo centro vertical. Capturas actuales: `workspace-refresh-narrow.jpg` y `workspace-team-expanded-grid.jpg`. `npm test`: 540 correctas; lint y build correctos. No se cambió la lógica de lectores ni se escribió en partidas.
