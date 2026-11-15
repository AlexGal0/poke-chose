import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MegaEvolution, MegaEvolutionService, MegaInventory } from '../games/core/mega-evolutions'
import { megaAvailability } from '../domain/mega-evolutions'
import { pokemonDisplayName } from '../domain/pokemon-names'
import { STATS, totalBaseStats } from '../domain/stats'
import { LoadingIndicator } from './LoadingIndicator'
import { TypeBadge } from './TypeBadge'
import './MegaEvolutions.css'

function MegaDialog({ entry, onClose }: { entry: MegaEvolution; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const name = pokemonDisplayName(entry.name)
  const megaName = t('megaEvolutions.megaName', { name, variant: entry.variant ? ` ${entry.variant}` : '' })
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus({ preventScroll: true }) }
  }, [])
  function outside(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return
    const box = event.currentTarget.getBoundingClientRect()
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
  }
  return <dialog ref={dialog} className="mega-dialog" aria-labelledby={titleId} onCancel={onClose} onClick={outside}>
    <header><div><span className="eyebrow">{entry.stoneName}</span><h2 id={titleId}>{megaName}</h2></div><button autoFocus type="button" onClick={onClose} aria-label={t('megaEvolutions.close')}>✕</button></header>
    <div className="mega-dialog-content">
      <div className={`mega-reveal type-${entry.megaTypes[0]}`}><img className="mega-artwork" src={entry.megaSprite} alt={megaName} width="320" height="320" /><div className="types">{entry.megaTypes.map(type => <TypeBadge key={type} type={type} />)}</div><div className="mega-original"><img src={entry.sprite} alt="" width="64" height="64" /><span>{name}</span><span className="types">{entry.types.map(type => <TypeBadge key={type} type={type} />)}</span></div></div>
      <section className="mega-comparison" aria-labelledby={`${titleId}-stats`}>
        <h3 id={`${titleId}-stats`}>{t('megaEvolutions.stats')}</h3><p className="hint">{t('megaEvolutions.statsHint')}</p>
        <div className="mega-stat-legend"><span>{t('megaEvolutions.base')}</span><span>{t('megaEvolutions.mega')}</span></div>
        <table><caption className="sr-only">{t('megaEvolutions.comparison', { name })}</caption><thead><tr><th scope="col">{t('megaEvolutions.stat')}</th><th scope="col">{t('megaEvolutions.base')}</th><th scope="col">{t('megaEvolutions.mega')}</th><th scope="col">{t('megaEvolutions.change')}</th></tr></thead><tbody>{STATS.map(stat => {
          const base = entry.baseStats[stat], mega = entry.megaStats[stat], delta = mega - base
          return <tr key={stat}><th scope="row">{t(`statistics.radarLabels.${stat}`)}<span className="mega-stat-bars" aria-hidden="true"><span style={{ width: `${base / 255 * 100}%` }} /><span style={{ width: `${mega / 255 * 100}%` }} /></span></th><td>{base}</td><td>{mega}</td><td className={delta > 0 ? 'mega-gain' : delta < 0 ? 'mega-loss' : ''}>{delta > 0 ? '+' : ''}{delta}</td></tr>
        })}</tbody><tfoot><tr><th scope="row">{t('megaEvolutions.total')}</th><td>{totalBaseStats(entry.baseStats)}</td><td>{totalBaseStats(entry.megaStats)}</td><td className="mega-gain">+{totalBaseStats(entry.megaStats) - totalBaseStats(entry.baseStats)}</td></tr></tfoot></table>
      </section>
    </div>
  </dialog>
}

const unavailable: MegaInventory = { quantities: null, stale: true }

