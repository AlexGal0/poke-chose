# Contrato de obtención sin ayuda externa

`src/games/core/acquisition.ts` permite a los adaptadores declarar disponibilidad
independiente y comparación con la edición contraparte. X e Y ya consumen estos
datos en Explorar catálogo y Capturas por zona. Black mantiene su comportamiento
anterior mientras se prepara la información de su contraparte.

- `independent: obtainable` exige al menos una cadena completa sin ayuda externa,
  incluidos progenitores, preevoluciones, objetos y Pokémon solicitados por NPC.
  Las elecciones de inicial o fósil cuentan como posibilidades de la edición, sin
  garantizar que todas puedan obtenerse simultáneamente en una misma partida.
- `unobtainable` requiere evidencia suficiente; una tabla vacía o un error no bastan.
  `unknown` conserva la incertidumbre.
- `counterpart` identifica la edición comparada y su disponibilidad independiente.
  `null` se reserva para juegos sin contraparte; si la comparación está pendiente,
  se identifica la contraparte con disponibilidad `unknown`.
- `isCounterpartExclusive` solo confirma exclusividad si la especie es obtenible
  sin ayuda externa aquí y no lo es en la contraparte. No indica exclusividad global.
- Cada ruta y método puede declarar `access`: `independent`, `trade`, `event`,
  `external` o `unknown`. El intercambio con un NPC puede ser independiente si
  se cumplen sus requisitos localmente; `trade` representa ayuda de otro jugador.
- `summaryAcquisitionRoutes` admite únicamente rutas independientes, intercambios
  y eventos. Safari Amistad es `external`, aunque su método sea una captura.
  Una ruta sin `access` queda sin verificar y no pasa este filtro.
- El detalle «?» conserva todas las vías y sus condiciones. No se debe filtrar
  `AcquisitionDetails.routes` ni sus zonas con el filtro del resumen.

Los campos nuevos son opcionales para permitir migrar los adaptadores de forma
incremental. Su ausencia nunca confirma disponibilidad ni exclusividad. La pantalla
debe poder representar disponibilidad desconocida sin anunciar medios externos.
La clasificación depende del juego, no de usar fuente manual, save o live.

## Aplicación a X e Y

El adaptador compartido XY recibe las tablas de la contraparte desde los puntos
de composición de X e Y. Las pantallas y la insignia compartida no importan juegos
concretos. La insignia se resuelve localmente, sin esperar las consultas de
evolución o cría de los iconos.

`src/games/xy/availability.ts` contiene 19 especies exclusivas sin ayuda externa
por edición, incluyendo preevoluciones obtenibles por cría, evoluciones locales y
fósiles. La lista se contrastó con [Serebii](https://www.serebii.net/xy/exclusives.shtml)
y las [ubicaciones de fósiles](https://www.serebii.net/pokearth/kalos/glitteringcave.shtml)
el 10 de noviembre de 2026. Se excluyen formas Mega: la especie Charizard o Mewtwo
no es exclusiva. Tampoco se incluyen Slurpuff y Aromatisse, que necesitan un
intercambio con otro jugador; sus preevoluciones sí son exclusivas.

La comparación de ausencia se basa en esa lista contrastada, no en restar tablas
de encuentros incompletas. Para las demás especies se reconoce evidencia positiva
de encuentros locales, regalos e intercambios NPC con petición resoluble. El
detalle de obtención también puede confirmar evolución local desde un antecesor
disponible y cría desde una evolución disponible con Ditto local. Requisitos no
resueltos siguen sin confirmar; no se promete cobertura exhaustiva de todas las
excepciones del catálogo nacional.

Safari Amistad conserva su información completa en «?», con métodos marcados
como externos. Se omite de las rutas resumidas y del selector de Capturas por zona
mediante `EncounterZone.access`, sin eliminarlo del atlas que usa el detalle.
Las evoluciones por intercambio conservan su icono como excepción explícita.

## Validación del 10 de noviembre de 2026

- `npm test`: 556 pruebas correctas, ejecutadas fuera del aislamiento para las
  pruebas de servidores locales y reemplazo de archivos sintéticos.
- `npm run lint` y `npm run build`: correctos. Vite avisa del tamaño de un chunk;
  no impide generar el bundle.
- Vite en el puerto 15310 y una sesión manual separada: Pinsir exclusivo en el
  catálogo y Ruta 12 de X; Heracross exclusivo en el catálogo y Ruta 12 de Y.
- Pinsir en Y: resumen sin captura ni cría; «?» conserva Safari Amistad y sus
  condiciones. El selector de zonas omite Safari Amistad.
- Cambio inmediato a inglés y restauración a español. Ambas pantallas verificadas
  con override 390×844, ancho de contenido de 375 px sin desbordamiento horizontal;
  override restaurado. No se añadieron Pokémon a la colección de prueba.
- Verificación con datos públicos de las tablas locales y metadatos de PokéAPI;
  no se escribieron partidas ni memoria del emulador.

Capturas conservadas: `artifacts/xy-exclusive-zone-x.jpg`,
`artifacts/xy-exclusive-catalog-y.jpg` y `artifacts/xy-exclusive-catalog-mobile.jpg`.

## Filtro «Solo exclusivos»

El catálogo y las capturas por zona ofrecen una casilla compacta cuando el
adaptador declara `exclusiveSpeciesIds`: una lista completa de exclusividades
confirmadas. No se consulta únicamente la página visible. Una lista ausente
significa que el filtro no está soportado; una lista vacía sí es un resultado
confirmado. X e Y reutilizan la misma lista contrastada que la disponibilidad.

El filtro se combina con nombre, tipos, ámbito de Pokédex y estado de captura.
En el catálogo reinicia la paginación; en Capturas se mantiene al cambiar de zona
y se restablece con «Limpiar filtros». La selección es propia de cada pantalla y
dura la sesión, sin añadir preferencias persistentes.

Validación adicional del 10 de noviembre de 2026: 557 pruebas, lint y build
correctos. En una sesión manual separada de Y se comprobaron 15 resultados
regionales y 19 nacionales, búsqueda de Pikachu sin resultados con el filtro y
visible al desactivarlo, Heracross como único resultado en Ruta 12, Ruta 2 vacía
y limpieza de filtros. Ambas pantallas se revisaron a 390×844 sin desbordamiento
horizontal (contenido de 375 px); se restauraron viewport e idioma después de
comprobar la etiqueta inglesa. Sin escrituras a partidas o memoria del emulador.
`artifacts/xy-exclusive-filter-mobile.jpg` conserva el resultado de Ruta 12.
