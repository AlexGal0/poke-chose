import { GenerationBadge } from '../../components/GenerationBadge'
import { EncounterNotice } from '../../components/EncounterNotice'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { EncounterAtlasData, EncounterZone } from './encounters'
import { betterEncounterZones, uniqueEncounterZone, mergeEncounterSpecies } from './encounters'
import type { PokedexState } from '../../models/pokedex'
import { encounterChances } from '../../domain/encounter-chances'
import { minimumEncounterLevel } from '../../domain/encounter-levels'
import { speciesGender } from '../../domain/gender'
import { GenderBadge } from './GenderBadge'
import { CaptureEvolutionHint } from './CaptureEvolutionHint'
import { PokedexLookup } from './PokedexLookup'
import { CollectionSearch } from '../../components/CollectionSearch'
import { matchesCollectionTags } from '../../domain/collection-search'
import { methodLabel } from '../../i18n/encounter-methods'
import { atlasConditionLabel, encounterAreaLabel, encounterResourceLabel } from '../../i18n/encounter-atlas'
import { pokemonDisplayName, pokemonWikiUrl } from '../../domain/pokemon-names'
import { TypeBadge } from '../../components/TypeBadge'
import { EncounterMethods } from '../../components/EncounterMethods'
import { KnowledgeActions, ActionIcon } from './KnowledgeActions'
import { persistValue } from '../../storage/persist'
import '../../components/CaptureChecklist.css'
import './EncounterAtlas.css'
import { DiscoveryContext } from '../../components/discovery-context'
import { loadEncounterEquipment } from '../../storage/workspace-preferences'
import { useCaptureZone } from '../../hooks/useCaptureZone'
import { useCaptureFilters } from '../../hooks/useCaptureFilters'
import { captureBrowserView, captureZoneNavigation } from '../../domain/capture-browser'
import type { CaptureLocationReading } from '../../models/capture-location'
import { loadCaptureFollow } from '../../storage/capture-follow'
import { CaptureFilters } from '../../components/CaptureFilters'

function loadZone(key: string, data: EncounterAtlasData, initialId: number) {
  try {
    const id = Number(localStorage.getItem(key))
    if (data.locations.some(zone => zone.id === id)) return id
  } catch { /* Navigation works without storage. */ }
  return data.locations.some(zone => zone.id === initialId) ? initialId : data.locations[0]?.id
}

