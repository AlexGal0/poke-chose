import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAcquisitionDetails } from '../api/acquisition-details'
import { blackAcquisitionInstructions } from '../domain/acquisition-instructions'
import { evolutionMethodFacts } from '../domain/evolution'
import { areaDescriptor } from '../domain/black-zones'
import { encounterMethodIcon } from '../domain/encounter-methods'
import { summarizeAcquisitionEncounters } from '../domain/acquisition-encounters'
import { blackNpcTrades } from '../domain/npc-trades'
import { pokemonDisplayName, pokemonWikiUrl } from '../domain/pokemon-names'
import { evolutionMethodLabel } from '../i18n/evolution'
import { acquisitionLabel } from '../i18n/acquisition'
import { areaLabel, zoneLabel } from '../i18n/zones'
import { methodLabel } from '../i18n/encounter-methods'
import { encounterConditionLabel } from '../i18n/encounter-seasons'
import { tradeInstructions } from '../i18n/npc-trades'
import type { CatalogEntry } from '../models/pokemon'
import './AcquisitionDetailsDialog.css'

export function AcquisitionDetailsDialog({ entry, onClose }: { entry: CatalogEntry; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [data, setData] = useState<{ locale: string; result: Awaited<ReturnType<typeof getAcquisitionDetails>> } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    const focus = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); focus?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void getAcquisitionDetails(entry.id, i18n.language, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setData({ locale: i18n.language, result })
        setError(false)
      }
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [entry.id, i18n.language, attempt])
  const current = data?.locale === i18n.language ? data.result : null
  const special = blackAcquisitionInstructions(entry.id)
  const trades = blackNpcTrades.filter(trade => trade.speciesId === entry.id)
  const encounterZones = new Map<string, Map<string, NonNullable<typeof current>['encounters']>>()
  for (const row of summarizeAcquisitionEncounters(current?.encounters ?? [])) {
    const descriptor = areaDescriptor(row.area)
    const zone = descriptor.kind === 'unknown' ? row.area : descriptor.zoneSlug
    if (!encounterZones.has(zone)) encounterZones.set(zone, new Map())
    const areas = encounterZones.get(zone)!
    if (!areas.has(row.area)) areas.set(row.area, [])
    areas.get(row.area)!.push(row)
  }
  return <dialog ref={dialog} className="acquisition-details-dialog" aria-labelledby="acquisition-details-title" onCancel={onClose}>
    <header><div><small>POKÉMON BLACK</small><h2 id="acquisition-details-title">{t('acquisitionDetails.heading', { name: pokemonDisplayName(entry.name) })}</h2></div><button onClick={onClose} autoFocus aria-label={t('acquisitionDetails.close')}>✕</button></header>
    <p className="hint">{t('acquisitionDetails.hint')}</p>
    {special.length > 0 && <section><h3>{t('acquisitionDetails.specialTitle')}</h3>{special.map(instruction => <div key={instruction.key}><p>{t(`acquisitionDetails.instructions.${instruction.key}`)}</p><a href={instruction.source} target="_blank" rel="noreferrer">{t('acquisitionDetails.source')}</a></div>)}</section>}
    {!current && !error && <p role="status">{t('acquisitionDetails.loading')}</p>}
    {error && <p role="alert" className="notice">{t('acquisitionDetails.error')} <button onClick={() => { setError(false); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {current && <>
      <section><h3>{t('acquisitionDetails.routes')}</h3><ul>{current.tags.map(tag => <li key={tag.kind}>{tag.icon} {acquisitionLabel(t, tag.kind)}</li>)}</ul></section>
      <section><h3>{t('acquisitionDetails.encounters')}</h3>{!current.encounters.length && <p>{t('acquisitionDetails.noEncounters')}</p>}
        <div className="acquisition-zones">{[...encounterZones].map(([zone, areas]) => <article className="acquisition-zone" key={zone}>
          <h4><span aria-hidden="true">⌖</span> {areaDescriptor(zone).kind === 'unknown' ? areaLabel(t, zone) : t(`zones.list.${zone}`)}</h4>
          {[...areas].map(([area, rows]) => <div className="acquisition-area" key={area}>
            {(areas.size > 1 || areaDescriptor(area).kind !== 'main') && <h5>{areaLabel(t, area)}</h5>}
            <div className="acquisition-methods">{[...new Set(rows.map(row => row.method.name))].map(method => <div className="acquisition-method" key={method}>
              <div className="acquisition-method-heading"><span aria-hidden="true">{encounterMethodIcon(method)}</span><strong>{methodLabel(t, method)}</strong></div>
              {rows.filter(row => row.method.name === method).map((row, index) => <div className="acquisition-encounter" key={index}>
                <div className="acquisition-encounter-values"><span>{t('captureChecklist.levelRange', { min: row.min_level, max: row.max_level })}</span>{method !== 'npc-trade' && <strong className="acquisition-chance">{row.chance}%<span aria-hidden="true"><i style={{ width: `${row.chance}%` }} /></span></strong>}</div>
                {row.condition_values.length > 0 && <p className="acquisition-conditions">{row.condition_values.map(condition => encounterConditionLabel(t, condition.name)).join(' · ')}</p>}
              </div>)}
            </div>)}</div>
          </div>)}
        </article>)}</div>
      </section>
      {trades.length > 0 && <section><h3>{t('acquisitionDetails.npcTrades')}</h3>{trades.map(trade => <div key={trade.locationId}><strong>{zoneLabel(t, { id: trade.locationId, name: trade.area })}</strong><p>{tradeInstructions(t, { instructionsKey: trade.name })}</p><p>{t('npcTradeDetails.deliver', { requested: trade.requested })}</p></div>)}</section>}
      {current.parent && current.node && <section><h3>{t('acquisitionDetails.evolution')}</h3><strong>{pokemonDisplayName(current.parent.name)} → {pokemonDisplayName(entry.name)}</strong><ul>{current.node.methods.map((method, index) => <li key={index}>{evolutionMethodLabel(t, evolutionMethodFacts(method, entry.id, current.tree.labels))}</li>)}</ul></section>}
    </>}
    <p className="hint">{t('acquisitionDetails.incomplete')}</p><a href={pokemonWikiUrl(entry.name)} target="_blank" rel="noreferrer">{t('acquisitionDetails.more')}</a>
  </dialog>
}
