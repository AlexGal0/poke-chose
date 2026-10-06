import { persistValue } from './persist.ts'

const KEY = 'poke-chose:active-tab:v1'
const TABS = ['collection', 'catalog', 'captures', 'analysis', 'types', 'battle'] as const
export type ActiveTab = typeof TABS[number]

export function loadActiveTab(): ActiveTab {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return TABS.find(tab => tab === value) ?? 'catalog'
  } catch { return 'catalog' }
}

export function saveActiveTab(tab: ActiveTab): boolean {
  return persistValue(KEY, JSON.stringify(tab))
}