export function EncounterAtlas({ data, initialZoneId, collectionIds, speciesCatalog, types, pokedex = null, stale = false, location }: { data: EncounterAtlasData; initialZoneId: number; collectionIds: ReadonlySet<number>; types?: readonly string[]; speciesCatalog?: import('./catalog').SpeciesEntry[]; pokedex?: PokedexState | null; stale?: boolean; location?: CaptureLocationReading }) {
  const { t, i18n } = useTranslation()
  const discovered = useContext(DiscoveryContext)
  const storageKey = `poke-chose:${data.version}:encounter-zone:v1`
  const followKey = `poke-chose:${data.version}:follow-location:v1`
  const reading = location ?? { scope: `${data.version}:unavailable`, available: false, zoneId: null, stale: true }
  const zoneControl = useCaptureZone({ reading, validZone: id => data.locations.some(zone => zone.id === id), loadManual: () => loadZone(storageKey, data, initialZoneId), saveManual: id => persistValue(storageKey, String(id)), loadFollow: () => loadCaptureFollow(followKey), saveFollow: enabled => persistValue(followKey, JSON.stringify(enabled)) })
  const { selected, zoneSaved: saved } = zoneControl
  const { query, setQuery, method, setMethod, progress: progressFilter, setProgress: setProgressFilter, zoneQuery, setZoneQuery, saved: filtersSaved } = useCaptureFilters(selected, `poke-chose:${data.version}:capture-filters:v1`)
  const equipmentKey = `poke-chose:${data.version}:encounter-access:v1`
  const [equipment, setEquipment] = useState(() => loadEncounterEquipment(equipmentKey, data.equipmentMethods ?? []))
  const [equipmentSaved, setEquipmentSaved] = useState(true)
  const zone = data.locations.find(zone => zone.id === selected)
  const label = (zone: EncounterZone) => encounterResourceLabel(zone, i18n.language, t)
  const zoneNavigation = captureZoneNavigation(data.locations, selected, zoneQuery, zone => `${label(zone)} ${zone.name} ${zone.stage ? encounterResourceLabel(zone.stage, i18n.language, t) : ''}`)
  const matchingZones = zoneNavigation.matching
  const stageNames = [...new Set(matchingZones.map(zone => zone.stage?.name ?? ''))]
  const { navigation, index } = zoneNavigation
  const allRows = mergeEncounterSpecies(zone?.areas.flatMap(area => area.rows) ?? [])
  const methods = [...new Set(allRows.flatMap(row => row.details.map(detail => detail.method)))]
  const allowed = new Set(methods.filter(value => (method === 'all' || value === method) && equipment[value] !== false))
  const browser = captureBrowserView(allRows, { pokedex, methods: allowed, progress: progressFilter, matches: row => {
    const species = data.species.find(p => p.id === row.speciesId)
    return Boolean(species && matchesCollectionTags(species, query, type => t(`types.${type}`)))
  } })
  const { rows, accessibleRows, subzones } = browser
  function selectZone(id: number) {
    zoneControl.selectZone(id)
  }
  return <div className="capture-panel encounter-atlas">
    <div className="section-heading"><h2 id="encounter-atlas-title">{t('games.modules.captures')}</h2><span className="count">{t('common.speciesCount', { count: rows.length })}</span></div>
    {!filtersSaved && <p className="notice" role="status">{t('captureFilters.saveFailed')}</p>}
    {pokedex && <PokedexLookup pokedex={pokedex} species={speciesCatalog?.length ? speciesCatalog : data.species} />}
    {!pokedex && <p className="hint">{t('captureChecklist.waitingForPokedex')}</p>}
    {stale && pokedex && <p className="notice" role="status">{t('captureChecklist.staleNotice')}</p>}
    {pokedex && accessibleRows.length > 0 && <p className="atlas-progress" role="status">{t('encounterAtlas.caughtInZone', { caught: accessibleRows.filter(row => pokedex.caughtSpeciesIds.has(row.speciesId)).length, total: accessibleRows.length })}</p>}
    <div className="zone-controls">
      <label className="zone-search">{t('captureChecklist.zoneSearchLabel')}<input type="search" value={zoneQuery} onChange={event => setZoneQuery(event.target.value)} placeholder={t('encounterAtlas.zonePlaceholder')} /></label>
      <div className="zone-select"><label htmlFor="atlas-zone">{t('captureChecklist.zoneLabel')}</label><div className="zone-navigation">
        <button title={index > 0 ? t('captureChecklist.previousZoneTitle', { zone: label(navigation[index - 1]) }) : t('captureChecklist.firstZoneTitle')} disabled={index <= 0} aria-label={t('captureChecklist.previousZoneAria')} onClick={() => selectZone(navigation[index - 1].id)}>←</button>
        <select id="atlas-zone" value={selected} onChange={event => selectZone(Number(event.target.value))}>
          {zone && !matchingZones.includes(zone) && <optgroup label={t('captureChecklist.currentZoneGroupLabel')}><option value={zone.id}>{label(zone)}</option></optgroup>}
          {stageNames.map(stage => {
            const zones = matchingZones.filter(zone => (zone.stage?.name ?? '') === stage)
            const options = zones.map(zone => <option key={zone.id} value={zone.id}>{label(zone)}</option>)
            return zones[0].stage ? <optgroup key={stage} label={encounterResourceLabel(zones[0].stage, i18n.language, t)}>{options}</optgroup> : options
          })}
        </select><button title={index >= 0 && index < navigation.length - 1 ? t('captureChecklist.nextZoneTitle', { zone: label(navigation[index + 1]) }) : t('captureChecklist.lastZoneTitle')} disabled={index < 0 || index >= navigation.length - 1} aria-label={t('captureChecklist.nextZoneAria')} onClick={() => selectZone(navigation[index + 1].id)}>→</button>
        {reading.available && <button type="button" className="zone-follow-toggle" aria-label={t('captureChecklist.location.follow')} title={t('captureChecklist.location.follow')} aria-pressed={zoneControl.follow} onClick={() => zoneControl.setFollow(!zoneControl.follow)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /></svg></button>}
      </div></div>
    </div>
    {zoneQuery && <p role="status" className="hint">{matchingZones.length ? t('captureChecklist.zonesFoundCount', { count: matchingZones.length }) : t('captureChecklist.noZoneMatches')}</p>}
    {!saved && <p className="notice" role="status">{t('captureChecklist.zoneSaveFailed')}</p>}
    {!zoneControl.followSaved && <p className="notice" role="status">{t('captureChecklist.location.saveFailed')}</p>}
    {reading.available && <>
      <p className="hint" role="status">{reading.stale ? t('captureChecklist.location.stale') : reading.zoneId !== null && data.locations.some(zone => zone.id === reading.zoneId) ? t('encounterAtlas.detectedZone', { zone: label(data.locations.find(zone => zone.id === reading.zoneId)!) }) : t('encounterAtlas.unknownZone')}</p>
    </>}
    <CollectionSearch showHint={false} collection={data.species.filter(p => allRows.some(row => row.speciesId === p.id))} types={types ?? [...new Set(data.species.flatMap(p => p.types))]} searchLabel={t('encounterAtlas.speciesSearch')} placeholder={t('encounterAtlas.speciesPlaceholder')} query={query} onChange={setQuery} />
    <CaptureFilters methods={methods} method={method} onMethodChange={setMethod} progress={progressFilter} onProgressChange={setProgressFilter} pokedexAvailable={pokedex !== null} />
    {Object.keys(equipment).length > 0 && <fieldset className="encounter-equipment"><legend>{t('captureChecklist.equipment.legend')}</legend>{Object.keys(equipment).map(value => <label key={value}><input type="checkbox" checked={equipment[value]} onChange={event => {
      const next = { ...equipment, [value]: event.target.checked }
      setEquipment(next)
      setEquipmentSaved(persistValue(equipmentKey, JSON.stringify(next)))
    }} />{methodLabel(t, value)}</label>)}</fieldset>}
    {allRows.length > accessibleRows.length && <p className="hint">{t('captureChecklist.equipment.hiddenCount', { count: allRows.length - accessibleRows.length })}</p>}
    {!equipmentSaved && <p className="notice" role="status">{t('captureChecklist.equipment.filterSaveFailed')}</p>}
    {rows.some(row => row.details.some(detail => detail.method === 'horde')) && <p className="hint">{t('encounterAtlas.hordeHint')}</p>}
    {zone?.noticeKey && <p className="notice">{t(zone.noticeKey)}</p>}
    {!rows.length && <p className="empty" role="status">{t(allRows.length ? 'encounterAtlas.noMatches' : 'encounterAtlas.noRecordedObtaining')}</p>}
    {zone && subzones.map(subzone => {
      const area = zone.areas.find(area => area.name === subzone.area)!
      return <section className="capture-subzone" key={subzone.area} aria-label={encounterAreaLabel(t, area, zone, i18n.language)}>
        <div className="capture-subzone-heading"><h3>{encounterAreaLabel(t, area, zone, i18n.language)}</h3><span className="count">{t('common.speciesCount', { count: subzone.rows.length })}</span></div>
        <ul className="capture-list">{subzone.rows.map(row => {
          const pokemon = data.species.find(species => species.id === row.speciesId)
          const gender = pokemon && speciesGender(pokemon.genderRate)
          const alternatives = betterEncounterZones(row.speciesId, selected!, row.details, data.locations)
          const chances = encounterChances(row.details)
          const caught = pokedex?.caughtSpeciesIds.has(row.speciesId)
          return <li key={row.speciesId} className={caught ? 'captured' : ''}>
            <a className="pokemon-wiki" href={pokemonWikiUrl(row.name)} target="_blank" rel="noopener noreferrer" aria-label={t('common.wikiSearchAria', { name: pokemonDisplayName(row.name) })}><ActionIcon kind="external" /></a>
            <GenerationBadge speciesId={row.speciesId} />
            <div className="capture-identity"><span className="capture-sprite-slot">{discovered.has(row.speciesId) && pokemon?.sprite ? <img src={pokemon.sprite} width="64" height="64" alt="" loading="lazy" /> : <span aria-label={t('pokemonCard.notDiscovered')}>?</span>}</span><div><div className="capture-name-line"><strong className="species-name">{pokemonDisplayName(row.name)}</strong>{gender && <GenderBadge kind={gender.kind} species distribution={pokemon?.genderDistribution} />}</div>
              <span className="capture-state">#{row.speciesId} {t('captureChecklist.minLevel', { level: minimumEncounterLevel(row) ?? '?' })}</span>{collectionIds.has(row.speciesId) && <small>{t('catalog.card.status.inCollection')}</small>}
              {pokedex && <span className="capture-state">{t(caught ? 'encounterAtlas.progressStates.caught' : pokedex.seenSpeciesIds.has(row.speciesId) ? 'encounterAtlas.progressStates.seen' : 'encounterAtlas.progressStates.unseen')}</span>}
            </div></div>
            {pokemon && <div className="types">{pokemon.types.map(type => <TypeBadge type={type} key={type} />)}</div>}
            <div className="atlas-obtaining"><EncounterMethods details={row.details} />
            {row.details.filter(detail => detail.trade || detail.instructionsKey).map((detail, index) => <p className="hint" key={`instructions-${index}`}>{detail.trade && <strong>{t('encounterAtlas.requestedPokemon', { name: detail.trade.requested === 'any' ? t('encounterAtlas.anyPokemon') : pokemonDisplayName(detail.trade.requested) })} </strong>}{t(detail.trade?.instructionsKey ?? detail.instructionsKey!)}</p>)}
            </div>
            <div className="atlas-chances"><span className="encounter-chances-label">{t('encounterChances.label')}</span>{chances.map(group => <div className="atlas-chance" key={group.key}>
              <span>{methodLabel(t, group.method)}</span><strong>{group.chance}%</strong><meter min="0" max="100" value={group.chance} aria-label={methodLabel(t, group.method)} />
              {group.conditions.length > 0 && <small>{group.conditions.map(condition => atlasConditionLabel(t, condition)).join(' · ')}</small>}
            </div>)}</div>
            <div className="atlas-insights">
            <div className="atlas-notices">
            {uniqueEncounterZone(row.speciesId, selected!, data.locations) && <EncounterNotice kind="unique" message={t('encounterAtlas.uniqueZone')} />}
            {alternatives.some(alternative => data.locations.indexOf(alternative.zone) > data.locations.findIndex(zone => zone.id === selected)) && <EncounterNotice kind="later" message={t('encounterAtlas.betterLater')} />}
            </div>
            {pokemon && pokedex && !caught && collectionIds.size > 0 && <CaptureEvolutionHint pokemon={pokemon} owned={collectionIds} />}
            {alternatives.length > 0 && <details className="atlas-alternatives"><summary>{t('encounterAtlas.betterElsewhere')}</summary>{alternatives.filter((value, index, all) => all.findIndex(other => other.zone.id === value.zone.id && other.method === value.method && other.chance === value.chance && JSON.stringify(other.conditions) === JSON.stringify(value.conditions)) === index).map((alternative, index) => <p key={index}><button onClick={() => selectZone(alternative.zone.id)}>{label(alternative.zone)}</button> · {methodLabel(t, alternative.method)}: {alternative.chance}%{alternative.conditions.length > 0 && ` · ${alternative.conditions.map(condition => atlasConditionLabel(t, condition)).join(' · ')}`}</p>)}</details>}
            </div>
            {pokemon ? <KnowledgeActions pokemon={pokemon} /> : <div />}
            <details><summary>{t('encounterAtlas.details')}</summary>{area.rows.filter(value => value.speciesId === row.speciesId).flatMap(value => value.details.filter(detail => allowed.has(detail.method)).map((detail, index) => <p key={`${value.variety}-${index}`}>
              {value.variety !== value.name && <strong>{t(`encounterAtlas.varieties.${value.variety}`, { defaultValue: value.variety })} · </strong>}{methodLabel(t, detail.method)} · {t('captureChecklist.levelRange', { min: detail.minLevel, max: detail.maxLevel })}{detail.chance !== null && ` · ${detail.chance}%`}
              {detail.conditions.length > 0 && ` · ${detail.conditions.map(condition => atlasConditionLabel(t, condition)).join(' · ')}`}{detail.pokemonDetails?.never_shiny && ` · ${t('encounterAtlas.shinyLocked')}`}
            </p>))}</details>
          </li>
        })}</ul>
      </section>
    })}
    <p className="hint">{t('encounterAtlas.source', { game: t(`games.names.${data.version}`), count: data.locations.length, date: new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(data.retrieved)) })} <a href="https://pokeapi.co/docs/v2#location-areas" target="_blank" rel="noreferrer">PokéAPI</a>{data.extraSources?.map(source => <span key={source.url}> · <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a></span>)}</p>
  </div>
}
