import { useTranslation } from 'react-i18next'
import { SourceModeSelect } from '../../components/SourceModeSelect'
import type { SourceMode } from '../../components/SourceModeSelect'
import type { PokedexBridgeSnapshot } from '../../sources/pokedex-snapshot'
import '../../components/SaveSync.css'
import { bridgeSnapshotMessageKey } from '../../i18n/bridge-messages'
import type { useLivePartySource } from '../../hooks/useLivePartySource'

export function XSourceSettings({ source, onChange, snapshot, live }: { source: SourceMode; onChange: (source: SourceMode) => void; snapshot: PokedexBridgeSnapshot; live: ReturnType<typeof useLivePartySource> }) {
  const { t, i18n } = useTranslation()
  return <details className="connection-settings" open>
    <summary>{t('app.connectionSettingsSummary')}</summary>
    <section id="connection-settings" className="panel save-sync" aria-label={t('saveSync.sourceLabel')}>
      <SourceModeSelect source={source} onChange={onChange} emulator="Citra" />
      {source === 'live' && <>
        <div className={live.snapshot.status === 'ready' ? 'sync-status' : 'sync-error'} role="status"><strong>{t('connectionIndicator.sourceStatus', { source: 'Citra', status: t(live.snapshot.status === 'ready' ? 'connectionIndicator.connected' : 'connectionIndicator.noActiveReading') })}</strong>
          <p>{t(bridgeSnapshotMessageKey(live.snapshot.sourceId, live.snapshot.message))}</p>
          {live.snapshot.updatedAt && <small>{t('saveSync.lastValidReading', { time: new Date(live.snapshot.updatedAt).toLocaleTimeString(i18n.language) })}</small>}
        </div>
        <button disabled={live.busy} onClick={() => { void live.control(live.snapshot.enabled ? 'disconnect' : 'connect') }}>{t(live.snapshot.enabled ? 'sources.xLive.disconnect' : 'sources.xLive.connect')}</button>
        {live.error && <p role="alert">{t('sources.xLive.controlError')}</p>}
        <p className="hint">{t('sources.xLive.hint')}</p>
      </>}
      {source === 'save' && <>
        <div className={snapshot.status === 'ready' ? 'sync-status' : 'sync-error'} role="status"><strong>{t('connectionIndicator.sourceStatus', { source: 'Citra', status: t(snapshot.status === 'ready' ? 'connectionIndicator.connected' : 'connectionIndicator.noActiveReading') })}</strong>
          <p>{t(bridgeSnapshotMessageKey(snapshot.sourceId, snapshot.message))}</p>{snapshot.updatedAt && <small>{t('saveSync.lastValidReading', { time: new Date(snapshot.updatedAt).toLocaleTimeString(i18n.language) })}{snapshot.status !== 'ready' && ` · ${t('saveSync.staleDataHint')}`}</small>}
        </div>
        <p className="hint">{t('sources.xSave.hint')}</p>
      </>}
    </section>
  </details>
}

export function XCollectionSettings({ live }: { live: ReturnType<typeof useLivePartySource> }) {
  const { t, i18n } = useTranslation()
  return <div className="save-sync">
    <p role="status" className={live.snapshot.boxesStatus === 'error' ? 'notice' : 'hint'}>{t(`sources.xLive.boxStatus.${live.snapshot.boxesStatus}`)}</p>
    {live.snapshot.boxesUpdatedAt && <p className="hint">{t('sources.xLive.boxesLastReading', { time: new Date(live.snapshot.boxesUpdatedAt).toLocaleTimeString(i18n.language) })}</p>}
    <button disabled={live.busy || !live.snapshot.enabled || live.snapshot.boxesStatus === 'reading'} onClick={() => { void live.control('refresh') }}>{t('sources.xLive.refreshCollection')}</button>
  </div>
}
