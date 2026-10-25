import { blackConnectionStatus } from './connection-status'
import { showConnectionControls } from '../../components/connection-controls'
import { blackDaycareReading, blackDaycareService } from './daycare'
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import type { CollectionState, Pokemon } from "../../models/pokemon";
import {
  addToCollection,
  removeFromCollection,
  toggleTeamMember,
} from "../../domain/collection";
import { loadState, saveState, readCache, writeCache } from "../../storage/local";
import { loadActiveTab, saveActiveTab } from '../../storage/active-tab'
import { Catalog } from "../../components/Catalog";
import { PokemonCard } from "../../components/PokemonCard";
import { CollectionDetails } from '../../components/CollectionDetails'
import { IndividualGenderIcon } from '../../components/IndividualGenderIcon'
import { TeamVitals } from '../../components/TeamVitals'
import { HeldItem } from '../../components/HeldItem'
import { Analysis } from "../../components/Analysis";
import { TypeChart } from "../../components/TypeChart";
import { EnemyPrototype } from '../../components/EnemyPrototype'
import type { BattleConnection } from '../../components/EnemyPrototype'
import { ConnectionIndicator } from '../../components/ConnectionIndicator'
import { BattleShortcut } from '../../components/BattleShortcut'
import { ReorderGrid } from '../../components/ReorderGrid'
import { RepelIndicator } from '../../components/RepelIndicator'
import { useBattleNavigation } from '../../hooks/useBattleNavigation'
import { SaveSync } from "../../components/SaveSync";
import { useTeamSource } from '../../hooks/useTeamSource'
import { saveDataSource } from '../../sources/save'
import { liveDataSource, refreshLiveBoxes } from '../../sources/live'
import { manualTeam } from "../../sources/team";
import { CaptureChecklist } from "../../components/CaptureChecklist";
import { SaveCollection } from "../../components/SaveCollection";
import { CollectionSearch } from "../../components/CollectionSearch";
import { FieldMoveFilter } from '../../components/FieldMoveFilter'
import { useFieldMoveFilter } from '../../hooks/useFieldMoveFilter'
import { blackCollectionMoves } from './collection-service'
import { useReaderConnections } from '../../hooks/useReaderConnections'
import { readerStatus } from '../../domain/reader-status'
import { noticeText } from '../../i18n/notice'
import { matchesCollectionTags } from "../../domain/collection-search";
import { typeLabel } from "../../i18n/types.ts";
import "../../App.css";
import { DiscoveryContext } from "../../components/discovery-context";
import { discoveredSpecies } from "../../domain/discovery";
import { EvolutionProvider } from "../../components/EvolutionProvider";
import { MovesProvider } from "../../components/MovesProvider";
import { StatsProvider } from '../../components/StatsProvider'
import { ThemeSelector } from '../../components/ThemeSelector'
import { LocaleSelector } from '../../components/LocaleSelector'
import { BlackDaycare } from './BlackDaycare'
import { DaycareAlertButton } from '../../components/DaycareAlertButton'
import { WorkspaceTabs } from '../../components/WorkspaceTabs'
import { generationVRules } from '../../domain/type-rules'

