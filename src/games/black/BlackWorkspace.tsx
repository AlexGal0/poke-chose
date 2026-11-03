import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GameWorkspace } from '../core/GameWorkspace'
import { GAME_PROFILES } from '../profiles'
import { blackCatalog } from './catalog'
import { blackKnowledge } from './knowledge'
import { blackSavedRosterService } from './saved-roster'
import { blackManualStorage } from './storage'
import { blackEncounters } from './encounters'
import { blackAcquisition } from './acquisition'
import { blackAlbum } from './album'
import { blackCollectionMoves } from './collection-service'
import { blackDaycareReading, blackDaycareService } from './daycare'
import { blackEvolutionRequirements, blackEvolutionInventory } from './evolution-requirements'
import { blackCaptureLocation } from './capture-location'
import { blackConnectionStatus } from './connection-status'
import { BlackBattle } from './BlackBattle'
import { generationVRules } from '../../domain/type-rules'
import { loadActiveTab, saveActiveTab } from '../../storage/active-tab'
import { readCache, writeCache } from '../../storage/local'
import { useBlackSource } from './useBlackSource'
import { useSavedRoster } from '../../hooks/useSavedRoster'
import { useSaveInventory } from '../../hooks/useSaveInventory'
import { useReaderConnections } from '../../hooks/useReaderConnections'
import { readerStatus } from '../../domain/reader-status'
import { noticeText } from '../../i18n/notice'
import { saveDataSource } from '../../sources/save'
import { liveDataSource, refreshLiveBoxes } from '../../sources/live'
import { BlackSourceSettings } from './BlackSourceSettings'
import { RepelIndicator } from '../../components/RepelIndicator'
import { showConnectionControls } from '../../components/connection-controls'
import type { BattleConnection } from '../../models/combat'

const game = GAME_PROFILES.find(profile => profile.id === 'black')!
const preferences = { loadTab: loadActiveTab, saveTab: saveActiveTab }

function CollectionControls({ connected, loading, error, stale }: { connected: boolean; loading: boolean; error: boolean; stale: boolean }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'success' | 'genericError' | null>(null)
  async function refresh() {
    setBusy(true)
    setResult(null)
    try { await refreshLiveBoxes(); setResult('success') }
    catch { setResult('genericError') }
    finally { setBusy(false) }
  }
  return <><div className="collection-refresh"><button disabled={!connected || busy} onClick={() => { void refresh() }}>{t(busy ? 'saveCollection.refresh.updating' : 'saveCollection.refresh.button')}</button>{!connected && <span>{t('saveCollection.refresh.connectHint')}</span>}</div>
    {result && <p role={result === 'success' ? 'status' : 'alert'}>{t(`saveCollection.refresh.${result}`)}</p>}
    {loading && <p role="status">{t('saveCollection.syncingNotice')}</p>}{error && <p role="alert">{t('saveCollection.resolveErrorNotice')}</p>}{stale && <p className="notice">{t('saveCollection.staleNotice')}</p>}</>
}

export default function BlackWorkspace({ onChangeGame }: { onChangeGame: () => void }) {
  const { t } = useTranslation()
  const [source, setSource] = useState<'manual' | 'save' | 'live'>(() => readCache('team-source') === 'live' ? 'live' : readCache('team-source') === 'save' ? 'save' : 'manual')
  const [battleConnection, setBattleConnection] = useState<BattleConnection>({ status: 'waiting', message: '', inBattle: false })
  const state = useBlackSource(source === 'manual' ? null : source === 'save' ? saveDataSource : liveDataSource)
  const readers = useReaderConnections()
  const sourceMessageKey = state.message && 'key' in state.message ? state.message.key : null
  const generalStatus = readerStatus({
    connected: state.connected,
    connecting: readers.general.connecting || sourceMessageKey === 'sources.live.messages.connecting',
    error: state.error || Boolean(readers.general.error),
    paused: sourceMessageKey === 'sources.live.messages.paused',
  })
  const combatStatus = readerStatus({ connected: battleConnection.status === 'ready', connecting: readers.battle.connecting, error: battleConnection.status === 'error' || Boolean(readers.battle.error) })
  const generalMessage = noticeText(t, readers.general.error) || (generalStatus === 'disconnected' && ['sources.loadingSpeciesData', 'sources.partyResolveFailed'].includes(sourceMessageKey ?? '')
    ? t('readerConnections.generalDisconnectedDetail') : noticeText(t, state.message)) || ''
  const combatMessage = noticeText(t, readers.battle.error) || battleConnection.message
  const inventory = useSaveInventory(source !== 'manual')
  const roster = useSavedRoster(blackSavedRosterService, state.party ?? undefined, state.boxes ?? undefined, source)
  const stale = !state.connected || state.error || state.partyStale
  const connection = blackConnectionStatus(source, state, { generalStatus, battleStatus: combatStatus, generalMessage, battleMessage: combatMessage,
    generalLabel: t('readerConnections.general'), battleLabel: t('readerConnections.battle'), saveLabel: t('connectionIndicator.sourceSave'), saveMessage: noticeText(t, state.message) || '', manualHint: t('connectionIndicator.manualHint') })
  return <GameWorkspace game={game} catalog={blackCatalog} knowledge={blackKnowledge} storage={blackManualStorage} preferences={preferences}
    typeRules={generationVRules} fieldMoveService={blackCollectionMoves} encounters={blackEncounters} initialZoneId={358}
    acquisition={blackAcquisition} album={blackAlbum} daycare={{ reading: blackDaycareReading(state.daycare, state.daycareStale, source !== 'manual'), service: blackDaycareService }}
    evolutionRequirements={blackEvolutionRequirements}
    notifications={source === 'live' ? <RepelIndicator reading={state.repel} stale={state.repelStale} /> : undefined}
    connectionStatus={{ data: connection, onOpenControls: showConnectionControls, actions: source === 'live' ? { reconnect: readers.connect, busy: readers.busy || generalStatus === 'connecting' || combatStatus === 'connecting' } : undefined }}
    captureSource={{ mode: source, pokedex: state.pokedex, stale: stale || state.pokedexStale, saveFailed: false,
      inventory: { quantities: blackEvolutionInventory(inventory.inventory, inventory.held), stale: inventory.stale },
      location: blackCaptureLocation(source, state.position, stale || state.positionStale, source !== 'manual').reading,
      capabilities: { party: true, boxes: true, pokedex: true },
      roster: { ...roster, service: blackSavedRosterService, boxCount: 24 },
      collectionStale: stale || (state.collectionError || roster.error) || roster.updating,
      collectionControls: source === 'live' ? <CollectionControls connected={state.connected} loading={roster.updating} error={(state.collectionError || roster.error)} stale={stale} /> : undefined,
      battlePanel: source === 'live' ? onConnectionChange => <BlackBattle party={roster.party ?? []} onConnectionChange={onConnectionChange} onStatusChange={setBattleConnection} /> : undefined,
      controls: <BlackSourceSettings source={source} onChange={next => { setSource(next); writeCache('team-source', next); setBattleConnection({ status: 'waiting', message: '', inBattle: false }) }} state={state}
        onConnect={() => { void readers.connect() }} connecting={readers.busy} generalStatus={generalStatus} battleStatus={combatStatus} generalMessage={generalMessage} battleMessage={combatMessage} />,
    }} onChangeGame={onChangeGame} />
}
