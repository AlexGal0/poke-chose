import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AcquisitionDetails, AcquisitionService } from '../games/core/acquisition'
import { acquisitionText } from '../i18n/acquisition-text'
import { pokemonDisplayName, pokemonWikiUrl } from '../domain/pokemon-names'
import './AcquisitionDetailsDialog.css'

export function AcquisitionDetailsDialog({ entry, service, onClose }: { entry: { id: number; name: string }; service: AcquisitionService; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const [data, setData] = useState<{ locale: string; speciesId: number; service: AcquisitionService; result: AcquisitionDetails } | null>(null)
  const [failure, setFailure] = useState<{ locale: string; speciesId: number; service: AcquisitionService } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    const focus = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); focus?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    void service.details(entry.id, i18n.language, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setData({ locale: i18n.language, speciesId: entry.id, service, result })
        setFailure(null)
      }
    }).catch(() => { if (!controller.signal.aborted) setFailure({ locale: i18n.language, speciesId: entry.id, service }) })
    return () => controller.abort()
  }, [entry.id, i18n.language, service, attempt])
  const current = data?.locale === i18n.language && data.speciesId === entry.id && data.service === service ? data.result : null
  const error = failure?.locale === i18n.language && failure.speciesId === entry.id && failure.service === service
  const special = service.instructions(entry.id)
  return <dialog ref={dialog} className="acquisition-details-dialog" aria-labelledby={titleId} onCancel={onClose}>
    <header><div><small>{service.gameName}</small><h2 id={titleId}>{t('acquisitionDetails.heading', { name: pokemonDisplayName(entry.name) })}</h2></div><button onClick={onClose} autoFocus aria-label={t('acquisitionDetails.close')}>✕</button></header>
    <p className="hint">{acquisitionText(t, service.labels.hint)}</p>
    {special.length > 0 && <section><h3>{t('acquisitionDetails.specialTitle')}</h3>{special.map((instruction, index) => <div key={index}><p>{acquisitionText(t, instruction.label)}</p><a href={instruction.source} target="_blank" rel="noreferrer">{t('acquisitionDetails.source')}</a></div>)}</section>}
    {!current && !error && <p role="status">{acquisitionText(t, service.labels.loading)}</p>}
    {error && <p role="alert" className="notice">{t('acquisitionDetails.error')} <button onClick={() => { setFailure(null); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {current && <>
      <section><h3>{t('acquisitionDetails.routes')}</h3><ul>{current.routes.map(route => <li key={route.kind}>{route.icon} {acquisitionText(t, route.label)}</li>)}</ul></section>
      <section><h3>{t('acquisitionDetails.encounters')}</h3>{!current.zones.length && <p>{acquisitionText(t, service.labels.noEncounters)}</p>}
        <div className="acquisition-zones">{current.zones.map(zone => <article className="acquisition-zone" key={zone.id}>
          <h4><span aria-hidden="true">⌖</span> {acquisitionText(t, zone.label)}</h4>
          {zone.areas.map(area => <div className="acquisition-area" key={area.id}>
            {area.label && <h5>{acquisitionText(t, area.label)}</h5>}
            <div className="acquisition-methods">{area.methods.map(method => <div className="acquisition-method" key={method.id}>
              <div className="acquisition-method-heading"><span aria-hidden="true">{method.icon}</span><strong>{acquisitionText(t, method.label)}</strong></div>
              {method.encounters.map((row, index) => <div className="acquisition-encounter" key={index}>
                <div className="acquisition-encounter-values"><span>{t('captureChecklist.levelRange', { min: row.minLevel, max: row.maxLevel })}</span>{row.chance !== null && <strong className="acquisition-chance">{row.chance}%<span aria-hidden="true"><i style={{ width: `${row.chance}%` }} /></span></strong>}</div>
                {row.conditions.length > 0 && <p className="acquisition-conditions">{row.conditions.map(condition => acquisitionText(t, condition)).join(' · ')}</p>}
              </div>)}
            </div>)}</div>
          </div>)}
        </article>)}</div>
      </section>
      {current.trades.length > 0 && <section><h3>{t('acquisitionDetails.npcTrades')}</h3>{current.trades.map(trade => <div key={trade.id}><strong>{acquisitionText(t, trade.location)}</strong><p>{acquisitionText(t, trade.instructions)}</p><p>{t('npcTradeDetails.deliver', { requested: typeof trade.requested === 'string' ? trade.requested : acquisitionText(t, trade.requested) })}</p></div>)}</section>}
      {current.evolution && <section><h3>{t('acquisitionDetails.evolution')}</h3><strong>{pokemonDisplayName(current.evolution.from)} → {pokemonDisplayName(entry.name)}</strong><ul>{current.evolution.methods.map((method, index) => <li key={index}>{method.map(fact => acquisitionText(t, fact)).join(' · ')}</li>)}</ul></section>}
    </>}
    <p className="hint">{t('acquisitionDetails.incomplete')}</p><a href={pokemonWikiUrl(entry.name)} target="_blank" rel="noreferrer">{t('acquisitionDetails.more')}</a>
  </dialog>
}
