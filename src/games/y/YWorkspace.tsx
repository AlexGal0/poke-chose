import { yZoneItems } from './zone-items'
import { Y_INVENTORY_LIMITS } from './inventory'
import { yEvolutionInventory } from './evolution-inventory'
import { yEvolutionRequirements } from './evolution-requirements'
import { yAcquisition } from './acquisition'
import { yConnectionStatus } from './connection-status'
import { showConnectionControls } from '../../components/connection-controls'
import { useTranslation } from 'react-i18next'
import { bridgeSnapshotMessageKey } from '../../i18n/bridge-messages'
import { yDaycareReading, yDaycareService } from './daycare'
import type { BattleConnection } from '../../models/combat'
import { YBattle } from './YBattle'
import { ySavedPokemon } from './saved-roster'
import { GameWorkspace } from '../core/GameWorkspace'
import { createManualStorage } from '../core/manual-storage'
import { GAME_PROFILES } from '../profiles'
import { yCatalog, yCatalogRules } from './catalog'
import { generationVIRules } from '../../domain/type-rules'
import { yKnowledge } from './knowledge'
import { yEncounters } from './encounters'
import { useState } from 'react'
import type { PokedexState } from '../../models/pokedex'
import { YSourceSettings, YCollectionSettings } from './YSourceSettings'
import { createPokedexSource } from '../../sources/pokedex-source'
import { usePokedexSource } from '../../hooks/usePokedexSource'
import { deserializePokedex } from '../../models/pokedex'
import { loadWorkspacePreference } from '../../storage/workspace-preferences'
import { persistValue } from '../../storage/persist'
import type { SourceMode } from '../../components/SourceModeSelect'
import { useSavedRoster } from '../../hooks/useSavedRoster'
import { ySavedRosterService } from './saved-roster'
import { createLivePartySource } from '../../sources/live-party-source'
import { useLivePartySource } from '../../hooks/useLivePartySource'
import { yCollectionMoves } from './collection-service'
import { yCaptureLocation } from './capture-location'
import { yAlbum } from './album'

const game = GAME_PROFILES.find(profile => profile.id === 'y')!
const storage = createManualStorage(yCatalogRules)
const saveSource = createPokedexSource('y-save', 721, undefined, { maxSpecies: 721, boxCount: 31, nicknameLength: 12, inventory: Y_INVENTORY_LIMITS })
const liveSource = createLivePartySource(undefined, undefined, 'y-live')
const noBoxes: [] = []
const noParty: [] = []

export default function YWorkspace({ onChangeGame }: { onChangeGame: () => void }) {
  const { t } = useTranslation()
  const [source, setSource] = useState<SourceMode>(() => loadWorkspacePreference('poke-chose:y:source:v1', ['manual', 'save', 'live'], 'manual'))
  const snapshot = usePokedexSource(saveSource, source === 'save')
  const live = useLivePartySource(liveSource, source === 'live')
  const roster = useSavedRoster(ySavedRosterService, source === 'save' ? snapshot.party : source === 'live' ? live.snapshot.party ?? undefined : undefined, source === 'save' ? snapshot.boxes : source === 'live' ? live.snapshot.boxes ?? noBoxes : undefined, source)
  const dex = source === 'save' ? snapshot.pokedex : source === 'live' ? live.snapshot.pokedex : null
  const pokedex: PokedexState | null = dex ? deserializePokedex(dex) : null
  const [sourceSaveFailed, setSourceSaveFailed] = useState(false)
  function changeSource(next: SourceMode) {
    setSource(next)
    setSourceSaveFailed(!persistValue('poke-chose:y:source:v1', JSON.stringify(next)))
  }
  const inventory = source === 'save' ? yEvolutionInventory(snapshot.capabilities?.inventory ? snapshot.inventory : null, snapshot.status !== 'ready' || snapshot.inventoryStale !== false) : source === 'live' ? yEvolutionInventory(live.snapshot.capabilities.inventory ? live.snapshot.inventory : null, live.snapshot.status !== 'ready' || live.snapshot.inventoryStale !== false) : undefined
  const captureSource = { inventory, pokedex, mode: source, location: yCaptureLocation(source, live.snapshot), stale: source === 'live' ? live.snapshot.status !== 'ready' : snapshot.status !== 'ready', saveFailed: sourceSaveFailed,
    battlePanel: source === 'live' && live.snapshot.capabilities.battle === true ? (onConnectionChange: (connection: BattleConnection) => void) => <YBattle onConnectionChange={onConnectionChange} reading={live.snapshot.battle} status={live.snapshot.status} rules={generationVIRules} resolve={ySavedPokemon} party={roster.party ?? noParty} /> : undefined,
    collectionStale: source === 'live' ? live.snapshot.boxesStatus !== 'ready' : snapshot.status !== 'ready',
    capabilities: { party: true, boxes: true, pokedex: true },
    roster: { ...roster, collection: source === 'live' && live.snapshot.boxes === null ? null : roster.collection, service: ySavedRosterService, boxCount: 31 },
    collectionControls: source === 'live' ? <YCollectionSettings live={live} /> : undefined,
    controls: <YSourceSettings source={source} onChange={changeSource} snapshot={snapshot} live={live} /> }
  const connection = yConnectionStatus(source, snapshot, live.snapshot, {
    manualHint: t('connectionIndicator.manualHint'), saveLabel: t('connectionIndicator.saveReader'), liveLabel: t('connectionIndicator.liveReader'), boxesLabel: t('connectionIndicator.boxesReader'),
    saveMessage: t(bridgeSnapshotMessageKey(snapshot.sourceId, snapshot.message)),
    liveMessage: live.error ? t('sources.yLive.controlError') : t(bridgeSnapshotMessageKey(live.snapshot.sourceId, live.snapshot.message)),
    boxesMessage: t(`sources.yLive.boxStatus.${live.snapshot.boxesStatus}`), controlError: live.error,
  })
  return <GameWorkspace zoneItems={yZoneItems} browseEncountersInManual evolutionRequirements={yEvolutionRequirements} acquisition={yAcquisition} connectionStatus={{ actions: source === 'live' ? { reconnect: async () => { if (!await live.control('reconnect')) throw new Error('Reconnect failed') }, busy: live.busy || live.snapshot.message === 'connecting' } : undefined, data: connection, onOpenControls: showConnectionControls }} daycare={{ reading: yDaycareReading(source, snapshot, live.snapshot), service: yDaycareService }} album={yAlbum} fieldMoveService={yCollectionMoves} game={game} catalog={yCatalog} storage={storage} typeRules={generationVIRules} knowledge={yKnowledge} encounters={yEncounters} initialZoneId={591} captureSource={captureSource} onChangeGame={onChangeGame} />
}
