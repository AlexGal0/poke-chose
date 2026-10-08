import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getBaseStats } from '../api/stats'
import { BASE_STAT_MAX, STATS, highestBaseStats, statsForm, totalBaseStats } from '../domain/stats'
import type { BaseStats, Stat } from '../domain/stats'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { statLabel, statsFormLabel } from '../i18n/stats'
import { natureDetails } from '../domain/nature'
import { natureEffectLabel } from '../i18n/nature'
import { findIndividual } from '../domain/individual-pokemon'
import type { TeamSourceState } from '../sources/team'
import { NatureInfo } from './NatureInfo'
import { StatsRadar } from './StatsRadar'
import { StatsContext } from './stats-context'
import type { StatsPokemon } from './stats-context'
import './Stats.css'

type Source = 'manual' | 'save' | 'live'

function StatsDialog({ pokemon, stale, missing, individual, onClose }: { pokemon: StatsPokemon; stale: boolean; missing: boolean; individual: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const outsideStart = useRef(false)
  const [stats, setStats] = useState<BaseStats | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [hoveredStat, setHoveredStat] = useState<Stat | null>(null)
  const [focusedStat, setFocusedStat] = useState<Stat | null>(null)
  const activeStat = hoveredStat ?? focusedStat
  const form = statsForm(pokemon.id, pokemon.form)
  const strengths = stats ? highestBaseStats(stats) : []
  const nature = individual ? natureDetails(pokemon.natureId) : null
  // Only the drawing scale adapts; stored statistics are never recalculated.
  const scaleMax = Math.max(BASE_STAT_MAX, ...(individual ? STATS.map(stat => pokemon.currentStats?.[stat] ?? (stat === 'hp' ? pokemon.maxHp : undefined) ?? 0) : []))
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    getBaseStats(pokemon.id, pokemon.form, controller.signal)
      .then(result => { if (!controller.signal.aborted) setStats(result) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [pokemon.id, pokemon.form, attempt])
  const outside = (event: React.PointerEvent<HTMLDialogElement> | React.MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
  }
  return <dialog ref={dialog} className="stats-dialog" aria-labelledby="stats-title" aria-describedby="stats-hint" onCancel={onClose} onPointerDown={event => { outsideStart.current = outside(event) }} onClick={event => { if (outsideStart.current && outside(event)) onClose(); outsideStart.current = false }}>
    <div className="stats-heading">
      <div><span className="eyebrow">{t(individual ? 'statistics.individualEyebrow' : 'statistics.eyebrow')}</span><h2 id="stats-title">{t('statistics.heading', { name: pokemonDisplayName(pokemon.name) })}</h2>{form && <p className="hint stats-form">{t('statistics.form', { name: statsFormLabel(t, form) })}</p>}</div>
      <button type="button" onClick={onClose} autoFocus aria-label={t('statistics.closeAria')}>✕</button>
    </div>
    <p id="stats-hint" className="hint">{t(individual ? 'statistics.comparisonHint' : 'statistics.hint')}</p>
    {individual && stale && <p role="status" className="notice">{t(missing ? 'statistics.missing' : 'statistics.stale')}</p>}
    <div className="stats-overview">
    {individual && <div>
      <NatureInfo natureId={pokemon.natureId} />
      <p className="stats-hp">{t('statistics.hpReading', { current: pokemon.currentHp ?? t('statistics.unavailable'), max: pokemon.maxHp ?? pokemon.currentStats?.hp ?? t('statistics.unavailable') })}</p>
    </div>}
    {stats && <section className="stats-strengths" aria-label={t('statistics.strengthsHeading')}>
      <p>{t('statistics.strengthsHeading')}</p>
      <ul>{strengths.map(stat => <li key={stat}><span aria-hidden="true">★</span> {statLabel(t, stat)} <strong>{stats[stat]}</strong></li>)}</ul>
      <p className="hint">{t('statistics.strengthsHint')}</p>
    </section>}
    </div>
    {!stats && !error && <p role="status" className="hint">{t('statistics.loading')}</p>}
    {error && <p role="alert" className="notice">{t('statistics.loadError')} <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    <div className="stats-charts">
    <div className="stats-table">
    <dl className="stats-comparison" aria-label={t(individual ? 'statistics.comparisonAria' : 'statistics.listAria')}>
      {STATS.map(stat => {
        const current = pokemon.currentStats?.[stat] ?? (stat === 'hp' ? pokemon.maxHp : undefined)
        const values = [{ kind: 'base', value: stats?.[stat] }, ...(individual ? [{ kind: 'current', value: current }] : [])]
        const primary = strengths.includes(stat)
        const effect = nature?.kind === 'changed' ? nature.increased === stat ? 'increased' : nature.decreased === stat ? 'decreased' : null : null
        return <div key={stat} tabIndex={0} onPointerEnter={() => setHoveredStat(stat)} onPointerLeave={() => setHoveredStat(null)} onFocus={() => setFocusedStat(stat)} onBlur={() => setFocusedStat(null)} className={`stats-comparison-row${primary ? ' stats-primary' : ''}${activeStat === stat ? ' stats-active' : ''}`}>
          <dt>{primary && <span className="stats-primary-star" aria-hidden="true">★ </span>}{statLabel(t, stat)}{primary && <span className="sr-only"> · {t('statistics.strength')}</span>}{effect && <span className={`stats-nature-arrow nature-${effect}`} role="img" aria-label={`${t('nature.heading')}: ${natureEffectLabel(t, effect, stat)}`} title={`${t('nature.heading')}: ${natureEffectLabel(t, effect, stat)}`}>{effect === 'increased' ? '↑' : '↓'}</span>}</dt>
          <dd>{values.map(({ kind, value }) => <div key={kind} className={`stats-series stats-series-${kind}`}>
            <span className="stats-series-label">{t(`statistics.series.${kind}`)}</span>
            <span className={`stats-track${value === undefined ? ' stats-track-missing' : ''}`} aria-hidden="true">{value !== undefined && <span className="stats-fill" style={{ width: `${value / scaleMax * 100}%` }} />}</span>
            <span className={`stats-value${value === undefined ? ' stats-value-missing' : ''}`}>{value ?? t('statistics.unavailable')}</span>
          </div>)}</dd>
        </div>
      })}
    </dl>
    {stats && <div className="stats-total"><span>{t('statistics.total')}</span><strong>{totalBaseStats(stats)}</strong></div>}
    </div>
    <StatsRadar base={stats} current={individual ? pokemon.currentStats : undefined} individual={individual} max={scaleMax} activeStat={activeStat} onHoverStat={setHoveredStat} onFocusStat={setFocusedStat} />
    </div>
    {individual && !pokemon.currentStats && <p className="notice">{t(pokemon.location === 'box' ? 'statistics.comparisonBoxHint' : 'statistics.incompleteHint')}</p>}
    <p className="hint stats-scale">{t('statistics.scale', { max: scaleMax })}{individual && <> {t('statistics.maxHpHint')}</>}</p>
    {individual && <p className="hint stats-battle-note">{t('statistics.battleHint')}</p>}
  </dialog>
}

export function StatsProvider({ children, source = 'manual', sourceState }: { children: ReactNode; source?: Source; sourceState?: TeamSourceState }) {
  const [selection, setSelection] = useState<{ pokemon: StatsPokemon; source: Source } | null>(null)
  const selected = selection?.pokemon
  const individual = !!selected && selection.source !== 'manual' && selected.personality !== undefined && selected.trainerId !== undefined && selected.speciesId !== undefined && !selected.isEgg
  const sameSource = selection?.source === source
  const candidate = individual && sameSource && sourceState ? findIndividual({ personality: selected.personality!, trainerId: selected.trainerId!, speciesId: selected.speciesId!, instanceKey: selected.instanceKey }, [...(sourceState.collection ?? sourceState.team)]) : undefined
  const current = candidate?.isEgg ? undefined : candidate
  const missing = individual && (!sameSource || !current)
  const pokemon = missing && selected ? { ...selected, level: null, natureId: undefined, currentHp: undefined, maxHp: undefined, currentStats: undefined } : current ?? selected
  const stale = missing || !sourceState?.connected || sourceState.error || sourceState.positionStale || sourceState.collectionLoading || sourceState.collectionError
  return <StatsContext.Provider value={pokemon => setSelection({ pokemon, source })}>{children}{pokemon && <StatsDialog key={`${selected?.instanceKey ?? selected?.id}-${pokemon.form ?? 0}`} pokemon={pokemon} stale={stale} missing={missing} individual={individual} onClose={() => setSelection(null)} />}</StatsContext.Provider>
}
