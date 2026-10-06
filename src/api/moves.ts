import { request } from './pokeapi.ts'
import { readCache, writeCache } from '../storage/local.ts'
import { blackWhiteLearnset, blackWhiteMove } from '../domain/moves.ts'
import type { LearnedMove, LearnsetResponse, MoveResponse } from '../domain/moves.ts'

export async function getLevelMoves(pokemonName: string, locale: string, signal?: AbortSignal): Promise<LearnedMove[]> {
  const key = `learnset-bw-${locale}-v2-${pokemonName}`
  const cached = readCache<LearnedMove[]>(key)
  if (Array.isArray(cached)) return cached
  const data = await request<LearnsetResponse>(`pokemon/${encodeURIComponent(pokemonName)}`, signal)
  const learnset = blackWhiteLearnset(data)
  const result: LearnedMove[] = new Array(learnset.length)
  let next = 0
  const workers = await Promise.allSettled(Array.from({ length: Math.min(4, learnset.length) }, async () => {
    while (next < learnset.length) {
      signal?.throwIfAborted()
      const index = next++
      const row = learnset[index]
      const moveKey = `move-bw-${locale}-v2-${row.slug}`
      const saved = readCache<ReturnType<typeof blackWhiteMove>>(moveKey)
      const move = saved ?? blackWhiteMove(await request<MoveResponse>(`move/${row.slug}`, signal), locale)
      if (!saved) writeCache(moveKey, move)
      result[index] = { ...move, ...row }
    }
  }))
  const failure = workers.find(worker => worker.status === 'rejected')
  if (failure?.status === 'rejected') throw failure.reason
  signal?.throwIfAborted()
  writeCache(key, result)
  return result
}
