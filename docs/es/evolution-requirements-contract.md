# Contrato de evoluciones pendientes: Black y X

`EvolutionRequirements` recibe un `EvolutionRequirementsService`, inventario normalizado, acción de apertura de detalle y badge opcional. El contrato está en `src/games/core/evolution-requirements.ts`. Las familias devuelven `{ root, labels?, sprites? }` con especies y métodos ya filtrados por juego. La presentación no elige adaptador ni abre conexiones.

## Adaptadores

`blackEvolutionRequirements`, inyectado en `GameWorkspace`, compone familias Black/White, índices de objetos Gen V, filtros Teselia/Nacional y badge legado. Su inventario procede del último save mediante `useSaveInventory`, incluso si la colección viene de live; bolsa y equipados se normalizan desde esa misma lectura.

`xEvolutionRequirements` usa `xKnowledge` y las reglas X/Y para convertir `KnowledgeNode.id` a `EvolutionNode.speciesId`, preservando las condiciones Gen VI. Entrega etiquetas de recursos y sprites del catálogo local X. Las condiciones usan `knowledgeEvolutionFacts`, igual que el detalle de X/Y. Los filtros Kalos y Solo Nacional usan pertenencia al catálogo regional, no la generación de origen. Las rutas que solo difieren en metadatos de formas se agrupan para esta planificación por especie; las condiciones distintas se conservan.

La capacidad opcional `evolutionRequirements` habilita la pestaña en GameWorkspace. `WorkspaceEvolutionRequirements` abre el detalle mediante KnowledgeContext y espera a disponer de colección. En Save/Live se usan marcas de captura de la Pokédex; en manual, la colección sirve como registro. Los huevos no generan pendientes. Datos obsoletos, resolución en curso y errores de colección se reflejan en la advertencia.

## Inventario y límites

Las claves de inventario son opacas, nunca IDs de PokéAPI por inferencia. `null` significa desconocido; `{}` significa lectura válida sin objetos. Bolsa y equipados deben pertenecer a la misma lectura. El estado obsoleto evita colorear cantidades como vigentes. En manual no se usan cantidades.

Save y En vivo de X aportan una lectura conjunta de bolsa/equipados mediante la capacidad opcional inventory. La pantalla conserva cantidades desconocidas si la fuente no ofrece esta capacidad. Véase [inventario de X](x-inventory.md) para integridad, actualización y límites. Los objetos se cachean por juego/locale y sus claves se resuelven con índices explícitos Gen VI, sin usar el save Black.

La pantalla conserva modelos de evolución legados, DiscoveryContext y claves de texto compartidas. Las extensiones Gen VI se mantienen durante la conversión y las interpreta el adaptador X. Las cantidades siguen siendo planificación por especie objetivo: no asignan ejemplares entre ramas alternativas. No incluye megaevoluciones ni planificación individual por forma.

La presentación no recurre al cargador de Pokémon de Black cuando falta un sprite. Usa los sprites del servicio y, opcionalmente, `renderSpeciesSprite` aportado por la composición. Black entrega los sprites y etiquetas de su familia filtrada; X entrega sus sprites locales. Sin ninguno de esos datos, el retrato queda sin imagen, sin consultar otro juego.

## Validación del 30 de octubre de 2026

- 487 tests correctos, lint y build correctos. Suite ejecutada fuera del sandbox por sus tests de red local y renombrado de fixtures.
- Pruebas sintéticas de condiciones Gen VI, deduplicación de formas, filtros regionales, nombres ES/EN e inventario desconocido; se mantiene cobertura del adaptador Black.
- Navegador con el servidor Vite ya activo: colección real conservada de X (196 ejemplares), fuente live detenida. No se conectó ni escribió en Citra ni se modificaron partidas. Se verificaron aviso de obsolescencia, objetos necesarios, filtros Kalos/Nacional/Todas, detalle X/Y y cambio ES/EN.
- Capturas de escritorio y móvil en `artifacts/x-evolution-items-{desktop,mobile}.png`. El override móvil solicitado fue 390×844; la inspección DOM reportó 325 CSS px de ancho y 320 de scrollWidth. No se detectaron elementos de main fuera del ancho disponible. Se restauraron viewport e idioma español.
- No se hizo una nueva lectura de save ni una comprobación visual específica de Black o del modo manual en esta sesión.
