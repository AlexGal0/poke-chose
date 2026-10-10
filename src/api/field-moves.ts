import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'
import { blackWhiteFieldMoves, FIELD_MOVES } from '../domain/field-moves.ts'
import type { FieldMove } from '../domain/field-moves.ts'
import type { LearnsetResponse } from '../domain/moves.ts'

const requests = new Map<string, Promise<FieldMove[]>>()

export function getFieldMoves(resource: string): Promise<FieldMove[]> {
  let pending = requests.get(resource)
  if (!pending) {
    pending = loadFieldMoves(resource)
    requests.set(resource, pending)
    void pending.catch(() => requests.delete(resource))
  }
  return pending
}

async function loadFieldMoves(resource: string): Promise<FieldMove[]> {
  const key = `field-moves-bw-v1-${resource}`
  const cached = readCache<FieldMove[]>(key)
  if (Array.isArray(cached) && cached.every(move => FIELD_MOVES.includes(move))) return cached
  const data = await request<LearnsetResponse>(`pokemon/${encodeURIComponent(resource)}`)
  const result = blackWhiteFieldMoves(data)
  writeCache(key, result)
  return result
}
