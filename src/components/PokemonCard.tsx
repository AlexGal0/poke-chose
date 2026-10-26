import { PokemonCardFrame } from './PokemonCardFrame'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { StatsPokemon } from './stats-context'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { EvolutionButton } from './EvolutionButton'
import { GenderIcon } from './GenderIcon'
import { MovesContext } from './moves-context'
import { StatsContext } from './stats-context'
import { NatureIndicator } from './NatureIndicator'
import './PokemonCard.css'
import { PokedexScopeBadge } from './PokedexScopeBadge'

export function PokemonCard({ pokemon, children, footer, tools, selected = false, captured = false, fainted = false, showEvolution = true, showGender = false, showMoves = false, showPokedexScope = false, onSpriteClick, spriteActionLabel }: {
  pokemon: StatsPokemon
  children?: React.ReactNode
  footer?: React.ReactNode
  tools?: React.ReactNode
  selected?: boolean
  captured?: boolean
  fainted?: boolean
  showEvolution?: boolean
  showGender?: boolean
  showMoves?: boolean
  showPokedexScope?: boolean
  spriteActionLabel?: string
  onSpriteClick?: () => void
}) {
  const { t } = useTranslation()
  const openMoves = useContext(MovesContext)
  const openStats = useContext(StatsContext)
  return <PokemonCardFrame pokemon={pokemon} selected={selected} captured={captured} fainted={fainted} footer={footer} onSpriteClick={onSpriteClick} spriteActionLabel={spriteActionLabel} tools={<>
      {showGender && <GenderIcon speciesId={pokemon.id} />}
      {openStats && !pokemon.isEgg && <button type="button" className="stats-icon" onClick={() => openStats(pokemon)} aria-label={t('statistics.buttonAria', { name: pokemonDisplayName(pokemon.name) })} title={t('statistics.button')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V10h3v10M11 20V4h3v16M17 20v-7h3v7M3 20h19" /></svg>
      </button>}
      {!pokemon.isEgg && (pokemon.speciesId !== undefined || pokemon.natureId !== undefined) && <NatureIndicator natureId={pokemon.natureId} />}
      {tools}
      {showPokedexScope && !pokemon.isEgg && <PokedexScopeBadge speciesId={pokemon.speciesId ?? pokemon.id} />}
    </>}>
    {children}{showMoves && <button type="button" className="moves-button" onClick={() => openMoves(pokemon)} aria-label={t('pokemonCard.movesAria', { name: pokemon.nickname || pokemonDisplayName(pokemon.name) })}>{t('pokemonCard.movesButton')}</button>}{showEvolution && <EvolutionButton speciesId={pokemon.id} name={pokemonDisplayName(pokemon.name)} />}
  </PokemonCardFrame>
}
