# Temas: comportamiento y validación

El selector de la cabecera ofrece Original, Pokémon, Pokémon oscuro y Fiesta 🎉. Está disponible también en combate. Las paletas se definen mediante variables CSS en `src/themes.css`; los colores originales quedan como valores de respaldo en las hojas de estilo de los componentes. Fiesta añade fondos con confeti, acentos neón y títulos multicolor. Los colores de tipos y los indicadores de salud conservan su significado.

## Persistencia

Cada selección se aplica inmediatamente y se guarda como una cadena JSON en `localStorage`, bajo `poke-chose:theme:v1`. `src/main.tsx` restaura el tema antes de montar React. No hace falta pulsar un botón de guardar y cambiar de sección o de fuente de equipo conserva la elección.

La preferencia pertenece al navegador, su perfil y el origen de la aplicación (protocolo, host y puerto). Por ejemplo, `localhost:5173`, `127.0.0.1:5173` y `127.0.0.1:4173` tienen almacenamientos separados. Para restaurar la elección, hay que volver a la misma dirección. No se sincroniza entre dispositivos; borrar los datos del sitio elimina la preferencia y una sesión privada puede descartarla al cerrarse.

Sin preferencia guardada, con un valor desconocido o si no puede leerse el almacenamiento, se usa Original. Si falla la escritura, el cambio sigue funcionando durante la sesión y el selector muestra un aviso. Las preferencias se guardan fuera del prefijo de caché, por lo que la recuperación de espacio que elimina caché de PokéAPI no las elimina.

## Comprobaciones realizadas

La última comprobación de código de esta conversación, después de la corrección del catálogo, terminó con:

- `npm test`: 167 pruebas correctas.
- `npm run lint`: correcto.
- `npm run build`: correcto.
- Chrome headless contra `npm run dev`, mediante `node artifacts/check-themes.mjs`: los cuatro temas a 1280, 390 y 320 px, cambio inmediato de paleta, restauración del selector y del tema al recargar, recuperación de una preferencia inválida, colores de tipos conservados y ausencia de desbordamiento horizontal de la página.

La comprobación posterior de persistencia volvió a ejecutar el script de navegador y pasó para los cuatro temas. Se inspeccionaron visualmente las capturas del tema claro a 390 px, del oscuro a 1280 px y de Fiesta a 390 px. La tabla de tipos mantiene su desplazamiento horizontal interno en móvil.

Se utilizó una colección manual sintética con Dewott, sin sprites ni solicitudes reales a PokéAPI. No se accedió a una partida real. Capturas: `artifacts/theme-{base,pokemon,pokemon-dark,fiesta}-{1280,390}.png`. La persistencia comprobada fue mediante recarga; no se simuló el cierre y la reapertura completa del navegador.

Esta actualización de documentación no volvió a ejecutar las pruebas de código ni el navegador.
