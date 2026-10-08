import { pokemonDisplayName } from '../domain/pokemon-names'
import type { StatsPokemon } from './stats-context'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { DiscoveryContext } from './discovery-context'
import { TypeBadge } from './TypeBadge'
import { EvolutionButton } from './EvolutionButton'
import { GenderIcon } from './GenderIcon'
import { MovesContext } from './moves-context'
import { StatsContext } from './stats-context'
import { NatureIndicator } from './NatureIndicator'
import './PokemonCard.css'

export function PokemonCard({ pokemon, children, footer, tools, selected = false, captured = false, fainted = false, showEvolution = true, showGender = false, showMoves = false }: {
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
}) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext).has(pokemon.id)
  const openMoves = useContext(MovesContext)
  const openStats = useContext(StatsContext)
  return <article className={`pokemon-card ${selected ? 'selected' : ''} ${captured ? 'captured' : ''} ${fainted ? 'fainted' : ''}`}>
    <span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span>
    <div className="card-tools">
      {showGender && <GenderIcon speciesId={pokemon.id} />}
      {openStats && !pokemon.isEgg && <button type="button" className="stats-icon" onClick={() => openStats(pokemon)} aria-label={t('statistics.buttonAria', { name: pokemonDisplayName(pokemon.name) })} title={t('statistics.button')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V10h3v10M11 20V4h3v16M17 20v-7h3v7M3 20h19" /></svg>
      </button>}
      {!pokemon.isEgg && (pokemon.speciesId !== undefined || pokemon.natureId !== undefined) && <NatureIndicator natureId={pokemon.natureId} />}
      {tools}
    </div>
    {selected && <span className="in-team">{t('pokemonCard.inTeam')}</span>}
    <div className={`sprite ${discovered ? '' : 'undiscovered'}`}>{discovered && pokemon.sprite ? <img src={pokemon.sprite} alt={pokemonDisplayName(pokemon.name)} width="96" height="96" loading="lazy" /> : <span aria-label={discovered ? t('pokemonCard.spriteUnavailable') : t('pokemonCard.notDiscovered')}>?</span>}</div>
    <div className="pokemon-identity">
      <h3 className={pokemon.nickname ? 'pokemon-nickname' : undefined}>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</h3>
      {pokemon.nickname && <p className="pokemon-species-name">{pokemonDisplayName(pokemon.name)}</p>}
    </div>
    <div className="types">{pokemon.types.map(type => <TypeBadge key={type} type={type} />)}</div>
    {fainted && <span className="fainted-status">{t('pokemonCard.fainted')}</span>}
    <div className="card-actions">{children}{showMoves && <button type="button" className="moves-button" onClick={() => openMoves(pokemon)} aria-label={t('pokemonCard.movesAria', { name: pokemon.nickname || pokemonDisplayName(pokemon.name) })}>{t('pokemonCard.movesButton')}</button>}{showEvolution && <EvolutionButton speciesId={pokemon.id} name={pokemonDisplayName(pokemon.name)} />}</div>
    {footer}
  </article>
}
