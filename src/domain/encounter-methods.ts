import type { BlackEncounterDetail } from '../models/encounters.ts'

// PokéAPI uses walk for ordinary grass and cave floors alike.
// Labels/descriptions live in the encounterMethods.* translation keys; this
// file only carries icons and which method ids are known, so it stays
// locale-free.
const icons: Record<string, string> = {
  walk: '👣',
  'dark-grass': '🌿',
  'grass-spots': '🍃',
  'cave-spots': '🌫️',
  'bridge-spots': '🌉',
  surf: '🌊',
  'surf-spots': '🌀',
  'old-rod': '🎣',
  'good-rod': '🎣',
  'super-rod': '🎣',
  'super-rod-spots': '🐟',
  gift: '🎁',
  'gift-egg': '🥚',
  static: '📍',
  'npc-trade': '🔄',
  'roaming-grass': '🐾',
  'roaming-water': '🐾',
  'rock-smash': '🪨',
  headbutt: '🌳',
}

export function isKnownEncounterMethod(method: string): boolean {
  return Object.hasOwn(icons, method)
}

export function encounterMethodIcon(method: string): string {
  return isKnownEncounterMethod(method) ? icons[method] : '🔎'
}

export function encounterMethods(details: readonly BlackEncounterDetail[]) {
  return [...new Set(details.map(detail => detail.method))].map(method => ({ method, icon: encounterMethodIcon(method) }))
}