export function MegaEvolutions({ service, inventory = unavailable, collection, collectionStale = false }: {
  service: MegaEvolutionService; inventory?: MegaInventory; collection: readonly { id: number; isEgg?: boolean }[] | null; collectionStale?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ service: MegaEvolutionService; locale: string; entries?: readonly MegaEvolution[]; error?: boolean } | null>(null)
  const [filter, setFilter] = useState('owned')
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const locale = i18n.language
    service.load(locale, controller.signal).then(entries => {
      if (!controller.signal.aborted) setResult({ service, locale, entries })
    }).catch(() => { if (!controller.signal.aborted) setResult({ service, locale, error: true }) })
    return () => controller.abort()
  }, [service, i18n.language, attempt])
  const current = result?.service === service && result.locale === i18n.language ? result : null
  const rows = (current?.entries ?? []).map(entry => ({ entry, ...megaAvailability(entry, inventory, collection, collectionStale) }))
  const owned = rows.filter(row => row.hasStone)
  const visible = filter === 'all' || inventory.quantities === null ? rows : owned
  const preview = rows.find(row => row.entry.id === selected && row.canPreview)?.entry
  if (selected && current?.entries && !preview) setSelected(null)
  return <section className="mega-screen" aria-labelledby="mega-title">
    <header className="mega-heading"><div><span className="eyebrow">{t('megaEvolutions.eyebrow')}</span><h2 id="mega-title">{t('megaEvolutions.title')}</h2><p className="hint">{t('megaEvolutions.intro')}</p></div><span className="mega-count">{inventory.quantities === null ? '—' : owned.length}<small>{t('megaEvolutions.stones')}</small></span></header>
    <p className="hint">{t('megaEvolutions.hint')}</p>
    {inventory.quantities === null ? <p className="notice" role="status">{t('megaEvolutions.inventoryUnknown')}</p> : inventory.stale && <p className="notice" role="status">{t('megaEvolutions.stale')}</p>}
    {collection === null ? <p className="notice" role="status">{t('megaEvolutions.collectionUnknown')}</p> : collectionStale && <p className="notice" role="status">{t('megaEvolutions.collectionStale')}</p>}
    <label className="mega-filter">{t('megaEvolutions.filter')}<select value={filter} onChange={event => setFilter(event.target.value)}><option value="owned">{t('megaEvolutions.ownedStones')}</option><option value="all">{t('megaEvolutions.allStones')}</option></select></label>
    {!current && <LoadingIndicator>{t('megaEvolutions.loading')}</LoadingIndicator>}
    {current?.error && <p role="alert">{t('megaEvolutions.error')} <button onClick={() => { setResult(null); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {current?.entries && !visible.length && <p className="empty">{t('megaEvolutions.empty')}</p>}
    <div className="mega-grid">{visible.map(row => {
      const { entry } = row
      const name = pokemonDisplayName(entry.name)
      const state = row.owned === null ? 'pokemonUnknown' : !row.owned ? 'pokemonMissing' : row.hasStone === null ? 'stoneUnknown' : !row.hasStone ? 'stoneMissing' : !row.canPreview ? 'unconfirmed' : 'ready'
      return <article className={`mega-card${row.canPreview ? ' is-ready' : ''}`} key={entry.id}>
        <div className={`mega-frame${row.owned ? ` type-${entry.types[0]}` : ''}`}><span className="mega-species-id">#{String(entry.speciesId).padStart(3, '0')}{entry.variant ? ` · ${entry.variant}` : ''}</span>{row.owned ? <img className="mega-base-art" src={entry.sprite} alt={name} width="192" height="192" loading="lazy" /> : <span className="mega-hidden" aria-label={t('megaEvolutions.hidden')}>?</span>}<button className="mega-stone" type="button" disabled={!row.canPreview} onClick={() => setSelected(entry.id)} aria-label={t('megaEvolutions.open', { name, stone: entry.stoneName })} title={t(`megaEvolutions.${state}`)}><img src={entry.stoneIcon} alt="" width="44" height="44" /><span aria-hidden="true">{row.canPreview ? '↗' : '⌑'}</span></button></div>
        <div className="mega-card-caption"><h3>{name}{entry.variant && <small>{entry.variant}</small>}</h3><strong>{entry.stoneName}</strong><p className={`mega-state ${row.canPreview ? 'mega-gain' : ''}`}>{t(`megaEvolutions.${state}`)}</p>{row.quantity && <p className="mega-quantities">{t('megaEvolutions.quantities', row.quantity)}</p>}</div>
      </article>
    })}</div>
    {preview && <MegaDialog key={preview.id} entry={preview} onClose={() => setSelected(null)} />}
  </section>
}
