import { useEffect, useState } from 'react'
import { getFieldMoves } from '../api/field-moves'
import { fieldMoveResource, matchesFieldMove } from '../domain/field-moves'
import type { FieldMove, FieldMovePokemon } from '../domain/field-moves'

export function useFieldMoveFilter(collection: FieldMovePokemon[]) {
  const [selected, setSelected] = useState<FieldMove[]>([])
  const [attempt, setAttempt] = useState(0)
  const resources = JSON.stringify([...new Set(collection.filter(pokemon => !pokemon.isEgg).map(fieldMoveResource))].sort())
  const [result, setResult] = useState<{ resources: string; moves: Record<string, FieldMove[]>; loading: boolean; error: boolean } | null>(null)
  const enabled = selected.length > 0
  useEffect(() => {
    if (!enabled) return
    let active = true
    const keys: string[] = JSON.parse(resources)
    const moves: Record<string, FieldMove[]> = {}
    let next = 0
    let error = false
    const publish = (loading: boolean) => {
      if (active) setResult({ resources, moves: { ...moves }, loading, error })
    }
    publish(true)
    void Promise.all(Array.from({ length: Math.min(4, keys.length) }, async () => {
      while (active && next < keys.length) {
        const resource = keys[next++]
        try { moves[resource] = await getFieldMoves(resource) } catch { error = true }
        publish(true)
      }
    })).then(() => publish(false))
    return () => { active = false }
  }, [enabled, resources, attempt])
  const current = result?.resources === resources ? result : null
  return {
    selected,
    setSelected,
    loading: enabled && (current?.loading ?? true),
    error: enabled && (current?.error ?? false),
    retry: () => setAttempt(value => value + 1),
    matches: (pokemon: FieldMovePokemon) => matchesFieldMove(pokemon, selected, current?.moves[fieldMoveResource(pokemon)]),
  }
}
