# Barras del equipo — validación de esta sesión

## Nombre del objeto equipado

Tras retirar los textos de habilidad y movimientos, `npm test` pasó 116 pruebas; lint y build también aprobaron. Una prueba verifica la traducción de índices de Generación V y el caso sin objeto. En Chrome con nombres sintéticos precargados en caché, las tarjetas mostraron «Superpoción» y «Agua Mística», sin textos «Objeto #», «Habilidad #» ni «Movimientos:». Se revisaron escritorio a 1280 px y móvil a 390 px, sin desbordamiento. Esta comprobación no valida una consulta externa real de nombres.

## Barras de PS y experiencia

- `npm test`: 115 pruebas aprobadas al implementar las barras, antes de añadir la prueba de objetos. Se verificaron los PS y la experiencia con fixtures PK5 cifrados en las 24 permutaciones, salud cero, cambios que deben actualizar el adaptador, snapshots antiguos sin estos campos, valores inválidos y límites de experiencia/nivel 100.
- `npm run lint` y `npm run build`: aprobados.
- Chrome sobre Vite, con SSE y tabla de crecimiento sintéticos en un perfil aislado: tres miembros con PS 60/80, 30/80 y 0/80; colores verde, amarillo y rojo. Una actualización sin recargar cambió PS a 10/80 y la experiencia restante de 1576 a 576. Solo las tarjetas del equipo mostraron las barras.
- Escritorio a 1280 px y móvil a 390 px: sin desbordamiento horizontal. En Manual, un miembro mostró «Sin datos» en ambas barras. Capturas: `artifacts/team-vitals-desktop.png` y `artifacts/team-vitals-mobile.png`.
- El bridge Save actualizado leyó PS y experiencia del save real mediante acceso de solo lectura. No se modificó el archivo. La actualización en combate con melonDS real queda pendiente; se reinició el servicio live para cargar el parser nuevo y requiere volver a conectar el lector, con Reset si GDB no responde.
