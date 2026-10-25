import { GenerationBadge } from '../../components/GenerationBadge'
import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SavedRosterPokemon, SavedRosterService } from './saved-roster'
import { DiscoveryContext } from '../../components/discovery-context'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import { TypeBadge } from '../../components/TypeBadge'
import { GenderBadge } from './GenderBadge'
import { experienceProgress } from '../../domain/experience'
import '../../components/TeamVitals.css'
import { KnowledgeActions } from './KnowledgeActions'
import { RosterEvolutionProgress } from './RosterEvolutionProgress'
import { EggHatching } from './EggHatching'

export function SavedRosterCard({ pokemon, service }: { pokemon: SavedRosterPokemon; service: SavedRosterService }) {
  const { t, i18n } = useTranslation()
  const discovered = useContext(DiscoveryContext).has(pokemon.id)
  const detailsKey = JSON.stringify([pokemon.moveIds, pokemon.abilityId, pokemon.heldItemId, i18n.language])
  const [description, setDescription] = useState<{ key: string; value: Awaited<ReturnType<SavedRosterService['describe']>> | null } | null>(null)
  const details = description?.key === detailsKey ? description.value : null
  const detailsError = description?.key === detailsKey && description.value === null
  useEffect(() => {
    if (pokemon.isEgg) return
    const controller = new AbortController()
    service.describe(pokemon, i18n.language, controller.signal).then(value => { if (!controller.signal.aborted) setDescription({ key: detailsKey, value }) })
      .catch(() => { if (!controller.signal.aborted) setDescription({ key: detailsKey, value: null }) })
    return () => controller.abort()
  }, [pokemon, service, i18n.language, detailsKey])
  const member = pokemon.partyMember
  const hpKnown = member?.currentHp !== undefined && member.maxHp !== undefined && member.maxHp > 0
  const fainted = !pokemon.isEgg && hpKnown && member?.currentHp === 0
  const hpRatio = hpKnown ? member!.currentHp! / member!.maxHp! : 0
  const exp = member?.experience !== undefined && pokemon.experienceLevels ? experienceProgress(member.level, member.experience, pokemon.experienceLevels) : null
  return <article className={`pokemon-card saved-roster-card ${fainted ? 'fainted' : ''}`}>
    {!pokemon.isEgg && <GenerationBadge speciesId={pokemon.id} />}
    <div className="roster-card-heading">{!pokemon.isEgg && <><span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span><div className="roster-card-tools"><RosterEvolutionProgress pokemon={pokemon} service={service} /><GenderBadge kind={pokemon.gender} /></div></>}</div>
    <div className="sprite">{pokemon.isEgg ? <span aria-label={t('app.team.eggLabel')}>🥚</span> : discovered && pokemon.sprite ? <img src={pokemon.sprite} alt="" width="96" height="96" loading="lazy" /> : <span aria-label={t('pokemonCard.notDiscovered')}>?</span>}</div>
    <div className="saved-roster-name"><h3 className={pokemon.nickname ? 'pokemon-nickname' : undefined}>{pokemon.isEgg ? t('app.team.eggLabel') : pokemon.nickname || pokemonDisplayName(pokemon.name)}</h3>
    {!pokemon.isEgg && <p className="pokemon-species-name">{pokemon.nickname ? pokemonDisplayName(pokemon.name) : <span aria-hidden="true">&nbsp;</span>}</p>}
      {!pokemon.isEgg && <p className="roster-held-item" title={detailsError ? t('individualDetails.itemUnavailable') : details ? details.item || t('heldItem.none') : t('individualDetails.itemLoading')}>{detailsError ? t('individualDetails.itemUnavailable') : details ? details.item || t('heldItem.none') : t('individualDetails.itemLoading')}</p>}</div>
    {pokemon.isEgg && <EggHatching cycles={pokemon.hatchCyclesRemaining} initialCycles={pokemon.hatchCycles} stepsPerCycle={service.hatching?.stepsPerCycle} inParty={pokemon.location === 'party'} />}
    {!pokemon.isEgg && <>
      <div className="saved-identity">
        <strong>{pokemon.level !== null ? t('saveCollection.memberLevel', { level: pokemon.level }) : t('saveCollection.levelUnavailable')}</strong>
      </div>
      <div className="types">{pokemon.types.map(type => <TypeBadge key={type} type={type} />)}</div>
      <p className="roster-condition">{fainted ? '✕ ' + t('pokemonCard.fainted') : <span aria-hidden="true">&nbsp;</span>}</p>
      {member && <div className="team-vitals"><div className="vital-label"><span>{t('common.hpAbbr')}</span><span>{hpKnown ? `${member.currentHp} / ${member.maxHp}` : t('teamVitals.noData')}</span></div>
        <progress className={`vital-bar hp-bar ${hpRatio <= 0.2 ? 'low' : hpRatio <= 0.5 ? 'medium' : ''}`} aria-label={t('common.hpAria')} value={hpKnown ? member.currentHp : 0} max={hpKnown ? member.maxHp : 1} />
        <div className="vital-label"><span>EXP</span><span>{exp ? member.level === 100 ? t('teamVitals.maxLevel') : t('teamVitals.remainingToLevelUp', { count: exp.remaining.toLocaleString(i18n.language) }) : t('teamVitals.noData')}</span></div>
        <progress className={`vital-bar exp-bar ${exp ? '' : 'unavailable'}`} aria-label={t('teamVitals.expAria')} value={exp?.value ?? 0} max={exp?.max ?? 1} />
      </div>}
      <KnowledgeActions pokemon={pokemon} individual={{ pokemon, service }} />
    </>}
    <p className="hint">{t(pokemon.location === 'party' ? 'saveCollection.memberPartySlot' : 'saveCollection.memberBoxSlot', { slot: pokemon.slot + 1, box: (pokemon.box ?? 0) + 1 })}</p>
  </article>
}
