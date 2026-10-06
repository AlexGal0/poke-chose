*English version: [../acquisition.md](../acquisition.md)*

# Iconos de obtención y descubrimiento

Los iconos describen vías para conseguir una especie en Pokémon Black, no el origen del ejemplar del usuario ni su disponibilidad inmediata. Se pueden mostrar varias vías. No se usa el filtro personal de Surf/Supercaña para decidir si una especie es capturable en el juego.

## Datos y límites

- [PokéAPI](https://pokeapi.co/docs/v2#pokemon-location-areas): `/pokemon/{id}/encounters`, filtrado exacto por `version.name === 'black'`. Se consulta la variedad predeterminada de la especie. Otras variedades pueden contener encuentros adicionales; la ausencia de datos permanece sin confirmar.
- [Cadenas evolutivas](https://pokeapi.co/docs/v2#evolution-chains): reutilizan el adaptador histórico Gen V del proyecto, sin descargar sprites de toda la familia para los iconos. Evolución por intercambio se distingue del intercambio con un personaje y de traer una especie desde otro juego.
- La cría se indica para especies base con grupos de huevo compatibles y para Phione. No calcula disponibilidad de padres, incienso, parejas especiales ni todas las crías de especies bebé. No representa una lista exhaustiva de obtención.
- Una vía directa ausente genera el icono «Obtención sin confirmar», incluso si existe evolución. Nunca se convierte automáticamente en «solo por evolución» o «solo por intercambio».
- Las respuestas se cachean en localStorage. Se consultan como máximo cuatro especies de la página visible a la vez; al cambiar de página se cancelan las consultas anteriores. Un error ofrece reintento independiente.

## Complementos locales

Estos complementos no pretenden enumerar todas las excepciones del catálogo nacional:

- [Fósiles en BW](https://www.wikidex.net/wiki/F%C3%B3sil): Omanyte, Kabuto, Aerodactyl, Lileep, Anorith, Cranidos, Shieldon, Tirtouga y Archen. Se distinguen de los regalos genéricos. Las elecciones y el progreso siguen aplicándose.
- [Solosis](https://www.wikidex.net/wiki/Solosis) y su familia, y [Rufflet](https://www.wikidex.net/wiki/Rufflet) y Braviary: origen externo para Black. Una evolución posterior puede seguir necesitando traer primero su familia.
- [Thundurus](https://www.wikidex.net/wiki/Thundurus) y [Zekrom](https://www.wikidex.net/wiki/Zekrom): origen externo y distribuciones especiales para Black.
- [Eventos de quinta generación](https://www.wikidex.net/wiki/Lista_de_eventos_de_la_quinta_generaci%C3%B3n): Victini, Keldeo, Meloetta y Genesect llevan icono de evento. No se garantiza acceso actual a distribuciones históricas.

## Imágenes

La unión de flags vistos y capturados revela sprites en modo save. Una Pokédex desconocida no revela ninguna imagen. Se aplica a `PokemonCard`, incluido el diálogo de evoluciones, el equipo y la colección del save. Los pequeños iconos de la checklist siguen requiriendo captura. Se mantiene la marca verde basada en capturas/colección: visto no equivale a capturado.

En Manual, la colección indica especies descubiertas; no se crea un registro de vistas separado. Los nombres y tipos permanecen visibles, y el marcador de una imagen desconocida es un signo de interrogación genérico, no una silueta del sprite.

## Validación de esta modificación

Pruebas de dominio y API con fixtures controlados verifican versión exacta, múltiples vías, intercambios, incertidumbre y descubrimiento. En Chrome se comprobaron imágenes vistas/capturadas/desconocidas, Pokédex desconocida, revelado manual, árbol de evolución y actualización de flags sin recargar; hover y foco de iconos, reintento y tamaños de 1280 y 390 px. Se usaron datos sintéticos, sin abrir el save personal. Las capturas `artifacts/catalog-mystery-1280.png` y `artifacts/catalog-mystery-390.png` contienen esos datos controlados, no disponibilidad real de las especies.
