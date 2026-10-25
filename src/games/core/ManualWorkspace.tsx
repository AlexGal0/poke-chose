import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import type { ConnectionStatus } from '../../models/connection-status'
import { WorkspaceDaycare } from './WorkspaceDaycare'
import { DaycareAlertButton } from '../../components/DaycareAlertButton'
import type { DaycareReading, DaycareService } from './daycare'
import { useBattleNavigation } from '../../hooks/useBattleNavigation'
import { BattleShortcut } from '../../components/BattleShortcut'
import type { BattleConnection } from '../../models/combat'
import { GenerationBadge } from '../../components/GenerationBadge'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CollectionState } from '../../models/pokemon'
import { addToCollection, removeFromCollection, toggleTeamMember } from '../../domain/collection'
import { pokemonDisplayName } from '../../domain/pokemon-names'
import { LocaleSelector } from '../../components/LocaleSelector'
import { ThemeSelector } from '../../components/ThemeSelector'
import type { GameProfile } from '../profiles'
import { GAME_MODULES } from '../profiles'
import type { CatalogService, ManualPokemon, SpeciesEntry } from './catalog'
import type { createManualStorage } from './manual-storage'
import './ManualWorkspace.css'
import { Analysis } from '../../components/Analysis'
import { TypeChart } from '../../components/TypeChart'
import type { TypeRules } from '../../domain/type-analysis'
import { KnowledgeProvider } from './KnowledgeProvider'
import { KnowledgeActions } from './KnowledgeActions'
import type { KnowledgeService } from './knowledge'
import type { EncounterAtlasData } from './encounters'
import { EncounterAtlas } from './EncounterAtlas'
import type { PokedexState } from '../../models/pokedex'
import { DiscoveryContext } from '../../components/discovery-context'
import { discoveredSpecies } from '../../domain/discovery'
import { WorkspaceTabs } from '../../components/WorkspaceTabs'
import type { SourceMode } from '../../components/SourceModeSelect'
import { loadWorkspacePreference } from '../../storage/workspace-preferences'
import { persistValue } from '../../storage/persist'
import type { SavedRosterPokemon, SavedRosterService } from './saved-roster'
import { SavedRosterCard } from './SavedRosterCard'
import { CollectionSearch } from '../../components/CollectionSearch'
import { matchesCollectionTags } from '../../domain/collection-search'
import { SavedRosterCollection } from './SavedRosterCollection'
import { ReorderGrid } from '../../components/ReorderGrid'
import { useFieldMoveFilter } from '../../hooks/useFieldMoveFilter'
import { FieldMoveFilter } from '../../components/FieldMoveFilter'
import type { FieldMoveService } from '../../domain/field-moves'
import type { CaptureLocationReading } from '../../models/capture-location'
import type { AlbumService } from './album'
import { SecretAlbum } from '../../components/SecretAlbum'

function ManualCard({ pokemon, children }: { pokemon: ManualPokemon; children?: React.ReactNode }) {
  const { t } = useTranslation()
  const discovered = useContext(DiscoveryContext).has(pokemon.id)
  return <article className="pokemon-card">
    <GenerationBadge speciesId={pokemon.id} />
    <span className="dex-number">#{String(pokemon.id).padStart(3, '0')}</span>
    <div className="sprite">{discovered && pokemon.sprite
      ? <img src={pokemon.sprite} width="96" height="96" loading="lazy" alt={pokemonDisplayName(pokemon.name)} />
      : <span aria-label={t(discovered ? 'pokemonCard.spriteUnavailable' : 'pokemonCard.notDiscovered')}>?</span>}</div>
    <h3>{pokemonDisplayName(pokemon.name)}</h3>
    <div className="types">{pokemon.types.map(type => <span key={type} className={`type type-${type}`}>{t(`types.${type}`)}</span>)}</div>
    <KnowledgeActions pokemon={pokemon} />
    <div className="card-actions">{children}</div>
  </article>
}

