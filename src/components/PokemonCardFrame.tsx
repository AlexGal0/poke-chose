import type { ReactNode } from 'react'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { DiscoveryContext } from './discovery-context'
import { GenerationBadge } from './GenerationBadge'
import { TypeBadge } from './TypeBadge'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { CombatSpecies } from '../models/combat'
import './PokemonCard.css'

export function PokemonCardFrame({ pokemon, tools, children, footer, sprite, onSpriteClick, selected = false, captured = false, fainted = false }: {
  pokemon: CombatSpecies & { nickname?: string | null; isEgg?: boolean }; tools?: ReactNode; children?: ReactNode; footer?: ReactNode
  onSpriteClick?: () => void; selected?: boolean; captured?: boolean; fainted?: boolean; sprite?: ReactNode
}) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext).has(pokemon.id)
  return <article className={`pokemon-card ${selected ? 'selected' : ''} ${captured ? 'captured' : ''} ${fainted ? 'fainted' : ''}`}>
    {!pokemon.isEgg && <GenerationBadge speciesId={pokemon.id} />}
    <span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span>
    <div className="card-tools">{tools}</div>
    {selected && <span className="in-team">{t('pokemonCard.inTeam')}</span>}
    {fainted && <span className="fainted-status">{t('pokemonCard.fainted')}</span>}
    {onSpriteClick ? <button type="button" className={`sprite sprite-button ${discovered ? '' : 'undiscovered'}`} onClick={onSpriteClick} aria-label={t('acquisitionDetails.open', { name: pokemonDisplayName(pokemon.name) })}>{discovered && pokemon.sprite ? <img src={pokemon.sprite} alt={pokemonDisplayName(pokemon.name)} width="96" height="96" loading="lazy" /> : <span>?</span>}</button> : <div className={`sprite ${discovered ? '' : 'undiscovered'}`}>{discovered && pokemon.sprite ? sprite ?? <img src={pokemon.sprite} alt={pokemonDisplayName(pokemon.name)} width="96" height="96" loading="lazy" /> : <span aria-label={discovered ? t('pokemonCard.spriteUnavailable') : t('pokemonCard.notDiscovered')}>?</span>}</div>}
    <div className="pokemon-identity"><h3 className={pokemon.nickname ? 'pokemon-nickname' : undefined}>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</h3>{pokemon.nickname && <p className="pokemon-species-name">{pokemonDisplayName(pokemon.name)}</p>}</div>
    <div className="types">{pokemon.types.map(type => <TypeBadge key={type} type={type} />)}</div>
    <div className="card-actions">{children}</div>{footer}
  </article>
}
