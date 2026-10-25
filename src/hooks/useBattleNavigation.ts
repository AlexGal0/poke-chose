import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { ActiveTab } from '../storage/active-tab'
import type { BattleConnection } from '../models/combat'
import { battleHasStarted, battleHasEnded, battleShortcutDestination } from '../domain/battle-shortcut'

function centerBattlers() {
  const participants = [...document.querySelectorAll<HTMLElement>('.battle-participant')].filter(element => element.getClientRects().length)
  if (!participants.length) return
  const bounds = participants.map(element => element.getBoundingClientRect())
  const top = Math.min(...bounds.map(rect => rect.top))
  const bottom = Math.max(...bounds.map(rect => rect.bottom))
  // On narrow screens the stacked cards are taller than the viewport: start at the active Pokémon.
  window.scrollTo({ top: Math.max(0, window.scrollY + top - Math.max(16, (window.innerHeight - (bottom - top)) / 2)), behavior: 'instant' })
}

// Extracted from BlackWorkspace, including return tab, scroll and automatic entry/exit.
export function useBattleNavigation({ sourceKey, enabled, tab, onSelect, connection }: {
  sourceKey: string; enabled: boolean; tab: ActiveTab; onSelect: (tab: ActiveTab) => void; connection: BattleConnection
}) {
  const [returnPoint, setReturnPoint] = useState<{ sourceKey: string; tab: Exclude<ActiveTab, 'battle'>; scrollY: number } | null>(null)
  const pendingScroll = useRef<{ tab: ActiveTab; top: number | 'battlers' | 'workspace'; sourceKey?: string } | null>(null)
  const confirmed = useRef({ sourceKey, active: false })
  const previous = returnPoint?.sourceKey === sourceKey ? returnPoint : null
  const battleView = enabled && tab === 'battle'
  function reset() { setReturnPoint(null); pendingScroll.current = null }
  function setTab(next: ActiveTab, viaShortcut = false) {
    if (!viaShortcut) reset()
    onSelect(next)
  }
  function toggle(focusBattlers = false) {
    const next = battleShortcutDestination(tab, previous?.tab ?? null)
    if (tab !== 'battle') setReturnPoint({ sourceKey, tab, scrollY: window.scrollY })
    else setReturnPoint(null)
    pendingScroll.current = { sourceKey, tab: next, top: next === 'battle' ? focusBattlers ? 'battlers' : 0 : previous?.scrollY ?? 'workspace' }
    setTab(next, true)
  }
  function selectTab(next: ActiveTab) {
    if (next === 'battle') { if (tab !== 'battle') toggle() }
    else setTab(next)
  }
  function openWorkspace(next: ActiveTab) {
    setTab(next)
    pendingScroll.current = { sourceKey, tab: next, top: 'workspace' }
    if (tab === next) document.getElementById('workspace')?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  useLayoutEffect(() => {
    const pending = pendingScroll.current
    if (!pending || pending.tab !== tab || (pending.sourceKey && pending.sourceKey !== sourceKey)) return
    pendingScroll.current = null
    if (pending.top === 'workspace') document.getElementById('workspace')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    else if (pending.top === 'battlers') centerBattlers()
    else window.scrollTo({ top: pending.top, behavior: 'instant' })
  }, [tab, sourceKey])
  const leave = useEffectEvent(() => { if (battleView) toggle() })
  const enter = useEffectEvent(() => {
    if (!battleView) toggle(true)
    else requestAnimationFrame(centerBattlers)
  })
  useEffect(() => {
    if (!enabled) { confirmed.current = { sourceKey, active: false }; return }
    const wasInBattle = confirmed.current.sourceKey === sourceKey && confirmed.current.active
    if (battleHasEnded(wasInBattle, connection)) leave()
    if (battleHasStarted(wasInBattle, connection)) enter()
    if (connection.status === 'ready') confirmed.current = { sourceKey, active: connection.inBattle }
  }, [sourceKey, enabled, connection])
  return { setTab, selectTab, toggle, reset, openWorkspace, battleView, canReturn: previous !== null }
}
