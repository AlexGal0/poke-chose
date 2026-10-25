# Fichas del ejemplar y alineación

Validación realizada el 23 de octubre de 2026.

- Se eliminó el desplegable «Datos del ejemplar». El objeto ocupa una fila bajo el nombre y el subtítulo de especie; las tarjetas reservan el mismo espacio con y sin apodo.
- Estadísticas muestra naturaleza, habilidad, bases de la forma y valores actuales disponibles. Las cajas indican expresamente que no incluyen estadísticas actuales; no se calculan ni inventan.
- Movimientos abre los conocidos del ejemplar, conservando sus cuatro posiciones. Incluye tipo, categoría, descripción de X/Y, PP base, potencia y precisión. «Por nivel» conserva la consulta de aprendizaje. Los PP restantes y los aumentos individuales todavía no se leen.
- Un ejemplar con PS conocidos iguales a cero y PS máximos positivos tiene borde y fondo rojizos, sprite desaturado y etiqueta «Debilitado». Los huevos y los PS desconocidos no activan esta presentación.
- Capturas utiliza filas compartidas para identidad, tipos, obtención, aparición, avisos, acciones y detalles. Se conserva la regla de ocultar imágenes de especies no vistas ni capturadas.

## Comprobaciones de esta sesión

Se utilizó la colección real leída de Citra, siempre en modo de solo lectura. Se comprobaron movimientos conocidos, aprendizaje por nivel, naturaleza y estadísticas de Riolu, naturaleza y ausencia explícita de estadísticas actuales de Farfetch’d en caja, traducciones española e inglesa y diseño móvil de 390 × 844.

Las seis tarjetas del equipo, incluida Sweetie Fox/Fennekin, tenían la misma coordenada vertical para objeto, tipos y acciones. Las primeras tres tarjetas de Ruta 4 coincidían en identidad, tipos, métodos, barras, acciones y detalles. Las tablas de movimientos conservan columnas legibles y desplazamiento horizontal en móvil.

Se verificó también Riolu debilitado en vivo (0/46 PS), con borde rojizo, sprite desaturado y etiqueta visible junto a compañeros saludables. El cambio ocurrió durante el juego del usuario; no se provocó ni se modificó la partida para probarlo.

Capturas de esta sesión: `artifacts/x-individual/`. Las pruebas sintéticas cubren posiciones de movimientos, metadatos históricos (Placaje con potencia 50 en X/Y), localización, rechazo de movimientos ajenos a X y seguimiento seguro de la identidad al cambiar de posición.

## Límites entre adaptador y pantalla

El contrato compartido acepta detalles normalizados opcionales, estadísticas base y una referencia al ejemplar. La pantalla no importa APIs ni identificadores de X. La selección se resuelve contra la colección de la fuente actual; si el ejemplar desaparece o su identidad resulta ambigua, sus datos dejan de mostrarse. Cambiar de fuente cierra la ficha.

Los 621 movimientos públicos de generaciones I–VI están empaquetados en el adaptador X. `scripts/update-x-move-details.mjs` los genera a partir de CSV públicos de PokéAPI y aplica los cambios históricos posteriores al grupo X/Y. El acceso desde la partida sigue siendo local. Black conserva su flujo existente; no se migra su workspace en esta mejora.
