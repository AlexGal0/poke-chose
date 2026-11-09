import { categoryLabel } from '../../i18n/moves'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ZONE_ITEM_CATEGORIES } from './zone-items'
import type { ZoneItem, ZoneItemCategory, ZoneItemOccurrence, ZoneItemsResult, ZoneItemsService } from './zone-items'
import { filterZoneItems, groupZoneItems } from '../../domain/zone-items'
import { loadZoneItemProgress, saveZoneItemProgress } from '../../storage/zone-item-progress'
import { TypeBadge } from '../../components/TypeBadge'
import './ZoneItems.css'

function ItemIcon({ item }: { item: ZoneItem }) {
  const [broken, setBroken] = useState<string | null>(null)
  return <span className="zone-item-icon">{item.icon && broken !== item.icon
    ? <img src={item.icon} alt="" width="40" height="40" loading="lazy" onError={() => setBroken(item.icon)} />
    : <span aria-hidden="true">{item.machine ? '◉' : '◇'}</span>}</span>
}

function MachineDetails({ machine }: { machine: NonNullable<ZoneItem['machine']> }) {
  const { t } = useTranslation()
  const move = machine.move
  return <div className="zone-item-machine">
    <span className="zone-item-generation" title={t('zoneItems.moveGeneration', { number: move.generation })} aria-label={t('zoneItems.moveGeneration', { number: move.generation })}>{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][move.generation - 1] ?? move.generation}</span>
    <div className="zone-item-move-name"><strong>{move.name}</strong><span className="zone-item-move-category">{categoryLabel(t, move.category)}</span></div>
    <div className="zone-item-move-type"><TypeBadge type={move.type} /></div>
    <dl className="zone-item-move-values"><div><dt>{t('zoneItems.pp')}</dt><dd>{move.pp}</dd></div><div><dt>{t('individualDetails.power')}</dt><dd title={move.power === null ? t('zoneItems.variableValue') : undefined}>{move.power ?? '—'}</dd></div><div><dt>{t('individualDetails.accuracy')}</dt><dd title={move.accuracy === null ? t('zoneItems.variableValue') : undefined}>{move.accuracy === null ? '—' : `${move.accuracy}%`}</dd></div></dl>
    {move.description && <p lang={move.descriptionLanguage ?? undefined}>{move.description}</p>}
    {move.descriptionLanguage && <small>{t('zoneItems.sourceLanguage', { language: move.descriptionLanguage.toUpperCase() })}</small>}
  </div>
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return <a className="zone-item-source" href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3h7v7M21 3 10 14" /><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></svg></a>
}

