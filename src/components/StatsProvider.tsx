import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getBaseStats } from '../api/stats'
import { BASE_STAT_MAX, STATS, statsForm, totalBaseStats } from '../domain/stats'
import type { BaseStats } from '../domain/stats'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { statLabel, statsFormLabel } from '../i18n/stats'
import { findIndividual } from '../domain/individual-pokemon'
import type { TeamSourceState } from '../sources/team'
import { NatureInfo } from './NatureInfo'
import { StatsContext } from './stats-context'
import type { StatsPokemon } from './stats-context'
import './Stats.css'

type Source = 'manual' | 'save' | 'live'

function StatsDialog({ pokemon, source, stale, missing, updatedAt, individual, onClose }: { pokemon: StatsPokemon; source: Source; stale: boolean; missing: boolean; updatedAt: string | null; individual: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const outsideStart = useRef(false)
  const [stats, setStats] = useState<BaseStats | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [tab, setTab] = useState<'species' | 'individual'>(individual ? 'individual' : 'species')
  const form = statsForm(pokemon.id, pokemon.form)
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
      <div><span className="eyebrow">{t(tab === 'individual' ? 'statistics.individualEyebrow' : 'statistics.eyebrow')}</span><h2 id="stats-title">{t('statistics.heading', { name: pokemonDisplayName(pokemon.name) })}</h2>{form && <p className="hint stats-form">{t('statistics.form', { name: statsFormLabel(t, form) })}</p>}</div>
      <button type="button" onClick={onClose} autoFocus aria-label={t('statistics.closeAria')}>✕</button>
    </div>
    {individual && <div className="stats-tabs" role="tablist" aria-label={t('statistics.tabsAria')}>
      {(['species', 'individual'] as const).map((item, index) => <button key={item} id={`stats-tab-${item}`} type="button" role="tab" aria-selected={tab === item} aria-controls={`stats-panel-${item}`} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index
        setTab(next === 0 ? 'species' : 'individual')
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
        buttons?.[next].focus()
      }}>{t(`statistics.tabs.${item}`)}</button>)}
    </div>}
    <p id="stats-hint" className="hint">{t(tab === 'individual' ? 'statistics.individualHint' : 'statistics.hint')}</p>
    {individual && <section id="stats-panel-individual" role="tabpanel" aria-labelledby="stats-tab-individual" hidden={tab !== 'individual'} tabIndex={0}>
      <dl className="stats-details">
        <div><dt>{t('statistics.nickname')}</dt><dd>{pokemon.nickname || pokemonDisplayName(pokemon.name)}</dd></div>
        <div><dt>{t('statistics.level')}</dt><dd>{pokemon.level ?? t('statistics.unavailable')}</dd></div>
        <div><dt>{t('statistics.location')}</dt><dd>{pokemon.location === 'box' ? t('statistics.box', { box: (pokemon.box ?? 0) + 1, slot: (pokemon.slot ?? 0) + 1 }) : t('statistics.party', { slot: (pokemon.slot ?? 0) + 1 })}</dd></div>
        <div><dt>{t('statistics.source')}</dt><dd>{t(`statistics.sources.${source}`)}</dd></div>
        <div><dt>{t('statistics.lastRead')}</dt><dd>{updatedAt && Number.isFinite(Date.parse(updatedAt)) ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(updatedAt)) : t('statistics.unavailable')}</dd></div>
      </dl>
      {stale && <p role="status" className="notice">{t(missing ? 'statistics.missing' : 'statistics.stale')}</p>}
      <NatureInfo natureId={pokemon.natureId} />
      <h3>{t('statistics.currentHeading')}</h3>
      <p className="hint">{t('statistics.hpReading', { current: pokemon.currentHp ?? t('statistics.unavailable'), max: pokemon.maxHp ?? pokemon.currentStats?.hp ?? t('statistics.unavailable') })}</p>
      <dl className="stats-current" aria-label={t('statistics.currentHeading')}>
        {STATS.map(stat => <div key={stat}><dt>{statLabel(t, stat)}</dt><dd>{pokemon.currentStats?.[stat] ?? (stat === 'hp' ? pokemon.maxHp : undefined) ?? t('statistics.unavailable')}</dd></div>)}
      </dl>
      {!pokemon.currentStats && <p className="notice">{t(pokemon.location === 'box' ? 'statistics.boxHint' : 'statistics.incompleteHint')}</p>}
      <p className="hint">{t('statistics.battleHint')}</p>
    </section>}
    <section id="stats-panel-species" role={individual ? 'tabpanel' : undefined} aria-labelledby={individual ? 'stats-tab-species' : undefined} hidden={tab !== 'species'} tabIndex={0}>
    {!stats && !error && <p role="status" className="empty">{t('statistics.loading')}</p>}
    {error && <p role="alert" className="notice">{t('statistics.loadError')} <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {stats && <>
      <dl className="stats-list" aria-label={t('statistics.listAria')}>
        {STATS.map(stat => <div key={stat} className="stats-row">
          <dt>{statLabel(t, stat)}</dt><dd><span className="stats-track" aria-hidden="true"><span className={`stats-fill stats-fill-${stat}`} style={{ width: `${stats[stat] / BASE_STAT_MAX * 100}%` }} /></span><span className="stats-value">{stats[stat]}</span></dd>
        </div>)}
      </dl>
      <div className="stats-total"><span>{t('statistics.total')}</span><strong>{totalBaseStats(stats)}</strong></div>
      <p className="hint stats-scale">{t('statistics.scale', { max: BASE_STAT_MAX })}</p>
    </>}
    </section>
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
  return <StatsContext.Provider value={pokemon => setSelection({ pokemon, source })}>{children}{pokemon && <StatsDialog key={`${selected?.instanceKey ?? selected?.id}-${pokemon.form ?? 0}`} pokemon={pokemon} source={selection!.source} stale={stale} missing={missing} updatedAt={sameSource && !missing ? sourceState?.updatedAt ?? null : null} individual={individual} onClose={() => setSelection(null)} />}</StatsContext.Provider>
}
