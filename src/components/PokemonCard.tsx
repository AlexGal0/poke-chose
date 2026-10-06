import { pokemonDisplayName } from '../domain/pokemon-names'
import type { Pokemon } from '../models/pokemon'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { DiscoveryContext } from './discovery-context'
import { TypeBadge } from './TypeBadge'
import { EvolutionButton } from './EvolutionButton'
import { GenderIcon } from './GenderIcon'
import { MovesContext } from './moves-context'
import './PokemonCard.css'

export function PokemonCard({ pokemon, children, footer, selected = false, captured = false, fainted = false, showEvolution = true, showGender = false, showMoves = false }: {
  pokemon: Pokemon
  children?: React.ReactNode
  footer?: React.ReactNode
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
  return <article className={`pokemon-card ${selected ? 'selected' : ''} ${captured ? 'captured' : ''} ${fainted ? 'fainted' : ''}`}>
    <span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span>
    {showGender && <GenderIcon speciesId={pokemon.id} />}
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
