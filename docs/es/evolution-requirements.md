# Evoluciones pendientes y obtención en Negro

> Conservación de evidencias (2026-10-17): se retiraron capturas intermedias y arneses de navegador mencionados en este registro. Los nombres y comandos son referencias históricas; no implican archivos disponibles ni comprobaciones ejecutables. Consulta la selección en `artifacts/README.md`. La limpieza no repitió las verificaciones visuales.

## Plan
- [x] Leer la bolsa de Objetos desde el save BW con CRC local/espejo, como dato opcional. Preservar el núcleo y la última lectura ante errores.
- [x] Crear Evoluciones pendientes para especies poseídas cuyo siguiente resultado todavía no figure como capturado (en manual, no figure en colección). Excluir huevos.
- [x] Separar intercambios de piedras/otros objetos; filtros Teselia, solo Nacional y todas. Mostrar condiciones adicionales y ramas alternativas sin ocultarlas.
- [x] Comparar un objeto por especie pendiente con cantidades del último save: bolsa y objetos equipados en ese mismo save, sin mezclar inventarios en vivo. Mostrar faltantes y límites (objetos conocidos no garantizan acceso al intercambio ni condiciones).
- [x] Pulsar el sprite del catálogo abre diálogo accesible con rutas específicas de Black, niveles, métodos, condiciones, intercambios NPC, evolución e instrucciones especiales verificadas. Evitar afirmar exclusividad cuando los datos sean incompletos.
- [x] Añadir ES/EN, tests de reglas/parser/contratos y revisar escritorio/móvil con datos reales y sintéticos. Commit por tema terminado.

La bolsa no se lee en RAM: primero se usa el último save como referencia. No se escribe en el juego. Sin edición de cantidades automática, simulación ni predicción de tiempo. Los pasos posteriores de una cadena sin su preevolución poseída no se cuentan como evolución inmediatamente pendiente. Para completar ramificaciones pueden hacer falta más ejemplares; las cantidades no asignan automáticamente un ejemplar a varias evoluciones.

## Resultado y validación

Bolsa real confirmada por el usuario: Piedra Fuego ×2 y Piedra Agua ×1. En la muestra del save se encontraron 4 evoluciones regionales por intercambio y 6 por objeto; cantidades suficientes para estas rutas. Filtro Nacional: Onix, Feebas y Clamperl, faltantes Revestimiento Metálico/Escama Bella/Escama Marina; Diente Marino disponible equipado en otro ejemplar. La vista advierte rutas alternativas sin objeto/intercambio cuando existen (p. ej. Feebas) y la necesidad de más preevoluciones para ramificaciones. No se asignan automáticamente ejemplares ni recursos.

Revisión con save real y collection live: filtros, origen del inventario, modo manual sin lectura de bolsa, escritorio y móvil 390×844, ES/EN. Diálogo de Zorua abierto desde el sprite y cerrado con Escape; evento especial, encuentros Black, fuentes. Petilil muestra intercambio por Cottonee en Ciudad Esmalte y el inglés equivalente. Capturas en artifacts/evolution-requirements-*.jpg y acquisition-details-*.jpg. Se reinició el lanzador para cargar el save bridge actualizado y se recuperaron ambos lectores tras Reset confirmado por el usuario. No se modificaron partidas.

Cobertura sintética: cantidades y CRC, principal/backup sin mezcla, corrupción aislada, cambios solo de inventario y recuperación del watcher, contrato legado, objetivos poseídos/no capturados, agrupación de métodos sin duplicar familias, índices de objeto Gen V y selección exacta de Black excluyendo White/Black 2. No se midieron FPS ni se localizó la bolsa en RAM.

Checks finales: 262 tests correctos, lint y build correctos (aviso existente de tamaño de bundle). El diálogo conserva instrucciones verificadas si falla la consulta; no presenta ausencia de encuentros como imposibilidad. Las notas especiales incluyen legendarios con requisitos previos, además de los casos revisados visualmente.
