# Animación de orden del equipo

> Conservación de evidencias (2026-10-17): se retiraron capturas intermedias y arneses de navegador mencionados en este registro. Los nombres y comandos son referencias históricas; no implican archivos disponibles ni comprobaciones ejecutables. Consulta la selección en `artifacts/README.md`. La limpieza no repitió las verificaciones visuales.

Las tarjetas conservan su identidad individual al cambiar de slot. El equipo anima su desplazamiento durante 380 ms; no anima la carga inicial, un cambio de ancho de la rejilla ni una sección oculta. Respeta `prefers-reduced-motion` y cancela animaciones anteriores al iniciar otro movimiento.

Validación de esta sesión: 255 tests, lint y build correctos. Prueba del adaptador con dos identidades diferentes y slots invertidos: las claves siguen a los ejemplares; se conserva la distinción de duplicados. Vista temporal con tarjetas sintéticas usando el hook real: intercambio entre extremos en escritorio y entre filas en móvil 390×844, dos animaciones de 380 ms y desplazamientos opuestos confirmados. Se eliminó la vista temporal al finalizar. Captura móvil: `artifacts/team-reorder-synthetic-mobile.jpg`.

El usuario cambió el orden dentro de melonDS y la interfaz recibió el equipo actualizado, con ambos lectores conectados. Captura del estado resultante: `artifacts/team-reorder-real-desktop.jpg`; esa imagen estática no prueba por sí sola la transición en vivo. No se modificaron save ni RAM desde la aplicación.
