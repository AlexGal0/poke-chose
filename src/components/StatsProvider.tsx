import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { getBaseStats } from '../api/stats'
import { BASE_STAT_MAX, STATS, statsForm, totalBaseStats } from '../domain/stats'
import type { BaseStats } from '../domain/stats'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { statLabel, statsFormLabel } from '../i18n/stats'
import { StatsContext } from './stats-context'
import type { StatsPokemon } from './stats-context'
import './Stats.css'

function StatsDialog({ pokemon, onClose }: { pokemon: StatsPokemon; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const outsideStart = useRef(false)
  const [stats, setStats] = useState<BaseStats | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
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
      <div><span className="eyebrow">{t('statistics.eyebrow')}</span><h2 id="stats-title">{t('statistics.heading', { name: pokemonDisplayName(pokemon.name) })}</h2>{form && <p className="hint stats-form">{t('statistics.form', { name: statsFormLabel(t, form) })}</p>}</div>
      <button type="button" onClick={onClose} autoFocus aria-label={t('statistics.closeAria')}>✕</button>
    </div>
    <p id="stats-hint" className="hint">{t('statistics.hint')}</p>
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
  </dialog>
}

export function StatsProvider({ children }: { children: ReactNode }) {
  const [pokemon, setPokemon] = useState<StatsPokemon | null>(null)
  return <StatsContext.Provider value={setPokemon}>{children}{pokemon && <StatsDialog key={`${pokemon.id}-${pokemon.form ?? 0}`} pokemon={pokemon} onClose={() => setPokemon(null)} />}</StatsContext.Provider>
}
