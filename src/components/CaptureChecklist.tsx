import { pokemonDisplayName, pokemonWikiUrl } from '../domain/pokemon-names'
import { useEffect, useState } from 'react'
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
  return <details className="dex-lookup"><summary>Consultar especie en la Pokédex · {pokedex.caughtSpeciesIds.size} capturadas / {pokedex.seenSpeciesIds.size} vistas</summary>
    <p className="hint">Registro global de tu partida, incluidas especies obtenidas por evolución o intercambio. Esta consulta no indica encuentros salvajes en Black.</p>
    <input type="search" value={query} onChange={event => setQuery(event.target.value)} aria-label="Consultar especie en la Pokédex" placeholder="Nombre o número, ej. minccino o 572" />
    {error && <p className="notice">No se pudo cargar el catálogo. <button onClick={() => { setError(false); setAttempt(value => value + 1) }}>Reintentar catálogo</button></p>}
    <ul>{matches.map(row => <li key={row.id} data-dex-species-id={row.id}><strong className="species-name">{pokemonDisplayName(row.name)}</strong> · {pokedex.caughtSpeciesIds.has(row.id) ? '✓ Capturado' : '○ No capturado'} <small>({pokedex.seenSpeciesIds.has(row.id) ? 'Visto' : 'No visto'})</small></li>)}</ul>
    {query && !matches.length && catalog.length > 0 && <p className="hint">Sin coincidencias.</p>}
  </details>
}