function ItemCard({ occurrence, marked, onToggle }: { occurrence: ZoneItemOccurrence; marked: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const { t } = useTranslation()
  const { item } = occurrence
  const place = occurrence.instructions ?? t('zoneItems.instructionsUnknown')
  const markLabel = t('zoneItems.markObtainedAria', { item: item.name, place })
  return <li className={`zone-item-card${marked ? ' is-obtained' : ''}`}>
    <div className="zone-item-corner"><SourceLink href={occurrence.source} label={t('zoneItems.sourceFor', { item: item.name, place })} /><label className="zone-item-check" title={markLabel}><input type="checkbox" aria-label={markLabel} checked={marked} onChange={event => onToggle(occurrence.id, event.target.checked)} /></label></div>
    <div className="zone-item-identity"><ItemIcon item={item} /><h5>{item.machine ? t(`zoneItems.${item.machine.kind}`, { number: String(item.machine.number).padStart(2, '0') }) : item.name}</h5></div>
    {!item.machine && item.description && <p lang={item.descriptionLanguage ?? undefined}>{item.description}</p>}
    <div className="zone-item-location"><span className={`zone-item-method zone-item-method-${occurrence.method}`}>{t(`zoneItems.methods.${occurrence.method}`)}</span><p lang={occurrence.instructionsLanguage ?? undefined}>{place}</p>{occurrence.instructionsLanguage && <small>{t('zoneItems.sourceLanguage', { language: occurrence.instructionsLanguage.toUpperCase() })}</small>}
      {occurrence.requirements && <div className="zone-item-requirements"><p>{occurrence.requirements}</p>{occurrence.requirementSource && <SourceLink href={occurrence.requirementSource} label={t('zoneItems.requirementsSource', { item: item.name })} />}</div>}
    </div>
    {item.machine && <details className="zone-item-move-details"><summary>{t('captureRedesign.moveDetails', { move: item.machine.move.name })}</summary><MachineDetails machine={item.machine} /></details>}
  </li>
}

export function ZoneItems({ service, zoneId, zoneName }: { service: ZoneItemsService; zoneId: number; zoneName: string }) {
  const { t, i18n } = useTranslation()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ service: ZoneItemsService; zoneId: number; locale: string; data?: ZoneItemsResult; error?: boolean } | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ZoneItemCategory | 'all'>('all')
  const [progress, setProgress] = useState<'all' | 'marked' | 'unmarked'>('all')
  const [marked, setMarked] = useState(() => loadZoneItemProgress(service.id))
  const [saveFailed, setSaveFailed] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const locale = i18n.language
    service.load(zoneId, locale, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ service, zoneId, locale, data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ service, zoneId, locale, error: true }) })
    return () => controller.abort()
  }, [service, zoneId, i18n.language, attempt])
  const current = result?.service === service && result.zoneId === zoneId && result.locale === i18n.language ? result : null
  const data = current?.data
  const filtered = filterZoneItems(data?.occurrences ?? [], { query, category, progress, marked })
  const groups = groupZoneItems(filtered)
  const fieldItems = filtered.filter(row => row.method !== 'purchase')
  const shops = new Map<string, ZoneItemOccurrence[]>()
  for (const occurrence of filtered.filter(row => row.method === 'purchase')) {
    const shop = occurrence.purchase?.shop ?? t('zoneItems.otherShop')
    shops.set(shop, [...shops.get(shop) ?? [], occurrence])
  }
  function toggle(id: string, checked: boolean) {
    const next = new Set(marked)
    if (checked) next.add(id)
    else next.delete(id)
    setMarked(next)
    setSaveFailed(!saveZoneItemProgress(service.id, next))
  }
  return <section className="zone-items" aria-label={t('zoneItems.title', { zone: zoneName })}>
    <div className="section-heading"><div><h3 id="zone-items-heading">{t('zoneItems.itemsView')}</h3></div>{data && <span className="count">{t('zoneItems.count', { count: groups.length })}</span>}</div>
    <details className="zone-items-guide"><summary>{t('captureRedesign.itemHelp')}</summary><p className="hint">{t('zoneItems.hint')}</p><p className="hint">{t('zoneItems.manualHint')}</p></details>
    <div className="zone-item-filters"><label>{t('zoneItems.search')}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('zoneItems.searchPlaceholder')} /></label><label>{t('zoneItems.category')}<select value={category} onChange={event => setCategory(event.target.value as ZoneItemCategory | 'all')}><option value="all">{t('zoneItems.allCategories')}</option>{ZONE_ITEM_CATEGORIES.map(value => <option value={value} key={value}>{t(`zoneItems.categories.${value}`)}</option>)}</select></label><label>{t('zoneItems.progress')}<select value={progress} onChange={event => setProgress(event.target.value as typeof progress)}><option value="all">{t('zoneItems.allProgress')}</option><option value="marked">{t('zoneItems.marked')}</option><option value="unmarked">{t('zoneItems.unmarked')}</option></select></label></div>
    {saveFailed && <p role="status" className="notice">{t('zoneItems.saveFailed')}</p>}
    {!current && <p role="status">{t('zoneItems.loading')}</p>}
    {current?.error && <p role="alert">{t('zoneItems.error')} <button onClick={() => { setResult(null); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {data && <>
      {data.coverage === 'unrecorded' && <p role="status" className="notice">{t('zoneItems.unrecorded')}</p>}
      {!groups.length && data.coverage === 'documented' && <p role="status" className="empty">{t(data.occurrences.length ? 'zoneItems.noMatches' : 'zoneItems.noRecordedItems')}</p>}
      {ZONE_ITEM_CATEGORIES.map(value => {
        const rows = fieldItems.filter(row => row.item.category === value)
        if (!rows.length) return null
        return <section className="zone-item-category" key={value} aria-label={t(`zoneItems.categories.${value}`)}><div className="section-heading"><h4>{t(`zoneItems.categories.${value}`)}</h4><span className="count">{rows.length}</span></div><ul className="zone-item-grid">{rows.map(occurrence => <ItemCard key={occurrence.id} occurrence={occurrence} marked={marked.has(occurrence.id)} onToggle={toggle} />)}</ul></section>
      })}
      {shops.size > 0 && <section className="zone-item-shops" aria-label={t('zoneItems.shops')}><h4>{t('zoneItems.shops')}</h4><p className="hint">{t('zoneItems.shopHint')}</p><div className="zone-item-shop-grid">{[...shops].map(([shop, rows]) => <table className="zone-item-shop" key={shop}><caption>{shop}</caption><thead><tr><th scope="col">{t('zoneItems.shopItem')}</th><th scope="col">{t('zoneItems.price')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.item.name}{row.item.machine && <span className="zone-item-shop-move"> · {row.item.machine.move.name}</span>}{!row.purchase && row.instructions && <small>{row.instructions}</small>}</td><td>{row.purchase?.price ?? '—'}</td></tr>)}</tbody></table>)}</div><SourceLink href={filtered.find(row => row.method === 'purchase')!.source} label={t('zoneItems.shopSource')} /></section>}
      <p className="hint">{t('zoneItems.coverageHint', { date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(data.retrieved)) })}</p>
    </>}
  </section>
}
