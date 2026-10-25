import type { AlbumService } from '../core/album.ts'
import { getPokemon } from '../../api/pokeapi.ts'
import { getCardDescription } from '../../api/card-description.ts'
import { animatedBattleSprite } from '../../sources/battle-sprites.ts'

export const blackAlbum: AlbumService = {
  speciesIds: Array.from({ length: 156 }, (_, index) => index + 494),
  edition: 'Pokémon Black',
  region: 'Unova',
  columns: { landscape: 13, portrait: 6 },
  get: getPokemon,
  description: getCardDescription,
  animation: pokemon => animatedBattleSprite(pokemon.sprite),
}