export function CaptureChecklist({ pokedex, enabled, stale, collection, team }: { pokedex: PokedexState | null; enabled: boolean; stale: boolean; collection: readonly CollectionPokemon[] | null; team: readonly PartyPokemon[] }) {
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
      if (!controller.signal.aborted) setError('No se pudo cargar la lista de zonas de PokéAPI.')
    })
    return () => controller.abort()
  }, [enabled, attempt])
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    getBlackEncounters(selected, controller.signal).then(rows => {
      if (!controller.signal.aborted) setResult({ locationId: selected, rows })
    }).catch(() => {
      if (!controller.signal.aborted) setError('No se pudieron cargar los encuentros de Black. Comprueba tu conexión.')
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
    <div className="section-heading"><div><span className="eyebrow">POKÉDEX / POKÉMON BLACK</span><h2 id="capture-title">Capturas por zona</h2></div>{checklist && <span className="count" aria-live="polite">Capturados: {checklist.caught} / {checklist.total}</span>}</div>
    <p className="hint">Capturada alguna vez en esta partida según la Pokédex. Ver una especie no completa la checklist; evolucionarla o liberarla no borra su captura.</p>
    <p className="hint">↗ Mayor probabilidad en una zona posterior · 📍 Única zona natural registrada en PokéAPI para Black. Pasa el cursor o toca el icono para consultar la comparación. Sin icono: no hay una mejora comparable ni una zona única registrada.</p>
    {!enabled ? <p className="empty">Selecciona Save de melonDS para consultar la Pokédex de tu partida de Black.</p> : <>
      {pokedex && <PokedexLookup pokedex={pokedex} />}
      <div className="zone-controls">
        <label className="zone-search">Buscar zona <input type="search" value={zoneQuery} onChange={event => setZoneQuery(event.target.value)} placeholder="Ej. Mayólica, cueva o ruta 6" /></label>
        <div className="zone-select"><label htmlFor="capture-zone">Zona</label><div className="zone-navigation">
        <button type="button" className="zone-previous" disabled={!previousZone} aria-label="Zona anterior" title={previousZone ? `Zona anterior: ${zoneLabel(previousZone)}` : 'Primera zona de la lista'} onClick={() => { if (previousZone) selectZone(previousZone.id) }}>←</button>
        <select id="capture-zone" value={selected} onChange={event => selectZone(Number(event.target.value))}>
          {!currentZone && <option value={selected}>{zoneLabel({ id: selected, name: '' })}</option>}
          {currentZone && !matchingZones.some(location => location.id === selected) && <optgroup label="Zona actual"><option value={selected}>{zoneLabel(currentZone)}</option></optgroup>}
          {ZONE_STAGES.map(stage => {
            const group = matchingZones.filter(location => zoneStage(location) === stage)
            return group.length > 0 ? <optgroup key={stage} label={stage}>{group.map(location => <option key={location.id} value={location.id}>{zoneLabel(location)}</option>)}</optgroup> : null
          })}
        </select>
        <button type="button" className="zone-next" disabled={!nextZone} aria-label="Zona siguiente" title={nextZone ? `Zona siguiente: ${zoneLabel(nextZone)}` : 'Última zona de la lista'} onClick={() => { if (nextZone) selectZone(nextZone.id) }}>→</button>
        </div></div>
      </div>
      {!zoneSaved && <p className="notice" role="status">La zona cambió, pero no se pudo guardar para la próxima sesión.</p>}
      {zoneQuery && <p className="hint" role="status">{matchingZones.length ? `${matchingZones.length} zonas encontradas.` : 'Sin coincidencias. La zona actual se conserva; cambia o borra la búsqueda.'}</p>}
      <p className="hint">Orden orientativo de primera visita en Pokémon Negro. Los desvíos opcionales se agrupan aparte; puedes volver a zonas anteriores.</p>
      <fieldset className="encounter-equipment"><legend>Mis objetos y habilidades</legend>
        <label><input type="checkbox" checked={access.surf} onChange={event => { const next = { ...access, surf: event.target.checked }; setAccess(next); setAccessSaved(saveEncounterAccess(next)) }} /> Puedo usar Surf (MO03)</label>
        <label><input type="checkbox" checked={access.superRod} onChange={event => { const next = { ...access, superRod: event.target.checked }; setAccess(next); setAccessSaved(saveEncounterAccess(next)) }} /> Tengo Supercaña</label>
      </fieldset>
      <p className="hint">Marca tus recursos manualmente; se recuerdan en este navegador. Surf requiere un Pokémon que lo pueda usar. El filtro afecta a los métodos de encuentro, no verifica obstáculos ni progreso para llegar a la zona.{allRows && allRows.length > rows!.length ? ` Ocultas: ${allRows.length - rows!.length} especies sin métodos habilitados.` : ''}</p>
      {!accessSaved && <p className="notice" role="status">El filtro funciona, pero no se pudo guardar para la próxima sesión.</p>}
      {error && <p className="notice" role="alert">{error} <button onClick={() => { setError(''); setAttempt(value => value + 1) }}>Reintentar encuentros</button></p>}
      {!pokedex && <p className="hint">Esperando una Pokédex válida de la partida. El estado de captura todavía es desconocido.</p>}
      {stale && pokedex && <p className="notice">Mostrando la última Pokédex válida; comprueba el estado de sincronización.</p>}
      {!rows && !error && <p className="empty" role="status">Cargando encuentros de Black…</p>}
      {rows && rows.length === 0 && <p className="empty">{allRows?.length ? 'No hay encuentros con tus recursos actuales en esta zona. Habilita Surf o Supercaña si los tienes.' : 'PokéAPI no registra encuentros para Pokémon Black en esta zona.'}</p>}
      {subzones.map((subzone, index) => <section className="capture-subzone" key={subzone.area} aria-labelledby={`capture-subzone-${index}`} data-area={subzone.area}>
        <div className="capture-subzone-heading"><h3 id={`capture-subzone-${index}`}>{areaLabel(subzone.area)}</h3><span className="count">{subzone.rows.length} especies</span></div>
        <ul className="capture-list">{subzone.rows.map(row => {
        const caught = pokedex?.caughtSpeciesIds.has(row.speciesId)
        return <li key={row.speciesId} className={caught ? 'captured' : ''} data-species-id={row.speciesId}><a className="pokemon-wiki" href={pokemonWikiUrl(row.name)} target="_blank" rel="noopener noreferrer" aria-label={`Buscar ${pokemonDisplayName(row.name)} en WikiDex (nueva pestaña)`} title="Consultar en WikiDex"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></svg></a><div className="capture-identity">{(caught || pokedex?.seenSpeciesIds.has(row.speciesId)) && <CapturedPokemonIcon speciesId={row.speciesId} />}<div><strong className="species-name">{pokemonDisplayName(row.name)}</strong><GenderIcon speciesId={row.speciesId} /><span className="capture-state">{!pokedex ? '— Sin datos de la partida' : caught ? '✓ Capturado' : '○ No capturado'}<span className="capture-level"> · Nv. mín. {minimumEncounterLevel(row) ?? "?"}</span></span></div></div><EncounterMethods details={row.details} /><NpcTradeDetails details={row.details} /><div className="capture-chance-summary"><EncounterChances details={row.details} /><EncounterOpportunity speciesId={row.speciesId} locationId={selected} details={row.details} />{pokedex && !caught && ownedSpeciesIds.size > 0 && <OwnedEvolutionIcon speciesId={row.speciesId} name={row.name} ownedSpeciesIds={ownedSpeciesIds} />}</div><EvolutionButton speciesId={row.speciesId} name={row.name} compact /><details><summary>Encuentros en Black</summary>{row.details.map((detail, index) => <p key={index}>{areaLabel(detail.area)} · {encounterMethod(detail.method).label} · Nv. {detail.minLevel}–{detail.maxLevel}{detail.method !== "npc-trade" && detail.chance !== null ? ` · ${detail.chance}%` : ""}{detail.conditions.length ? ` · ${detail.conditions.join(', ')}` : ''}</p>)}</details></li>
      })}</ul></section>)}
      <p className="hint">Incluye los encuentros de PokéAPI para Black y los cinco intercambios con personajes del juego original. No es una lista de todas las especies obtenibles por evolución, eventos o intercambio con otros jugadores. Los porcentajes corresponden a cada tabla/condición; no se aplican a los intercambios con personajes.</p>
    </>}
  </section>
}
