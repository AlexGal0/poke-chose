import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CollectionLocationFilter } from '../domain/collection-search'
import { adjacentBox, matchesBoxSearch } from '../domain/box-navigation'
import './BoxNavigation.css'

export function BoxNavigation({ location, onChange, boxCounts, partyCount, total }: {
  location: CollectionLocationFilter; onChange: (location: CollectionLocationFilter) => void
  boxCounts: readonly number[]; partyCount: number; total: number
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const details = useRef<HTMLDetailsElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const id = useId()
  const previous = adjacentBox(location, -1, boxCounts.length)
  const next = adjacentBox(location, 1, boxCounts.length)
  const options = [
    { value: 'all' as const, label: t('saveCollection.boxFilter.all'), count: total },
    { value: 'party' as const, label: t('saveCollection.boxFilter.party'), count: partyCount },
    ...boxCounts.map((count, box) => ({ value: box, label: t('saveCollection.boxFilter.box', { number: box + 1 }), count })),
  ]
  const selected = options.find(option => option.value === location)!
  const matches = options.filter(option => matchesBoxSearch(option.value, option.label, query))
  useEffect(() => {
    function close(event: PointerEvent) {
      if (details.current?.open && !details.current.contains(event.target as Node)) details.current.open = false
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  function select(location: CollectionLocationFilter) {
    onChange(location)
    setQuery('')
    if (details.current?.open) { details.current.open = false; trigger.current?.focus() }
  }
  return <div className="box-navigation" role="group" aria-label={t('saveCollection.boxFilter.navigation')}>
    <button className="box-navigation-arrow" type="button" disabled={previous === null} onClick={() => { if (previous !== null) select(previous) }} aria-label={t('saveCollection.boxFilter.previous')} title={t('saveCollection.boxFilter.previous')}>←</button>
    <details ref={details} className="box-picker" onToggle={event => {
      if (event.currentTarget.open) { setQuery(''); search.current?.focus() }
    }} onKeyDown={event => {
      if (event.key === 'Escape' && details.current?.open) { event.preventDefault(); details.current.open = false; trigger.current?.focus() }
    }}>
      <summary ref={trigger} aria-label={`${t('saveCollection.locationLabel')}: ${selected.label}`} aria-controls={id}>
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 10h18M9 5V3h6v2M10 14h4" /></svg>
        <span className="box-picker-title">{selected.label}</span><span className="box-picker-count">{selected.count}</span><span className="box-picker-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="box-picker-panel" id={id}>
        <div className="box-picker-search">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
          <input ref={search} type="search" value={query} aria-label={t('saveCollection.boxFilter.search')} placeholder={t('saveCollection.boxFilter.searchPlaceholder')} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); details.current?.querySelector<HTMLButtonElement>('.box-picker-option')?.focus() }
            if (event.key === 'Enter' && matches.length === 1) { event.preventDefault(); select(matches[0].value) }
          }} />
        </div>
        <div className="box-picker-options" role="group" aria-label={t('saveCollection.locationLabel')}>
          {matches.map(option => <button type="button" key={option.value} className="box-picker-option" aria-pressed={location === option.value} onClick={() => select(option.value)}>
            <span>{option.label}</span><span className="box-picker-count">{option.count}</span>{location === option.value && <span className="box-picker-check" aria-hidden="true">✓</span>}
          </button>)}
          {!matches.length && <p className="box-picker-empty" role="status">{t('saveCollection.boxFilter.noResults')}</p>}
        </div>
      </div>
    </details>
    <button className="box-navigation-arrow" type="button" disabled={next === null} onClick={() => { if (next !== null) select(next) }} aria-label={t('saveCollection.boxFilter.next')} title={t('saveCollection.boxFilter.next')}>→</button>
  </div>
}
