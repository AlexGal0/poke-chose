import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { promotedToolCount } from './workspace-navigation'
import { useTranslation } from 'react-i18next'
import type { ActiveTab } from '../storage/active-tab'

const PRIMARY_TABS: readonly ActiveTab[] = ['captures', 'catalog', 'collection', 'evolutions']
const TOOL_TABS: readonly ActiveTab[] = ['daycare', 'analysis', 'types', 'battle', 'development']
const TAB_PATHS: Record<ActiveTab, string> = {
  captures: 'M12 22s8-5 8-12a8 8 0 1 0-16 0c0 7 8 12 8 12ZM9 10a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  catalog: 'M4 3h7v18H4V3Zm9 0h7v18h-7V3ZM7 7h1m8 0h1',
  collection: 'M3 7l9-4 9 4v13H3V7Zm0 0 9 4 9-4M12 11v9',
  analysis: 'M4 20h17M7 16V9m6 7V4m6 12v-5',
  daycare: 'M12 3C8 3 4 12 4 16a8 8 0 0 0 16 0c0-4-4-13-8-13ZM8 14l3 2 4-4',
  types: 'M4 4h16v16H4V4Zm0 5h16M9 4v16m6-16v16M4 15h16',
  evolutions: 'M4 18h5V6h11m-5-4 5 4-5 4M9 12h8m-4-4 4 4-4 4',
  battle: 'm4 3 16 16m-5 1 5-5M4 21 20 3M3 16l5 5',
  development: 'm8 5-6 7 6 7m8-14 6 7-6 7m-3-17-2 20',
}

export function WorkspaceTabs({ active, onChange, collectionCount, live = false, available = {} }: {
  active: ActiveTab; onChange: (tab: ActiveTab) => void; collectionCount: number | null; live?: boolean; available?: Partial<Record<ActiveTab, boolean>>
}) {
  const { t } = useTranslation()
  const [width, setWidth] = useState(0)
  const tools = useRef<HTMLDetailsElement>(null)
  const navigation = useRef<HTMLElement>(null)
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !tools.current?.contains(event.target) && tools.current) tools.current.open = false
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  useEffect(() => {
    const element = navigation.current
    if (!element) return
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const primary = PRIMARY_TABS.filter(tab => tab !== 'evolutions' || available.evolutions)
  const candidates = TOOL_TABS.filter(tab => (tab !== 'battle' || live) && (tab !== 'development' || available.development))
  const promoted = promotedToolCount(width, primary.length, candidates.length)
  const visible = [...primary, ...candidates.slice(0, promoted)]
  const secondary = candidates.slice(promoted)
  const toolActive = secondary.includes(active)
  const label = (tab: ActiveTab) => t(tab === 'evolutions' ? 'evolutionRequirements.title' : `app.tabs.${tab}`)
  function select(tab: ActiveTab) {
    if (tools.current) {
      tools.current.open = false
      if (secondary.includes(tab)) tools.current.querySelector('summary')?.focus()
    }
    onChange(tab)
    requestAnimationFrame(() => {
      const panel = document.getElementById(tab === 'development' ? 'development-panel' : 'workspace-panel')
      if (panel && navigation.current) window.scrollTo({ top: Math.max(0, window.scrollY + panel.getBoundingClientRect().top - navigation.current.getBoundingClientRect().height - 12), behavior: 'instant' })
    })
  }
  function keyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (current < 0) return
    const next = event.key === 'ArrowRight' ? (current + 1) % buttons.length : event.key === 'ArrowLeft' ? (current + buttons.length - 1) % buttons.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : -1
    if (next >= 0) { event.preventDefault(); buttons[next].focus(); buttons[next].click() }
  }
  function tabButton(tab: ActiveTab) {
    return <button id={`${tab}-tab`} key={tab} role="tab" aria-selected={active === tab} aria-controls={tab === 'development' ? 'development-panel' : 'workspace-panel'} disabled={available[tab] === false} onClick={() => select(tab)}>
      <svg className="workspace-tab-icon" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={TAB_PATHS[tab]} /></svg>
      <span className="workspace-tab-label">{label(tab)}</span>{tab === 'collection' && <span className="workspace-tab-count">{collectionCount ?? '…'}</span>}
    </button>
  }
  return <nav id="workspace" ref={navigation} className={`workspace-navigation ${secondary.length ? 'has-tools' : 'no-tools'}`} style={{ '--workspace-primary-count': visible.length } as CSSProperties} aria-label={t('app.tabs.ariaLabel')}>
    <div className="tabs workspace-primary-tabs" role="tablist" aria-label={t('workspaceShell.mainSections')} onKeyDown={keyboard}>{visible.map(tabButton)}</div>
    {secondary.length > 0 && <details ref={tools} className={`workspace-tools ${toolActive ? 'has-active-tool' : ''}`} onKeyDown={event => {
      if (event.key === 'Escape' && tools.current) { tools.current.open = false; tools.current.querySelector('summary')?.focus() }
    }}>
      <summary><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm13-1v8m-4-4h8" /></svg><span>{toolActive ? label(active) : t('workspaceShell.tools')}</span><span aria-hidden="true">⌄</span></summary>
      <div className="tabs workspace-tools-list" role="tablist" aria-label={t('workspaceShell.tools')} onKeyDown={keyboard}>{secondary.map(tabButton)}</div>
    </details>}
  </nav>
}
