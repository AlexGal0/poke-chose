> Revisión documental: 14 de noviembre de 2026. [Índice](README.md) · [Estado actual](project-status.md) · [Contratos vigentes](adapter-contracts.md).
>
> **Alcance actualizado:** La pantalla está implementada para X/Y y es opcional por servicio, sin obligación para otros juegos ni flag nuevo en `GameModule`. Usa inventario confirmado y propiedad actual; falta de Pokémon mantiene identidad oculta y bloquea la mega. Los fondos conocidos siguen el tipo principal y los desconocidos conservan el fondo neutro. Véanse [contratos](adapter-contracts.md) y [estado actual](project-status.md).
>
> El contenido de la entrega original se conserva abajo. Sus pasos, pruebas, capturas y decisiones pendientes corresponden a esa fecha; no sustituyen el estado actual ni son comprobaciones repetidas en esta revisión.

## Registro de implementación y evidencia original

# Megapiedras

En X e Y, **Herramientas → Megapiedras** relaciona las piedras de la bolsa y las
equipadas con los Pokémon actuales del equipo y las cajas. La vista inicial
muestra solo las piedras que tienes; el filtro permite consultar todas las
compatibles. Una especie capturada en el pasado no cuenta como propiedad actual.
Los huevos tampoco desbloquean la vista.

Con piedra y Pokémon confirmados, el botón de la piedra al pie del marco abre
la megaevolución en grande, tipos y comparación de las seis estadísticas base.
La tabla incluye valores, diferencias negativas y totales. Sin el Pokémon se
conserva su nombre, se oculta su imagen y se deshabilita la piedra. Sin lectura
válida, no se presupone una bolsa o colección vacía. Las lecturas desactualizadas
no desbloquean la mega. Manual permite consultar el catálogo, pero necesita una
fuente Save o En vivo para confirmar el inventario; no hay marcas manuales de
posesión de piedras.

## Contrato y adaptadores

`src/games/core/mega-evolutions.ts` define `MegaEvolutionService`, las formas
normalizadas y `MegaInventory`. `GameWorkspace` recibe opcionalmente el servicio
`megaEvolutions`: sin él no ofrece la pestaña y descarta una pestaña mega
persistida. Black no implementa el contrato. X e Y inyectan el mismo adaptador
XY, sin importaciones específicas de juegos en la pantalla compartida.

El adaptador limita el catálogo a 28 formas publicadas en XY, incluida Blaziken
de evento. No incluye formas de ORAS ni Latias/Latios inéditos en XY. Admite
ambas piedras X/Y en cualquiera de las versiones, pues se pueden intercambiar.
El importador `scripts/import-xy-mega.mjs` obtiene nombres ES/EN, índices de
inventario, estadísticas históricas Gen VI y arte desde PokéAPI. Los recursos
quedan locales; su procedencia se conserva en `public/mega-evolutions/README.md`.
Mega-Alakazam usa Defensa Especial 95 y aumento total 90 en XY.

Se reutiliza la lectura normalizada de inventario ya disponible para evoluciones:
bolsa y equipados pertenecen al mismo snapshot. Esta es una dependencia
deliberada de la composición de X/Y; el contrato de la pantalla admite cualquier
otra fuente que entregue esas cantidades. No simula el combate ni verifica
Megaaro, progreso de historia, habilidades o disponibilidad de intercambio.

## Validación del 10 de noviembre de 2026

- Pruebas: propiedad actual, huevos, piedras en bolsa/equipadas, datos desconocidos
  o desactualizados, formas XY, variantes X/Y, cancelación, localización y estadísticas históricas.
- Navegador, Y real en Save y En vivo: Blastoisita y Aerodactylita sin sus Pokémon
  quedan bloqueadas; Lucarita equipada y Lucario desbloquean Mega-Lucario.
- Comparación 525 → 625, Escape y retorno del foco; inglés y español; diálogo
  móvil de 390 × 844 sin desbordamiento horizontal (clientWidth = scrollWidth).
- X: acceso visible y datos desconocidos explícitos sin lectura disponible.
  Black: acceso ausente. Se restauraron Y, español y fuente En vivo.

## Identidad durante el combate

El equipo de memoria puede conservar la forma normal mientras su copia de
combate ya está megaevolucionada. El lector XY admite esa transición solo tras
confirmar la identidad PK6, las dos copias del campo y la megapiedra compatible
equipada. Las formas arbitrarias o piedras incompatibles siguen sin confirmarse.
La sesión compartida enlaza el participante activo con el equipo por identidad,
propietario y especie, aunque cambie de forma; no hereda estadísticas de un
ocupante de otra forma ante una lectura incompleta.

Validación real en Y: Mega-Lucario 57, 146/165 PS, frente a Meowstic 44,
120/128 PS. El aviso de lectura parcial desapareció y se mostraron la forma
mega y las etapas actuales. El archivo de guardado no cambió durante la lectura.
