import { pokemonDisplayName, pokemonWikiUrl } from '../domain/pokemon-names'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getBlackEncounters, getBlackLocations } from '../api/encounters'
import { getCatalog } from '../api/pokeapi'
import type { CatalogEntry } from '../models/pokemon'
import { captureChecklist } from '../domain/checklist'
import { accessibleEncounters } from '../domain/encounter-access'
import { encounterSubzones } from '../domain/encounter-subzones'
import { minimumEncounterLevel, orderEncountersByLevel } from '../domain/encounter-levels'
import { loadEncounterAccess, saveEncounterAccess } from '../storage/encounter-access'
import { loadEncounterZone, saveEncounterZone } from '../storage/encounter-zone'
import type { EncounterLocation, EncounterSpecies } from '../models/encounters'
import type { PokedexState } from '../models/pokedex'
import { EncounterChances } from './EncounterChances'
import { EncounterOpportunity } from './EncounterOpportunity'
import { NpcTradeDetails } from './NpcTradeDetails'
import { EncounterMethods } from './EncounterMethods'
import { encounterMethod } from '../domain/encounter-methods'
import { CapturedPokemonIcon } from './CapturedPokemonIcon'
import { EvolutionButton } from './EvolutionButton'
import { GenderIcon } from './GenderIcon'
import { OwnedEvolutionIcon } from './OwnedEvolutionIcon'
import type { CollectionPokemon, PartyPokemon } from '../models/party'
import { areaLabel, orderBlackZones, searchBlackZones, zoneLabel, zoneStage, ZONE_STAGES } from '../domain/black-zones'
import './CaptureChecklist.css'

function PokedexLookup({ pokedex }: { pokedex: PokedexState }) {
  const { t } = useTranslation()
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getCatalog(controller.signal).then(setCatalog).catch(() => {
      if (!controller.signal.aborted) setError(true)
    })
    return () => controller.abort()
  }, [attempt])
  const matches = query.trim() ? catalog.filter(row => row.name.includes(query.trim().toLowerCase()) || String(row.id) === query.trim()).slice(0, 8) : []
  return <details className="dex-lookup"><summary>{t('captureChecklist.pokedexLookup.summary', { caught: pokedex.caughtSpeciesIds.size, seen: pokedex.seenSpeciesIds.size })}</summary>
    <p className="hint">{t('captureChecklist.pokedexLookup.hint')}</p>
    <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label={t('captureChecklist.pokedexLookup.inputAriaLabel')} placeholder={t('captureChecklist.pokedexLookup.placeholder')} />
    {error && <p className="notice">{t('captureChecklist.pokedexLookup.loadError')} <button onClick={() => { setError(false); setAttempt(value => value + 1) }}>{t('captureChecklist.pokedexLookup.retryButton')}</button></p>}
    <ul>{matches.map(row => <li key={row.id} data-dex-species-id={row.id}><strong className="species-name">{pokemonDisplayName(row.name)}</strong> · {pokedex.caughtSpeciesIds.has(row.id) ? t('captureChecklist.status.caught') : t('captureChecklist.status.notCaught')} <small>({pokedex.seenSpeciesIds.has(row.id) ? t('captureChecklist.pokedexLookup.seenLabel') : t('captureChecklist.pokedexLookup.notSeenLabel')})</small></li>)}</ul>
    {query && !matches.length && catalog.length > 0 && <p className="hint">{t('captureChecklist.pokedexLookup.noMatches')}</p>}
  </details>
}

