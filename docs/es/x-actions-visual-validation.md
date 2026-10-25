# Botones e iconos de capturas y equipo de X

KnowledgeActions concentra estadísticas, movimientos y evoluciones, con SVG locales,
etiquetas traducidas, nombres accesibles específicos por especie y título al pasar
el cursor. Los módulos disponibles siguen procediendo de KnowledgeContext. La barra
muestra texto en tarjetas anchas y solo iconos en tarjetas estrechas; sus etiquetas
siguen disponibles para tecnologías de asistencia. Los botones tienen 44 px de alto.

El equipo Save/en vivo también permite abrir esas fichas. Datos del ejemplar mantiene
un control desplegable separado, con icono de información y estado abierto/cerrado:
sigue mostrando estadísticas actuales, habilidad, objeto y movimientos del ejemplar.
Huevos no ofrecen fichas de especie. Capturas usa el mismo componente y un enlace
externo SVG consistente. Catálogo y tarjetas manuales comparten las acciones; no se
importa ningún adaptador concreto en su presentación. Black conserva sus controles.

Validación actual: 310 pruebas, lint y build correctos. UI con equipo/Pokédex reales
de Citra: abrir estadísticas de Riolu, desplegar y cerrar sus datos actuales, abrir
la familia de Ralts desde capturas, cerrar con Escape y navegación por Tab con foco
visible. Textos ES/EN y diseño a 390 × 844 comprobados; ancho del documento 375 px
frente a viewport 390 px, sin desbordamiento horizontal. Botones del equipo medidos
en móvil: 39.56 × 44 px, con separación. Evidencias locales ignoradas en
artifacts/x-actions/: captures.png, team.png y team-mobile.png.

Cambio de presentación y acceso a fichas existentes; sin cambios en save, lectura de
memoria ni banderas de descubrimiento.
