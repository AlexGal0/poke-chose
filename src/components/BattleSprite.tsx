import { useState } from 'react'
import type { CombatSpecies } from '../models/combat'
import { pokemonDisplayName } from '../domain/pokemon-names'

export function BattleSprite({ pokemon, fainted }: { pokemon: CombatSpecies; fainted: boolean }) {
  const [failed, setFailed] = useState<string | null>(null)
  const animation = pokemon.animatedSprite
  const src = !fainted && animation && failed !== animation ? animation : pokemon.sprite
  if (!src) return null
  return <picture>
    {pokemon.sprite && <source media="(prefers-reduced-motion: reduce)" srcSet={pokemon.sprite} />}
    <img src={src} alt={pokemonDisplayName(pokemon.name)} width="128" height="128" onError={() => { if (animation && src === animation) setFailed(animation) }} />
  </picture>
}
