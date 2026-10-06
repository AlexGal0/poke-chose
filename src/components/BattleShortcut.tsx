import { useTranslation } from 'react-i18next'
import './BattleShortcut.css'

export function BattleShortcut({ inBattle, viewingBattle, canReturn, onClick }: { inBattle: boolean; viewingBattle: boolean; canReturn: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  const action = viewingBattle ? canReturn ? t('battleShortcut.returnToPrevious') : t('battleShortcut.goTo', { destination: t('app.tabs.captures') }) : t('battleShortcut.goTo', { destination: t('app.tabs.battle') })
  const label = t('battleShortcut.combined', { action, status: inBattle ? t('battleShortcut.detected') : t('battleShortcut.notConfirmed') })
  return <button type="button" className={`battle-floating-button ${inBattle ? 'active' : 'inactive'}`} onClick={onClick} title={label} aria-label={label} aria-pressed={viewingBattle}>
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 3 4 1 12 12-4 4L4 8 3 4zM14 18l6-6M16 20l3 3M3 21l3-3M4 16l4 4M4 16l4-4M14 8l6-5 1 1-1 4-5 6" />
    </svg>
    {viewingBattle && <span className="battle-shortcut-return" aria-hidden="true">↩</span>}
  </button>
}