export function CaptureChecklist({ pokedex, enabled, stale, collection, team }: { pokedex: PokedexState | null; enabled: boolean; stale: boolean; collection: readonly CollectionPokemon[] | null; team: readonly PartyPokemon[] }) {
  const { t } = useTranslation()
  const ownedSpeciesIds = new Set([...(collection ?? []), ...team].filter(pokemon => !pokemon.isEgg).map(pokemon => pokemon.speciesId))
  const [access, setAccess] = useState(loadEncounterAccess)
  const [accessSaved, setAccessSaved] = useState(true)
  const [locations, setLocations] = useState<EncounterLocation[]>([{ id: 358, name: 'unova-route-3' }])
  const [selected, setSelected] = useState(loadEncounterZone)
  const [zoneSaved, setZoneSaved] = useState(true)
  const [zoneQuery, setZoneQuery] = useState('')
  const [result, setResult] = useState<{ locationId: number; rows: EncounterSpecies[] } | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getBlackLocations(controller.signal).then(setLocations).catch(() => {
      if (!controller.signal.aborted) setError('captureChecklist.errors.loadZones')
    })
    return () => controller.abort()
  }, [enabled, attempt])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getBlackEncounters(selected, controller.signal).then(rows => {
      if (!controller.signal.aborted) setResult({ locationId: selected, rows })
    }).catch(() => {
      if (!controller.signal.aborted) setError('captureChecklist.errors.loadEncounters')
    })
    return () => controller.abort()
  }, [enabled, selected, attempt])
  const allRows = result?.locationId === selected ? result.rows : null
  const rows = allRows ? orderEncountersByLevel(accessibleEncounters(allRows, access)) : null
  const checklist = rows && pokedex ? captureChecklist(rows, pokedex.caughtSpeciesIds) : null
  const subzones = rows ? encounterSubzones(rows) : []
  const matchingZones = searchBlackZones(locations, zoneQuery)
  const currentZone = locations.find(location => location.id === selected)
  const navigationZones = orderBlackZones(currentZone && !matchingZones.some(zone => zone.id === selected) ? [...matchingZones, currentZone] : matchingZones)
  const zoneIndex = navigationZones.findIndex(zone => zone.id === selected)
  const previousZone = zoneIndex > 0 ? navigationZones[zoneIndex - 1] : null
  const nextZone = zoneIndex >= 0 ? navigationZones[zoneIndex + 1] : null
  function selectZone(id: number) { setSelected(id); setZoneSaved(saveEncounterZone(id)); setError('') }
  return <section className="panel capture-panel" aria-labelledby="capture-title">
    <div className="section-heading"><div><span className="eyebrow">POKÉDEX / POKÉMON BLACK</span><h2 id="capture-title">{t('app.tabs.captures')}</h2></div>{checklist && <span className="count" aria-live="polite">{t('captureChecklist.header.count', { caught: checklist.caught, total: checklist.total })}</span>}</div>
    <p className="hint">{t('captureChecklist.header.hint1')}</p>
    <p className="hint">{t('captureChecklist.header.hint2')}</p>
    {!enabled ? <p className="empty">{t('captureChecklist.disabledNotice')}</p> : <>
      {pokedex && <PokedexLookup pokedex={pokedex} />}
      <div className="zone-controls">
        <label className="zone-search">{t('captureChecklist.zoneSearchLabel')} <input type="search" value={zoneQuery} onChange={event => setZoneQuery(event.target.value)} placeholder={t('captureChecklist.zoneSearchPlaceholder')} /></label>
        <div className="zone-select"><label htmlFor="capture-zone">{t('captureChecklist.zoneLabel')}</label><div className="zone-navigation">
        <button type="button" className="zone-previous" disabled={!previousZone} aria-label={t('captureChecklist.previousZoneAria')} title={previousZone ? t('captureChecklist.previousZoneTitle', { zone: zoneLabel(previousZone) }) : t('captureChecklist.firstZoneTitle')} onClick={() => { if (previousZone) selectZone(previousZone.id) }}>←</button>
        <select id="capture-zone" value={selected} onChange={event => selectZone(Number(event.target.value))}>
          {!currentZone && <option value={selected}>{zoneLabel({ id: selected, name: '' })}</option>}
          {currentZone && !matchingZones.some(location => location.id === selected) && <optgroup label={t('captureChecklist.currentZoneGroupLabel')}><option value={selected}>{zoneLabel(currentZone)}</option></optgroup>}
          {ZONE_STAGES.map(stage => {
            const group = matchingZones.filter(location => zoneStage(location) === stage)
            return group.length > 0 ? <optgroup key={stage} label={stage}>{group.map(location => <option key={location.id} value={location.id}>{zoneLabel(location)}</option>)}</optgroup> : null
          })}
        </select>
        <button type="button" className="zone-next" disabled={!nextZone} aria-label={t('captureChecklist.nextZoneAria')} title={nextZone ? t('captureChecklist.nextZoneTitle', { zone: zoneLabel(nextZone) }) : t('captureChecklist.lastZoneTitle')} onClick={() => { if (nextZone) selectZone(nextZone.id) }}>→</button>
        </div></div>
      </div>
      {!zoneSaved && <p className="notice" role="status">{t('captureChecklist.zoneSaveFailed')}</p>}
      {zoneQuery && <p className="hint" role="status">{matchingZones.length ? t('captureChecklist.zonesFoundCount', { count: matchingZones.length }) : t('captureChecklist.noZoneMatches')}</p>}
      <p className="hint">{t('captureChecklist.zoneOrderHint')}</p>
      <fieldset className="encounter-equipment"><legend>{t('captureChecklist.equipment.legend')}</legend>
        <label><input type="checkbox" checked={access.surf} onChange={event => { const next = { ...access, surf: event.target.checked }; setAccess(next); setAccessSaved(saveEncounterAccess(next)) }} /> {t('captureChecklist.equipment.surf')}</label>
        <label><input type="checkbox" checked={access.superRod} onChange={event => { const next = { ...access, superRod: event.target.checked }; setAccess(next); setAccessSaved(saveEncounterAccess(next)) }} /> {t('captureChecklist.equipment.superRod')}</label>
      </fieldset>
      <p className="hint">{t('captureChecklist.equipment.hint')}{allRows && allRows.length > rows!.length ? ` ${t('captureChecklist.equipment.hiddenCount', { count: allRows.length - rows!.length })}` : ''}</p>
      {!accessSaved && <p className="notice" role="status">{t('captureChecklist.equipment.filterSaveFailed')}</p>}
      {error && <p className="notice" role="alert">{t(error)} <button onClick={() => { setError(''); setAttempt(value => value + 1) }}>{t('captureChecklist.retryEncountersButton')}</button></p>}
      {!pokedex && <p className="hint">{t('captureChecklist.waitingForPokedex')}</p>}
      {stale && pokedex && <p className="notice">{t('captureChecklist.staleNotice')}</p>}
      {!rows && !error && <p className="empty" role="status">{t('captureChecklist.loadingEncounters')}</p>}
      {rows && rows.length === 0 && <p className="empty">{allRows?.length ? t('captureChecklist.noEncountersWithAccess') : t('captureChecklist.noEncountersRegistered')}</p>}
      {subzones.map((subzone, index) => <section className="capture-subzone" key={subzone.area} aria-labelledby={`capture-subzone-${index}`} data-area={subzone.area}>
        <div className="capture-subzone-heading"><h3 id={`capture-subzone-${index}`}>{areaLabel(subzone.area)}</h3><span className="count">{t('captureChecklist.speciesCount', { count: subzone.rows.length })}</span></div>
        <ul className="capture-list">{subzone.rows.map(row => {
        const caught = pokedex?.caughtSpeciesIds.has(row.speciesId)
        return <li key={row.speciesId} className={caught ? 'captured' : ''} data-species-id={row.speciesId}><a className="pokemon-wiki" href={pokemonWikiUrl(row.name)} target="_blank" rel="noopener noreferrer" aria-label={t('captureChecklist.wikiSearchAria', { name: pokemonDisplayName(row.name) })} title={t('captureChecklist.wikiTitle')}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></a><div className="capture-identity">{(caught || pokedex?.seenSpeciesIds.has(row.speciesId)) && <CapturedPokemonIcon speciesId={row.speciesId} />}<div><strong className="species-name">{pokemonDisplayName(row.name)}</strong><GenderIcon speciesId={row.speciesId} /><span className="capture-state">{!pokedex ? t('captureChecklist.status.noData') : caught ? t('captureChecklist.status.caught') : t('captureChecklist.status.notCaught')}<span className="capture-level"> {t('captureChecklist.minLevel', { level: minimumEncounterLevel(row) ?? "?" })}</span></span></div></div><EncounterMethods details={row.details} /><NpcTradeDetails details={row.details} /><div className="capture-chance-summary"><EncounterChances details={row.details} /><EncounterOpportunity speciesId={row.speciesId} locationId={selected} details={row.details} />{pokedex && !caught && ownedSpeciesIds.size > 0 && <OwnedEvolutionIcon speciesId={row.speciesId} name={row.name} ownedSpeciesIds={ownedSpeciesIds} />}</div><EvolutionButton speciesId={row.speciesId} name={row.name} compact /><details><summary>{t('captureChecklist.encountersSummary')}</summary>{row.details.map((detail, index) => <p key={index}>{areaLabel(detail.area)} · {encounterMethod(detail.method).label} · {t('captureChecklist.levelRange', { min: detail.minLevel, max: detail.maxLevel })}{detail.method !== "npc-trade" && detail.chance !== null ? ` · ${detail.chance}%` : ""}{detail.conditions.length ? ` · ${detail.conditions.join(', ')}` : ''}</p>)}</details></li>
      })}</ul></section>)}
      <p className="hint">{t('captureChecklist.footerHint')}</p>
    </>}
  </section>
}