function BlackWorkspace({ onChangeGame }: { onChangeGame: () => void }) {
  const { t, i18n } = useTranslation();
  const [battleConnection, setBattleConnection] = useState<BattleConnection>({ status: 'waiting', message: t('app.battleWaitingMessage'), inBattle: false })
  const [state, setState] = useState(loadState);
  const [saveFailed, setSaveFailed] = useState(false);
  const [collectionQuery, setCollectionQuery] = useState("");
  const [tab, setActiveTab] = useState(() => {
    const savedTab = loadActiveTab()
    return savedTab === 'battle' && readCache('team-source') !== 'live' ? 'catalog' : savedTab
  })
  const [tabSaveFailed, setTabSaveFailed] = useState(false)
  const [source, setSource] = useState<"manual" | "save" | "live">(() =>
    readCache("team-source") === "live" ? "live" : readCache("team-source") === "save" ? "save" : "manual",
  );
  const saveTeam = useTeamSource(source === "live" ? liveDataSource : source === "save" ? saveDataSource : null);
  const readers = useReaderConnections()
  const sourceMessageKey = saveTeam.message && 'key' in saveTeam.message ? saveTeam.message.key : null
  const generalStatus = readerStatus({
    connected: saveTeam.connected,
    connecting: readers.general.connecting || sourceMessageKey === 'sources.live.messages.connecting',
    error: saveTeam.error || Boolean(readers.general.error),
    paused: sourceMessageKey === 'sources.live.messages.paused',
  })
  const combatStatus = readerStatus({ connected: battleConnection.status === 'ready', connecting: readers.battle.connecting, error: battleConnection.status === 'error' || Boolean(readers.battle.error) })
  const generalMessage = noticeText(t, readers.general.error) || (generalStatus === 'disconnected' && ['sources.loadingSpeciesData', 'sources.partyResolveFailed'].includes(sourceMessageKey ?? '')
    ? t('readerConnections.generalDisconnectedDetail') : noticeText(t, saveTeam.message)) || ''
  const combatMessage = noticeText(t, readers.battle.error) || battleConnection.message
  const manual = manualTeam(state);
  const team = source !== "manual" ? saveTeam.team : manual;
  const collection =
    source !== "manual" ? (saveTeam.collection ?? []) : state.collection;
  const discovered = source !== "manual"
    ? discoveredSpecies(saveTeam.pokedex)
    : new Set(state.collection.map(pokemon => pokemon.id));
  const manualFieldMoves = useFieldMoveFilter(state.collection, blackCollectionMoves)
  const filteredManualCollection = state.collection.filter((pokemon) =>
    matchesCollectionTags(pokemon, collectionQuery, type => typeLabel(t, type)) && manualFieldMoves.matches(pokemon),
  );
  function updateState(next: CollectionState) {
    setState(next);
    setSaveFailed(!saveState(next));
  }
  const navigation = useBattleNavigation({ sourceKey: source, enabled: source === 'live', tab, connection: battleConnection, onSelect: next => {
    setActiveTab(next)
    setTabSaveFailed(!saveActiveTab(next))
  } })
  const { setTab, toggle: toggleBattleShortcut, battleView, canReturn: canReturnFromBattle } = navigation

  function addPokemon(pokemon: Pokemon) {
    updateState(addToCollection(state, pokemon));
  }
  function removePokemon(id: number) {
    updateState(removeFromCollection(state, id));
  }
  function toggleTeam(id: number) {
    updateState(toggleTeamMember(state, id));
  }

  return (
    <DiscoveryContext.Provider value={discovered}><StatsProvider source={source} sourceState={saveTeam}><MovesProvider><EvolutionProvider>
      <header className={`site-header ${battleView ? 'battle-header' : ''}`}>
        <a className="brand" href="#">
          <span className="pokeball" aria-hidden="true" />
          Poké<span>Chose</span>
        </a>
        <div className="header-controls">
          <button className="change-game" onClick={onChangeGame}>{t('games.change')}</button>
          <LocaleSelector />
          <ThemeSelector />
          <div className="game-label">
          POKÉMON BLACK <span>{t('app.gameGeneration')}</span>
          </div>
        </div>
      </header>
      <main className={battleView ? 'battle-layout' : undefined}>
        <div className="intro" hidden={battleView}>
          <div>
            <span className="eyebrow">{t('app.intro.eyebrow')}</span>
            <h1>
              <Trans key={i18n.language} i18nKey="app.intro.heading" components={{ balance: <span /> }} />
            </h1>
            <p>
              {t('app.intro.description')}
            </p>
          </div>
          <span className="save-status" role="status">
            {saveFailed || tabSaveFailed ? t('app.saveStatus.failed') : t('app.saveStatus.ok')}
          </span>
        </div>
        {(saveFailed || tabSaveFailed) && (
          <p className="notice" role="alert">
            {t('app.storageNotice')}
          </p>
        )}
        <details className={`connection-settings ${battleView ? 'compact' : ''}`} open={!battleView}>
          <summary>{t('app.connectionSettingsSummary')}</summary>
        <SaveSync
          source={source}
          onChange={(next) => {
            navigation.reset()
            setSource(next);
            writeCache("team-source", next);
            if (next !== 'live' && tab === 'battle') setTab('catalog')
          }}
          state={saveTeam}
          onConnect={() => { void readers.connect() }}
          connecting={readers.busy}
          generalStatus={generalStatus}
          battleStatus={combatStatus}
          generalMessage={generalMessage}
          battleMessage={combatMessage}
        />
        </details>
        <section className="panel team-panel" aria-labelledby="team-title" hidden={battleView}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t('app.team.eyebrow')}</span>
              <h2 id="team-title">{t('app.team.heading')}</h2>
            </div>
            <span className="count">{team.length} / 6</span>
          </div>
          <ReorderGrid key={source} className="team-grid" itemKeys={team.map((pokemon, index) => source === 'manual' ? String(pokemon.id) : `${saveTeam.team[index].personality}:${saveTeam.team[index].trainerId}`)}>
            {team.map((pokemon, index) => (
              <PokemonCard
                key={pokemon.instanceKey ?? pokemon.id}
                pokemon={pokemon}
                fainted={source !== 'manual' && !saveTeam.team[index].isEgg && saveTeam.team[index].currentHp === 0 && (saveTeam.team[index].maxHp ?? 0) > 0}
                footer={<TeamVitals speciesId={pokemon.id} member={source === 'manual' ? undefined : saveTeam.team[index]} />}
              >
                {source !== "manual" ? (
                  <div className="save-member-info">
                    {saveTeam.team[index].isEgg
                      ? t('app.team.eggLabel')
                      : t('app.team.level', { level: saveTeam.team[index].level })}
                    <HeldItem itemId={saveTeam.team[index].heldItemId} />
                  </div>
                ) : (
                  <button onClick={() => toggleTeam(pokemon.id)}>
                    {t('app.team.removeButton')}
                  </button>
                )}
              </PokemonCard>
            ))}
            {Array.from({ length: 6 - team.length }, (_, index) => (
              <button
                key={index}
                className="empty-slot"
                disabled={source !== "manual"}
                onClick={() => {
                  setTab("collection");
                  document
                    .getElementById("workspace")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                aria-label={t('app.team.chooseAria')}
              >
                <span>+</span>
                <strong>{t('app.team.emptySlotLabel', { number: team.length + index + 1 })}</strong>
                <small>
                  {source !== "manual"
                    ? t('app.team.readOnlyMemberHint')
                    : t('app.team.chooseFromCollection')}
                </small>
              </button>
            ))}
          </ReorderGrid>
          <p className="hint">
            {source !== "manual"
              ? t('app.team.hint.readOnly')
              : team.length === 6
                ? t('app.team.hint.full')
                : t('app.team.hint.editable')}
          </p>
        </section>
        <WorkspaceTabs active={tab} onChange={navigation.selectTab} collectionCount={source !== 'manual' && saveTeam.collection === null ? null : collection.length} live={source === 'live'} />
        <div
          id="workspace-panel"
          role="tabpanel"
          aria-labelledby={`${tab}-tab`}
        >
          <div hidden={tab !== "captures"}>
            <CaptureChecklist pokedex={saveTeam.pokedex} enabled={source !== "manual"} stale={saveTeam.error || !saveTeam.connected} collection={saveTeam.collection} team={saveTeam.team} position={saveTeam.position} positionStale={saveTeam.positionStale} source={source} />
          </div>
          <div hidden={tab !== "catalog"}>
            <Catalog
              collection={collection}
              onAdd={addPokemon}
              readOnly={source !== "manual"}
              pokedex={source !== "manual" ? saveTeam.pokedex : null}
            />
          </div>
          <div hidden={tab !== "collection"}>
          {source !== "manual" ? (
            <SaveCollection key={source} state={saveTeam} live={source === "live"} boxCount={24} types={generationVRules.types} fieldMoveService={blackCollectionMoves} refresh={refreshLiveBoxes} />
          ) : (
            <section className="panel collection-panel" aria-labelledby="collection-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{t('app.collection.eyebrow')}</span>
                  <h2 id="collection-title">{t('app.collection.heading')}</h2>
                </div>
                <span className="count">{t('app.collection.count', { count: state.collection.length })}</span>
              </div>

              <CollectionSearch
                types={generationVRules.types}
                collection={state.collection}
                query={collectionQuery}
                onChange={setCollectionQuery}
              />
              <FieldMoveFilter moves={blackCollectionMoves.moves} selected={manualFieldMoves.selected} onChange={manualFieldMoves.setSelected} loading={manualFieldMoves.loading} error={manualFieldMoves.error} onRetry={manualFieldMoves.retry} />
              {state.collection.length === 0 ? (
                <div className="empty">
                  <p>{t('app.collection.emptyIntro')}</p>
                  <button className="primary" onClick={() => setTab("catalog")}>
                    {t('app.collection.exploreCatalogButton')}
                  </button>
                </div>
              ) : filteredManualCollection.length === 0 ? (
                !manualFieldMoves.loading && !manualFieldMoves.error && <p className="empty">{t('app.collection.noMatches')}</p>
              ) : (
                <div className="pokemon-grid">
                  {filteredManualCollection.map((pokemon) => (
                    <PokemonCard
                      key={pokemon.id}
                      pokemon={pokemon}
                      selected={state.teamIds.includes(pokemon.id)}
                      tools={<IndividualGenderIcon pokemon={pokemon} />}
                      showMoves
                    >
                      <CollectionDetails pokemon={pokemon} />
                      <button
                        className="primary"
                        disabled={
                          !state.teamIds.includes(pokemon.id) &&
                          manual.length === 6
                        }
                        onClick={() => toggleTeam(pokemon.id)}
                      >
                        {state.teamIds.includes(pokemon.id)
                          ? t('app.collection.removeFromTeam')
                          : manual.length === 6
                            ? t('app.collection.teamFull')
                            : t('app.collection.addToTeam')}
                      </button>
                      <button
                        className="remove"
                        onClick={() => removePokemon(pokemon.id)}
                      >
                        {t('app.collection.removeFromCollection')}
                      </button>
                    </PokemonCard>
                  ))}
                </div>
              )}
            </section>
          )}
          </div>
          <div hidden={tab !== "analysis"}>
            <Analysis team={source !== "manual" ? saveTeam.team.filter(member => !member.isEgg) : team} rules={generationVRules} />
          </div>
          <div hidden={tab !== "types"}><TypeChart rules={generationVRules} /></div>
          <div hidden={tab !== 'daycare'}>{tab === 'daycare' && <BlackDaycare state={saveTeam} source={source} />}</div>
          {source === 'live' && <div hidden={tab !== 'battle'}><EnemyPrototype onConnectionChange={setBattleConnection} /></div>}
        </div>
      </main>
      <footer hidden={battleView}>
        PokéChose · Pokémon Black{" "}
        <span>
          <Trans
            key={i18n.language}
            i18nKey="app.footer.credits"
            components={{ pokeapiLink: <a href="https://pokeapi.co/" target="_blank" rel="noreferrer" /> }}
          />
        </span>
      </footer>
      <ConnectionIndicator data={blackConnectionStatus(source, saveTeam, { generalStatus, battleStatus: combatStatus, generalMessage, battleMessage: combatMessage, generalLabel: t('readerConnections.general'), battleLabel: t('readerConnections.battle'), saveLabel: t('connectionIndicator.sourceSave'), saveMessage: noticeText(t, saveTeam.message) || '', manualHint: t('connectionIndicator.manualHint') })} onOpenControls={showConnectionControls} />
      {source !== 'manual' && <DaycareAlertButton reading={blackDaycareReading(saveTeam.daycare, saveTeam.daycareStale, true)} service={blackDaycareService} onClick={() => navigation.openWorkspace('daycare')} />}
      {source === 'live' && <RepelIndicator reading={saveTeam.repel} stale={saveTeam.repelStale} />}
      {source === 'live' && <BattleShortcut inBattle={battleConnection.inBattle} viewingBattle={battleView} canReturn={canReturnFromBattle} onClick={() => toggleBattleShortcut()} />}
    </EvolutionProvider></MovesProvider></StatsProvider></DiscoveryContext.Provider>
  );
}

export default BlackWorkspace;

