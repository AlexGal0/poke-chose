import type { ActiveTab } from '../storage/active-tab.ts'

export function battleShortcutDestination(tab: ActiveTab, returnTab: Exclude<ActiveTab, 'battle'> | null): ActiveTab {
  return tab === 'battle' ? returnTab ?? 'captures' : 'battle'
}

export function battleHasEnded(wasInBattle: boolean, connection: { status: string; inBattle: boolean }): boolean {
  return wasInBattle && connection.status === 'ready' && !connection.inBattle
}

export function battleHasStarted(wasInBattle: boolean, connection: { status: string; inBattle: boolean }): boolean {
  return !wasInBattle && connection.status === 'ready' && connection.inBattle
}
