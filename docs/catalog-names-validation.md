# Nombres y enlaces del catálogo

El catálogo nuevo consulta `pokemon-species?limit=649` en lugar de la lista de variantes `pokemon`. Las cachés anteriores del catálogo y de las tarjetas se normalizan al leerlas, sin borrarlas ni necesitar una consulta adicional. Los nombres visibles y los enlaces a WikiDex comparten la misma adaptación, que contempla sufijos de formas y nombres especiales como Mr. Mime, Mime Jr., Farfetch'd y Nidoran♀/♂. Las formas del equipo con tipos diferentes mantienen sus datos propios.

Validación realizada al implementar la corrección en esta conversación:

- `npm test`: 167 pruebas correctas, incluidas regresiones de nombres, enlaces, lectura de caché anterior y consulta del catálogo de especies.
- `npm run lint` y `npm run build`: correctos.
- `npm run dev` y `node artifacts/check-themes.mjs`: Chrome verificó nombres de tarjetas cargadas, búsqueda y URL para Frillish, Jellicent, Darmanitan, Mr. Mime y Nidoran♀ usando caché sintética con nombres antiguos. También se volvieron a comprobar los cuatro temas a 1280, 390 y 320 px.
- Captura de esa comprobación: `artifacts/catalog-names-320.png`, inspeccionada visualmente a 320 px.

No se utilizó una partida real. Los datos del navegador son sintéticos; se comprobaron las páginas reales de Frillish, Jellicent, Mr. Mime y Nidoran♀ en WikiDex por separado.

Esta actualización documental no volvió a ejecutar las pruebas de código ni el navegador. La normalización descrita corresponde al catálogo y sus tarjetas; no implica migrar los nombres ya guardados en la colección manual ni modificar los enlaces de Capturas por zona.
