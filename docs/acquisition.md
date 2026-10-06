*Versión en español: [es/acquisition.md](es/acquisition.md)*

# Acquisition and discovery icons

The icons describe ways to obtain a species in Pokémon Black, not the origin of the user's own specimen or its immediate availability. Several icons can be shown at once. The personal Surf/Super Rod filter is never used to decide whether a species can be caught in the game.

## Data and limits

- [PokéAPI](https://pokeapi.co/docs/v2#pokemon-location-areas): `/pokemon/{id}/encounters`, filtered exactly by `version.name === 'black'`. The species' default variety is queried. Other varieties may contain additional encounters; the absence of data remains unconfirmed.
- [Evolution chains](https://pokeapi.co/docs/v2#evolution-chains): reuse the project's existing Gen V adapter, without downloading sprites for the whole family just for the icons. Trade evolution is distinguished from trading with an NPC and from bringing a species in from another game.
- Breeding is shown for base species with compatible egg groups and for Phione. It does not compute parent availability, Incense, special pairings, or every baby species' offspring. It is not an exhaustive list of acquisition methods.
- A missing direct route produces the "Unconfirmed acquisition" icon, even if an evolution exists. It is never automatically turned into "evolution only" or "trade only".
- Responses are cached in localStorage. At most four species from the visible page are queried at a time; changing page cancels the previous queries. An error offers an independent retry.

## Local add-ons

These add-ons do not aim to list every exception in the national catalog:

- [Fossils in BW](https://www.wikidex.net/wiki/F%C3%B3sil): Omanyte, Kabuto, Aerodactyl, Lileep, Anorith, Cranidos, Shieldon, Tirtouga, and Archen. They are distinguished from generic gifts. Choices and progress still apply.
- [Solosis](https://www.wikidex.net/wiki/Solosis) and its family, and [Rufflet](https://www.wikidex.net/wiki/Rufflet) and Braviary: external origin for Black. A later evolution may still require bringing its family in first.
- [Thundurus](https://www.wikidex.net/wiki/Thundurus) and [Zekrom](https://www.wikidex.net/wiki/Zekrom): external origin and special distributions for Black.
- [Generation V events](https://www.wikidex.net/wiki/Lista_de_eventos_de_la_quinta_generaci%C3%B3n): Victini, Keldeo, Meloetta, and Genesect carry an event icon. Current access to historical distributions is not guaranteed.

## Images

The union of seen and caught flags reveals sprites in Save mode. An unknown Pokédex entry reveals no image. This applies to `PokemonCard`, including the evolution dialog, the team, and the save's collection. The small checklist icons still require a capture. The green mark based on captures/collection is kept: seen does not equal caught.

In Manual mode, the collection indicates discovered species; no separate "seen" record is created. Names and types remain visible, and the placeholder for an unknown image is a generic question mark, not a sprite silhouette.

## Validation performed for this change

Domain and API tests with controlled fixtures verify exact version matching, multiple routes, trades, uncertainty, and discovery. In Chrome, seen/caught/unknown images, an unknown Pokédex, manual reveal, the evolution tree, and flag updates without reloading were checked; icon hover and focus, retry, and sizes at 1280 and 390 px. Synthetic data was used, without opening the personal save. The screenshots `artifacts/catalog-mystery-1280.png` and `artifacts/catalog-mystery-390.png` contain that controlled data, not real species availability.
