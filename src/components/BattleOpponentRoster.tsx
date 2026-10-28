import { useTranslation } from 'react-i18next'
import './BattleOpponentRoster.css'

export function BattleOpponentRoster({ total, stale = false }: { total: number | null; stale?: boolean }) {
  const { t } = useTranslation()
  return <div className="battle-opponent-roster">
    <span className="battle-opponent-roster-label">{t('battleOpponentRoster.heading')}</span>
    {total === null ? <span className="hint">{t('battleOpponentRoster.unknown')}</span> : <>
      <span className="battle-opponent-roster-balls" role="img" aria-label={t('battleOpponentRoster.total', { count: total })}>
        {Array.from({ length: total }, (_, index) => <svg key={index} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M2 12a10 10 0 0 1 20 0Z" fill="var(--danger-text, #ef7a83)" />
          <path d="M2 12a10 10 0 0 0 20 0Z" fill="var(--text, #edf4f8)" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="3" fill="var(--surface-raised, #202a36)" stroke="currentColor" strokeWidth="1.5" />
        </svg>)}
      </span>
      <span className="battle-opponent-roster-total" aria-hidden="true">{total}</span>
      {stale && <small className="hint">{t('battleOpponentRoster.lastConfirmed')}</small>}
    </>}
  </div>
}
