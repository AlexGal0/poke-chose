# Contador de evolución

Las tarjetas de equipo y colección con nivel conocido muestran `↗ N` para evoluciones directas por nivel sin condiciones adicionales. El número indica niveles restantes; cero significa que se alcanzó el umbral y puede requerir subir otro nivel. El botón abre la familia evolutiva. No se muestra para huevos, niveles desconocidos, datos ausentes ni métodos especiales.

El componente visual y el cálculo son compartidos. Negro conserva una pequeña integración con su API de evolución existente; X usa el servicio del adaptador a través de KnowledgeContext. El modo manual no dispone de niveles individuales y no inventa un contador.

Validación realizada el 24 de octubre de 2026:

- `npm test`: 364 pruebas aprobadas fuera del sandbox; la ejecución restringida falló en pruebas de red local y operaciones con archivos temporales.
- `npm run build`: aprobado.
- Vista aislada del componente con datos sintéticos en `/artifacts/evolution-check.html`: valores 5, 1 y 0, ausencia de indicador sin valor, etiqueta singular y respuesta al clic.
- Revisión visual en escritorio y en un iframe de 390 px; sin desbordamiento del indicador.
- No se utilizó una partida real ni se verificó una conexión con el emulador.

## Corrección del contador en X

La respuesta real de PokéAPI incluye `is_default: true` en los métodos de evolución. Este campo es metadato y no un requisito; ahora el cálculo lo permite sin descartar el contador. Los requisitos adicionales desconocidos siguen impidiendo mostrar una cifra sin confirmar. La consulta de la tarjeta depende de la especie y no de la identidad del objeto que cambia al actualizar el emulador.

Se comprobó la integración con `SavedRosterCard`, `KnowledgeProvider`, `xKnowledge` y `xSavedRosterService`, usando individuos sintéticos y respuestas públicas reales de PokéAPI guardadas en `artifacts/evolution-api-fixture.json`:

- Equipo: Bulbasaur de nivel 11 muestra `↗ 5`; al actualizar el individuo a nivel 12 cambia a `↗ 4`.
- Colección: el nivel calculado desde la experiencia muestra `↗ 4`.
- Pulsar el contador abre la familia evolutiva de X/Y y sus requisitos.
- `npm test`: 365 pruebas aprobadas; `npm run lint` y `npm run build`: aprobados.

## Ubicación y estilo en X

El contador está en la cabecera, a la izquierda del género. El género permanece alineado a la derecha al desaparecer el contador. Su botón tiene fondo transparente, sin borde, sombra de caja ni redondeo; el hover ilumina únicamente el texto y la flecha. El foco de teclado añade subrayado como señal accesible, sin dibujar una silueta.

Se comprobó con las tarjetas reales y los individuos sintéticos de la vista de validación: alternar Bulbasaur y Venusaur conserva la posición horizontal del género en equipo y colección. El hover devuelve fondo transparente, borde de 0 px, sombra de caja ausente y color iluminado. El clic sigue abriendo la familia evolutiva. El estilo se limita a las tarjetas compartidas usadas en X; Negro conserva su integración y presentación actuales.

## Nivel en la colección de X

La resolución compartida del roster calcula ahora el nivel de los Pokémon de caja usando la experiencia individual y la tabla de crecimiento que entrega el adaptador. Así, la etiqueta de nivel y el contador de evolución consumen el mismo valor normalizado. El nivel del equipo sigue siendo la lectura de la fuente. Sin experiencia o tabla válida se muestra el aviso de nivel no disponible; los huevos no muestran nivel.

Validación con individuos sintéticos y datos locales de X: Bulbasaur de caja con 1000 EXP muestra `Nv. 12` y `↗ 4`. Las pruebas cubren distintas curvas de crecimiento, conservación del nivel del equipo, huevos y datos ausentes o inválidos. No se utiliza una partida real para estas comprobaciones.
