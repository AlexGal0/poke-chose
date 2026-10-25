import { useTranslation } from 'react-i18next'
import type { ActiveTab } from '../storage/active-tab'

const WORKSPACE_TAB_ORDER = ['captures', 'catalog', 'collection', 'analysis', 'daycare', 'types'] as const
export function WorkspaceTabs({ active, onChange, collectionCount, live = false, available = {} }: {
  active: ActiveTab; onChange: (tab: ActiveTab) => void; collectionCount: number | null; live?: boolean; available?: Partial<Record<ActiveTab, boolean>>
}) {
  const { t } = useTranslation()
  const workspace: readonly ActiveTab[] = available.evolutions ? [...WORKSPACE_TAB_ORDER, 'evolutions'] : WORKSPACE_TAB_ORDER
  const tabs: readonly ActiveTab[] = live ? [...workspace, 'battle'] : workspace
  return <div id="workspace" className="tabs" role="tablist" aria-label={t('app.tabs.ariaLabel')} onKeyDown={event => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (current < 0) return
    const next = event.key === 'ArrowRight' ? (current + 1) % buttons.length : event.key === 'ArrowLeft' ? (current + buttons.length - 1) % buttons.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1
    if (next >= 0) { event.preventDefault(); buttons[next].focus(); buttons[next].click() }
  }}>
    {tabs.map(tab => <button id={`${tab}-tab`} key={tab} role="tab" aria-selected={active === tab} aria-controls="workspace-panel" disabled={available[tab] === false} onClick={() => onChange(tab)}>
      {t(tab === 'evolutions' ? 'evolutionRequirements.title' : `app.tabs.${tab}`)}{tab === 'collection' && <> <span>{collectionCount ?? '…'}</span></>}
    </button>)}
  </div>
}
