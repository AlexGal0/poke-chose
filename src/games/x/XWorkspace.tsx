import { xAcquisition } from './acquisition'
import { xConnectionStatus } from './connection-status'
import { showConnectionControls } from '../../components/connection-controls'
import { useTranslation } from 'react-i18next'
import { bridgeSnapshotMessageKey } from '../../i18n/bridge-messages'
import { xDaycareReading, xDaycareService } from './daycare'
import type { BattleConnection } from '../../models/combat'
import { XBattle } from './XBattle'
import { xSavedPokemon } from './saved-roster'
import { ManualWorkspace } from '../core/ManualWorkspace'
import { createManualStorage } from '../core/manual-storage'
import { GAME_PROFILES } from '../profiles'
import { xCatalog, xCatalogRules } from './catalog'
import { generationVIRules } from '../../domain/type-rules'
import { xKnowledge } from './knowledge'
import { xEncounters } from './encounters'
import { useState } from 'react'
import type { PokedexState } from '../../models/pokedex'
import { XSourceSettings, XCollectionSettings } from './XSourceSettings'
import { createPokedexSource } from '../../sources/pokedex-source'
import { usePokedexSource } from '../../hooks/usePokedexSource'
import { deserializePokedex } from '../../models/pokedex'
import { loadWorkspacePreference } from '../../storage/workspace-preferences'
import { persistValue } from '../../storage/persist'
import type { SourceMode } from '../../components/SourceModeSelect'
import { useSavedRoster } from '../../hooks/useSavedRoster'
import { xSavedRosterService } from './saved-roster'
import { createLivePartySource } from '../../sources/live-party-source'
import { useLivePartySource } from '../../hooks/useLivePartySource'
import { xCollectionMoves } from './collection-service'
import { xCaptureLocation } from './capture-location'
import { xAlbum } from './album'

const game = GAME_PROFILES.find(profile => profile.id === 'x')!
const storage = createManualStorage(xCatalogRules)
const saveSource = createPokedexSource('x-save', 721, undefined, { maxSpecies: 721, boxCount: 31, nicknameLength: 12 })
const liveSource = createLivePartySource()
const noBoxes: [] = []
const noParty: [] = []

export default function XWorkspace({ onChangeGame }: { onChangeGame: () => void }) {
  const { t } = useTranslation()
  const [source, setSource] = useState<SourceMode>(() => loadWorkspacePreference('poke-chose:x:source:v1', ['manual', 'save', 'live'], 'manual'))
  const snapshot = usePokedexSource(saveSource, source === 'save')
  const live = useLivePartySource(liveSource, source === 'live')
  const roster = useSavedRoster(xSavedRosterService, source === 'save' ? snapshot.party : source === 'live' ? live.snapshot.party ?? undefined : undefined, source === 'save' ? snapshot.boxes : source === 'live' ? live.snapshot.boxes ?? noBoxes : undefined, source)
  const dex = source === 'save' ? snapshot.pokedex : source === 'live' ? live.snapshot.pokedex : null
  const pokedex: PokedexState | null = dex ? deserializePokedex(dex) : null
  const [sourceSaveFailed, setSourceSaveFailed] = useState(false)
  function changeSource(next: SourceMode) {
    setSource(next)
    setSourceSaveFailed(!persistValue('poke-chose:x:source:v1', JSON.stringify(next)))
  }
  const captureSource = { pokedex, mode: source, location: xCaptureLocation(source, live.snapshot), stale: source === 'live' ? live.snapshot.status !== 'ready' : snapshot.status !== 'ready', saveFailed: sourceSaveFailed,
    battlePanel: source === 'live' && live.snapshot.capabilities.battle === true ? (onConnectionChange: (connection: BattleConnection) => void) => <XBattle onConnectionChange={onConnectionChange} reading={live.snapshot.battle} status={live.snapshot.status} rules={generationVIRules} resolve={xSavedPokemon} party={roster.party ?? noParty} /> : undefined,
    collectionStale: source === 'live' ? live.snapshot.boxesStatus !== 'ready' : snapshot.status !== 'ready',
    capabilities: { party: true, boxes: true, pokedex: true },
    roster: { ...roster, collection: source === 'live' && live.snapshot.boxes === null ? null : roster.collection, service: xSavedRosterService, boxCount: 31 },
    collectionControls: source === 'live' ? <XCollectionSettings live={live} /> : undefined,
    controls: <XSourceSettings source={source} onChange={changeSource} snapshot={snapshot} live={live} /> }
  const connection = xConnectionStatus(source, snapshot, live.snapshot, {
    manualHint: t('connectionIndicator.manualHint'), saveLabel: t('connectionIndicator.saveReader'), liveLabel: t('connectionIndicator.liveReader'), boxesLabel: t('connectionIndicator.boxesReader'),
    saveMessage: t(bridgeSnapshotMessageKey(snapshot.sourceId, snapshot.message)),
    liveMessage: live.error ? t('sources.xLive.controlError') : t(bridgeSnapshotMessageKey(live.snapshot.sourceId, live.snapshot.message)),
    boxesMessage: t(`sources.xLive.boxStatus.${live.snapshot.boxesStatus}`), controlError: live.error,
  })
  return <ManualWorkspace acquisition={xAcquisition} connectionStatus={{ actions: source === 'live' ? { reconnect: async () => { if (!await live.control('reconnect')) throw new Error('Reconnect failed') }, busy: live.busy || live.snapshot.message === 'connecting' } : undefined, data: connection, onOpenControls: showConnectionControls }} daycare={{ reading: xDaycareReading(source, snapshot, live.snapshot), service: xDaycareService }} album={xAlbum} fieldMoveService={xCollectionMoves} game={game} catalog={xCatalog} storage={storage} typeRules={generationVIRules} knowledge={xKnowledge} encounters={xEncounters} initialZoneId={591} captureSource={captureSource} onChangeGame={onChangeGame} />
}
