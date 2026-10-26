# Combate individual contra entrenadores en X

## Causa encontrada

El lector usaba la primera entrada de cada una de las dos copias del equipo rival como si siempre fuera el Pokémon activo. En el combate real revisado, esa entrada era Doduo (nivel 24), pero el participante activo era Helioptile (nivel 25), en el tercer espacio. Las copias de estado del campo indicaban especie 694 y 25/61 PS, por lo que el rechazo «Unconfirmed X rival» era correcto ante la identidad elegida erróneamente.

## Corrección del adaptador

Se reutiliza `readXMemoryParty` con dos perfiles locales del equipo enemigo. En la sesión validada sus primeros núcleos PK6 están en `0x081FEBA0` y `0x081FF744`, con objetos de 484 bytes, núcleo a +64 y estadísticas separadas a +344. La tabla comienza 0x8c bytes antes del primer núcleo; su contador está 24 bytes después de la tabla. Se validaron ambos contadores (tres miembros), punteros, identidades y copias contra Citra.

El lector comprueba las dos tablas y busca un único rival por especie y PS máximos, según el estado activo del campo. Exige coincidencia de sus datos en ambas copias, mantiene doble muestreo y vuelve a comprobar las cabeceras del combate. El nivel procede del registro de equipo; los PS actuales y niveles de estadísticas proceden del campo, no de las copias iniciales del equipo. El espacio enemigo se transmite en `partySlot`, ya admitido por `BattleReading`.

Si dos rivales coinciden en especie y PS máximos y no pueden distinguirse, la lectura sigue sin confirmarse. No se elige uno por posición ni por orden. El soporte se limita al perfil local validado y combate individual; no se afirma compatibilidad con dobles u hordas ni otras revisiones.

## Validación

- Citra real, lectura acotada y sin dumps: Helioptile, nivel 25, tercer espacio del rival, 25/61 PS; Honedge propio, 70/89 PS. Confirmación visual del usuario de especie y nivel.
- Fixtures sintéticos: salvaje, tercer miembro de entrenador, cambio de rival, equipos ambiguos, contadores inconsistentes, corrupción y tablas que cambian durante la lectura.
- `npm test`: 429 pruebas correctas. `npm run build` y `npm run lint`: correctos.
- `scripts/probe-citra-x-battle.ts` muestra tablas confirmadas y metadatos normalizados; no guarda memoria en bruto ni escribe en el juego.

Tras reiniciar los servicios locales, se verificó la pantalla real con «Ambos Pokémon detectados»: Honedge 70/89 PS y Helioptile nivel 25, 25/61 PS. Evidencia: `artifacts/x-trainer-battle-helioptile.png`. No se efectuaron escrituras de memoria ni modificaciones del save.