function CatalogCard({ entry, service, collected, onAdd, readOnly = false, caught = null }: {
  entry: SpeciesEntry; service: CatalogService; collected: boolean; onAdd: (pokemon: ManualPokemon) => void
  readOnly?: boolean; caught?: boolean | null
}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<{ pokemon?: ManualPokemon; error?: boolean }>({})
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    service.get(entry, controller.signal).then(pokemon => {
      if (!controller.signal.aborted) setResult({ pokemon })
    }).catch(() => { if (!controller.signal.aborted) setResult({ error: true }) })
    return () => controller.abort()
  }, [entry, service, attempt])
  if (!result.pokemon) return <article className="pokemon-card loading-card">
    <GenerationBadge speciesId={entry.id} />
    <span className="dex-number">#{entry.id}</span><h3>{pokemonDisplayName(entry.name)}</h3>
    {result.error ? <><p role="alert">{t('catalog.card.loadError')}</p><button onClick={() => { setResult({}); setAttempt(value => value + 1) }}>{t('common.retry')}</button></> : <p role="status">{t('catalog.card.loading')}</p>}
  </article>
  const pokemon = result.pokemon
  return <ManualCard pokemon={pokemon}>{readOnly ? <p className="catalog-capture-state">{t(caught === null ? 'catalog.card.status.noPokedexData' : caught ? 'catalog.card.status.everCaught' : 'catalog.card.status.notCaught')}</p> : <button className="primary" disabled={collected} onClick={() => onAdd(pokemon)}>
    {t(collected ? 'catalog.card.status.inCollection' : 'catalog.card.addButton')}
  </button>}</ManualCard>
}

const PAGE_SIZE = 12
const VIEWS = ['catalog', 'collection', 'analysis', 'types', 'captures', 'battle', 'daycare'] as const
type View = typeof VIEWS[number]

