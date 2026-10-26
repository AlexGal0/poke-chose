# Contrato de obtención

`src/games/core/acquisition.ts` define `AcquisitionService`: rutas resumidas, instrucciones especiales y detalles por especie. Los resultados normalizados incluyen zonas, áreas, métodos, niveles, probabilidades opcionales, condiciones, intercambios y requisitos de evolución. No exponen respuestas de PokéAPI, árboles de Negro ni acceso al bridge.

Cada adaptador decide las fuentes, versiones y reglas. `src/games/black/acquisition.ts` conserva el comportamiento de Negro original: encuentros de esa edición, instrucciones especiales, intercambios locales y evoluciones de Gen V. Las probabilidades de intercambios se normalizan como `null`. La agrupación respeta áreas, métodos y condiciones.

Las etiquetas usan `AcquisitionText`: una clave estable con parámetros (incluidas etiquetas anidadas), o un nombre resuelto por la fuente. `src/i18n/acquisition-text.ts` resuelve esas etiquetas en presentación. Las reglas no llaman a i18next. Las claves de etiquetas específicas de Negro se eligen en su adaptador y no son valores predeterminados de la UI compartida.

`AcquisitionIcons` y `AcquisitionDetailsDialog` consumen datos del contrato. El diálogo conserva cancelación al desmontar/cambiar idioma, reintento y las instrucciones verificadas durante un fallo de la consulta. El catálogo de Negro recibe el servicio desde `BlackWorkspace`. La identidad del servicio evita reutilizar rutas de otro adaptador.

## Alcance de esta preparación

X incorpora `src/games/x/acquisition.ts`, inyectado desde `XWorkspace` al catálogo compartido. Reutiliza los iconos y el diálogo de obtención. El catálogo heredado de Negro conserva sus consultas de especies y su selector de Teselia/Nacional; esta entrega extrae exclusivamente el límite de obtención. El catálogo de X usa `CatalogService` para especies y `AcquisitionService` para obtención, sin consultar APIs de Negro desde la presentación.

Las pruebas del contrato usan fixtures sintéticos y cubren agrupación, condiciones, zonas desconocidas, intercambios sin porcentaje, evolución, idioma, cancelación y fallos. Las comprobaciones de navegador se registran en el resumen de entrega; no se usan los saves como fixtures de escritura.

## Validación de esta entrega

- `npm test`: 412 pruebas correctas; `npm run lint` y `npm run build`: correctos.
- Navegador con datos de PokéAPI/caché: iconos del catálogo de Negro, instrucciones especiales de Victini, zonas/métodos/niveles/porcentajes de Patrat y cierre con devolución del foco.
- Detalle de Patrat en español e inglés; diseño a 390 px sin desbordamiento horizontal.
- Capturas: `artifacts/acquisition-contract-black-desktop.png` y `artifacts/acquisition-contract-black-mobile.png`. Son comprobaciones del catálogo, no una nueva validación de memoria de Citra ni de los saves.

## Adaptador de X

- Usa el atlas local de Kalos y `xKnowledge`, con sus reglas y filtros de Gen VI, para zonas, métodos, condiciones y evolución.
- La metainformación de grupos huevo se consulta en PokéAPI y se guarda como datos no localizados en una caché propia de X. Los requisitos de evolución se resuelven para el idioma solicitado.
- Regalos e intercambios llevan probabilidad `null`; las tablas aleatorias conservan su porcentaje. Se agrupan slots equivalentes sin mezclar condiciones, variedades o métodos. Se mantienen las restricciones de Safari Amistad y encuentros condicionales.
- La ausencia de un encuentro local se muestra como obtención sin confirmar; no demuestra exclusividad por transferencia o evento. Las instrucciones y tablas tienen el alcance del atlas existente, no una verificación del progreso del jugador.
- El contrato admite una etiqueta traducible en el Pokémon solicitado para los intercambios de X que aceptan una elección, además del nombre literal usado por Negro.
- El catálogo consulta las rutas de las entradas visibles con un máximo de cuatro consultas concurrentes y cancela al cambiar de página. La imagen abre el mismo diálogo compartido.

### Validación del adaptador X

`npm test`: 421 pruebas correctas; lint y build correctos. Pruebas sintéticas de fósiles, regalos e intercambios sin porcentaje, condiciones por inicial, restricciones de shiny, requisitos de evolución Gen VI, agrupación por variedad/condición, traducción, cancelación y errores. En navegador con datos públicos/caché se comprobaron Tyrunt y Farfetch’d (incluido Safari Amistad), español/inglés y vista de 390 px; no se modificó ningún save ni se requirió lectura de memoria para obtener estos métodos. Capturas: `artifacts/x-acquisition-fossil-desktop.png` y `artifacts/x-acquisition-mobile.png`.
