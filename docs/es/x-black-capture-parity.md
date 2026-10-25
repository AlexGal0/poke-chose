# Revisión de tarjetas y paridad de capturas X / Black

## Tarjetas y búsquedas

Género individual: distintivo SVG junto al número de Pokédex, con formas y colores
para macho/hembra/sin género/desconocido. Capturas muestra el género posible de la
especie junto a su nombre, sin confundirlo con el género de un ejemplar. Huevos no
muestran género. Las etiquetas accesibles y títulos usan las traducciones existentes.

Nombre y apodo reservan espacio uniforme; apodos mantienen su capitalización. Tipos,
estado de debilitado, PS, experiencia y acciones se alinean entre tarjetas. Se midieron
las seis tarjetas reales, incluida Sweetie Fox: mismas coordenadas verticales de tipos,
PS y acciones. No se cambiaron valores del ejemplar ni interpretación de género.

CollectionSearch ahora acepta tipos explícitos y datos estructurales; Black conserva
el conjunto Gen V por defecto y X proporciona sus 18 tipos. matchesCollectionTags
es genérico y conserva AND entre nombre, apodo, número y tipos, con equivalencia entre
slug estable y etiqueta localizada. X usa el mismo buscador en colección, catálogo y
atlas. El catálogo X añade metadatos públicos locales para filtrar sin consultar cada
especie remotamente. No se leen reglas de Black desde la presentación compartida.

## Lista revisada contra CaptureChecklist de Black

| Función | Estado en X |
| --- | --- |
| Pokédex global: visto/capturado y búsqueda por especie/número | Disponible, con catálogo nacional local de 721 especies |
| Captura basada en flags, independiente de equipo/cajas | Conservada |
| Imágenes ocultas sin visto/capturado | Conservada, también en árboles evolutivos |
| Género posible por especie y enlace WikiDex | Disponible, con nuevo distintivo |
| Orden de zonas, búsqueda, anterior/siguiente | Conservado; búsqueda sin distinguir tildes y títulos de navegación |
| Agrupación del recorrido | Tramos localizados definidos por el adaptador X, sin reutilizar hitos de Black |
| Zona actual fuera de resultados de búsqueda | Conservada |
| Selección y filtros de recursos persistentes | Conservados; incluye aviso de especies ocultas |
| Subzonas, nivel mínimo, rangos y métodos | Conservados; filas ordenadas por nivel mínimo |
| Probabilidades por método/condición | Conservadas; sin mezclar hordas, pesca o condiciones distintas |
| Única zona natural | Añadida, referida a los datos disponibles, excluye regalos/intercambios/estáticos |
| Mejor probabilidad en otra zona / más adelante | Disponible con destinos navegables y comparación por método/condición |
| Evolución desde un Pokémon poseído | Añadida, usa ancestros estrictos de la familia compatible y excluye huevos del conjunto poseído |
| Intercambios con personajes y regalos | Conservados con instrucciones, sin probabilidad de Poké Ball inventada |
| Árbol de evolución | Conservado; la pista abre la misma ficha con requisitos |
| Datos anteriores, errores y reintentos | Conservados; la pista de evolución dispone de reintento propio |
| Seguimiento automático de zona | Pendiente por petición expresa del usuario |

Las pistas de evolución comprueban posesión actual, no banderas de capturado. No
prometen satisfacer nivel, sexo, objetos ni etapas intermedias: el botón abre los
requisitos. Los registros de encuentro no son una lista de toda especie obtenible
por crianza, evolución, evento o intercambio externo. Las zonas especiales mantienen
sus avisos sobre cobertura y acceso.

## Validación

319 pruebas correctas, lint y build correctos. Pruebas nuevas: Hada frente a tipos
Gen V, nombre/apodo/tipos combinados, catálogo X local y cancelación, exclusividad
por zona frente a subzonas/regalos/intercambios, ancestros frente a hermanos o
especie actual, condiciones sin importar orden y tramos del itinerario contiguos.

Comprobaciones con la Pokédex/equipo reales de Citra: Hada devuelve Azurill, Ralts y
Flabébé en la colección; Ralts muestra exclusividad natural en Ruta 4; Marill en
Ruta 3 con Surf ofrece evolución desde Azurill. Consulta nacional de 282 devuelve
Gardevoir no capturado/no visto. Alineación de los seis miembros medida en el DOM.
El fallo inicial de nombre Symbol con React Compiler se corrigió a GenderSymbol y
se repitió la comprobación en navegador.

La implementación de Black sigue en su workspace histórico. No se ha trasladado
su transporte ni IDs de mapas a X. Los controles y contratos extraídos son solo los
necesarios para esta revisión; ninguna lectura escribe saves o memoria.

Comprobaciones finales adicionales: la pista de Marill abre Azurill → Marill →
Azumarill con amistad alta y nivel 18; la sugerencia de Weedle navega desde Ruta 2
al Bosque de Novarte (20 %). Buscar vanitas encuentra Pueblo Vánitas sin tilde,
manteniendo la zona actual fuera de resultados. Hada + Psíquico deja solo Ralts.
El catálogo filtrado por Hada muestra 13 especies de la generación seleccionada;
las imágenes no descubiertas permanecen ocultas. Se comprobaron etiquetas ES/EN
y vista 390 × 844: documento 375 px, sin desbordamiento horizontal. Surf se activó
solo durante la comprobación y se restauró a su valor inicial desactivado.

Evidencias locales ignoradas: artifacts/x-parity/team.png, team-mobile.png,
captures.png y capture-mobile.png. Las agrupaciones de X son rangos del itinerario
curado, no los grupos de medallas de Black. CollectionSearch conserva por compatibilidad
el conjunto Gen V cuando sus consumidores históricos no pasan tipos; X siempre
proporciona sus reglas explícitas. No se ha rediseñado el workspace histórico de Black.
