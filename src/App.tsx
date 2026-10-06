import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { CollectionState, Pokemon } from "./models/pokemon";
import {
  addToCollection,
  removeFromCollection,
  toggleTeamMember,
} from "./domain/collection";
import { loadState, saveState, readCache, writeCache } from "./storage/local";
import { loadActiveTab, saveActiveTab } from './storage/active-tab'
import type { ActiveTab } from './storage/active-tab'
import { Catalog } from "./components/Catalog";
import { PokemonCard } from "./components/PokemonCard";
import { TeamVitals } from './components/TeamVitals'
import { HeldItem } from './components/HeldItem'
import { Analysis } from "./components/Analysis";
import { TypeChart } from "./components/TypeChart";
import { EnemyPrototype } from './components/EnemyPrototype'
import type { BattleConnection } from './components/EnemyPrototype'
import { ConnectionIndicator } from './components/ConnectionIndicator'
import { BattleShortcut } from './components/BattleShortcut'
import { battleShortcutDestination, battleHasEnded, battleHasStarted } from './domain/battle-shortcut'
import { SaveSync } from "./components/SaveSync";
import { useTeamSource } from './hooks/useTeamSource'
import { saveDataSource } from './sources/save'
import { liveDataSource } from './sources/live'
import { manualTeam } from "./sources/team";
import { CaptureChecklist } from "./components/CaptureChecklist";
import { SaveCollection } from "./components/SaveCollection";
import { CollectionSearch } from "./components/CollectionSearch";
import { matchesCollectionTags } from "./domain/collection-search";
import "./App.css";
import { DiscoveryContext } from "./components/discovery-context";
import { discoveredSpecies } from "./domain/discovery";
import { EvolutionProvider } from "./components/EvolutionProvider";
import { MovesProvider } from "./components/MovesProvider";
import { ThemeSelector } from './components/ThemeSelector'

