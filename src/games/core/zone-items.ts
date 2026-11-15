/** Stable item and occurrence identifiers are adapter-owned, never localized names. */
export const ZONE_ITEM_CATEGORIES = ['evolution', 'machine', 'key', 'held', 'medicine', 'ball', 'berry', 'treasure', 'other'] as const
export type ZoneItemCategory = typeof ZONE_ITEM_CATEGORIES[number]
export type ZoneItemMethod = 'pickup' | 'hidden' | 'gift' | 'reward' | 'exchange' | 'purchase' | 'harvest' | 'unknown'

export interface ZoneItemMove {
  generation: number
  id: string
  name: string
  type: string
  category: 'physical' | 'special' | 'status' | 'unconfirmed'
  pp: number
  power: number | null
  accuracy: number | null
  description: string | null
  descriptionLanguage: string | null
}

export interface ZoneItem {
  id: string
  name: string
  icon: string | null
  category: ZoneItemCategory
  description: string | null
  descriptionLanguage: string | null
  machine?: { kind: 'tm' | 'hm'; number: number; move: ZoneItemMove }
}

/** A specific way to obtain an item; repeated items retain separate locations/conditions. */
export interface ZoneItemOccurrence {
  id: string
  zoneId: number
  item: ZoneItem
  method: ZoneItemMethod
  instructions: string | null
  instructionsLanguage: string | null
  requirements?: string | null
  requirementSource?: string | null
  source: string
  purchase?: { shop: string; price: string }
}

export interface ZoneItemsResult {
  zoneId: number
  /** Missing coverage is not evidence that the zone has no items. */
  coverage: 'documented' | 'unrecorded'
  source: string | null
  retrieved: string
  occurrences: readonly ZoneItemOccurrence[]
}

export interface ZoneItemsService {
  id: string
  load(zoneId: number, locale: string, signal?: AbortSignal): Promise<ZoneItemsResult>
  /** Shares the same occurrence index as load; ready for an item→zones screen. */
  find(itemId: string, locale: string, signal?: AbortSignal): Promise<readonly ZoneItemOccurrence[]>
}