export function ManualWorkspace({ game, catalog: service, storage, typeRules, knowledge, encounters, initialZoneId, captureSource, fieldMoveService, album, daycare, connectionStatus, onChangeGame }: {
  connectionStatus?: { data: ConnectionStatus; onOpenControls: () => void }
  daycare?: { reading: DaycareReading; service: DaycareService }
  album?: AlbumService
  game: GameProfile; catalog: CatalogService; storage: ReturnType<typeof createManualStorage>; typeRules: TypeRules; knowledge: KnowledgeService; fieldMoveService: FieldMoveService; onChangeGame: () => void
  encounters?: EncounterAtlasData; initialZoneId?: number
  captureSource?: { pokedex: PokedexState | null; controls: React.ReactNode; collectionControls?: React.ReactNode; mode: SourceMode; stale: boolean; saveFailed: boolean
    location?: CaptureLocationReading
    battlePanel?: (onConnectionChange: (connection: BattleConnection) => void) => React.ReactNode
    collectionStale?: boolean
    capabilities?: { party: boolean; boxes: boolean; pokedex: boolean }
    roster?: { party: SavedRosterPokemon[] | null; collection: SavedRosterPokemon[] | null; loading: boolean; updating: boolean; error: boolean; retry: () => void; service: SavedRosterService; boxCount: number } }
}) {
  const { t } = useTranslation()
  const [state, setState] = useState(storage.load)
  const [saveFailed, setSaveFailed] = useState(false)
  const [tabSaveFailed, setTabSaveFailed] = useState(false)
  const [selectedView, setSelectedView] = useState<View>(() => loadWorkspacePreference(`poke-chose:${game.id}:active-tab:v1`, VIEWS, 'catalog'))
  const editable = !captureSource || captureSource.mode === 'manual'
  const roster = !editable ? captureSource?.roster : undefined
  const analysisAvailable = editable || roster?.party != null
  const view = (!analysisAvailable && selectedView === 'analysis') || (selectedView === 'battle' && !captureSource?.battlePanel) || (selectedView === 'daycare' && (!game.modules.daycare || !daycare)) ? 'catalog' : selectedView
  function persistView(next: View) {
    setSelectedView(next)
    setTabSaveFailed(!persistValue(`poke-chose:${game.id}:active-tab:v1`, JSON.stringify(next)))
  }
  const [lastWorkspaceView, setLastWorkspaceView] = useState<Exclude<View, 'battle'>>(() => selectedView === 'battle' ? 'catalog' : selectedView)
  if (view !== 'battle' && lastWorkspaceView !== view) setLastWorkspaceView(view)
  const workspaceView = view === 'battle' ? lastWorkspaceView : view
  const sourceKey = captureSource?.mode ?? 'manual'
  const [combat, setCombat] = useState<{ sourceKey: string; connection: BattleConnection }>({ sourceKey, connection: { status: 'waiting', message: '', inBattle: false } })
  const onBattleConnection = useCallback((connection: BattleConnection) => setCombat({ sourceKey, connection }), [sourceKey])
  const connection = combat.sourceKey === sourceKey ? combat.connection : { status: 'waiting', message: '', inBattle: false }
  const navigation = useBattleNavigation({ sourceKey, enabled: Boolean(captureSource?.battlePanel), tab: view, connection, onSelect: next => {
    if (VIEWS.some(view => view === next)) persistView(next as View)
  } })
  const battleView = navigation.battleView
  function setView(next: View) { navigation.setTab(next) }
  const [entries, setEntries] = useState<SpeciesEntry[]>([])
  const [catalogError, setCatalogError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [catalogQuery, setCatalogQuery] = useState('')
  const [collectionQuery, setCollectionQuery] = useState('')
  const query = workspaceView === 'collection' ? collectionQuery : catalogQuery
  function setQuery(next: string) { if (workspaceView === 'collection') setCollectionQuery(next); else setCatalogQuery(next) }
  const [scope, setScope] = useState('regional')
  const [page, setPage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    service.list(controller.signal).then(rows => {
      if (!controller.signal.aborted) setEntries(rows)
    }).catch(() => { if (!controller.signal.aborted) setCatalogError(true) })
    return () => controller.abort()
  }, [service, attempt])

  function update(next: CollectionState<ManualPokemon>) {
    setState(next)
    setSaveFailed(!storage.save(next))
  }
  const team = editable ? state.teamIds.flatMap(id => state.collection.filter(p => p.id === id)) : roster?.party ?? []
  const manualFieldMoves = useFieldMoveFilter(state.collection, fieldMoveService)
  const normalizeAnalysis = (pokemon: SavedRosterPokemon) => ({ ...pokemon, currentHp: pokemon.partyMember?.currentHp, maxHp: pokemon.partyMember?.maxHp })
  const analysisTeam = editable ? team : (roster?.party ?? []).map(normalizeAnalysis)
  const analysisCollection = editable ? state.collection : roster?.collection?.map(normalizeAnalysis) ?? null
  const discovered = editable ? new Set(state.collection.map(pokemon => pokemon.id)) : discoveredSpecies(captureSource?.pokedex ?? null)
  const matches = (entry: SpeciesEntry) => matchesCollectionTags({ ...entry, types: entry.types ?? [] }, query, type => t(`types.${type}`))
  const filtered = entries.filter(entry => (scope === 'all' || !service.rules.regionalSpeciesIds || service.rules.regionalSpeciesIds.includes(entry.id)) && matches(entry))
  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const pending = GAME_MODULES.filter(module => !game.modules[module])

  return <DiscoveryContext.Provider value={discovered}><KnowledgeProvider key={captureSource?.mode ?? 'manual'} service={knowledge} game={game} individuals={roster?.collection ?? roster?.party ?? []} stale={captureSource?.stale} >
    <header className={`site-header manual-header ${battleView ? 'battle-header' : ''}`}>
      <div className="brand-lockup">{album && <SecretAlbum key={sourceKey} service={album} owned={editable ? new Set(state.collection.map(pokemon => pokemon.id)) : captureSource?.pokedex?.caughtSpeciesIds ?? new Set()} seen={discovered} />}<span className="brand">Poké<span>Chose</span></span></div>
      <div className="header-controls"><button onClick={onChangeGame}>{t('games.change')}</button><LocaleSelector /><ThemeSelector /></div>
    </header>
    <main className={battleView ? 'battle-layout' : undefined}>
      <div className="intro" hidden={battleView}><div><span className="eyebrow">{t(`games.regions.${game.region}`)} · {t('games.generation', { number: game.generation })}</span>
        <h1>{t(`games.names.${game.id}`)}</h1><p>{t('workspaceRules.description')}</p></div>
        <span className="save-status" role="status">{t(saveFailed || tabSaveFailed || captureSource?.saveFailed ? 'app.saveStatus.failed' : 'app.saveStatus.ok')}</span>
      </div>
      {(saveFailed || tabSaveFailed || captureSource?.saveFailed) && <p className="notice" role="alert">{t('app.storageNotice')}</p>}
      <details className={`connection-settings ${battleView ? 'compact' : ''}`} open={!battleView}><summary>{t('app.connectionSettingsSummary')}</summary>{captureSource?.controls}</details>
      <section className="panel" aria-labelledby="manual-team-title" hidden={battleView}>
        <div className="section-heading"><h2 id="manual-team-title">{t('games.modules.team')}</h2><span className="count">{editable || roster?.party != null ? team.length : '…'} / 6</span></div>
        {!editable && roster?.party == null && <p className="notice" role="status">{t(roster?.error ? 'savedRoster.resolveError' : roster?.loading ? 'savedRoster.loading' : 'sourceCapabilities.partyWaiting')}{roster?.error && <button onClick={roster.retry}>{t('common.retry')}</button>}</p>}
        {!editable && captureSource?.stale && roster?.party != null && <p className="notice" role="status">{t(captureSource.capabilities?.boxes === false ? 'sourceCapabilities.partyStale' : 'savedRoster.stale')}</p>}
        <ReorderGrid key={sourceKey} className="team-grid" itemKeys={!editable && roster?.party ? roster.party.map(p => `${p.personality}:${p.trainerId}`) : team.map(p => String(p.id))}>{!editable && roster?.party ? roster.party.map(pokemon => <SavedRosterCard key={pokemon.instanceKey} pokemon={pokemon} service={roster.service} />) : team.map(pokemon => <ManualCard key={pokemon.id} pokemon={pokemon}>
          <button onClick={() => update(toggleTeamMember(state, pokemon.id))}>{t('app.team.removeButton')}</button>
        </ManualCard>)}{Array.from({ length: 6 - team.length }, (_, index) => <button className="empty-slot" key={index} disabled={!editable}
          onClick={() => { setView('collection'); setQuery(''); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }) }}>
          <span aria-hidden="true">+</span><strong>{t('app.team.emptySlotLabel', { number: team.length + index + 1 })}</strong><small>{t(editable ? 'app.team.chooseFromCollection' : roster?.party != null ? 'app.team.readOnlyMemberHint' : 'workspaceRules.saveTeamUnavailable')}</small>
        </button>)}</ReorderGrid><p className="hint">{t(editable ? team.length === 6 ? 'app.team.hint.full' : 'app.team.hint.editable' : 'app.team.hint.readOnly')}</p>
      </section>
      <WorkspaceTabs live={Boolean(captureSource?.battlePanel)} active={view} collectionCount={editable ? state.collection.length : roster?.collection?.length ?? null} available={{ daycare: game.modules.daycare && Boolean(daycare), analysis: game.modules.analysis && analysisAvailable, captures: game.modules.captures && Boolean(encounters) }} onChange={next => { if (VIEWS.some(view => view === next)) navigation.selectTab(next) }} />
      <section className={battleView ? undefined : 'panel'} id="workspace-panel" role="tabpanel" aria-labelledby={`${view}-tab`}>
        {captureSource?.battlePanel && <div hidden={view !== 'battle'} key={sourceKey}>{captureSource.battlePanel(onBattleConnection)}</div>}
        <div hidden={view === 'battle'}>
        {!editable && <div hidden={view !== 'collection'} key={sourceKey}>{captureSource?.collectionControls}{captureSource?.capabilities?.boxes === false ? <><h2>{t('app.tabs.collection')}</h2><p className="empty" role="status">{t('sourceCapabilities.boxesUnavailable')}</p></> : roster?.collection ? <SavedRosterCollection fieldMoveService={fieldMoveService} collection={roster.collection} service={roster.service} boxCount={roster.boxCount} types={service.rules.types} /> : <><h2>{t('app.tabs.collection')}</h2><p className="empty">{t(roster?.error ? 'savedRoster.resolveError' : roster?.loading ? 'savedRoster.loading' : 'sourceCapabilities.collectionWaiting')}</p></>}</div>}
        {encounters && <div hidden={view !== 'captures'} key={`captures:${sourceKey}`}>{editable ? <><h2>{t('app.tabs.captures')}</h2><p className="empty">{t('workspaceRules.capturesManualHint', { game: t(`games.names.${game.id}`) })}</p></> : captureSource?.capabilities?.pokedex === false ? <p className="empty" role="status">{t('sourceCapabilities.pokedexUnavailable')}</p> : <EncounterAtlas location={captureSource?.location} data={encounters} initialZoneId={initialZoneId ?? encounters.locations[0]?.id ?? 0} types={service.rules.types} speciesCatalog={entries} collectionIds={new Set([...(roster?.collection ?? []), ...(roster?.party ?? [])].filter(p => !p.isEgg).map(p => p.id))} pokedex={captureSource?.pokedex ?? null} stale={captureSource?.stale} />}</div>}
        {workspaceView === 'daycare' ? daycare && <WorkspaceDaycare key={sourceKey} reading={daycare.reading} service={daycare.service} hint={t(editable ? 'daycare.manual' : !daycare.reading.available ? 'daycare.sourceUnavailable' : captureSource?.mode === 'save' ? 'daycare.saveHint' : 'daycare.liveHint')} /> : workspaceView === 'captures' ? null : workspaceView === 'analysis' ? <Analysis key={captureSource?.mode ?? 'manual'} team={analysisTeam} rules={typeRules} collection={analysisCollection} stale={!editable && (captureSource?.stale || roster?.updating)} collectionStale={!editable && captureSource?.collectionStale} /> : workspaceView === 'types' ? <TypeChart rules={typeRules} /> : workspaceView === 'collection' && !editable ? null : <>
        <div className="section-heading"><h2 id="manual-workspaceView-title">{t(`games.modules.${workspaceView}`)}</h2><span className="count">{t('common.speciesCount', { count: workspaceView === 'catalog' ? filtered.length : state.collection.length })}</span></div>
        <CollectionSearch collection={workspaceView === 'catalog' ? entries.map(p => ({ types: p.types ?? [] })) : state.collection} types={service.rules.types} searchLabel={workspaceView === 'catalog' ? t('catalog.searchAriaLabel') : undefined} query={query} onChange={next => { setQuery(next); setPage(0) }} />
        {workspaceView === 'collection' && <FieldMoveFilter moves={fieldMoveService.moves} selected={manualFieldMoves.selected} onChange={manualFieldMoves.setSelected} loading={manualFieldMoves.loading} error={manualFieldMoves.error} onRetry={manualFieldMoves.retry} />}<div className="search-row">
          {workspaceView === 'catalog' && <select aria-label={t('catalog.scopeAriaLabel')} value={scope} onChange={event => { setScope(event.target.value); setPage(0) }}>
            <option value="regional">{t('catalog.scopeRegional', { region: t(`games.regions.${game.region}`) })}</option><option value="all">{t('manualWorkspace.national', { number: game.generation })}</option>
          </select>}
        </div>
        {workspaceView === 'catalog' ? <>
          <p className="hint">{t('manualWorkspace.catalogHint')}</p>
          {catalogError ? <p className="empty" role="alert">{t('catalog.loadError')} <button onClick={() => { setCatalogError(false); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>
            : entries.length === 0 ? <p className="empty" role="status">{t('catalog.loadingCatalog')}</p>
              : filtered.length === 0 ? <p className="empty">{t('catalog.noMatches')}</p>
                : <><div className="pokemon-grid">{filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(entry => <CatalogCard key={entry.id} entry={entry} service={service}
                  collected={editable && state.collection.some(p => p.id === entry.id)} readOnly={!editable} caught={captureSource?.pokedex?.caughtSpeciesIds.has(entry.id) ?? null} onAdd={pokemon => update(addToCollection(state, pokemon))} />)}</div>
                  <nav className="pagination" aria-label={t('catalog.paginationAriaLabel')}><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>{t('common.previousPage')}</button><span>{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>{t('common.nextPage')}</button></nav></>}
        </> : state.collection.length === 0 ? <div className="empty"><p>{t('app.collection.emptyIntro')}</p><button onClick={() => setView('catalog')}>{t('app.collection.exploreCatalogButton')}</button></div>
          : <div className="pokemon-grid">{state.collection.filter(p => matches(p) && manualFieldMoves.matches(p)).map(pokemon => <ManualCard key={pokemon.id} pokemon={pokemon}>
            <button className="primary" disabled={!state.teamIds.includes(pokemon.id) && team.length === 6} onClick={() => update(toggleTeamMember(state, pokemon.id))}>
              {t(state.teamIds.includes(pokemon.id) ? 'app.collection.removeFromTeam' : team.length === 6 ? 'app.collection.teamFull' : 'app.collection.addToTeam')}
            </button><button className="remove" onClick={() => update(removeFromCollection(state, pokemon.id))}>{t('app.collection.removeFromCollection')}</button>
          </ManualCard>)}{state.collection.filter(p => matches(p) && manualFieldMoves.matches(p)).length === 0 && !manualFieldMoves.loading && !manualFieldMoves.error && <p className="empty">{t('catalog.noMatches')}</p>}</div>}
        </>}
        </div>
      </section>
      <section className="panel" aria-labelledby="pending-modules-title" hidden={battleView}><h2 id="pending-modules-title">{t('manualWorkspace.pendingHeading')}</h2>
        <p className="hint" id="pending-modules-description">{t('manualWorkspace.pendingHint')}</p>
        <div className="game-modules">{pending.map(module => <button disabled key={module} aria-describedby="pending-modules-description"><strong>{t(`games.modules.${module}`)}</strong><span>{t('games.pending')}</span></button>)}</div>
      </section>
    </main>
    <footer hidden={battleView}><span>PokéChose · {t(`games.names.${game.id}`)}</span><a href="https://pokeapi.co/" target="_blank" rel="noreferrer">PokéAPI</a></footer>
    {connectionStatus && <ConnectionIndicator data={connectionStatus.data} onOpenControls={connectionStatus.onOpenControls} />}
    {daycare && <DaycareAlertButton reading={daycare.reading} service={daycare.service} onClick={() => navigation.openWorkspace('daycare')} />}
    {captureSource?.battlePanel && <BattleShortcut inBattle={connection.inBattle} viewingBattle={battleView} canReturn={navigation.canReturn} onClick={() => navigation.toggle()} />}
  </KnowledgeProvider></DiscoveryContext.Provider>
}