function App() {
  const [battleConnection, setBattleConnection] = useState<BattleConnection>({ status: 'waiting', message: 'Esperando el lector de combate.', inBattle: false })
  const returnPoint = useRef<{ tab: Exclude<ActiveTab, 'battle'>; scrollY: number } | null>(null)
  const lastConfirmedBattle = useRef(false)
  const [canReturnFromBattle, setCanReturnFromBattle] = useState(false)
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
  const manual = manualTeam(state);
  const battleView = source === 'live' && tab === 'battle'
  const team = source !== "manual" ? saveTeam.team : manual;
  const collection =
    source !== "manual" ? (saveTeam.collection ?? []) : state.collection;
  const discovered = source !== "manual"
    ? discoveredSpecies(saveTeam.pokedex)
    : new Set(state.collection.map(pokemon => pokemon.id));
  const filteredManualCollection = state.collection.filter((pokemon) =>
    matchesCollectionTags(pokemon, collectionQuery),
  );
  function updateState(next: CollectionState) {
    setState(next);
    setSaveFailed(!saveState(next));
  }
  function setTab(next: ActiveTab, viaShortcut = false) {
    if (!viaShortcut) {
      returnPoint.current = null
      setCanReturnFromBattle(false)
    }
    setActiveTab(next)
    setTabSaveFailed(!saveActiveTab(next))
  }

  function toggleBattleShortcut(scrollToEnd = false) {
    const previous = returnPoint.current
    const next = battleShortcutDestination(tab, previous?.tab ?? null)
    if (tab !== 'battle') {
      returnPoint.current = { tab, scrollY: window.scrollY }
      setCanReturnFromBattle(true)
    } else {
      returnPoint.current = null
      setCanReturnFromBattle(false)
    }
    setTab(next, true)
    requestAnimationFrame(() => {
      if (next === 'battle') window.scrollTo({ top: scrollToEnd ? document.documentElement.scrollHeight : 0, behavior: 'instant' })
      else if (previous) window.scrollTo({ top: previous.scrollY, behavior: 'instant' })
      else document.getElementById('workspace')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  }

  const leaveFinishedBattle = useEffectEvent(() => {
    if (battleView) toggleBattleShortcut()
  })
  const enterNewBattle = useEffectEvent(() => {
    if (!battleView) toggleBattleShortcut(true)
    else requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }))
  })

  useEffect(() => {
    if (source !== 'live') {
      lastConfirmedBattle.current = false
      return
    }
    if (battleHasEnded(lastConfirmedBattle.current, battleConnection)) leaveFinishedBattle()
    if (battleHasStarted(lastConfirmedBattle.current, battleConnection)) enterNewBattle()
    if (battleConnection.status === 'ready') lastConfirmedBattle.current = battleConnection.inBattle
  }, [source, battleConnection])

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
    <DiscoveryContext.Provider value={discovered}><MovesProvider><EvolutionProvider>
      <header className={`site-header ${battleView ? 'battle-header' : ''}`}>
        <a className="brand" href="#">
          <span className="pokeball" aria-hidden="true" />
          Poké<span>Chose</span>
        </a>
        <div className="header-controls">
          <ThemeSelector />
          <div className="game-label">
          POKÉMON BLACK <span>GENERACIÓN V</span>
          </div>
        </div>
      </header>
      <main className={battleView ? 'battle-layout' : undefined}>
        <div className="intro" hidden={battleView}>
          <div>
            <span className="eyebrow">TU PARTIDA. TU ESTRATEGIA.</span>
            <h1>
              Un equipo con <span>equilibrio.</span>
            </h1>
            <p>
              Organiza tu colección y encuentra la combinación para tu próxima
              batalla.
            </p>
          </div>
          <span className="save-status" role="status">
            {saveFailed || tabSaveFailed ? "⚠ No se pudo guardar" : "● Guardado local"}
          </span>
        </div>
        {(saveFailed || tabSaveFailed) && (
          <p className="notice" role="alert">
            El navegador no permite guardar o el almacenamiento está lleno. Los
            cambios de esta sesión podrían perderse al recargar.
          </p>
        )}
        <details className={`connection-settings ${battleView ? 'compact' : ''}`} open={!battleView}>
          <summary>Origen y controles de conexión</summary>
        <SaveSync
          source={source}
          onChange={(next) => {
            returnPoint.current = null
            setCanReturnFromBattle(false)
            setSource(next);
            writeCache("team-source", next);
            if (next !== 'live' && tab === 'battle') setTab('catalog')
          }}
          state={saveTeam}
        />
        </details>
        <section className="panel team-panel" aria-labelledby="team-title" hidden={battleView}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">LISTOS PARA LA BATALLA</span>
              <h2 id="team-title">Tu equipo</h2>
            </div>
            <span className="count">{team.length} / 6</span>
          </div>
          <div className="team-grid">
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
                      ? "Huevo"
                      : `Lv. ${saveTeam.team[index].level}`}
                    <HeldItem itemId={saveTeam.team[index].heldItemId} />
                  </div>
                ) : (
                  <button onClick={() => toggleTeam(pokemon.id)}>
                    Quitar del equipo
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
                aria-label="Elegir Pokémon de la colección"
              >
                <span>+</span>
                <strong>Espacio {team.length + index + 1}</strong>
                <small>
                  {source !== "manual"
                    ? "Sin miembro en la partida"
                    : "Elegir de tu colección"}
                </small>
              </button>
            ))}
          </div>
          <p className="hint">
            {source !== "manual"
              ? "Equipo de solo lectura. Los huevos no participan en el análisis. La cobertura sigue usando STAB."
              : team.length === 6
                ? "Equipo completo. Quita un miembro para cambiarlo por otro."
                : "Elige hasta 6 Pokémon de tu colección. Puedes cambiarlos cuando quieras."}
          </p>
        </section>
        <div
          id="workspace"
          className="tabs"
          role="tablist"
          aria-label="Secciones de PokéChose"
          onKeyDown={event => {
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (current < 0) return;
            const next = event.key === "ArrowRight" ? (current + 1) % buttons.length
              : event.key === "ArrowLeft" ? (current + buttons.length - 1) % buttons.length
                : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
            if (next >= 0) { event.preventDefault(); buttons[next].focus(); buttons[next].click(); }
          }}
        >
          <button id="captures-tab" role="tab" aria-selected={tab === "captures"} aria-controls="workspace-panel" onClick={() => setTab("captures")}>
            Capturas por zona
          </button>
          <button
            id="catalog-tab"
            role="tab"
            aria-selected={tab === "catalog"}
            aria-controls="workspace-panel"
            onClick={() => setTab("catalog")}
          >
            Explorar catálogo
          </button>
          <button
            id="collection-tab"
            role="tab"
            aria-selected={tab === "collection"}
            aria-controls="workspace-panel"
            onClick={() => setTab("collection")}
          >
            Mi colección{" "}
            <span>
              {source !== "manual" && saveTeam.collection === null
                ? "…"
                : collection.length}
            </span>
          </button>
          <button id="analysis-tab" role="tab" aria-selected={tab === "analysis"} aria-controls="workspace-panel" onClick={() => setTab("analysis")}>
            Balance de tipos
          </button>
          <button id="types-tab" role="tab" aria-selected={tab === "types"} aria-controls="workspace-panel" onClick={() => setTab("types")}>
            Tabla de tipos
          </button>
          {source === 'live' && <button id="battle-tab" role="tab" aria-selected={tab === 'battle'} aria-controls="workspace-panel" onClick={() => setTab('battle')}>
            Combate
          </button>}
        </div>
        <div
          id="workspace-panel"
          role="tabpanel"
          aria-labelledby={`${tab}-tab`}
        >
          <div hidden={tab !== "captures"}>
            <CaptureChecklist pokedex={saveTeam.pokedex} enabled={source !== "manual"} stale={saveTeam.error || !saveTeam.connected} collection={saveTeam.collection} team={saveTeam.team} />
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
            <SaveCollection key={source} state={saveTeam} live={source === "live"} />
          ) : (
            <section className="panel collection-panel" aria-labelledby="collection-title">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">03 / TUS COMPAÑEROS</span>
                  <h2 id="collection-title">Mi colección</h2>
                </div>
                <span className="count">{state.collection.length} Pokémon</span>
              </div>

              <CollectionSearch
                collection={state.collection}
                query={collectionQuery}
                onChange={setCollectionQuery}
              />
              {state.collection.length === 0 ? (
                <div className="empty">
                  <p>Tu aventura empieza con el primer Pokémon.</p>
                  <button className="primary" onClick={() => setTab("catalog")}>
                    Explorar catálogo
                  </button>
                </div>
              ) : filteredManualCollection.length === 0 ? (
                <p className="empty">Sin coincidencias en tu colección.</p>
              ) : (
                <div className="pokemon-grid">
                  {filteredManualCollection.map((pokemon) => (
                    <PokemonCard
                      key={pokemon.id}
                      pokemon={pokemon}
                      selected={state.teamIds.includes(pokemon.id)}
                      showMoves
                    >
                      <button
                        className="primary"
                        disabled={
                          !state.teamIds.includes(pokemon.id) &&
                          manual.length === 6
                        }
                        onClick={() => toggleTeam(pokemon.id)}
                      >
                        {state.teamIds.includes(pokemon.id)
                          ? "− Quitar del equipo manual"
                          : manual.length === 6
                            ? "Equipo manual completo"
                            : "+ Al equipo manual"}
                      </button>
                      <button
                        className="remove"
                        onClick={() => removePokemon(pokemon.id)}
                      >
                        Eliminar de colección
                      </button>
                    </PokemonCard>
                  ))}
                </div>
              )}
            </section>
          )}
          </div>
          <div hidden={tab !== "analysis"}>
            <Analysis team={source !== "manual" ? saveTeam.team.filter(member => !member.isEgg) : team} />
          </div>
          <div hidden={tab !== "types"}><TypeChart /></div>
          {source === 'live' && <div hidden={tab !== 'battle'}><EnemyPrototype onConnectionChange={setBattleConnection} /></div>}
        </div>
      </main>
      <footer hidden={battleView}>
        PokéChose · Pokémon Black{" "}
        <span>
          Datos y sprites de{" "}
          <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
            PokéAPI
          </a>{" "}
          · Colección guardada en este navegador
        </span>
      </footer>
      <ConnectionIndicator source={source} state={saveTeam} battle={battleConnection} />
      {source === 'live' && <BattleShortcut inBattle={battleConnection.inBattle} viewingBattle={battleView} canReturn={canReturnFromBattle} onClick={() => toggleBattleShortcut()} />}
    </EvolutionProvider></MovesProvider></DiscoveryContext.Provider>
  );
}

export default App;
