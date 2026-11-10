import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RosterIndividual, RosterDescription } from './saved-roster'
import type { BaseStats, Stat } from '../../domain/stats'
import { highestBaseStats, totalBaseStats, STATS } from '../../domain/stats'
import { statLabel } from '../../i18n/stats'
import { categoryLabel, moveDescription } from '../../i18n/moves'
import { NatureInfo } from '../../components/NatureInfo'
import { StatsRadar } from '../../components/StatsRadar'
import { TypeBadge } from '../../components/TypeBadge'

function useDescription(individual: RosterIndividual) {
  const { i18n } = useTranslation()
  const { pokemon, service } = individual
  const [result, setResult] = useState<{ key: string; value: RosterDescription } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const key = JSON.stringify([pokemon.moveIds, pokemon.abilityId, pokemon.heldItemId, i18n.language])
  useEffect(() => {
    const controller = new AbortController()
    service.describe(pokemon, i18n.language, controller.signal).then(value => {
      if (!controller.signal.aborted) { setResult({ key, value }); setError(false) }
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [service, pokemon, i18n.language, key, attempt])
  return { value: result?.key === key ? result.value : null, error, retry: () => { setError(false); setAttempt(value => value + 1) } }
}

export function IndividualStats({ individual, base }: { individual: RosterIndividual; base: BaseStats }) {
  const { t } = useTranslation()
  const [active, setActive] = useState<Stat | null>(null)
  const description = useDescription(individual)
  const pokemon = individual.pokemon
  const current = pokemon.partyMember?.currentStats
  const max = Math.max(255, ...Object.values(current ?? {}))
  return <>
    <div className="individual-overview"><NatureInfo natureId={pokemon.natureId} /><p><strong>{t('savedRoster.ability')}: </strong>{description.value?.ability || '—'}</p></div>
    <p className="hint">{t('statistics.hpReading', { current: pokemon.partyMember?.currentHp ?? t('statistics.unavailable'), max: pokemon.partyMember?.maxHp ?? t('statistics.unavailable') })}</p>
    <p className="hint">{t('statistics.total')}: {totalBaseStats(base)} · {t('statistics.strengthsHeading')}: {highestBaseStats(base).map(stat => statLabel(t, stat)).join(' · ')}</p>
    {description.value?.abilityError && <p role="alert">{t('savedRoster.detailsError')} <button onClick={description.retry}>{t('common.retry')}</button></p>}
    {!current && <p className="notice">{t('statistics.comparisonBoxHint')}</p>}
    <div className="knowledge-stats-layout"><div><div className="individual-stat-head"><span>{t('statistics.series.base')}</span><strong>{t('statistics.series.current')}</strong></div>
      <dl className="knowledge-stats individual-stats">{STATS.map(stat => <div key={stat} onMouseEnter={() => setActive(stat)} onMouseLeave={() => setActive(null)}>
        <dt>{statLabel(t, stat)}</dt><dd><span>{base[stat]}</span><meter min="0" max={max} value={current?.[stat] ?? 0} aria-label={statLabel(t, stat)} /><strong>{current?.[stat] ?? '—'}</strong></dd>
      </div>)}</dl></div>
      <StatsRadar base={base} current={current} individual max={max} activeStat={active} onHoverStat={setActive} onFocusStat={setActive} />
    </div>
  </>
}

export function IndividualMoves({ individual }: { individual: RosterIndividual }) {
  const { t } = useTranslation()
  const description = useDescription(individual)
  if (description.error || description.value?.knownMovesError) return <p className="notice" role="alert">{t('savedRoster.detailsError')} <button onClick={description.retry}>{t('common.retry')}</button></p>
  if (!description.value) return <p role="status">{t('savedRoster.loading')}</p>
  const moves = description.value.knownMoves
  if (!moves) return <p className="notice">{t('individualDetails.movesUnavailable')}</p>
  return <><p className="hint">{t('individualDetails.ppHint')}</p>{moves.length ? <div className="table-scroll"><table className="moves-table individual-moves-table">
    <caption className="sr-only">{t('individualDetails.knownMoves')}</caption>
    <thead><tr>{['move', 'type', 'category', 'pp'].map(key => <th scope="col" key={key}>{t(`movesDialog.table.${key}`)}</th>)}<th scope="col">{t('individualDetails.power')}</th><th scope="col">{t('individualDetails.accuracy')}</th><th scope="col">{t('movesDialog.table.description')}</th></tr></thead>
    <tbody>{moves.map(move => <tr key={move.slot}><th scope="row" data-label={t('movesDialog.table.move')}>{move.name}</th><td data-label={t('movesDialog.table.type')}>{move.type ? <TypeBadge type={move.type} /> : '—'}</td><td data-label={t('movesDialog.table.category')}>{categoryLabel(t, move.categoryId)}</td><td data-label={t('movesDialog.table.pp')}>{move.pp}</td><td data-label={t('individualDetails.power')}>{move.power ?? '—'}</td><td data-label={t('individualDetails.accuracy')}>{move.accuracy === null ? '—' : `${move.accuracy}%`}</td><td className="move-description" data-label={t('movesDialog.table.description')}>{moveDescription(t, move)}</td></tr>)}</tbody>
  </table></div> : <p>{t('movesDialog.noMoves')}</p>}</>
}
