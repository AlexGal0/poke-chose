# Recorrido y obtenciones de X

El adaptador `src/games/x/encounters.ts` compone 66 destinos: las zonas con encuentros de PokéAPI, ciudades y puntos del recorrido, y una entrada para los personajes itinerantes de hoteles. Se omiten alias de rutas y puertas duplicadas. El orden es fijo: no determina la posición ni el progreso de la partida.

Las ciudades sin datos muestran un aviso explícito, no una lista inventada. Los intercambios NPC incluyen especie solicitada, nivel y requisitos. Los regalos conservan las elecciones exclusivas y sus instrucciones; no se dibuja una probabilidad aleatoria. Las marcas de captura siguen siendo las de la Pokédex, por lo que una especie capturada no demuestra que se haya realizado un intercambio concreto.

Fuentes: [PokéAPI](https://pokeapi.co/docs/v2#locations), [intercambios](https://www.serebii.net/xy/ingametrade.shtml), [regalos](https://www.serebii.net/xy/gift.shtml). Se conserva el catálogo de encuentros original; el adaptador añade navegación e instrucciones sin modificarlo. Los fósiles se muestran en la zona donde se eligen, con la indicación de revivirlos en Pueblo Petroglifo. No se incluyen distribuciones temporales.

Para actualizar los metadatos de localidades y las especies adicionales: `node --experimental-strip-types scripts/update-x-localities.mjs`. El componente compartido solo conoce instrucciones y fuentes normalizadas; el recorrido y los requisitos permanecen en el adaptador de X. Black conserva su módulo existente.
