import { useEffect, useState } from 'react'
import { saveDataSource } from '../sources/save'
import { isSaveSnapshot } from '../models/party'
import type { InventoryItem } from '../models/inventory'

const empty = { inventory: null as InventoryItem[] | null, held: {} as Record<number, number>, stale: true, updatedAt: null as string | null }
export function useSaveInventory(enabled: boolean) {
  const [state, setState] = useState(empty)
  useEffect(() => {
    if (!enabled) return
    return saveDataSource.subscribe(event => {
      if (event.type === 'repel') return
      if (event.type === 'connection') {
        if (!event.connected) setState(previous => ({ ...previous, stale: true }))
        return
      }
      if (!isSaveSnapshot(event.snapshot) || event.snapshot.status !== 'ready' || event.snapshot.backup || event.snapshot.inventory == null) {
        setState(previous => ({ ...previous, stale: true }))
        return
      }
      const snapshot = event.snapshot
      const held: Record<number, number> = {}
      for (const member of [...(snapshot.party ?? []), ...(snapshot.boxes ?? [])]) {
        if (member.heldItemId && !member.isEgg) held[member.heldItemId] = (held[member.heldItemId] ?? 0) + 1
      }
      setState({ inventory: snapshot.inventory!, held, stale: event.connected === false, updatedAt: snapshot.updatedAt })
    })
  }, [enabled])
  return enabled ? state : empty
}
